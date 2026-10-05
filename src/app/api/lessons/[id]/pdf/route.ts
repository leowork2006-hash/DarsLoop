import { authenticate, fail, HttpError } from "@/lib/http";
import { authorizedLesson } from "@/lib/backend";
import { pdfBytes } from "@/lib/pdf-storage";
import { parseRange } from "@/lib/media";
export const runtime="nodejs";
export async function GET(req:Request,c:{params:Promise<{id:string}>}){try{
  const user=await authenticate(req),lesson=await authorizedLesson(user,(await c.params).id);
  if(!lesson||lesson.sourceKind!=="pdf")throw new HttpError(404,"PDF not found.");
  const expected=new URL(req.url).searchParams.get("v");if(expected!==null&&expected!==String(lesson.version))throw new HttpError(409,"The source changed. Reload the lesson.");
  const bytes=await pdfBytes(lesson),current=await authorizedLesson(user,lesson.id);
  if(!current)throw new HttpError(404,"PDF access ended.");if(current.version!==lesson.version)throw new HttpError(409,"The source changed. Reload the lesson.");
  let range:ReturnType<typeof parseRange>;try{range=parseRange(req.headers.get("range"),bytes.length);}catch{return new Response(null,{status:416,headers:{"Content-Range":`bytes */${bytes.length}`,"Cache-Control":"private, no-store"}});}
  const headers:Record<string,string>={"Content-Type":"application/pdf","Cache-Control":"private, no-store","Accept-Ranges":"bytes","Content-Disposition":`${new URL(req.url).searchParams.get("download")==="1"?"attachment":"inline"}; filename="DarsLoop-source.pdf"`,"X-Content-Type-Options":"nosniff","Content-Security-Policy":"sandbox"};
  const start=range?.start??0,end=range?.end??bytes.length-1;headers["Content-Length"]=String(end-start+1);if(range)headers["Content-Range"]=`bytes ${start}-${end}/${bytes.length}`;
  return new Response(new Uint8Array(bytes.subarray(start,end+1)),{status:range?206:200,headers});
}catch(error){return fail(error);}}
