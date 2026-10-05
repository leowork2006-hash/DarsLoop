"use client";
import {languageLabels,spokenLanguages,type SpokenLanguage} from "@/lib/spoken-language";
export function SpokenLanguageField({value,onChange,disabled=false}:{value:SpokenLanguage;onChange:(value:SpokenLanguage)=>void;disabled?:boolean}) {
 return <label className="field">Main spoken language<select value={value} onChange={e=>onChange(e.target.value as SpokenLanguage)} disabled={disabled}>{spokenLanguages.map(language=><option key={language} value={language}>{languageLabels[language]}</option>)}</select><small className="muted">Choose the language used most in class. Other spoken words may appear in their original script or as transliteration.</small></label>;
}
