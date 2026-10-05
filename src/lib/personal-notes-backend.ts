import { cloudMode } from "./supabase/config";
import * as local from "./personal-notes-store";
import * as cloud from "./supabase/personal-notes";
import type { PersonalNotesInput } from "./personal-notes";

export async function readPersonalNotes(user:string,id:string,version:number) {
  return cloudMode()?cloud.readPersonalNotes(user,id,version):local.readPersonalNotes(user,id,version);
}
export async function savePersonalNotes(user:string,id:string,input:PersonalNotesInput) {
  return cloudMode()?cloud.savePersonalNotes(user,id,input):local.savePersonalNotes(user,id,input);
}
