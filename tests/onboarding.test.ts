import { afterEach, describe, expect, it, vi } from "vitest";
import { onboardingInput } from "../src/lib/onboarding-input";
import { readDeviceOnboarding, readOnboardingPreference, saveDeviceOnboarding } from "../src/lib/onboarding";

afterEach(() => vi.unstubAllGlobals());
describe("welcome preference boundaries", () => {
  it("rejects account IDs, redirects and arbitrary metadata in a preference update", () => {
    for (const addition of [{ userId: "another-account" }, { data: { role: "admin" } }, { redirect: "https://evil.invalid" }]) {
      expect(onboardingInput.safeParse({ completed: true, language: "en", ...addition }).success).toBe(false);
    }
    for (const value of [{ completed: "true", language: "en" }, { completed: false, language: "ur" }, { completed: true, language: "fr" }]) {
      expect(onboardingInput.safeParse(value).success).toBe(false);
    }
  });
  it("accepts only the three offered guide languages", () => {
    for (const language of ["en", "ar", "ur"]) expect(onboardingInput.safeParse({ completed: true, language }).success).toBe(true);
  });
  it("treats corrupt or user-edited metadata as display defaults, never as permission", () => {
    for (const value of [null, "true", [], { completed: "true", language: "<script>" }, { admin: true }]) {
      expect(readOnboardingPreference(value)).toEqual({ completed: false, language: "en" });
    }
    expect(readOnboardingPreference({ completed: true, language: "unknown", role: "admin" })).toEqual({ completed: true, language: "en" });
  });
  it("keeps device completion and language separate for each account", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
    saveDeviceOnboarding("one", { completed: true, language: "ur" });
    expect(readDeviceOnboarding("one")).toEqual({ completed: true, language: "ur" });
    expect(readDeviceOnboarding("two")).toEqual({ completed: false, language: "en" });
    saveDeviceOnboarding("two", { completed: true, language: "ar" });
    expect(readDeviceOnboarding("one").language).toBe("ur");
  });
  it("allows welcome use when browser storage is blocked or damaged", () => {
    vi.stubGlobal("localStorage", { getItem: () => "{broken", setItem: () => { throw new Error("blocked"); } });
    expect(readDeviceOnboarding("one")).toEqual({ completed: false, language: "en" });
    expect(() => saveDeviceOnboarding("one", { completed: true, language: "en" })).not.toThrow();
  });
  it("preserves an unsynced local language choice when an account update is interrupted", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
    saveDeviceOnboarding("one", { completed: true, language: "ur", pendingSync: true });
    expect(readDeviceOnboarding("one")).toEqual({ completed: true, language: "ur", pendingSync: true });
    // A successful sync clears the local override so later account updates can be read.
    saveDeviceOnboarding("one", { completed: true, language: "ur" });
    expect(readDeviceOnboarding("one").pendingSync).toBeUndefined();
  });
});
