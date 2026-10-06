import { beforeEach, describe, expect, it, vi } from "vitest";
import { studySkillsLesson } from "./fixtures/study-skills";
import type { Candidate, Lesson } from "../src/lib/types";

const fixture = vi.hoisted(() => ({ user: "verified-student", authorized: vi.fn(), budget: vi.fn(), search: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "fictional-session" }) }) }));
vi.mock("../src/lib/store", () => ({ sessionUser: () => fixture.user }));
vi.mock("../src/lib/supabase/config", () => ({ cloudMode: () => false }));
vi.mock("../src/lib/backend", () => ({ authorizedLesson: (...args: unknown[]) => fixture.authorized(...args), takeBudget: (...args: unknown[]) => fixture.budget(...args) }));
vi.mock("../src/lib/references", () => ({ findCandidates: (...args: unknown[]) => fixture.search(...args) }));
const { POST } = await import("../src/app/api/lessons/[id]/references/route");
const wording = "إنما الأعمال بالنيات وإنما لكل امرئ ما نوى";
const candidate: Candidate = { id: "hadith:4560:ar", title: "Fixture source", url: "https://hadeethenc.com/ar/browse/hadith/4560", text: wording, language: "ar", grade: "صحيح", gradePublisher: "HadeethEnc", collectionAttribution: "متفق عليه", retrievedAt: "2026-10-06T00:00:00.000Z", matchBasis: "wording", recordHash: "a".repeat(64) };
function lesson(): Lesson {
  const base = studySkillsLesson();
  return { ...base, id: "authorized-lesson", version: 7, segments: [{ ...base.segments[0], id: "captured-mention", text: `The captured mention was: ${wording}.`, flags: [] }] };
}
function request(overrides: Record<string, unknown> = {}, id = "authorized-lesson", headers: Record<string, string> = {}) {
  return POST(new Request(`http://localhost:3037/api/lessons/${id}/references`, { method: "POST", headers: { host: "localhost:3037", origin: "http://localhost:3037", "content-type": "application/json", ...headers }, body: JSON.stringify({ segmentId: "captured-mention", wording, language: "ar", version: 7, ...overrides }) }), { params: Promise.resolve({ id }) });
}
beforeEach(() => {
  fixture.user = "verified-student";
  fixture.authorized.mockReset().mockResolvedValue(lesson());
  fixture.budget.mockReset().mockResolvedValue(true);
  fixture.search.mockReset().mockResolvedValue([candidate]);
});

describe("References route with mocked identity, authorized source and provider", () => {
  it("searches only the exact captured wording and returns separately attributed possible matches", async () => {
    const response = await request({ wording: `  ${wording}  ` });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const result = await response.json();
    expect(result.status).toBe("candidates");
    expect(result.candidates).toEqual([candidate]);
    expect(result.message).toMatch(/Possible wording matches.*teacher/);
    expect(fixture.search).toHaveBeenCalledExactlyOnceWith(wording, "ar");
    expect(fixture.budget).toHaveBeenCalledExactlyOnceWith("verified-student", "source", 3);
    expect(fixture.authorized.mock.calls).toEqual([["verified-student", "authorized-lesson"], ["verified-student", "authorized-lesson"]]);
  });
  it("rejects missing or foreign lessons before spending budget or calling the provider", async () => {
    fixture.authorized.mockImplementation(async (_user, id) => id === "authorized-lesson" ? lesson() : null);
    for (const id of ["missing-lesson", "foreign-lesson"]) {
      const response = await request({}, id);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Lesson not found." });
    }
    expect(fixture.search).not.toHaveBeenCalled();
    expect(fixture.budget).not.toHaveBeenCalled();
  });
  it("rejects signed-out and cross-site requests before reading a lesson", async () => {
    expect((await request({}, "authorized-lesson", { origin: "https://foreign.invalid" })).status).toBe(403);
    fixture.user = "";
    expect((await request()).status).toBe(401);
    expect(fixture.authorized).not.toHaveBeenCalled();
    expect(fixture.search).not.toHaveBeenCalled();
  });
  it("rejects stale versions, altered or uncaptured wording, missing and flagged passages before lookup", async () => {
    expect((await request({ version: 6 })).status).toBe(409);
    for (const input of [{ wording: wording.replace("إنما", "إنَّما") }, { wording: "Words not captured in this lesson" }, { segmentId: "foreign-passage" }]) {
      const response = await request(input);
      expect(response.status).toBe(400);
      expect((await response.json()).error).toContain("actually captured");
    }
    const flagged = lesson(); flagged.segments[0].flags = ["asr_disagreement"];
    fixture.authorized.mockResolvedValue(flagged);
    expect((await request()).status).toBe(400);
    expect(fixture.search).not.toHaveBeenCalled();
    expect(fixture.budget).not.toHaveBeenCalled();
  });
  it("preserves source-budget rate limits without calling the provider", async () => {
    fixture.budget.mockResolvedValue(false);
    const response = await request();
    expect(response.status).toBe(429);
    expect((await response.json()).error).toContain("wait");
    expect(fixture.search).not.toHaveBeenCalled();
  });
  it("rejects malformed lookup inputs before provider or budget access", async () => {
    for (const input of [{ wording: "too short" }, { wording: "a".repeat(401) }, { language: "fr" }, { version: 7.5 }]) expect((await request(input)).status).toBe(400);
    expect(fixture.budget).not.toHaveBeenCalled();
    expect(fixture.search).not.toHaveBeenCalled();
  });
  it("uses the authorized captured PDF page rather than an audio passage or saved summary", async () => {
    const pdf = { ...lesson(), sourceKind: "pdf" as const, segments: [], pdfPages: [{ id: "page-1", page: 1, text: wording, flags: [] }] };
    fixture.authorized.mockResolvedValue(pdf);
    expect((await request({ segmentId: "page-1" })).status).toBe(200);
    expect(fixture.search).toHaveBeenCalledExactlyOnceWith(wording, "ar");
    fixture.search.mockClear();
    expect((await request()).status).toBe(400);
    expect(fixture.search).not.toHaveBeenCalled();
  });
  it("distinguishes an unavailable provider from a genuine no-match result", async () => {
    fixture.search.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("private upstream details"));
    const noMatch = await request(), unavailable = await request();
    expect(noMatch.status).toBe(200); expect(unavailable.status).toBe(200);
    expect(await noMatch.json()).toMatchObject({ status: "no_match", candidates: [] });
    const failure = await unavailable.json();
    expect(failure).toMatchObject({ status: "unavailable", candidates: [] });
    expect(failure.message).toContain("does not mean the narration does not exist");
    expect(JSON.stringify(failure)).not.toContain("private upstream details");
  });
  it.each(["revoked", "changed"] as const)("withholds successful asynchronous matches when access is %s during lookup", async (condition) => {
    let resolve!: (candidates: Candidate[]) => void;
    fixture.search.mockImplementation(() => new Promise<Candidate[]>(done => { resolve = done; }));
    const pending = request();
    await vi.waitFor(() => expect(fixture.search).toHaveBeenCalledTimes(1));
    fixture.authorized.mockResolvedValue(condition === "revoked" ? null : { ...lesson(), version: 8 });
    resolve([candidate]);
    const response = await pending;
    expect(response.status).toBe(condition === "revoked" ? 404 : 409);
    const result = await response.json();
    expect(result.error).toContain(condition === "revoked" ? "access ended" : "lesson changed");
    expect(result).not.toHaveProperty("candidates");
  });
});
