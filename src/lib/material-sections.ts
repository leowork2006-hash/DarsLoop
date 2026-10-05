import { instructionLike } from "./evidence";
import { NOTE_DETAIL_LIMITS, resolveNoteOptions } from "./note-options";
import { isPdfPage, sourcePassages, validSourcePassage } from "./source-passages";
import type { Artifacts, Lesson, PracticeItem, StudyNoteOptions, StudyPassage } from "./types";
import { supportedOverview } from "./material-overview";

// Separate from the original ASR guard policy: a material change never invalidates
// the literal transcript checkpoint or asks for another transcription.
export const MATERIAL_GENERATION_REVISION = "section-fidelity-v1";
export const MATERIAL_SECTION_LIMITS = { seconds: 600, characters: 20_000, sections: 24 } as const;
export type MaterialSection = { index: number; passages: StudyPassage[]; clear: StudyPassage[]; context: StudyPassage[] };
export type MaterialQuota = { notes: number; terms: number; practice: number };

export function materialSections(passages: StudyPassage[]): MaterialSection[] {
  if (!passages.length || passages.some(p => !validSourcePassage(p)) || new Set(passages.map(p => p.id)).size !== passages.length || passages.some(p => isPdfPage(p) !== isPdfPage(passages[0]))) throw new Error("Invalid source sections");
  const ordered = [...passages].sort((a, b) => isPdfPage(a) && isPdfPage(b) ? a.page - b.page : !isPdfPage(a) && !isPdfPage(b) ? a.start - b.start : 0);
  const groups: StudyPassage[][] = []; let current: StudyPassage[] = [], size = 0;
  const flush = () => { if (current.length) groups.push(current); current = []; size = 0; };
  for (const passage of ordered) {
    const cost = JSON.stringify({ id: passage.id, text: passage.text, ...(isPdfPage(passage) ? { page: passage.page } : {}), ...(passage.flags.length ? { qualityFlags: passage.flags } : {}) }).length;
    if (cost > MATERIAL_SECTION_LIMITS.characters) throw new Error("A source passage needs a smaller processing section");
    const timeFull = current.length && !isPdfPage(passage) && !isPdfPage(current[0]) && passage.end - current[0].start > MATERIAL_SECTION_LIMITS.seconds;
    if (current.length && (size + cost > MATERIAL_SECTION_LIMITS.characters || timeFull)) flush();
    current.push(passage); size += cost;
  }
  flush();
  if (groups.length > MATERIAL_SECTION_LIMITS.sections) throw new Error("This source needs more bounded processing sections");
  const eligible=(p:StudyPassage)=>!p.flags.length&&!instructionLike(p.text);
  return groups.map((passages, index) => {
    const first=ordered.indexOf(passages[0]),last=ordered.indexOf(passages.at(-1)!);
    // Two neighboring source passages on each side preserve immediate conditions
    // at a section boundary. Each original passage is ≤20k characters, making the
    // complete context ≤100k; assigned core sections remain ≤20k and exclusive.
    return {index,passages,clear:passages.filter(eligible),context:ordered.slice(Math.max(0,first-2),Math.min(ordered.length,last+3)).filter(eligible)};
  });
}

// Caps are distributed across the entire chronology, including the tail. A cap
// is not a requested count and unused quota is never filled with extra facts.
export function materialQuotas(sections: MaterialSection[], options: StudyNoteOptions): MaterialQuota[] {
  const eligible = sections.filter(s => s.clear.length), count = eligible.length, limits = NOTE_DETAIL_LIMITS[options.detail];
  const part = (total: number, index: number) => Math.floor((index + 1) * total / count) - Math.floor(index * total / count);
  return sections.map(section => {
    const index = eligible.indexOf(section);
    return index < 0 ? { notes: 0, terms: 0, practice: 0 } : { notes: options.enabled ? part(limits.maxNotes, index) : 0, terms: part(30, index), practice: part(40, index) };
  });
}

export function materialCounts(artifacts: Pick<Artifacts, "notes" | "terms" | "practice">) {
  return { notes: artifacts.notes.length, terms: artifacts.terms.length, quizzes: artifacts.practice.filter(p => p.kind === "quiz").length, cards: artifacts.practice.filter(p => p.kind === "flashcard").length };
}

export function mergeSectionMaterial(material: Artifacts[]): Artifacts {
  const notes: Artifacts["notes"] = [], terms: Artifacts["terms"] = [], practice: PracticeItem[] = [];
  const merge = <T extends { evidence: Artifacts["notes"][number]["evidence"] }>(items: T[], item: T, equal: (a: T, b: T) => boolean) => {
    const previous = items.find(other => equal(other, item));
    if (!previous) { items.push({ ...item, evidence: [...item.evidence] }); return; }
    for (const citation of item.evidence) if (previous.evidence.length < 6 && !previous.evidence.some(c => c.segmentId === citation.segmentId && c.quote === citation.quote)) previous.evidence.push(citation);
  };
  material.forEach((section, index) => {
    section.notes.forEach(note => merge(notes, note, (a, b) => a.heading === b.heading && a.text === b.text));
    section.terms.forEach(term => merge(terms, term, (a, b) => a.term === b.term && a.definition === b.definition));
    section.practice.forEach((item, itemIndex) => merge(practice, { ...item, id: `section-${index + 1}-item-${itemIndex + 1}` }, (a, b) => a.kind === b.kind && a.question === b.question && a.answer === b.answer && JSON.stringify(a.choices) === JSON.stringify(b.choices)));
  });
  return { overview: supportedOverview(notes), notes, terms, practice };
}

export function revisionPractice(artifacts: Artifacts, revision: number): Artifacts {
  if (!Number.isSafeInteger(revision) || revision < 1) throw new Error("Invalid material revision");
  return { ...artifacts, practice: artifacts.practice.map((item, index) => ({ ...item, id: `material-${revision}-item-${index + 1}` })) };
}

export function detailedPrepared(lesson: Lesson) {
  return lesson.noteOptions?.enabled !== false && !!lesson.artifacts?.notes.length && lesson.artifacts.preparation?.revision === MATERIAL_GENERATION_REVISION && lesson.artifacts.preparation.detail === "detailed";
}

export function sourceReadyForMaterial(lesson: Lesson) {
  const complete = lesson.sourceKind === "pdf" || lesson.transcriptionComplete === true || lesson.status === "ready" || lesson.materialPreparation?.kind === "detailed";
  return complete && sourcePassages(lesson).some(p => validSourcePassage(p) && !p.flags.length && !instructionLike(p.text));
}

export function detailedOptions(lesson: Lesson): StudyNoteOptions {
  return { ...resolveNoteOptions(lesson.noteOptions), enabled: true, detail: "detailed" };
}
