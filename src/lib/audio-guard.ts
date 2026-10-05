import { normalise } from "./evidence";
import type { Segment } from "./types";
type Speech={start:number;end:number;text:string};
const critical=new Set(["not","unless","except","never","only","لا","ليس","الا","نہیں","مگر","صرف"]);
function importantWords(text:string){return normalise(text).split(/\s+/).filter(w=>critical.has(w)||/^\d+$/.test(w)).sort();}
function namedTerms(text:string){return [...text.matchAll(/\b(?:word|term|called)\s+["“']?([\p{L}\p{M}-]+)/giu)].map(m=>normalise(m[1])).sort();}
export function compareTranscriptions(primary:Segment[],secondary:Speech[],offset:number) {
  return primary.map(p=>{
    const heard=secondary.filter(s=>{const midpoint=offset+(s.start+s.end)/2;return midpoint>=p.start-.25&&midpoint<=p.end+.25;}).map(s=>s.text).join(" ");
    const a=importantWords(p.text),b=importantWords(heard),terms=namedTerms(p.text),otherTerms=namedTerms(heard);
    const disagreement=(a.length>0||b.length>0)&&JSON.stringify(a)!==JSON.stringify(b)||terms.length>0&&JSON.stringify(terms)!==JSON.stringify(otherTerms);
    return disagreement?{...p,flags:[...p.flags,"Key wording differs between two transcriptions. Replay this moment."]}:p;
  });
}
