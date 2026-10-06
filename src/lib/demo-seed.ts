import { createHash } from "node:crypto";
import legacySegments from "../../fixtures/demo-timing.json";
import { demoArtifacts, demoCourse, demoScript, demoTitle } from "./demo";
import type { Lesson, Segment } from "./types";

// This is an example preference, never an authorization or entitlement marker.
export const DEMO_SEED_REVISION = 2;
export function needsDemoSeed(metadata: Record<string, unknown> | undefined): boolean {
  const revision = metadata?.darsloop_example_revision;
  return typeof revision !== "number" || !Number.isInteger(revision) || revision < DEMO_SEED_REVISION;
}
export function cloudDemoId(owner: string): string {
  const h = createHash("sha256").update(`darsloop-demo:${owner}`).digest("hex");
  return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;
}
export function validatedDemoSegments(input: unknown): Segment[] {
  if (!Array.isArray(input) || input.length !== demoScript.length || input.some((s, i) =>
    !s || s.text !== demoScript[i] || s.id !== `example-${i + 1}` ||
    !Number.isFinite(s.start) || !Number.isFinite(s.end) || s.start < 0 || s.end <= s.start ||
    !Array.isArray(s.flags) || s.flags.length !== 0
  )) throw new Error("Example audio manifest does not match the script.");
  return input as Segment[];
}
function fixtureAudio(audioPath: string, filename: string): boolean {
  return audioPath === `fixtures/${filename}` || audioPath.endsWith(`/fixtures/${filename}`);
}
function matchesScript(segments: Segment[], script: readonly string[]): boolean {
  return segments.length === script.length && segments.every((s, i) =>
    s.id === `example-${i + 1}` && s.text === script[i] && s.flags.length === 0 &&
    Number.isFinite(s.start) && Number.isFinite(s.end) && s.start >= 0 && s.end > s.start
  );
}
export function systemDemoFixture(lesson: Lesson, owner: string): "legacy" | "current" | null {
  if (lesson.ownerId !== owner || lesson.demo !== true || lesson.shared || lesson.sourceKind === "pdf" ||
    lesson.sourceImport || lesson.mime !== "audio/mpeg" || !Number.isInteger(lesson.version) || lesson.version < 1)
    return null;
  if (lesson.title === `Demo lesson · ${demoTitle}` && lesson.course === demoCourse &&
    fixtureAudio(lesson.audioPath, "demo-five-pillars.mp3") && matchesScript(lesson.segments, demoScript))
    return "current";
  const legacyTitle = lesson.title === "Listening, catch-up & revision" || lesson.title === "Demo lesson · Listening, catch-up & revision";
  if (legacyTitle && lesson.course === "Adab of learning" &&
    fixtureAudio(lesson.audioPath, "demo.mp3") && matchesScript(lesson.segments, legacySegments.map(s => s.text)))
    return "legacy";
  return null;
}
export function currentSeedDemo(owner: string, id: string, segments: Segment[], audioPath: string, previous?: Lesson): Lesson {
  return {
    id, ownerId: owner, title: `Demo lesson · ${demoTitle}`, course: demoCourse,
    createdAt: previous?.createdAt ?? new Date().toISOString(), duration: segments.at(-1)!.end,
    // Old attempts and shares must never attach to different source content.
    version: previous ? previous.version + 1 : 1, status: "ready", stage: "Prepared example", error: null,
    demo: true, segments, artifacts: demoArtifacts(segments), audioPath, mime: "audio/mpeg"
  };
}
