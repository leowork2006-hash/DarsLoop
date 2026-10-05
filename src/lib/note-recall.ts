import { createHash } from "node:crypto";
import { evidenceValid, normalise, safePractice } from "./evidence";
import { capturedMaterialLanguage, supportedNoteCardQuestion } from "./study-material-language";
import type { Artifacts, StudyPassage } from "./types";

// Reuse a complete, already accepted explanation. This adds no claim, truncates
// no qualification, and never turns a rejected source passage into practice.
export function noteRecallCards(artifacts: Artifacts, passages: StudyPassage[], revision = 0): Artifacts {
  const practice = [...artifacts.practice], ids = new Set(practice.map(p => p.id));
  const answers = new Set(practice.filter(p => p.kind === "flashcard").map(p => normalise(p.answer)));
  const language = artifacts.language || capturedMaterialLanguage(artifacts.notes);
  const source = passages.some(p => "page" in p) ? "pdf" : "audio";
  const candidates = artifacts.notes.flatMap(note => {
    const answer = normalise(note.text);
    if (!note.text.trim() || note.text.length > 1200 || answers.has(answer) || !evidenceValid(note.evidence, passages)) return [];
    answers.add(answer);
    const digest = createHash("sha256").update(JSON.stringify([note.heading, note.text, note.evidence])).digest("hex").slice(0, 24);
    const id = `note-recall-${revision}-${digest}`;
    if (ids.has(id)) return [];
    ids.add(id);
    return safePractice({ ...artifacts, practice: [{ id, kind: "flashcard", question: supportedNoteCardQuestion(note.heading, language, source), answer: note.text, choices: [], evidence: note.evidence }] });
  });
  const room = Math.max(0, 40 - practice.length);
  // If the inventory is full, distribute remaining slots through the lesson,
  // instead of silently dropping all the last topics.
  const selected = candidates.length <= room ? candidates : room === 1 ? [candidates[0]] : Array.from({ length: room }, (_, i) => candidates[Math.round(i * (candidates.length - 1) / (room - 1))]);
  return { ...artifacts, practice: [...practice, ...selected] };
}
