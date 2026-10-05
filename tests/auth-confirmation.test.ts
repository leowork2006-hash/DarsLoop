import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  confirmationChallenge, confirmationCookieName, confirmationOrigin,
  emailConfirmationQuery, signupEmailRedirect, validConfirmationChallenge,
} from "../src/lib/auth-confirmation";

const fixture = vi.hoisted(() => ({ configured: true, create: vi.fn(), verify: vi.fn(), signUp: vi.fn(), setCookie: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: (...args: unknown[]) => fixture.create(...args) }));
vi.mock("../src/lib/supabase/config", () => ({ cloudMode: () => true, accountConfigured: () => fixture.configured, publicConfig: () => ({ url: "https://fictional-project.supabase.co", key: "fictional-publishable-key" }) }));
vi.mock("../src/lib/supabase/server", () => ({ AccountServiceUnavailable: class extends Error {}, accountClient: async () => ({ auth: { signUp: fixture.signUp } }) }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: fixture.setCookie }) }));
const route = await import("../src/app/auth/confirm/route");
const account = await import("../src/app/api/account/route");
const origin = "https://study.example.test", hash = "a".repeat(64), invite = "b".repeat(48);
const input = { tokenHash: hash, type: "email" as const, invite };

function get(query: string | URLSearchParams = new URLSearchParams({ token_hash: hash, type: "email", invite }), headers: Record<string, string> = {}) {
  return new NextRequest(`${origin}/auth/confirm?${query}`, { headers: { host: new URL(origin).host, ...headers } });
}
async function challenge(query?: URLSearchParams) {
  const response = await route.GET(get(query));
  const html = await response.text(), csrf = html.match(/name="csrf" value="([a-f0-9]+)"/)?.[1];
  expect(csrf).toHaveLength(64);
  const cookie = response.cookies.get(confirmationCookieName(origin));
  expect(cookie).toBeDefined();
  return { csrf: csrf!, cookie: `${cookie!.name}=${cookie!.value}`, response, html };
}
function post(csrf: string, cookie: string, fields: Record<string, string> = {}, headers: Record<string, string> = {}, body?: string, query = "") {
  return new NextRequest(`${origin}/auth/confirm${query}`, { method: "POST", headers: { host: new URL(origin).host, origin, "sec-fetch-site": "same-origin", "content-type": "application/x-www-form-urlencoded", cookie, ...headers }, body: body ?? new URLSearchParams({ token_hash: hash, type: "email", invite, csrf, ...fields }).toString() });
}
function signup() {
  return new Request(`${origin}/api/account`, { method: "POST", headers: { host: new URL(origin).host, origin, "content-type": "application/json" }, body: JSON.stringify({ action: "signup", email: "fictional@example.test", password: "fictional-strong-password", invite }) });
}

beforeEach(() => {
  vi.stubEnv("DARSLOOP_ORIGIN", origin);
  vi.stubEnv("DARSLOOP_BACKEND", "supabase");
  vi.stubEnv("DARSLOOP_EMAIL_CONFIRMATION_FLOW", "");
  fixture.configured = true;
  fixture.verify.mockReset().mockResolvedValue({ data: { session: { access_token: "fictional-session" }, user: { id: "fictional-student" } }, error: null });
  fixture.create.mockReset().mockImplementation((_url, _key, options) => ({ auth: { verifyOtp: async (args: unknown) => {
    const result = await fixture.verify(args);
    options.cookies.setAll([{ name: "sb-fictional-auth-token", value: "fictional-cookie", options: { path: "/foreign-path", domain: "example.test", secure: false, httpOnly: false, sameSite: "none", maxAge: 3600 } }], { "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0", Expires: "0", Pragma: "no-cache" });
    return result;
  } } }));
  fixture.signUp.mockReset().mockResolvedValue({ error: null });
  fixture.setCookie.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe("strict confirmation input and signup redirect", () => {
  it("retains PKCE as default and accepts only the exact token_hash opt-in", async () => {
    expect(signupEmailRedirect(origin, invite)).toBe(`${origin}/auth/callback`);
    expect(signupEmailRedirect(origin, invite, "pkce")).toBe(`${origin}/auth/callback`);
    expect(signupEmailRedirect(origin, invite, "token_hash")).toBe(`${origin}/auth/confirm?invite=${invite}`);
    expect(signupEmailRedirect(origin, "https://foreign.test", "token_hash")).toBe(`${origin}/auth/confirm`);
    for (const flow of ["TOKEN_HASH", " token_hash", "implicit", "true"]) expect(() => signupEmailRedirect(origin, invite, flow)).toThrow();
    const defaultResponse = await account.POST(signup());
    expect(defaultResponse.status).toBe(200);
    expect(fixture.signUp.mock.calls[0][0].options.emailRedirectTo).toBe(`${origin}/auth/callback`);
    vi.stubEnv("DARSLOOP_EMAIL_CONFIRMATION_FLOW", "token_hash");
    expect((await account.POST(signup())).status).toBe(200);
    expect(fixture.signUp.mock.calls[1][0].options.emailRedirectTo).toBe(`${origin}/auth/confirm?invite=${invite}`);
    vi.stubEnv("DARSLOOP_EMAIL_CONFIRMATION_FLOW", "invalid");
    expect((await account.POST(signup())).status).toBe(500);
    expect(fixture.signUp).toHaveBeenCalledTimes(2);
  });

  it("requires a canonical HTTPS origin or a loopback HTTP origin", () => {
    expect(confirmationOrigin("http://127.0.0.1:3039")).toBe("http://127.0.0.1:3039");
    expect(confirmationOrigin(`${origin}/`)).toBe(origin);
    for (const value of ["http://external.test", `${origin}/foreign`, `${origin}?next=bad`, `${origin}#bad`, "https://user:password@study.example.test", ` ${origin}`, "file:///tmp/test"]) expect(() => confirmationOrigin(value)).toThrow();
  });

  it("rejects malformed, missing, oversized or repeated tokens and OTP types", async () => {
    for (const token of ["", "x".repeat(31), "x".repeat(257), "x".repeat(32) + "<", "x".repeat(32) + "\n"]) {
      expect((await route.GET(get(new URLSearchParams({ token_hash: token, type: "email" })))).status).toBe(400);
    }
    for (const type of ["", "signup", "recovery", "magiclink", "email_change", "Email"]) expect((await route.GET(get(new URLSearchParams({ token_hash: hash, type })))).status).toBe(400);
    for (const query of [`token_hash=${hash}&token_hash=${hash}&type=email`, `token_hash=${hash}&type=email&type=email`, `token_hash=${hash}&type=email&next=https://foreign.test`, `token_hash=${hash}&type=email&extra=${"x".repeat(2048)}`]) expect((await route.GET(get(query))).status).toBe(400);
    expect(fixture.create).not.toHaveBeenCalled();
  });

  it("carries an invitation from only a fixed trusted auth redirect", () => {
    const params = new URLSearchParams({ token_hash: hash, type: "email", redirect_to: `${origin}/auth/confirm?invite=${invite}` });
    expect(emailConfirmationQuery(params, origin)).toEqual(input);
    expect(emailConfirmationQuery(new URLSearchParams({ token_hash: hash, type: "email", redirect_to: `${origin}/auth/callback` }), origin, invite)).toEqual(input);
    const invalid = ["https://foreign.test/auth/confirm", `https://user@study.example.test/auth/confirm`, `${origin}/learn`, `${origin}/auth/confirm/`, `${origin}/auth/confirm#fragment`, `${origin}/auth/confirm?next=https://foreign.test`, `${origin}/auth/confirm?invite=bad`, `${origin}/auth/confirm?invite=${invite}&invite=${invite}`, "//study.example.test/auth/confirm"];
    for (const redirect_to of invalid) expect(() => emailConfirmationQuery(new URLSearchParams({ token_hash: hash, type: "email", redirect_to }), origin)).toThrow();
    params.set("invite", "c".repeat(48));
    expect(() => emailConfirmationQuery(params, origin)).toThrow();
  });

  it("renders the prepared template into a valid invitation-carrying app link", () => {
    const template = readFileSync(new URL("../docs/email/signup-confirmation.html", import.meta.url), "utf8");
    const rendered = template.replaceAll("{{ .SiteURL }}", origin).replaceAll("{{ .TokenHash }}", hash).replaceAll("{{ .RedirectTo }}", signupEmailRedirect(origin, invite, "token_hash"));
    const href = rendered.match(/href="([^"]+)"/)![1].replaceAll("&amp;", "&");
    const url = new URL(href);
    expect(url.origin + url.pathname).toBe(`${origin}/auth/confirm`);
    expect(emailConfirmationQuery(url.searchParams, origin)).toEqual(input);
    expect(template).not.toContain(".ConfirmationURL");
  });
});

describe("email-link scanner and CSRF boundaries", () => {
  it("GET and HEAD never create a Supabase client or consume the OTP", async () => {
    const first = await challenge(), second = await challenge();
    expect(first.csrf).not.toBe(second.csrf);
    expect(first.html).toContain('method="post" action="/auth/confirm"');
    expect(first.html).not.toContain("<script");
    const head = await route.HEAD();
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    expect(head.headers.get("set-cookie")).toBeNull();
    expect(fixture.create).not.toHaveBeenCalled();
    expect(fixture.verify).not.toHaveBeenCalled();
  });

  it("makes the short-lived challenge private and secure without referrer leakage", async () => {
    const { response } = await challenge(), header = response.headers.get("set-cookie")!;
    expect(header).toContain("__Host-darsloop-email-confirm=");
    for (const attribute of ["HttpOnly", "Secure", "SameSite=lax", "Path=/", "Max-Age=600"]) expect(header).toContain(attribute);
    expect(header).not.toContain("Domain=");
    expect(header).not.toContain(hash);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("content-security-policy")).toContain("form-action 'self'");
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
  });

  it("binds the nonce to the exact token, type and invitation", () => {
    const value = confirmationChallenge(input);
    expect(validConfirmationChallenge(input, value.nonce, value.cookie)).toBe(true);
    expect(validConfirmationChallenge({ ...input, tokenHash: "d".repeat(64) }, value.nonce, value.cookie)).toBe(false);
    expect(validConfirmationChallenge({ ...input, invite: "c".repeat(48) }, value.nonce, value.cookie)).toBe(false);
    expect(validConfirmationChallenge(input, "f".repeat(64), value.cookie)).toBe(false);
    expect(validConfirmationChallenge(input, value.nonce, undefined)).toBe(false);
  });

  it("blocks cross-origin, missing-origin, cross-site and untrusted-host POSTs", async () => {
    const { csrf, cookie } = await challenge();
    const rejectedHeaders: Record<string, string>[] = [{ origin: "https://foreign.test" }, { origin: "" }, { "sec-fetch-site": "cross-site" }, { host: "foreign.test" }];
    for (const headers of rejectedHeaders) expect((await route.POST(post(csrf, cookie, {}, headers))).status).toBe(403);
    expect((await route.GET(get(undefined, { host: "foreign.test" }))).status).toBe(403);
    expect(fixture.create).not.toHaveBeenCalled();
  });

  it("rejects missing cookies and altered tokens, invitations or challenge values", async () => {
    const { csrf, cookie } = await challenge();
    expect((await route.POST(post(csrf, ""))).status).toBe(403);
    const alteredFields: Record<string, string>[] = [{ token_hash: "c".repeat(64) }, { invite: "c".repeat(48) }, { csrf: "d".repeat(64) }];
    for (const fields of alteredFields) expect((await route.POST(post(csrf, cookie, fields))).status).toBe(403);
    expect(fixture.verify).not.toHaveBeenCalled();
  });

  it("bounds form bodies and rejects unsupported, duplicated and redirect fields before verification", async () => {
    const { csrf, cookie } = await challenge();
    const valid = new URLSearchParams({ token_hash: hash, type: "email", invite, csrf }).toString();
    const invalidBodies = [valid + "&token_hash=" + hash, valid + "&type=email", valid + "&redirect_to=https://foreign.test", valid + "&next=/learn", valid + "&extra=" + "x".repeat(2049), valid.replace("type=email", "type=recovery")];
    for (const body of invalidBodies) expect((await route.POST(post(csrf, cookie, {}, {}, body))).status).toBe(400);
    expect((await route.POST(post(csrf, cookie, {}, { "content-type": "application/json" }, "{}"))).status).toBe(400);
    expect((await route.POST(post(csrf, cookie, {}, { "content-length": "3000" }))).status).toBe(400);
    expect((await route.POST(post(csrf, cookie, {}, {}, undefined, "?next=/learn"))).status).toBe(400);
    expect(fixture.verify).not.toHaveBeenCalled();
  });
});

describe("explicit confirmation with mocked Supabase", () => {
  it("confirms in a fresh browser without a PKCE verifier and writes host-only SSR session cookies", async () => {
    const { csrf, cookie } = await challenge();
    const response = await route.POST(post(csrf, cookie));
    expect(response.status).toBe(303);
    expect(fixture.verify).toHaveBeenCalledWith({ token_hash: hash, type: "email" });
    expect(response.headers.get("location")).toBe(`${origin}/learn?invite=${invite}`);
    expect(response.headers.get("location")).not.toContain(hash);
    const session = response.cookies.get("sb-fictional-auth-token")!;
    expect(session.value).toBe("fictional-cookie");
    expect(session).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 3600 });
    expect(session).not.toHaveProperty("domain");
    expect(response.cookies.get(confirmationCookieName(origin))?.maxAge).toBe(0);
    expect(response.cookies.get("darsloop-auth-invite")?.maxAge).toBe(0);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    const options = fixture.create.mock.calls[0][2];
    expect(options.cookies.getAll()).toHaveLength(1);
    expect(options.cookies.getAll()[0].name).toBe(confirmationCookieName(origin));
  });

  it("redirects a confirmation without an invitation only to the trusted /learn", async () => {
    const { csrf, cookie } = await challenge(new URLSearchParams({ token_hash: hash, type: "email" }));
    const response = await route.POST(post(csrf, cookie, { invite: "" }));
    expect(response.headers.get("location")).toBe(`${origin}/learn`);
  });

  it("bounds the provider request with an abort signal and preserves upstream cancellation", async () => {
    const { csrf, cookie } = await challenge();
    await route.POST(post(csrf, cookie));
    const requestFetch = fixture.create.mock.calls[0][2].global.fetch;
    const intercepted = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
    try {
      await requestFetch("https://fictional-project.supabase.co/auth/v1/verify", { method: "POST" });
      expect(intercepted.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
      const cancel = new AbortController(); cancel.abort();
      await requestFetch("https://fictional-project.supabase.co/auth/v1/verify", { signal: cancel.signal });
      expect(intercepted.mock.calls[1][1]?.signal?.aborted).toBe(true);
    } finally { intercepted.mockRestore(); }
  });

  it("clears the challenge after confirmation and delegates token replay rejection to Supabase", async () => {
    const { csrf, cookie } = await challenge();
    expect((await route.POST(post(csrf, cookie))).headers.get("location")).toContain("/learn");
    expect((await route.POST(post(csrf, ""))).status).toBe(403);
    fixture.verify.mockResolvedValueOnce({ data: { session: null, user: null }, error: { message: "secret expired token detail", status: 403 } });
    const fresh = await challenge(), replay = await route.POST(post(fresh.csrf, fresh.cookie));
    expect(replay.status).toBe(303);
    expect(replay.headers.get("location")).toBe(`${origin}/signin?confirmed=failed&invite=${invite}`);
    expect(replay.cookies.get("sb-fictional-auth-token")).toBeUndefined();
    expect(await replay.text()).not.toContain("secret");
    expect(replay.cookies.get(confirmationCookieName(origin))?.maxAge).toBe(0);
  });

  it("returns generic fixed failures without writing session cookies on provider errors or empty sessions", async () => {
    for (const outcome of ["throw", "empty", "error", "unconfigured"]) {
      if (outcome === "throw") fixture.verify.mockRejectedValueOnce(new Error("secret provider details"));
      if (outcome === "empty") fixture.verify.mockResolvedValueOnce({ data: { session: null, user: null }, error: null });
      if (outcome === "error") fixture.verify.mockResolvedValueOnce({ data: { session: { access_token: "fictional" }, user: { id: "fictional" } }, error: { message: "secret" } });
      fixture.configured = outcome !== "unconfigured";
      const { csrf, cookie } = await challenge(), response = await route.POST(post(csrf, cookie));
      expect(response.headers.get("location")).toBe(`${origin}/signin?confirmed=failed&invite=${invite}`);
      expect(response.cookies.get("sb-fictional-auth-token")).toBeUndefined();
      expect(await response.text()).not.toContain("secret");
    }
  });

  it("uses a non-prefixed challenge only for local HTTP and fails safely for bad server configuration", async () => {
    vi.stubEnv("DARSLOOP_ORIGIN", "http://127.0.0.1:3039");
    const local = await route.GET(new NextRequest(`http://127.0.0.1:3039/auth/confirm?token_hash=${hash}&type=email`, { headers: { host: "127.0.0.1:3039" } }));
    expect(local.cookies.get("darsloop-email-confirm")?.secure).toBe(false);
    expect(local.headers.get("set-cookie")).not.toContain("__Host-");
    vi.stubEnv("DARSLOOP_ORIGIN", "https://user:secret@foreign.test/path");
    const failed = await route.POST(post("a".repeat(64), ""));
    expect(failed.status).toBe(503);
    expect(failed.headers.get("location")).toBeNull();
    expect(await failed.text()).not.toContain("foreign.test");
    expect(fixture.verify).not.toHaveBeenCalled();
  });
});
