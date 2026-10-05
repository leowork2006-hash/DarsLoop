import { authorizedLesson, db } from "./store";
import { PersonalNotesError, personalNotesInputSchema, type PersonalNotes, type PersonalNotesInput } from "./personal-notes";

function notesDatabase() {
  const database=db();
  database.exec(`CREATE TABLE IF NOT EXISTS personal_notes (
    user_id TEXT NOT NULL,lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    version INTEGER NOT NULL CHECK(version>0),revision INTEGER NOT NULL CHECK(revision>0),
    text TEXT NOT NULL CHECK(length(text)<=20000),view TEXT NOT NULL CHECK(view IN ('summary','points','detailed')),
    updated_at TEXT NOT NULL,PRIMARY KEY(user_id,lesson_id,version)
  )`);
  return database;
}

function checkAccess(user:string,id:string,version:number) {
  const lesson=authorizedLesson(user,id);
  if(!lesson)throw new PersonalNotesError("access");
  if(lesson.version!==version)throw new PersonalNotesError("version");
}

type Row={version:number;revision:number;text:string;view:PersonalNotes["view"];updated_at:string};
function output(row:Row):PersonalNotes {
  return {version:row.version,revision:row.revision,text:row.text,view:row.view,updatedAt:row.updated_at};
}

export function readPersonalNotes(user:string,id:string,version:number):PersonalNotes|null {
  checkAccess(user,id,version);
  const row=notesDatabase().prepare("SELECT version,revision,text,view,updated_at FROM personal_notes WHERE user_id=? AND lesson_id=? AND version=?").get(user,id,version) as Row|undefined;
  return row?output(row):null;
}

export function savePersonalNotes(user:string,id:string,input:PersonalNotesInput):PersonalNotes {
  const validated=personalNotesInputSchema.parse(input),database=notesDatabase();
  database.exec("BEGIN IMMEDIATE");
  try {
    checkAccess(user,id,validated.version);
    const previous=database.prepare("SELECT revision FROM personal_notes WHERE user_id=? AND lesson_id=? AND version=?").get(user,id,validated.version) as {revision:number}|undefined;
    if((previous?.revision||0)!==validated.revision)throw new PersonalNotesError("conflict");
    const result:PersonalNotes={version:validated.version,revision:validated.revision+1,text:validated.text,view:validated.view,updatedAt:new Date().toISOString()};
    database.prepare("INSERT INTO personal_notes VALUES(?,?,?,?,?,?,?) ON CONFLICT(user_id,lesson_id,version) DO UPDATE SET revision=excluded.revision,text=excluded.text,view=excluded.view,updated_at=excluded.updated_at").run(user,id,result.version,result.revision,result.text,result.view,result.updatedAt);
    database.exec("COMMIT");return result;
  } catch(error) {database.exec("ROLLBACK");throw error;}
}
