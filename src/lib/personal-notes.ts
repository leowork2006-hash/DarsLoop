import { z } from "zod";
import type { Lesson } from "./types";

export const PERSONAL_NOTES_LIMIT=20_000;
export const noteViewSchema=z.enum(["summary","points","detailed"]);
export type NoteView=z.infer<typeof noteViewSchema>;
export const personalNotesInputSchema=z.strictObject({
  version:z.number().int().positive().max(2_147_483_647),
  revision:z.number().int().min(0).max(2_147_483_646),
  text:z.string().max(PERSONAL_NOTES_LIMIT),
  view:noteViewSchema,
});
export type PersonalNotesInput=z.infer<typeof personalNotesInputSchema>;
export type PersonalNotes={version:number;revision:number;text:string;view:NoteView;updatedAt:string};

export class PersonalNotesError extends Error {
  constructor(public reason:"access"|"version"|"conflict") {
    super(reason==="access"?"Lesson not found.":reason==="version"?"This lesson changed. Reopen it before editing your notes.":"Your notes were saved elsewhere. Reload the saved version before saving again.");
  }
}

export function initialNoteView(lesson:Pick<Lesson,"noteOptions">):NoteView {
  return lesson.noteOptions?.detail==="short"?"summary":lesson.noteOptions?.detail==="detailed"?"detailed":"points";
}

// An editable starting point contains generated explanations only. Teacher
// quotations, citations and audio remain in the captured class material.
export function editableClassNotes(lesson:Pick<Lesson,"artifacts"|"noteOptions">):string {
  if(lesson.noteOptions?.enabled===false)return "";
  const text=(lesson.artifacts?.notes||[]).map(note=>`${note.heading}\n${note.text}`).join("\n\n");
  // Never cut a qualification mid-sentence to fit the editor.
  return text.length<=PERSONAL_NOTES_LIMIT?text:"";
}
