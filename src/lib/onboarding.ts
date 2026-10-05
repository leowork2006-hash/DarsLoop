import type { GuideLanguage } from "./guide-language";

export type OnboardingPreference = { completed: boolean; language: GuideLanguage };
export type DeviceOnboardingPreference = OnboardingPreference & { pendingSync?: boolean };
const defaultPreference: OnboardingPreference = { completed: false, language: "en" };

// These are display preferences only. Never use editable metadata for access control.
export function readOnboardingPreference(value: unknown): OnboardingPreference {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...defaultPreference };
  const preference = value as Record<string, unknown>;
  return {
    completed: preference.completed === true,
    language: preference.language === "ar" || preference.language === "ur" ? preference.language : "en",
  };
}

function deviceKey(userId: string) { return `darsloop-onboarding-v1:${userId}`; }
export function readDeviceOnboarding(userId: string): DeviceOnboardingPreference {
  try {
    const value = JSON.parse(localStorage.getItem(deviceKey(userId)) || "null");
    return { ...readOnboardingPreference(value), ...(value?.pendingSync === true ? { pendingSync: true } : {}) };
  }
  catch { return { ...defaultPreference }; }
}
export function saveDeviceOnboarding(userId: string, preference: DeviceOnboardingPreference) {
  try { localStorage.setItem(deviceKey(userId), JSON.stringify(preference)); } catch { /* Account persistence still works when local storage is unavailable. */ }
}
