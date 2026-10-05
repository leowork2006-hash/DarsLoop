import { randomUUID } from "node:crypto";
import { db, rawLesson } from "./store";
import { aliasSchema, challengeQuestions, ChallengeError, roundDetail, roundMatches, roundSnapshot, roundSummary, scoreRound, type ChallengeAction, type StoredParticipant, type StoredRound } from "./class-challenges";

function database() {
  const connection=db();
  connection.exec(`CREATE TABLE IF NOT EXISTS class_quiz_rounds (
    id TEXT PRIMARY KEY,group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,active INTEGER NOT NULL DEFAULT 1,payload TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS class_quiz_rounds_group ON class_quiz_rounds(group_id,active);
  CREATE TABLE IF NOT EXISTS class_quiz_participants (
    round_id TEXT NOT NULL REFERENCES class_quiz_rounds(id) ON DELETE CASCADE,user_id TEXT NOT NULL,
    alias TEXT,choices TEXT,correct INTEGER,PRIMARY KEY(round_id,user_id)
  );
  CREATE UNIQUE INDEX IF NOT EXISTS class_quiz_alias ON class_quiz_participants(round_id,lower(alias)) WHERE alias IS NOT NULL;
  CREATE TRIGGER IF NOT EXISTS class_quiz_unshare AFTER DELETE ON shares BEGIN
    UPDATE class_quiz_rounds SET active=0 WHERE group_id=OLD.group_id AND lesson_id=OLD.lesson_id;
  END;
  CREATE TRIGGER IF NOT EXISTS class_quiz_reshare AFTER UPDATE OF version ON shares WHEN NEW.version<>OLD.version BEGIN
    UPDATE class_quiz_rounds SET active=0 WHERE group_id=OLD.group_id AND lesson_id=OLD.lesson_id;
  END;
  CREATE TRIGGER IF NOT EXISTS class_quiz_source_changed AFTER UPDATE ON lessons WHEN
    NEW.version<>OLD.version OR coalesce(json_extract(NEW.payload,'$.materialRevision'),0)<>coalesce(json_extract(OLD.payload,'$.materialRevision'),0)
    OR json_extract(NEW.payload,'$.artifacts') IS NOT json_extract(OLD.payload,'$.artifacts')
    OR json_extract(NEW.payload,'$.segments') IS NOT json_extract(OLD.payload,'$.segments')
    OR json_extract(NEW.payload,'$.pdfPages') IS NOT json_extract(OLD.payload,'$.pdfPages')
    OR coalesce(json_extract(NEW.payload,'$.sourceKind'),'audio')<>coalesce(json_extract(OLD.payload,'$.sourceKind'),'audio') BEGIN
    UPDATE class_quiz_rounds SET active=0 WHERE lesson_id=OLD.id;
  END;`);
  return connection;
}
function member(user:string,groupId:string) {
  if(!database().prepare("SELECT 1 FROM memberships WHERE group_id=? AND user_id=?").get(groupId,user))throw new ChallengeError("access");
}
function participant(user:string,roundId:string):StoredParticipant|undefined {
  const row=database().prepare("SELECT alias,choices,correct FROM class_quiz_participants WHERE round_id=? AND user_id=?").get(roundId,user) as {alias:string|null;choices:string|null;correct:number|null}|undefined;
  return row?{...row,choices:row.choices?JSON.parse(row.choices):null}:undefined;
}
function currentRound(user:string,id:string):StoredRound {
  const row=database().prepare("SELECT active,payload FROM class_quiz_rounds WHERE id=?").get(id) as {active:number;payload:string}|undefined;
  if(!row?.active)throw new ChallengeError("access");
  const round=JSON.parse(row.payload) as StoredRound;member(user,round.groupId);
  const lesson=rawLesson(round.lessonId);
  if(!lesson||!database().prepare("SELECT 1 FROM shares WHERE group_id=? AND lesson_id=? AND version=?").get(round.groupId,round.lessonId,round.version))throw new ChallengeError("access");
  if(!roundMatches(round,lesson))throw new ChallengeError("changed");
  return round;
}
export function listClassRounds(user:string,groupId:string) {
  member(user,groupId);
  const rows=database().prepare("SELECT id FROM class_quiz_rounds WHERE group_id=? AND active=1 ORDER BY rowid DESC LIMIT 20").all(groupId) as {id:string}[];
  return rows.flatMap(({id})=>{try{return [roundSummary(currentRound(user,id),participant(user,id))];}catch(error){if(error instanceof ChallengeError)return [];throw error;}});
}
export function readClassRound(user:string,id:string) {
  const round=currentRound(user,id),own=participant(user,id);
  const peers=own?.alias?database().prepare(`SELECT p.alias,p.correct FROM class_quiz_participants p JOIN memberships m ON m.group_id=? AND m.user_id=p.user_id
    WHERE p.round_id=? AND p.alias IS NOT NULL AND p.choices IS NOT NULL ORDER BY p.correct DESC,lower(p.alias)`).all(round.groupId,id) as {alias:string;correct:number}[]:[];
  return roundDetail(round,own,peers.map(p=>({...p,total:round.items.length})));
}
export function actOnClassRound(user:string,input:ChallengeAction) {
  const connection=database();connection.exec("BEGIN IMMEDIATE");
  try {
    let id:string;
    if(input.action==="create") {
      member(user,input.groupId);
      const group=connection.prepare("SELECT owner_id FROM groups WHERE id=?").get(input.groupId) as {owner_id:string}|undefined;
      if(group?.owner_id!==user)throw new ChallengeError("owner");
      const lesson=rawLesson(input.lessonId);
      if(!lesson||lesson.status!=="ready"||!connection.prepare("SELECT 1 FROM shares WHERE group_id=? AND lesson_id=? AND version=?").get(input.groupId,input.lessonId,lesson.version))throw new ChallengeError("access");
      const items=challengeQuestions(lesson);if(!items.length)throw new ChallengeError("empty");
      const previous=connection.prepare("SELECT id FROM class_quiz_rounds WHERE group_id=? AND lesson_id=? AND active=1 ORDER BY rowid DESC").all(input.groupId,input.lessonId) as {id:string}[];
      id=previous.find(row=>{try{return roundMatches(currentRound(user,row.id),lesson);}catch{return false;}})?.id??randomUUID();
      if(!previous.some(row=>row.id===id)) {
        if(listClassRounds(user,input.groupId).length>=20)throw new ChallengeError("limit");
        const round:StoredRound={id,groupId:input.groupId,lessonId:lesson.id,lessonTitle:lesson.title,version:lesson.version,materialRevision:lesson.materialRevision??0,createdAt:new Date().toISOString(),snapshot:roundSnapshot(lesson),items};
        connection.prepare("INSERT INTO class_quiz_rounds(id,group_id,lesson_id,payload) VALUES(?,?,?,?)").run(id,input.groupId,lesson.id,JSON.stringify(round));
      }
    } else {
      id=input.roundId;const round=currentRound(user,id),own=participant(user,id);
      if(input.action==="join") {
        const alias=aliasSchema.parse(input.alias);
        const taken=connection.prepare("SELECT user_id FROM class_quiz_participants WHERE round_id=? AND lower(alias)=lower(?) AND user_id<>?").get(id,alias,user);
        if(taken)throw new ChallengeError("alias");
        connection.prepare("INSERT INTO class_quiz_participants(round_id,user_id,alias) VALUES(?,?,?) ON CONFLICT(round_id,user_id) DO UPDATE SET alias=excluded.alias").run(id,user,alias);
      }
      if(input.action==="withdraw")connection.prepare("UPDATE class_quiz_participants SET alias=NULL WHERE round_id=? AND user_id=?").run(id,user);
      if(input.action==="submit") {
        if(!own?.alias)throw new ChallengeError("optin");
        const correct=scoreRound(round.items,input.choices);
        if(own.choices&&JSON.stringify(own.choices)!==JSON.stringify(input.choices))throw new ChallengeError("submitted");
        if(!own.choices)connection.prepare("UPDATE class_quiz_participants SET choices=?,correct=? WHERE round_id=? AND user_id=? AND choices IS NULL").run(JSON.stringify(input.choices),correct,id,user);
      }
    }
    const result=readClassRound(user,id);connection.exec("COMMIT");return result;
  } catch(error) {connection.exec("ROLLBACK");throw error;}
}
