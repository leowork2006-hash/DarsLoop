"use client";
import { studyMaterialLanguages,studyMaterialLanguageLabels,type StudyMaterialLanguage } from "@/lib/study-material-language";

export function StudyMaterialLanguageField({value,onChange,disabled=false}:{value:StudyMaterialLanguage;onChange:(value:StudyMaterialLanguage)=>void;disabled?:boolean}) {
  return <label className="field">Study material language<select value={value} onChange={event=>onChange(event.target.value as StudyMaterialLanguage)} disabled={disabled}>{studyMaterialLanguages.map(language=><option key={language} value={language}>{studyMaterialLanguageLabels[language]}</option>)}</select><small className="muted">For notes, questions, flashcards and explanations. Auto follows the captured lesson; source quotations keep their original words.</small></label>;
}
