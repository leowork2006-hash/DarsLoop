import { z } from "zod";
import type { StudyNoteOptions } from "./types";

export const studyNoteOptionsSchema=z.strictObject({enabled:z.boolean(),detail:z.enum(["short","standard","detailed"])});
export const DEFAULT_NOTE_OPTIONS:StudyNoteOptions={enabled:true,detail:"standard"};

export function resolveNoteOptions(options?:StudyNoteOptions):StudyNoteOptions {
  return studyNoteOptionsSchema.parse(options??DEFAULT_NOTE_OPTIONS);
}

export function parseNoteOptions(form:Pick<FormData,"getAll">):StudyNoteOptions {
  const enabled=form.getAll("notesEnabled"),detail=form.getAll("noteDetail");
  if(enabled.length>1||detail.length>1||enabled.length&&enabled[0]!=="true"&&enabled[0]!=="false"||detail.length&&!["short","standard","detailed"].includes(detail[0] as string))throw new Error("Choose a valid note option.");
  return {enabled:enabled.length?enabled[0]==="true":true,detail:detail.length?detail[0] as StudyNoteOptions["detail"]:"standard"};
}

export const NOTE_DETAIL_LIMITS={
  short:{maxNotes:6,maxText:500,instruction:"Write a short recap of the main points: at most 6 notes, each at most 500 characters. Combine related points only when their conditions remain clear."},
  standard:{maxNotes:16,maxText:1000,instruction:"Write organized notes for the main topics: at most 16 notes, each at most 1000 characters. Include the teacher's key explanations and qualifications."},
  detailed:{maxNotes:40,maxText:1800,instruction:"Write detailed section-by-section notes: at most 40 notes, each at most 1800 characters. Retain separately taught steps, examples, conditions and exceptions only where the transcript supports them."},
} as const;
