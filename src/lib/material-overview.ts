import type { Note } from "./types";

// A short overview contains complete already-supported explanations only. Never
// cut a negation/qualification midway through a note to satisfy the output cap.
export function supportedOverview(notes: Pick<Note, "text">[]) {
  const parts: string[] = [];
  for (const note of notes) {
    if (parts.length === 3) break;
    if ([...parts, note.text].join(" ").length <= 1500) parts.push(note.text);
  }
  return parts.join(" ");
}
