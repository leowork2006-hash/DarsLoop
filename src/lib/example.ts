import { readFileSync } from "node:fs";
import path from "node:path";
import { demoArtifacts, demoScript, demoTitle, demoCourse } from "./demo";
import type { Lesson, Segment } from "./types";

// Only this authored fixture is public. No account, lesson ID or storage path is accepted.
export function exampleLesson(): Lesson {
  const segments: Segment[] = JSON.parse(readFileSync(path.join(process.cwd(), "fixtures/demo-five-pillars-timing.json"), "utf8"));
  if (segments.length !== demoScript.length || segments.some((s, i) => s.text !== demoScript[i] || !Number.isFinite(s.start) || !Number.isFinite(s.end) || s.start < 0 || s.end <= s.start)) {
    throw new Error("The fictional example does not match its audio manifest.");
  }
  return {
    id: "fictional-example", ownerId: "", title: demoTitle, course: demoCourse,
    createdAt: "2026-10-04T00:00:00.000Z", duration: segments.at(-1)!.end, version: 1,
    status: "ready", stage: "Prepared example", error: null, demo: true,
    segments, artifacts: demoArtifacts(segments), audioPath: "fixtures/demo-five-pillars.mp3", mime: "audio/mpeg",
  };
}
