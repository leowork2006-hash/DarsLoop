import { adminClient } from "./admin";
import { authorizedLesson } from "./store";
import { PersonalNotesError, personalNotesInputSchema, type PersonalNotes, type PersonalNotesInput } from "../personal-notes";

export async function readPersonalNotes(user:string,id:string,version:number):Promise<PersonalNotes|null> {
  const lesson=await authorizedLesson(user,id);
  if(!lesson)throw new PersonalNotesError("access");
  if(lesson.version!==version)throw new PersonalNotesError("version");
  const {data,error}=await adminClient().from("personal_notes").select("version,revision,text,view,updated_at").eq("user_id",user).eq("lesson_id",id).eq("version",version).maybeSingle();
  if(error)throw new Error("Your saved notes could not be opened. Try again.");
  return data?{version:data.version,revision:data.revision,text:data.text,view:data.view,updatedAt:data.updated_at}:null;
}

export async function savePersonalNotes(user:string,id:string,input:PersonalNotesInput):Promise<PersonalNotes> {
  const validated=personalNotesInputSchema.parse(input);
  const {data,error}=await adminClient().rpc("darsloop_save_personal_notes",{p_user:user,p_lesson:id,p_version:validated.version,p_revision:validated.revision,p_text:validated.text,p_view:validated.view});
  if(error){
    if(error.message==="note_access")throw new PersonalNotesError("access");
    if(error.message==="note_changed")throw new PersonalNotesError("version");
    if(error.message==="note_conflict")throw new PersonalNotesError("conflict");
    throw new Error("Your notes could not be saved. Keep your changes open and try again.");
  }
  return data as PersonalNotes;
}
