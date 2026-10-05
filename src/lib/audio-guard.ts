import { normalise } from "./evidence";
import type { Segment } from "./types";
type Speech={start:number;end:number;text:string};
const critical=new Set(["not","unless","except","never","only","لا","ليس","ليست","لم","لن","الا","غير","دون","نہیں","نهيں","نہ","مت","مگر","صرف"]);
function wording(text:string){return normalise(text).replace(/ک/g,"ك").replace(/[یے]/g,"ي").replace(/[٠-٩۰-۹]/g,c=>String(c.charCodeAt(0)-(c<="٩"?0x660:0x6f0)));}
function importantWords(text:string){return wording(text).split(/\s+/).filter(w=>critical.has(w)||/^\d+$/.test(w)).sort();}
function namedTerms(text:string){return [...text.matchAll(/(?:\b(?:word|term|called)|(?:^|\s)(?:كلمة|كلمه|مصطلح|لفظ|اصطلاح))\s+["“'«]?([\p{L}\p{M}-]+)/giu)].map(m=>wording(m[1])).sort();}
export function compareTranscriptions(primary:Segment[],secondary:Speech[],offset:number) {
  // Recognizers split the same sentence differently. Compare connected timing
  // groups so a merged condition + negation is not mistaken for missing words.
  // These groups only determine flags; source wording/timestamps stay intact.
  const roots=primary.map((_,i)=>i),root=(i:number):number=>roots[i]===i?i:roots[i]=root(roots[i]);
  const matches=secondary.map(s=>primary.flatMap((p,i)=>{
    const overlap=Math.min(p.end,offset+s.end)-Math.max(p.start,offset+s.start);
    return overlap>=Math.min(.3,Math.min(p.end-p.start,s.end-s.start)*.25)?[i]:[];
  }));
  for(const indices of matches)for(const i of indices.slice(1))roots[root(i)]=root(indices[0]);
  return primary.map((p,index)=>{
    const group=primary.filter((_,i)=>root(i)===root(index)).map(s=>s.text).join(" ");
    const heard=secondary.filter((_,i)=>matches[i].some(j=>root(j)===root(index))).map(s=>s.text).join(" ");
    const a=importantWords(group),b=importantWords(heard),terms=namedTerms(group),otherTerms=namedTerms(heard);
    const disagreement=(a.length>0||b.length>0)&&JSON.stringify(a)!==JSON.stringify(b)||terms.length>0&&JSON.stringify(terms)!==JSON.stringify(otherTerms);
    return disagreement?{...p,flags:[...p.flags,"Key wording differs between two transcriptions. Replay this moment."]}:p;
  });
}
