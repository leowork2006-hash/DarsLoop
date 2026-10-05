import type { Artifacts, Segment } from "./types";

export const studyMaterialLanguages=["auto","ar","ur","en"] as const;
export type StudyMaterialLanguage=typeof studyMaterialLanguages[number];
export type PreparedMaterialLanguage=Exclude<StudyMaterialLanguage,"auto">;
export const studyMaterialLanguageLabels:Record<StudyMaterialLanguage,string>={auto:"Auto · follow the lesson",ar:"Arabic · العربية",ur:"Urdu · اردو",en:"English"};

const count=(text:string,pattern:RegExp)=>Array.from(text.matchAll(pattern)).length;
const urduMarkers=/[ٹڈڑںےہھگچپژ]/u;
const urduWords=/(?:^|\s)(?:اور|کی|کے|کا|ہے|ہیں|کو|میں|سے|یہ|وہ|نہیں|ایک)(?=\s|[۔،.!?]|$)/u;
const romanUrdu=/(?:^|\s)(?:hai|hain|mein|nahi|nahin|aap|hum|yeh|woh|karein|karen|samajh|ustad)(?=\s|[,.!?]|$)/giu;

// A bounded script/word heuristic for the captured main explanation. Explicit
// selection is available when code-switching/transliteration makes Auto wrong.
// No transcript text is changed and no extra provider request is made.
export function capturedMaterialLanguage(segments:Pick<Segment,"text">[]):PreparedMaterialLanguage {
  const scores={ar:0,ur:0,en:0};
  for(const {text} of segments){
    const arabic=count(text,/\p{Script=Arabic}/gu),latin=count(text,/\p{Script=Latin}/gu);
    if(arabic)scores[urduMarkers.test(text)||urduWords.test(text)?"ur":"ar"]+=arabic;
    if(latin)scores[count(text,romanUrdu)>=3?"ur":"en"]+=latin;
  }
  // A tie retains the source script ahead of the English instruction language.
  return scores.ur>=scores.ar&&scores.ur>=scores.en&&scores.ur>0?"ur":scores.ar>=scores.en&&scores.ar>0?"ar":"en";
}

export function resolveMaterialLanguage(language:StudyMaterialLanguage|undefined,segments:Pick<Segment,"text">[]):PreparedMaterialLanguage {
  return !language||language==="auto"?capturedMaterialLanguage(segments):language;
}

export function studyMaterialInstruction(language:PreparedMaterialLanguage):string {
  const name=language==="ar"?"Arabic":language==="ur"?"Urdu":"English";
  return `Write all generated note headings, note explanations, overview, glossary definitions, quiz questions, quiz answers, choices and flashcard questions/answers in ${name}. ${language==="ur"?"Use readable Urdu script for Urdu explanations, not English or Roman Urdu. ":""}Keep teacher-defined term names in their captured form. Preserve every evidence quote exactly in its original captured wording, script and language; never translate or transliterate a citation. Translation applies only to generated explanations, never to transcript text, sacred quotations or evidence. Preserve meaning, negation, conditions, exceptions and disagreement across languages. Do not add outside explanations to make a translation easier. These instructions are in English for the system; they do not select English as the student language.`;
}

export function languageAuditInstruction(language:PreparedMaterialLanguage):string {
  return ` The generated explanations are requested in ${language==="ar"?"Arabic":language==="ur"?"Urdu":"English"}. Compare meaning across languages with the original captured passages. Evidence quotations must remain literal original text. Reject explanations that translate away negation, qualifications, uncertainty or disagreement, add interpretation, or use a different explanation language. Check headings, questions, answers and each supplied quiz choice for that language; set lessonScopeOnly=false if any use a different language. Quiz choices are labelled alternatives, not all true claims. Term names may retain the captured form.`;
}

// Detect the failure this setting fixes: overwhelmingly English explanations
// returned for an Arabic/Urdu selection (or the reverse). This is a script
// sanity check, not a native-language or translation-quality guarantee.
export function textScriptCounts(text:string) {return {arabic:count(text,/\p{Script=Arabic}/gu),latin:count(text,/\p{Script=Latin}/gu)};}
export function textUsesRequestedScript(text:string,language:PreparedMaterialLanguage):boolean {
  const {arabic,latin}=textScriptCounts(text);
  // A numeric answer has no explanation-language script to reject.
  if(!arabic&&!latin)return true;
  return language==="en"?latin>=arabic:arabic>0&&arabic>=latin;
}
export function materialUsesRequestedScript(material:Artifacts,language:PreparedMaterialLanguage):boolean {
  const filtered=filterMaterialLanguage(material,language);
  return filtered.notes.length===material.notes.length&&filtered.terms.length===material.terms.length&&filtered.practice.length===material.practice.length;
}

// Keep complete items only. A wrong-language distractor withholds its whole
// quiz, never removes a choice or alters the correct answer/evidence.
// Source quotations and captured term names are deliberately not translated.
export function filterMaterialLanguage(material:Artifacts,language:PreparedMaterialLanguage):Artifacts {
  const uses=(text:string)=>textUsesRequestedScript(text,language);
  const notes=material.notes.filter(note=>uses(note.heading)&&uses(note.text));
  const terms=material.terms.filter(term=>uses(term.definition));
  const practice=material.practice.filter(item=>[item.question,item.answer,...item.choices].every(uses));
  return {...material,overview:notes.slice(0,3).map(note=>note.text).join(" "),notes,terms,practice};
}

export function supportedNoteCardQuestion(heading:string,language:PreparedMaterialLanguage,source:"audio"|"pdf"="audio"):string {
  if(source==="pdf")return language==="ar"?`كيف شرح المصدر «${heading}»؟`:language==="ur"?`ماخذ میں «${heading}» کی وضاحت کیسے کی گئی ہے؟`:`How does the source explain “${heading}”?`;
  return language==="ar"?`كيف شرح المعلم «${heading}»؟`:language==="ur"?`استاد نے «${heading}» کی وضاحت کیسے کی؟`:`How did the teacher explain “${heading}”?`;
}
