import { detailedOptions, detailedPrepared, sourceReadyForMaterial } from "./material-sections";
import type { PreparedMaterialLanguage } from "./study-material-language";
import type { Lesson } from "./types";
export type MaterialQueueCode="not_found"|"conflict"|"busy"|"source_not_ready";
export class MaterialQueueError extends Error{
  constructor(public code:MaterialQueueCode){super({not_found:"Lesson not found.",conflict:"This lesson changed. Reload before preparing notes.",busy:"This lesson is already being prepared.",source_not_ready:"The saved source has no clear passages to prepare."}[code]);this.name="MaterialQueueError";}
}
export type DetailedQueueResult={status:"queued"|"already_queued"|"already_prepared";revision:number};
export function checkMaterialRequest(version:number,revision:number){
  if(!Number.isSafeInteger(version)||version<1||version>2147483647||!Number.isSafeInteger(revision)||revision<0||revision>=2147483647)throw new MaterialQueueError("conflict");
}
export function materialSourceSnapshot(l:Lesson){
  return {sourceKind:l.sourceKind||"audio",duration:l.duration,audioPath:l.audioPath,mime:l.mime,segments:l.segments,pdfPages:l.pdfPages||[],sourcePageCount:l.sourcePageCount??null,transcriptionComplete:l.transcriptionComplete===true,sourceImport:l.sourceImport??null,studyLanguage:l.noteOptions?.language||"auto",spokenLanguage:l.spokenLanguage||"auto",transcriptCache:l.transcriptCache??null};
}
export function detailedQueueChange(l:Lesson|null,user:string,version:number,expectedRevision:number,jobStatus:string|undefined,language?:PreparedMaterialLanguage):{result:DetailedQueueResult;lesson?:Lesson}{
  checkMaterialRequest(version,expectedRevision);
  if(!l||l.ownerId!==user||l.demo||l.shared)throw new MaterialQueueError("not_found");
  if(language&&!(["en","ur","ar"] as string[]).includes(language))throw new MaterialQueueError("conflict");
  const options=detailedOptions(l,language),target=options.language as PreparedMaterialLanguage;
  if(l.version!==version)throw new MaterialQueueError("conflict");
  const current=l.materialRevision??0,marker=l.materialPreparation;
  if(!Number.isSafeInteger(current)||current<0||current>=2147483647)throw new MaterialQueueError("conflict");
  const active=jobStatus==="queued"||jobStatus==="running";
  if(current===expectedRevision&&marker?.kind==="detailed"&&marker.revision===current+1&&marker.noteOptions.language===target&&active&&(l.status==="queued"||l.status==="processing"))return {result:{status:"already_queued",revision:marker.revision}};
  if(!active&&(l.status==="ready"||l.status==="failed")&&(l.sourceImport||!sourceReadyForMaterial(l)))throw new MaterialQueueError("source_not_ready");
  if(l.status==="ready"&&!active&&detailedPrepared(l,target)&&(current===expectedRevision||current===expectedRevision+1))return {result:{status:"already_prepared",revision:current}};
  if(current!==expectedRevision)throw new MaterialQueueError("conflict");
  if(active||l.status==="queued"||l.status==="processing")throw new MaterialQueueError("busy");
  if(!["ready","failed"].includes(l.status)||l.sourceImport||!sourceReadyForMaterial(l))throw new MaterialQueueError("source_not_ready");
  const revision=current+1;
  const lesson:Lesson={...l,status:"queued",error:null,stage:"Waiting to prepare detailed notes",nextAttemptAt:undefined,quotaDeferrals:undefined,materialFailure:undefined,materialPreparation:{kind:"detailed",revision,noteOptions:options,requestedAt:new Date().toISOString()}};
  return {result:{status:"queued",revision},lesson};
}
