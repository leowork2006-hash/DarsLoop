import { authenticate, body, fail, HttpError, json } from "@/lib/http";
import { onboardingInput } from "@/lib/onboarding-input";
import { cloudMode } from "@/lib/supabase/config";
import { accountClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    await authenticate(req);
    const input = onboardingInput.safeParse(await body(req, 512));
    if (!input.success) throw new HttpError(400, "Choose English, Arabic or Urdu for your guide.");
    if (!cloudMode()) return json({ saved: "device" });
    const client = await accountClient();
    const { error } = await client.auth.updateUser({ data: { darsloop_onboarding: input.data } });
    if (error) throw new HttpError(503, "Your welcome preference could not sync. It is still saved on this device.");
    return json({ saved: "account" });
  } catch (error) { return fail(error); }
}
