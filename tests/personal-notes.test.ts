import { afterAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { editableClassNotes, initialNoteView, personalNotesInputSchema, PERSONAL_NOTES_LIMIT } from "../src/lib/personal-notes";

process.env.DARSLOOP_DATA_DIR=mkdtempSync(path.join(os.tmpdir(),"darsloop-personal-notes-"));
const store=await import("../src/lib/store");
const notes=await import("../src/lib/personal-notes-store");
function fixture(){const user=store.createSession();store.seedDemo(user.userId);return {user:user.userId,lesson:store.listLessons(user.userId)[0]};}
afterAll(()=>{store.db().close();rmSync(process.env.DARSLOOP_DATA_DIR!,{recursive:true,force:true});});

describe("personal note input and captured material",()=>{
  it("accepts plain personal text but rejects identity injection, unsafe bounds and ambiguous views",()=>{
    const input={version:1,revision:0,text:"سوال\nMy reminder <script>still plain text</script>",view:"points"};
    expect(personalNotesInputSchema.parse(input)).toEqual(input);
    for(const change of [{userId:"someone else"},{revision:-1},{version:0},{revision:2_147_483_647},{view:"add religious interpretation"},{text:"x".repeat(PERSONAL_NOTES_LIMIT+1)}])expect(personalNotesInputSchema.safeParse({...input,...change}).success).toBe(false);
  });
  it("uses the original upload choice for a view and copies complete explanations without source quotations",()=>{
    const {lesson}=fixture();
    expect(initialNoteView({})).toBe("points");expect(initialNoteView({noteOptions:{enabled:true,detail:"short"}})).toBe("summary");expect(initialNoteView({noteOptions:{enabled:true,detail:"detailed"}})).toBe("detailed");
    const original=JSON.stringify(lesson),copied=editableClassNotes(lesson);
    expect(copied).toBe(lesson.artifacts!.notes.map(note=>`${note.heading}\n${note.text}`).join("\n\n"));expect(copied).not.toContain("Audio time:");expect(JSON.stringify(lesson)).toBe(original);
    expect(editableClassNotes({...lesson,noteOptions:{enabled:false,detail:"standard"}})).toBe("");
    expect(editableClassNotes({...lesson,artifacts:{...lesson.artifacts!,notes:[{...lesson.artifacts!.notes[0],text:"x".repeat(PERSONAL_NOTES_LIMIT)}]}})).toBe("");
  });
});

describe("private per-student notes in local database",()=>{
  it("saves and reopens personal text without changing transcript, generated notes, quotations, version or practice",()=>{
    const {user,lesson}=fixture(),original=JSON.stringify(store.rawLesson(lesson.id));
    expect(notes.readPersonalNotes(user,lesson.id,1)).toBeNull();
    const saved=notes.savePersonalNotes(user,lesson.id,{version:1,revision:0,text:"My revision plan. Teacher text is not changed.",view:"detailed"});
    expect(saved.revision).toBe(1);expect(notes.readPersonalNotes(user,lesson.id,1)).toEqual(saved);expect(JSON.stringify(store.rawLesson(lesson.id))).toBe(original);
    const updated=notes.savePersonalNotes(user,lesson.id,{version:1,revision:1,text:"",view:"summary"});expect(updated.revision).toBe(2);expect(updated.text).toBe("");
  });
  it("keeps owner and classmate edits separate, and denies a third account",()=>{
    const owner=fixture(),student=fixture(),foreign=fixture(),group=store.createGroup(owner.user,"Note privacy");store.join(student.user,store.invite(owner.user,group));store.share(owner.user,group,owner.lesson.id);
    notes.savePersonalNotes(owner.user,owner.lesson.id,{version:1,revision:0,text:"Owner private text",view:"points"});
    expect(notes.readPersonalNotes(student.user,owner.lesson.id,1)).toBeNull();
    notes.savePersonalNotes(student.user,owner.lesson.id,{version:1,revision:0,text:"Classmate private text",view:"summary"});
    expect(notes.readPersonalNotes(owner.user,owner.lesson.id,1)?.text).toBe("Owner private text");expect(notes.readPersonalNotes(student.user,owner.lesson.id,1)?.text).toBe("Classmate private text");
    expect(()=>notes.readPersonalNotes(foreign.user,owner.lesson.id,1)).toThrow("Lesson not found");expect(()=>notes.savePersonalNotes(foreign.user,owner.lesson.id,{version:1,revision:0,text:"foreign",view:"summary"})).toThrow("Lesson not found");
    expect(JSON.stringify(store.publicLesson(owner.lesson))).not.toContain("private text");
  });
  it("denies reads and saves after class access ends",()=>{
    const owner=fixture(),student=fixture(),group=store.createGroup(owner.user,"Revoked notes");store.join(student.user,store.invite(owner.user,group));store.share(owner.user,group,owner.lesson.id);
    notes.savePersonalNotes(student.user,owner.lesson.id,{version:1,revision:0,text:"Before revocation",view:"points"});store.revokeShare(owner.user,group,owner.lesson.id);
    expect(()=>notes.readPersonalNotes(student.user,owner.lesson.id,1)).toThrow("Lesson not found");expect(()=>notes.savePersonalNotes(student.user,owner.lesson.id,{version:1,revision:1,text:"After revocation",view:"points"})).toThrow("Lesson not found");
  });
  it("isolates transcript versions and rejects stale simultaneous saves",()=>{
    const {user,lesson}=fixture();notes.savePersonalNotes(user,lesson.id,{version:1,revision:0,text:"First saved edit",view:"points"});
    expect(()=>notes.savePersonalNotes(user,lesson.id,{version:1,revision:0,text:"Stale second editor",view:"points"})).toThrow("saved elsewhere");expect(notes.readPersonalNotes(user,lesson.id,1)?.text).toBe("First saved edit");
    store.updateLesson({...lesson,version:2},1);
    expect(()=>notes.readPersonalNotes(user,lesson.id,1)).toThrow("lesson changed");expect(()=>notes.savePersonalNotes(user,lesson.id,{version:1,revision:1,text:"Stale version",view:"summary"})).toThrow("lesson changed");
    expect(notes.readPersonalNotes(user,lesson.id,2)).toBeNull();expect(notes.savePersonalNotes(user,lesson.id,{version:2,revision:0,text:"New version",view:"detailed"}).revision).toBe(1);
  });
  it("removes associated personal text when the lesson is deleted",()=>{
    const {user,lesson}=fixture();notes.savePersonalNotes(user,lesson.id,{version:1,revision:0,text:"Private deletion fixture",view:"points"});store.deleteLesson(user,lesson.id);
    expect(store.db().prepare("SELECT count(*) AS n FROM personal_notes WHERE lesson_id=?").get(lesson.id)).toEqual({n:0});expect(()=>notes.readPersonalNotes(user,lesson.id,1)).toThrow("Lesson not found");
  });
});
