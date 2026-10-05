# Email confirmation setup

## Prepared, not installed

The signup email template in `email/signup-confirmation.html` is prepared source. Its suggested subject is **Confirm your email for DarsLoop**. No hosted email template, SMTP provider, sender, confirmation requirement or billing setting was changed by this implementation. Delivery to a new inbox remains a separate owner check.

Supabase's default SMTP is restricted to authorized project-team addresses and has a low sending limit. New Free projects created from June 3, 2026 cannot customize email templates while using default SMTP; custom SMTP permits customization. Project creation date, sender eligibility and SMTP configuration must be checked by the owner. See [Supabase default SMTP](https://supabase.com/docs/guides/auth/auth-smtp) and [email-template customization change](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier).

## Application behavior

- Empty `DARSLOOP_EMAIL_CONFIRMATION_FLOW` or `pkce` keeps signup's existing `/auth/callback` redirect. OAuth continues using its existing PKCE callback.
- The exact server opt-in `DARSLOOP_EMAIL_CONFIRMATION_FLOW=token_hash` makes signup use `/auth/confirm`, with a validated class invitation when present. Other nonempty values fail before sending a signup email.
- The prepared email links to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&redirect_to={{ .RedirectTo }}`. `RedirectTo` supplies only a strictly validated invitation; it is never followed as a redirect.
- GET and HEAD do not verify the OTP. GET creates a ten-minute, HttpOnly, SameSite=Lax challenge cookie and shows an explicit button. POST requires the configured host, exact same-origin `Origin`, a matching challenge bound to the token/type/invitation, and a bounded URL-encoded form.
- Only the `email` OTP type is accepted. Recovery, email-change and arbitrary redirect flows are not handled here. Provider requests share a fifteen-second abort deadline. On verified success, SSR session cookies are written directly to the redirect response with HttpOnly, SameSite=Lax, host-only Path=/ and Secure on HTTPS. The application redirects only to `/learn` with an optional validated invitation. Failures use a fixed generic sign-in destination. Confirmation responses are private/no-store and no-referrer.
- No PKCE verifier from the browser that requested signup is needed for this token-hash flow. Supabase still enforces one-use tokens and expiry. Reopening the email after success cannot create another session from that used token.

## Owner rollout

1. Deploy the application route before changing the hosted template. Leave the flow setting empty during this step.
2. Set Supabase Site URL and server `DARSLOOP_ORIGIN` to the same exact HTTPS origin, with no path. Add the exact app `/auth/confirm` redirect and the app's narrowly scoped invitation variant to Supabase's allowed redirect URLs; keep the existing OAuth/callback settings. Supabase compares the query string too. Its glob syntax uses `?` as a wildcard, so an invitation pattern must escape the literal question mark, for example `https://YOUR_ORIGIN/auth/confirm\?invite=*`. Test the generated URL against the saved allowlist. Do not add an unrestricted domain wildcard. See [Supabase redirect URL matching](https://supabase.com/docs/guides/auth/redirect-urls).
3. After confirming SMTP/template eligibility, install the prepared **Confirm signup** template and its subject in Supabase Auth. Do not disable email confirmation. The template deliberately opens an app page so email-link scanners' GET/HEAD requests do not consume the OTP.
4. Set the server flow to `token_hash` after the matching template is installed. With the template installed and the opt-in still empty, confirmation still works, but an invitation is preserved only in the requesting browser's existing invitation cookie. The opt-in carries it in `RedirectTo` for another browser.
5. Request a new signup email to an authorized inbox. Open it in a different browser, verify that loading the page leaves the account unconfirmed, click the button, and check the confirmed session, invitation, subsequent password sign-in and replay failure. Also verify branded sender, inbox/spam arrival and acceptable delivery timing. An admin-generated test link cannot prove email delivery or sender branding.
6. Rollback requires matching both sides: restore the previous hosted confirmation template and unset the server opt-in. Keep `/auth/confirm` deployed for already sent links. OAuth's callback needs no change.

No confirmation URL, token, inbox, password, session cookie or service key belongs in a public report. The form must not be embedded on another site or changed to auto-submit. Review the rendered email's final link after configuring it: the app-generated `RedirectTo` contains only an auth path and at most one validated invitation parameter. The Supabase client's experimental `appendPkceFlowIdToRedirects` setting is not enabled; enabling it would require updating and testing the bounded `RedirectTo` contract.

## Evidence and sources

Targeted route tests mock Supabase to check GET/HEAD nonconsumption, input bounds, origin/CSRF checks, fixed redirects, replay handling and cookie security. They do not prove hosted email delivery. A separate owner-authorized hosted `generateLink`/`verifyOtp` check may prove the installed application's token handling without proving SMTP delivery.

Official references: [Supabase email templates and scanner behavior](https://supabase.com/docs/guides/auth/auth-email-templates), [verifyOtp token-hash API](https://supabase.com/docs/reference/javascript/auth-verifyotp), [SSR cookie client](https://supabase.com/docs/guides/auth/server-side/creating-a-client).
