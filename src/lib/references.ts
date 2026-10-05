import { createHash } from "node:crypto";
import { z } from "zod";
import { tokens } from "./evidence";
import type { Candidate } from "./types";
const endpoint="https://mcp.islamiccontent.org/mcp";
const textParts=(r:unknown)=>z.object({content:z.array(z.object({type:z.string(),text:z.string().optional()})).optional()}).parse(r).content?.filter(p=>p.type==="text"&&p.text&&!p.text.trim().startsWith("{")).map(p=>p.text).join("\n")||"";
export function parseRpc(text:string,id:number) {
  const messages=text.trim().startsWith("{")?[JSON.parse(text)]:text.split(/\r?\n\r?\n/).map(event=>event.split(/\r?\n/).filter(l=>l.startsWith("data:")).map(l=>l.slice(5).trim()).join("\n")).filter(Boolean).map(t=>JSON.parse(t));
  const found=messages.find(m=>m.id===id);if(!found||found.error||found.result?.isError)throw new Error("Reference source unavailable");return found.result;
}
async function rpc(method:string,params:unknown,id:number) {
  const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json, text/event-stream"},body:JSON.stringify({jsonrpc:"2.0",id,method,params}),signal:AbortSignal.timeout(18_000)});
  if(!response.ok)throw new Error("Reference source unavailable");
  return parseRpc(await response.text(),id);
}
const hitSchema=z.object({id:z.string(),title:z.string(),url:z.string()});
const recordSchema=z.object({id:z.string(),title:z.string(),url:z.string(),segments:z.array(z.object({kind:z.string(),text:z.string()})),metadata:z.object({source:z.string(),language:z.string(),grade:z.string().optional(),attribution:z.string().optional()})});
export function mapRecord(input:unknown,query:string):Candidate|null {
  const r=recordSchema.safeParse(input);if(!r.success)return null;const v=r.data;
  let url:URL;try{url=new URL(v.url);}catch{return null;}
  if(url.protocol!=="https:"||url.hostname!=="hadeethenc.com"||url.username||url.password||!/^\/[a-z]{2,3}\/browse\/hadith\/\d+$/.test(url.pathname)||v.metadata.source!=="HadeethEnc"||!v.metadata.grade||!v.id.startsWith("hadith:"))return null;
  const exact=v.segments.filter(s=>s.kind==="exact").map(s=>s.text).join("\n");if(!exact)return null;
  const q=tokens(query),words=tokens(exact),overlap=q.filter(t=>words.includes(t));
  // Conservative lexical filter, not a calibrated probability or a scholarly decision.
  if(q.length<3||overlap.length<3||overlap.length/q.length<0.5)return null;
  return {id:v.id,title:v.title,url:v.url,text:exact,language:v.metadata.language,grade:v.metadata.grade,gradePublisher:v.metadata.source,collectionAttribution:v.metadata.attribution||"",retrievedAt:new Date().toISOString(),matchBasis:"wording",recordHash:createHash("sha256").update(JSON.stringify(input)).digest("hex")};
}
export function isCategoryOnly(hit:{url:string},rendering:string) {
  const items=rendering.split(/(?:^|\n)\d+\.\s/).slice(1);
  const item=items.find(part=>part.includes(hit.url));
  // An absent match-basis marker cannot silently become a wording match.
  return !item||/\[in category:/i.test(item);
}
export async function findCandidates(query:string,language:"ar"|"en"|"ur") {
  if(tokens(query).length<3)return [];
  await rpc("initialize",{protocolVersion:"2025-03-26",capabilities:{},clientInfo:{name:"darsloop",version:"0.1.0"}},1);
  const search=await rpc("tools/call",{name:"search",arguments:{query,sources:["hadith"],language,limit:5}},2);
  const rendering=textParts(search);
  const structured=z.object({structuredContent:z.object({results:z.array(hitSchema)})}).parse(search).structuredContent;
  const candidates:Candidate[]=[];const seen=new Set<string>();
  for(const hit of structured.results){
    if(!hit.id.startsWith("hadith:")||seen.has(hit.id)||isCategoryOnly(hit,rendering))continue;seen.add(hit.id);
    const fetched=await rpc("tools/call",{name:"fetch",arguments:{id:hit.id}},3);
    const candidate=mapRecord(fetched.structuredContent,query);
    if(candidate)candidates.push(candidate);if(candidates.length===3)break;
  }
  return candidates;
}
