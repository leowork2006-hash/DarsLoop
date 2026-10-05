import { authenticate, body, fail, HttpError, json } from "@/lib/http";
import { takeBudget } from "@/lib/backend";
import { PersonalNotesError, personalNotesInputSchema } from "@/lib/personal-notes";
import { readPersonalNotes, savePersonalNotes } from "@/lib/personal-notes-backend";

export const runtime="nodejs";
type Context={params:Promise<{id:string}>};
function notesFailure(error:unknown) {
  if(error instanceof PersonalNotesError)return fail(new HttpError(error.reason==="access"?404:409,error.message));
  return fail(error);
}

export async function GET(req:Request,context:Context) {
  try {
    const user=await authenticate(req),versions=new URL(req.url).searchParams.getAll("version");
    if(versions.length!==1||!/^\d{1,10}$/.test(versions[0])||!Number.isSafeInteger(Number(versions[0]))||Number(versions[0])<1||Number(versions[0])>2_147_483_647)throw new HttpError(400,"Choose a valid lesson version.");
    return json({notes:await readPersonalNotes(user,(await context.params).id,Number(versions[0]))});
  } catch(error){return notesFailure(error);}
}

export async function PUT(req:Request,context:Context) {
  try {
    const user=await authenticate(req),input=personalNotesInputSchema.safeParse(await body(req,90_000));
    if(!input.success)throw new HttpError(400,"Your notes must be plain text with a valid lesson version and view.");
    if(!await takeBudget(user,"personal-notes",30))throw new HttpError(429,"A few changes were saved quickly. Wait a moment, then save again.");
    return json({notes:await savePersonalNotes(user,(await context.params).id,input.data)});
  } catch(error){return notesFailure(error);}
}
