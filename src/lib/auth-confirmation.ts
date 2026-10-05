import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { accountDestination } from "./account-input";

export const confirmationBodyLimit = 2048;
export type EmailConfirmation = { tokenHash: string; type: "email"; invite: string };
const invitePattern = /^[a-f0-9]{48}$/;
const tokenPattern = /^[A-Za-z0-9_-]{32,256}$/;
const noncePattern = /^[a-f0-9]{64}$/;

// The configured origin is the only redirect authority. Request/forwarded headers
// and email parameters never supply a redirect destination.
export function confirmationOrigin(value = process.env.DARSLOOP_ORIGIN || "http://127.0.0.1:3000") {
  const url = new URL(value);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (value !== value.trim() || url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
      !(url.protocol === "https:" || (url.protocol === "http:" && loopback))) throw new Error("Invalid account origin");
  return url.origin;
}

export function signupEmailRedirect(origin: string, invite: unknown, flow = process.env.DARSLOOP_EMAIL_CONFIRMATION_FLOW) {
  const trusted = confirmationOrigin(origin);
  if (flow && flow !== "pkce" && flow !== "token_hash") throw new Error("Invalid email confirmation flow");
  const result = new URL(flow === "token_hash" ? "/auth/confirm" : "/auth/callback", trusted);
  if (flow === "token_hash" && typeof invite === "string" && invitePattern.test(invite)) result.searchParams.set("invite", invite);
  return result.href;
}

function singleFields(params: URLSearchParams, allowed: string[]) {
  for (const key of params.keys()) if (!allowed.includes(key) || params.getAll(key).length !== 1) throw new Error("Invalid confirmation");
}

function invitation(value: string | null) {
  if (value === null || value === "") return "";
  if (!invitePattern.test(value)) throw new Error("Invalid confirmation");
  return value;
}

function confirmationFields(params: URLSearchParams): EmailConfirmation {
  const tokenHash = params.get("token_hash") || "";
  if (!tokenPattern.test(tokenHash) || params.get("type") !== "email") throw new Error("Invalid confirmation");
  return { tokenHash, type: "email", invite: invitation(params.get("invite")) };
}

export function emailConfirmationQuery(params: URLSearchParams, origin: string, cookieInvite?: string): EmailConfirmation {
  if (params.toString().length > confirmationBodyLimit) throw new Error("Invalid confirmation");
  singleFields(params, ["token_hash", "type", "invite", "redirect_to"]);
  const input = confirmationFields(params);
  const redirect = params.get("redirect_to");
  let nestedInvite = "";
  if (redirect !== null) {
    const url = new URL(redirect);
    // RedirectTo carries an invitation only. Neither allowed auth path is followed.
    if (url.origin !== origin || url.username || url.password || url.hash ||
        !["/auth/confirm", "/auth/callback"].includes(url.pathname)) throw new Error("Invalid confirmation");
    singleFields(url.searchParams, ["invite"]);
    nestedInvite = invitation(url.searchParams.get("invite"));
  }
  if (input.invite && nestedInvite && input.invite !== nestedInvite) throw new Error("Invalid confirmation");
  input.invite = input.invite || nestedInvite || (cookieInvite && invitePattern.test(cookieInvite) ? cookieInvite : "");
  return input;
}

export function emailConfirmationForm(params: URLSearchParams) {
  singleFields(params, ["token_hash", "type", "invite", "csrf"]);
  const input = confirmationFields(params), nonce = params.get("csrf") || "";
  if (!noncePattern.test(nonce)) throw new Error("Invalid confirmation");
  return { input, nonce };
}

function binding(input: EmailConfirmation) {
  return createHash("sha256").update(`${input.tokenHash}\0${input.type}\0${input.invite}`).digest("hex");
}

export function confirmationChallenge(input: EmailConfirmation) {
  const nonce = randomBytes(32).toString("hex");
  return { nonce, cookie: `${nonce}.${binding(input)}` };
}

export function validConfirmationChallenge(input: EmailConfirmation, nonce: string, cookie: string | undefined) {
  if (!noncePattern.test(nonce) || !cookie || !/^[a-f0-9]{64}\.[a-f0-9]{64}$/.test(cookie)) return false;
  const expected = Buffer.from(`${nonce}.${binding(input)}`), actual = Buffer.from(cookie);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function confirmationCookieName(origin: string) {
  return origin.startsWith("https://") ? "__Host-darsloop-email-confirm" : "darsloop-email-confirm";
}

export function confirmationDestination(input: EmailConfirmation, origin: string, success: boolean) {
  if (success) return new URL(accountDestination(input.invite), origin);
  const url = new URL("/signin?confirmed=failed", origin);
  if (input.invite) url.searchParams.set("invite", input.invite);
  return url;
}

export function confirmationRequestAllowed(req: Request, origin: string, post = false) {
  const expected = new URL(origin);
  if (req.headers.get("host")?.toLowerCase() !== expected.host.toLowerCase()) return false;
  if (post && (req.headers.get("origin") !== origin || req.headers.get("sec-fetch-site") === "cross-site")) return false;
  return true;
}

export async function readConfirmationForm(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  if (!/^application\/x-www-form-urlencoded(?:;\s*charset=utf-8)?$/i.test(contentType) || !req.body) throw new Error("Invalid confirmation");
  const length = req.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > confirmationBodyLimit)) throw new Error("Invalid confirmation");
  const reader = req.body.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > confirmationBodyLimit) { await reader.cancel(); throw new Error("Invalid confirmation"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return emailConfirmationForm(new URLSearchParams(Buffer.concat(chunks).toString("utf8")));
}
