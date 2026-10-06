import { normalise } from "./evidence";
import type { Segment } from "./types";
type Speech={start:number;end:number;text:string};
const critical=new Set(["not","unless","except","never","only","لا","ليس","ليست","لم","لن","الا","غير","دون","نہیں","نهيں","نہ","مت","مگر","صرف"]);
function wording(text:string){return normalise(text).replace(/ک/g,"ك").replace(/[یے]/g,"ي").replace(/[٠-٩۰-۹]/g,c=>String(c.charCodeAt(0)-(c<="٩"?0x660:0x6f0)));}
export function transcriptionWords(text:string){return wording(text).split(/\s+/).filter(Boolean);}
export function sensitiveWords(text:string){return transcriptionWords(text).filter(w=>critical.has(w)||/^\d+$/.test(w)).sort();}
function unmatched(words:string[],other:string[]){
  const available=new Map<string,number>();for(const word of other)available.set(word,(available.get(word)||0)+1);
  return words.map(word=>{const count=available.get(word)||0;if(count){available.set(word,count-1);return false;}return true;});
}
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
    const members=primary.flatMap((s,i)=>root(i)===root(index)?[{segment:s,index:i}]:[]);
    const group=members.map(s=>s.segment.text).join(" ");
    const heard=secondary.filter((_,i)=>matches[i].some(j=>root(j)===root(index))).map(s=>s.text).join(" ");
    const a=sensitiveWords(group),b=sensitiveWords(heard),terms=namedTerms(group),otherTerms=namedTerms(heard);
    const disagreement=(a.length>0||b.length>0)&&JSON.stringify(a)!==JSON.stringify(b)||terms.length>0&&JSON.stringify(terms)!==JSON.stringify(otherTerms);
    if(disagreement)return {...p,flags:[...new Set([...p.flags,"Key wording differs between two transcriptions. Replay this moment."])]};
    const original=transcriptionWords(group),checked=transcriptionWords(heard),missing=unmatched(original,checked),added=unmatched(checked,original).filter(Boolean).length;
    const missingCount=missing.filter(Boolean).length,denominator=Math.max(original.length,checked.length,1);
    if(Math.max(missingCount,added)<3||Math.max(missingCount,added)/denominator<.25)return p;
    // Attribute primary-only omissions within merged timing groups. A following
    // matching passage remains usable instead of inheriting a neighbour's gap.
    let cursor=0,localMissing=0;
    for(const member of members){const size=transcriptionWords(member.segment.text).length;if(member.index===index)localMissing=missing.slice(cursor,cursor+size).filter(Boolean).length;cursor+=size;}
    const localWords=transcriptionWords(p.text).length;
    return added>=3&&added/denominator>=.25||localMissing>=3&&localMissing/Math.max(localWords,1)>=.25?{...p,flags:[...new Set([...p.flags,"Wording differs between two transcriptions. Replay this moment."])]}:p;
  });
}
