import { z } from "zod";
import type { StudyNoteOptions } from "./types";
import { studyMaterialLanguages } from "./study-material-language";

export const studyNoteOptionsSchema=z.strictObject({enabled:z.boolean(),detail:z.enum(["short","standard","detailed"]),language:z.enum(studyMaterialLanguages).default("auto")});
export const DEFAULT_NOTE_OPTIONS:StudyNoteOptions={enabled:true,detail:"standard",language:"auto"};

export function resolveNoteOptions(options?:StudyNoteOptions):StudyNoteOptions {
  return studyNoteOptionsSchema.parse(options??DEFAULT_NOTE_OPTIONS);
}

export function parseNoteOptions(form:Pick<FormData,"getAll">):StudyNoteOptions {
  const enabled=form.getAll("notesEnabled"),detail=form.getAll("noteDetail"),language=form.getAll("studyLanguage");
  if(enabled.length>1||detail.length>1||language.length>1||enabled.length&&enabled[0]!=="true"&&enabled[0]!=="false"||detail.length&&!["short","standard","detailed"].includes(detail[0] as string)||language.length&&!studyMaterialLanguages.includes(language[0] as typeof studyMaterialLanguages[number]))throw new Error("Choose a valid note option.");
  return studyNoteOptionsSchema.parse({enabled:enabled.length?enabled[0]==="true":true,detail:detail.length?detail[0]:"standard",language:language.length?language[0]:"auto"});
}

export const NOTE_DETAIL_LIMITS={
  short:{maxNotes:6,maxText:500,instruction:"Write a short recap of the main taught points. Combine related points only when their conditions remain clear."},
  standard:{maxNotes:16,maxText:1000,instruction:"Write organized notes for the distinct taught topics. Include key explanations, source-supported examples, steps and qualifications throughout this section."},
  detailed:{maxNotes:40,maxText:1800,instruction:"Write detailed section-by-section notes. Preserve distinct taught explanations, examples, steps, conditions, exceptions and disagreements throughout the supplied section. A broad overview must not replace the separate explanations."},
} as const;
