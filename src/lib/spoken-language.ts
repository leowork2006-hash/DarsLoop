export const spokenLanguages = ["auto", "ur", "ar", "en"] as const;
export type SpokenLanguage = typeof spokenLanguages[number];
export const languageLabels:Record<SpokenLanguage,string>={auto:"Detect automatically",ur:"Urdu · اردو",ar:"Arabic · العربية",en:"English"};
export function readSpokenLanguage(value:unknown):SpokenLanguage {
  if(value===undefined||value===null||value==="")return "auto";
  if(typeof value==="string"&&spokenLanguages.includes(value as SpokenLanguage))return value as SpokenLanguage;
  throw new Error("Choose a supported spoken language.");
}
