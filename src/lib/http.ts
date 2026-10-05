import { cookies } from "next/headers";
import { sessionUser } from "./store";
import { cloudMode } from "./supabase/config";
import { accountUser, AccountServiceUnavailable } from "./supabase/server";
export class HttpError extends Error { constructor(public status:number,message:string){super(message);} }
export function localRequest(req:Request) {
  const host=req.headers.get("host")||"";
  if(cloudMode()){
    const approved=process.env.DARSLOOP_ORIGIN;if(!approved||new URL(approved).host!==host)throw new HttpError(403,"Open DarsLoop from its configured address.");
  }else if(!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host))throw new HttpError(403,"This build is available on localhost only.");
  const origin=req.headers.get("origin");
  if(cloudMode()&&origin&&origin!==process.env.DARSLOOP_ORIGIN)throw new HttpError(403,"Open DarsLoop directly to use this action.");
  if(origin&&origin!==`http://${host}`&&origin!==`https://${host}`)throw new HttpError(403,"Open DarsLoop directly to use this action.");
  if(req.headers.get("sec-fetch-site")==="cross-site")throw new HttpError(403,"Cross-site access is disabled.");
}
export async function authenticate(req:Request) {localRequest(req);if(cloudMode()){const account=await accountUser();if(!account)throw new HttpError(401,"Sign in to open your lessons.");return account.id;}const user=sessionUser((await cookies()).get("darsloop-session")?.value);if(!user)throw new HttpError(401,"Open your workspace to start a session.");return user;}
export function fail(e:unknown) {return Response.json({error:e instanceof HttpError||e instanceof AccountServiceUnavailable?e.message:"That action could not be completed. Please try again."},{status:e instanceof HttpError?e.status:e instanceof AccountServiceUnavailable?503:500,headers:{"Cache-Control":"no-store"}});}
export async function body(req:Request,max=10_000) {
 const reader=req.body?.getReader();if(!reader)throw new HttpError(400,"The request is not valid.");const chunks:Uint8Array[]=[];let size=0;
 while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new HttpError(413,"This request is too large.");}chunks.push(value);}
 try{return JSON.parse(Buffer.concat(chunks).toString("utf8"));}catch{throw new HttpError(400,"The request is not valid.");}
}
export function json(data:unknown,status=200) {return Response.json(data,{status,headers:{"Cache-Control":"no-store"}});}
