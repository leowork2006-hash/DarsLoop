import { z } from "zod";
import { availablePractice } from "./insights";
import { instructionLike, needsPersonalReferral } from "./evidence";
import type { Lesson, PracticeItem } from "./types";

export const ROUND_QUESTION_LIMIT=10;
export const aliasSchema=z.string().trim().min(2).max(30)
  .regex(/^[\p{L}\p{N}][\p{L}\p{N} _.-]*$/u,"Use a nickname with letters, numbers and spaces.")
  .refine(value=>!/@|\d{7}/u.test(value),"Use a nickname without contact details.");
const id=z.string().uuid();
export const challengeActionSchema=z.discriminatedUnion("action",[
  z.strictObject({action:z.literal("create"),groupId:id,lessonId:id}),
  z.strictObject({action:z.literal("join"),roundId:id,alias:aliasSchema,consent:z.literal(true)}),
  z.strictObject({action:z.literal("withdraw"),roundId:id}),
  z.strictObject({action:z.literal("submit"),roundId:id,choices:z.array(z.number().int().min(0).max(3)).min(1).max(ROUND_QUESTION_LIMIT)}),
]);
export type ChallengeAction=z.infer<typeof challengeActionSchema>;
export type RoundQuestion=Pick<PracticeItem,"id"|"question"|"choices">;
export type RoundSummary={id:string;groupId:string;lessonId:string;lessonTitle:string;version:number;materialRevision:number;questionCount:number;createdAt:string;joined:boolean;submitted:boolean};
export type RoundDetail=RoundSummary & {
  alias?:string;questions?:RoundQuestion[];
  result?:{correct:number;total:number;choices:number[];items:PracticeItem[]};
  participants?:{alias:string;correct:number;total:number}[];
};
export type RoundSnapshot={version:number;materialRevision:number;sourceKind:"audio"|"pdf";segments:Lesson["segments"];pdfPages:NonNullable<Lesson["pdfPages"]>;artifacts:Lesson["artifacts"]};
export type StoredRound={id:string;groupId:string;lessonId:string;lessonTitle:string;version:number;materialRevision:number;createdAt:string;snapshot:RoundSnapshot;items:PracticeItem[]};
export type StoredParticipant={alias:string|null;choices:number[]|null;correct:number|null};
export class ChallengeError extends Error {
  constructor(public reason:"access"|"changed"|"owner"|"empty"|"optin"|"answers"|"submitted"|"alias"|"limit") {
    super({access:"This quiz round is no longer available.",changed:"The lesson changed. Ask the class owner to create a new round.",owner:"Only the class owner can create a round.",empty:"This shared lesson has no supported multiple-choice questions yet.",optin:"Join this round before opening its questions or scores.",answers:"Answer each question with one of its choices.",submitted:"Your first attempt is already saved. It cannot be replaced.",alias:"That nickname is already in this round. Choose another.",limit:"This class already has 20 open rounds. Use an existing round."}[reason]);
  }
}
export function challengeQuestions(lesson:Lesson) {
  const judgment=/\b(?:halal|haram|fatwa|sahih|saheeh|hasan|da[‘'’]?if|authenticity|hadith grad(?:e|ing)|religious (?:rank|status)|valid (?:prayer|fast|marriage|divorce))\b|حلال|حرام|فتوى|فتوی|صحيح|ضعيف|صحیح|ضعیف|درجہ ایمان/iu;
  return lesson.demo?[]:availablePractice(lesson).filter(item=>item.kind==="quiz"&&!needsPersonalReferral(item.question)
    &&!judgment.test(`${item.question} ${item.answer}`)&&!instructionLike([item.question,item.answer,...item.choices].join(" "))).slice(0,ROUND_QUESTION_LIMIT);
}
export function roundSnapshot(lesson:Lesson):RoundSnapshot {
  return {version:lesson.version,materialRevision:lesson.materialRevision??0,sourceKind:lesson.sourceKind??"audio",segments:lesson.segments,pdfPages:lesson.pdfPages??[],artifacts:lesson.artifacts};
}
function stable(value:unknown):string {
  if(Array.isArray(value))return `[${value.map(stable).join(",")}]`;
  if(value&&typeof value==="object")return `{${Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>`${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
}
export function roundMatches(round:StoredRound,lesson:Lesson) {
  return !lesson.demo&&(lesson.status==="ready"||!!lesson.materialPreparation)&&stable(round.snapshot)===stable(roundSnapshot(lesson));
}
export function scoreRound(items:PracticeItem[],choices:number[]) {
  if(choices.length!==items.length||choices.some((choice,index)=>!Number.isInteger(choice)||choice<0||choice>=items[index].choices.length))throw new ChallengeError("answers");
  return items.filter((item,index)=>item.choices[choices[index]]===item.answer).length;
}
export function roundSummary(round:StoredRound,participant?:StoredParticipant):RoundSummary {
  return {id:round.id,groupId:round.groupId,lessonId:round.lessonId,lessonTitle:round.lessonTitle,version:round.version,materialRevision:round.materialRevision,questionCount:round.items.length,createdAt:round.createdAt,joined:!!participant?.alias,submitted:participant?.choices!==null&&participant?.choices!==undefined};
}
export function roundDetail(round:StoredRound,participant:StoredParticipant|undefined,participants:{alias:string;correct:number;total:number}[]):RoundDetail {
  const summary=roundSummary(round,participant);
  // A participant's user ID, contact details and private reviews never enter this projection.
  if(!participant?.alias)return summary;
  return {...summary,alias:participant.alias,questions:round.items.map(({id,question,choices})=>({id,question,choices})),participants,
    ...(participant.choices?{result:{correct:participant.correct!,total:round.items.length,choices:participant.choices,items:round.items}}:{})};
}
