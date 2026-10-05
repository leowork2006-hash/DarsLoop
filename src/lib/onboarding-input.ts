import { z } from "zod";

// No account IDs, redirects or arbitrary metadata may be supplied by the caller.
export const onboardingInput = z.object({
  completed: z.literal(true),
  language: z.enum(["en", "ar", "ur"]),
}).strict();
