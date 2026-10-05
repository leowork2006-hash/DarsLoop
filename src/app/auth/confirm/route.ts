import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { accountConfigured, publicConfig } from "@/lib/supabase/config";
import {
  confirmationChallenge, confirmationCookieName, confirmationDestination,
  confirmationOrigin, confirmationRequestAllowed, emailConfirmationQuery,
  readConfirmationForm, validConfirmationChallenge, type EmailConfirmation,
} from "@/lib/auth-confirmation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function secureHeaders(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.headers.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
  return response;
}

function cookieOptions(origin: string) {
  return { httpOnly: true, sameSite: "lax" as const, secure: origin.startsWith("https://"), path: "/" };
}

function page(input?: EmailConfirmation, nonce?: string, status = 200) {
  // All form values have already passed strict ASCII validation. No provider
  // descriptions, request URLs or arbitrary redirect values appear in this page.
  const form = input && nonce ? `<form method="post" action="/auth/confirm" autocomplete="off">
    <input type="hidden" name="token_hash" value="${input.tokenHash}">
    <input type="hidden" name="type" value="email">
    <input type="hidden" name="invite" value="${input.invite}">
    <input type="hidden" name="csrf" value="${nonce}">
    <button type="submit">Confirm my email</button></form>` : `<a class="button" href="/signin">Go to sign in</a>`;
  const title = input ? "Confirm your email" : "This link could not finish";
  const copy = input ? "Confirm to open your DarsLoop workspace. Only continue if you asked to create this account." : "The link may have expired or already been used. If your email is confirmed, sign in with your DarsLoop password.";
  return secureHeaders(new NextResponse(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><title>${title} · DarsLoop</title><style>
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#f5f3eb;color:#242720;font-family:system-ui,sans-serif}main{width:min(100%,460px);background:#fffef9;border:1px solid #dcded3;border-radius:24px;padding:36px;box-shadow:0 16px 40px #282d2110}.brand{font-size:19px;font-weight:750;margin:0 0 32px}h1{font:500 30px/1.15 Georgia,serif;margin:0 0 16px}p{font-size:15px;line-height:1.6;color:#53594c;margin:0 0 24px}button,.button{display:block;width:100%;border:0;border-radius:13px;background:#313b2d;color:#fff;padding:15px;font:650 15px system-ui;text-align:center;text-decoration:none;cursor:pointer}button:hover,.button:hover{background:#45513d}button:focus-visible,.button:focus-visible{outline:3px solid #aa9470;outline-offset:4px}.foot{margin:24px 0 0;font-size:12px}@media(max-width:400px){main{padding:28px 24px}h1{font-size:27px}}
  </style></head><body><main><div class="brand">DarsLoop AI</div><h1>${title}</h1><p>${copy}</p>${form}<p class="foot">Your lessons stay in your private workspace.</p></main></body></html>`, { status, headers: { "Content-Type": "text/html; charset=utf-8" } }));
}

export async function GET(req: NextRequest) {
  try {
    const origin = confirmationOrigin();
    if (!confirmationRequestAllowed(req, origin)) return page(undefined, undefined, 403);
    const input = emailConfirmationQuery(req.nextUrl.searchParams, origin, req.cookies.get("darsloop-auth-invite")?.value);
    const challenge = confirmationChallenge(input), response = page(input, challenge.nonce);
    response.cookies.set(confirmationCookieName(origin), challenge.cookie, { ...cookieOptions(origin), maxAge: 600 });
    return response;
  } catch { return page(undefined, undefined, 400); }
}

// Email scanners may issue either GET or HEAD. Neither consumes the one-use OTP.
export async function HEAD() {
  return secureHeaders(new NextResponse(null, { status: 200 }));
}

export async function POST(req: NextRequest) {
  let origin: string;
  try { origin = confirmationOrigin(); } catch { return page(undefined, undefined, 503); }
  if (!confirmationRequestAllowed(req, origin, true)) return page(undefined, undefined, 403);
  let input: EmailConfirmation;
  try {
    if (req.nextUrl.search) return page(undefined, undefined, 400);
    const form = await readConfirmationForm(req);
    if (!validConfirmationChallenge(form.input, form.nonce, req.cookies.get(confirmationCookieName(origin))?.value)) return page(undefined, undefined, 403);
    input = form.input;
  } catch { return page(undefined, undefined, 400); }

  const pendingCookies: { name: string; value: string; options: CookieOptions }[] = [];
  let verified = false;
  try {
    if (accountConfigured()) {
      const { url, key } = publicConfig();
      const deadline = AbortSignal.timeout(15_000);
      const client = createServerClient(url, key, {
        cookieOptions: cookieOptions(origin),
        global: { fetch: (url, options) => fetch(url, {
          ...options, signal: options?.signal ? AbortSignal.any([options.signal, deadline]) : deadline,
        }) },
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: items => { pendingCookies.push(...items); },
        },
      });
      const { data, error } = await client.auth.verifyOtp({ token_hash: input.tokenHash, type: input.type });
      verified = !error && !!data.session && !!data.user;
    }
  } catch { /* Return the same generic failure for every provider/network error. */ }

  const response = secureHeaders(NextResponse.redirect(confirmationDestination(input, origin, verified), 303));
  if (verified) {
    for (const { name, value, options } of pendingCookies) {
      // Session cookies are host-only even if a client default changes upstream.
      const { domain: _domain, ...hostOptions } = options;
      response.cookies.set(name, value, { ...hostOptions, ...cookieOptions(origin) });
    }
  }
  response.cookies.set(confirmationCookieName(origin), "", { ...cookieOptions(origin), maxAge: 0 });
  response.cookies.set("darsloop-auth-invite", "", { ...cookieOptions(origin), maxAge: 0 });
  return response;
}
