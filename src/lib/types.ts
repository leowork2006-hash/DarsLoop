import type { OnboardingPreference } from "./onboarding";
import type { SpokenLanguage } from "./spoken-language";
export type Segment = {id:string; start:number; end:number; text:string; flags:string[];words?:{start:number;end:number;text:string;language?:string;confidence?:number}[]};
export type Citation = {segmentId:string; quote:string};
export type Note = {heading:string; text:string; evidence:Citation[]};
export type Term = {term:string; definition:string; evidence:Citation[]};
export type PracticeItem = {id:string; kind:"quiz"|"flashcard"; question:string; answer:string; choices:string[]; evidence:Citation[]};
export type Artifacts = {warnings?:string[];overview:string; notes:Note[]; terms:Term[]; practice:PracticeItem[]};
export type StudyNoteOptions = {enabled:boolean; detail:"short"|"standard"|"detailed"};
export type SourceImport = {bytes:number;parts:number};
export type Lesson = {id:string; ownerId:string; title:string; course:string; createdAt:string; duration:number; version:number; status:"queued"|"processing"|"ready"|"failed"; stage:string; error:string|null; demo:boolean; segments:Segment[]; artifacts:Artifacts|null; audioPath:string; mime:string; noteOptions?:StudyNoteOptions; spokenLanguage?:SpokenLanguage; sourceImport?:SourceImport; importedMedia?:{source:"audio"|"video";preparation:"extracted"|"compressed"|"repackaged"}; shared?:boolean;nextAttemptAt?:string;quotaDeferrals?:number;transcriptionProvider?:"groq"|"deepgram"|"speechmatics"; processedChunks?:number; transcriptionComplete?:boolean; providers?:{asr:string;generation:string;policy:string;checker?:string;provider?:"groq"|"deepgram"|"speechmatics";checkMode?:"dual-pass"|"single-pass"}};
export type Answer = {status:"answered"|"partial"|"not_covered"|"unclear_audio"|"needs_teacher"|"temporarily_unavailable"; blocks:{text:string;evidence:Citation[]}[]; message:string; mode:"ai"|"excerpt"; version:number;retrieval?:"whole_lesson"|"hybrid"|"lexical_fallback"|"note_anchor"};
export type Candidate = {id:string; title:string; url:string; text:string; language:string; grade:string; gradePublisher:string; collectionAttribution:string; retrievedAt:string; matchBasis:"wording"; recordHash:string};
export type ReviewActivity = {day:string; attempts:number};
export type Review = {itemId:string; lessonId:string; version:number; dueAt:string; intervalDays:number; attempts:number; lastResult:boolean; activity?:ReviewActivity[]};
export type ClassGroup = {id:string;name:string;owner:boolean;memberCount:number;lessons:Pick<Lesson,"id"|"title"|"course"|"demo">[]};
export type Workspace = {lessons:Lesson[]; reviews:Review[]; groups:ClassGroup[]; configured:{asr:boolean;generation:boolean}; userId:string;accountMode?:"local"|"supabase";onboarding?:OnboardingPreference};
export function formatTime(seconds:number) { const t=Math.max(0,Math.floor(seconds)); return `${Math.floor(t/60)}:${String(t%60).padStart(2,"0")}`; }
