import { z } from "zod";
import { authenticate, body, fail, HttpError, json } from "@/lib/http";
import { createGroup, invite, join, listGroups, revokeShare, share } from "@/lib/backend";
export const runtime="nodejs";
export async function POST(req:Request){try{
  const user=await authenticate(req),raw=await body(req);
  const b=z.discriminatedUnion("action",[
    z.object({action:z.literal("create"),name:z.string().trim().min(2).max(80)}),
    z.object({action:z.literal("invite"),groupId:z.string().uuid()}),
    z.object({action:z.literal("join"),token:z.string().regex(/^[a-f0-9]{48}$/)}),
    z.object({action:z.literal("share"),groupId:z.string().uuid(),lessonId:z.string().uuid(),permitted:z.literal(true)}),
    z.object({action:z.literal("revoke"),groupId:z.string().uuid(),lessonId:z.string().uuid()})
  ]).safeParse(raw);
  if(!b.success)throw new HttpError(400,"Check the class details and sharing permission.");
  const a=b.data;let token:string|undefined;
  try{if(a.action==="create")await createGroup(user,a.name);if(a.action==="invite")token=await invite(user,a.groupId);if(a.action==="join")await join(user,a.token);if(a.action==="share")await share(user,a.groupId,a.lessonId);if(a.action==="revoke")await revokeShare(user,a.groupId,a.lessonId);}catch(e){throw new HttpError(400,e instanceof Error?e.message:"Class action failed.");}
  return json({groups:await listGroups(user),...(token?{token}:{})});
}catch(e){return fail(e);}}
