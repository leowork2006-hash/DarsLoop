import { sourcePassages } from "./source-passages";
import { evidenceValid, normalise } from './evidence';
import { getStudyPlan, type StudyPlanTopic } from './study-plan';
import { studyInsights } from './insights';
import type { Citation, Lesson, Review } from './types';

/** These are bounded views over current lesson evidence, never new generated facts. */
export function catchUpPoints(lesson:Lesson){
  return (lesson.artifacts?.notes??[]).filter(note=>evidenceValid(note.evidence,sourcePassages(lesson))).slice(0,7);
}
export function teacherTerms(lessons:Lesson[],course='',query=''){
  const search=normalise(query).trim();
  return lessons.filter(l=>l.status==='ready'&&(!course||l.course===course)).flatMap(lesson=>(lesson.artifacts?.terms??[])
    .filter(term=>evidenceValid(term.evidence,sourcePassages(lesson))&&(!search||normalise(`${term.term} ${term.definition} ${lesson.title}`).includes(search)))
    .map((term,index)=>({id:`${lesson.id}:${lesson.version}:${index}`,lesson,...term})))
    .sort((a,b)=>a.term.localeCompare(b.term));
}
export function citationStart(lesson:Lesson,evidence:Citation[]){return lesson.segments.find(s=>s.id===evidence[0]?.segmentId)?.start??0;}
export function localDay(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function examWeek(lessons:Lesson[],reviews:Review[],examDate:string,course='',now=new Date()){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(examDate))return [];
  const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const end=new Date(`${examDate}T00:00:00`);
  if(!Number.isFinite(end.getTime())||localDay(end)!==examDate||end<=today)return [];
  const days=Math.min(7,Math.round((Date.UTC(end.getFullYear(),end.getMonth(),end.getDate())-Date.UTC(today.getFullYear(),today.getMonth(),today.getDate()))/86400_000));
  const start=new Date(end);start.setDate(end.getDate()-days);
  const current=studyInsights(lessons,reviews,now.getTime()).currentReviews;
  const topics=getStudyPlan(lessons,reviews,{course,now:now.getTime()}).units.flatMap(unit=>unit.topics);
  const missed=(topic:StudyPlanTopic)=>topic.practiceItemIds.filter(id=>current.some(r=>r.lessonId===topic.lessonId&&r.itemId===id&&!r.lastResult&&lessons.find(l=>l.id===r.lessonId)?.artifacts?.practice.find(p=>p.id===id)?.kind==='quiz')).length;
  const ordered=[...topics].sort((a,b)=>missed(b)-missed(a)||b.dueCount-a.dueCount||a.triedCount-b.triedCount||a.title.localeCompare(b.title));
  const result=Array.from({length:days},(_,i)=>{const date=new Date(start);date.setDate(start.getDate()+i);return {date:localDay(date),topics:[] as StudyPlanTopic[]};});
  ordered.forEach((topic,index)=>result[index%days].topics.push(topic));
  return result;
}
