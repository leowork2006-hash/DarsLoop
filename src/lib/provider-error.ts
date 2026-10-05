export class ProviderError extends Error {
  constructor(public code:string,message:string,public retryAt?:number){super(message);}
}
export function retryTime(value:string|null,now=Date.now(),fallback=60_000){
  const seconds=value===null?NaN:Number(value);
  const parsed=Number.isFinite(seconds)?now+seconds*1000:value?Date.parse(value):NaN;
  return Math.max(now+5000,Math.min(now+86400_000,Number.isFinite(parsed)?parsed:now+fallback));
}
export function quotaError(response:Response,kind="transcription"){
  return new ProviderError("quota",`The ${kind} service is busy. Your audio and completed work are saved.`,retryTime(response.headers.get("retry-after")));
}
