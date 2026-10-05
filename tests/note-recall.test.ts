import { describe, expect, it } from 'vitest';
import { noteRecallCards } from '../src/lib/note-recall';
import { artifactSchema } from '../src/lib/evidence';
import type { Artifacts, Segment } from '../src/lib/types';
const passage=(i:number):Segment=>({id:`s${i}`,start:i*60,end:i*60+30,text:`Authored concept ${i}: recall an explanation, then check the original before using it.`,flags:[]});
const make=(count:number):{sources:Segment[];material:Artifacts}=>{const sources=Array.from({length:count},(_,i)=>passage(i));return {sources,material:{overview:'',notes:sources.map((s,i)=>({heading:`Concept ${i}`,text:s.text,evidence:[{segmentId:s.id,quote:s.text}]})),terms:[],practice:[]}};};
describe('whole-note recall cards',()=>{
 it('adds distinct supported concepts even when a card already exists; preserves full qualifications and existing IDs',()=>{
  const {sources,material}=make(8);material.practice=[{id:'already-reviewed',kind:'flashcard',question:'Recall the first explanation',answer:material.notes[0].text,choices:[],evidence:material.notes[0].evidence}];const before=structuredClone(material);
  const result=noteRecallCards(material,sources,2);expect(result.practice).toHaveLength(8);expect(result.practice[0]).toEqual(before.practice[0]);expect(result.practice.every(p=>material.notes.some(n=>n.text===p.answer))).toBe(true);expect(material).toEqual(before);expect(noteRecallCards(result,sources,2)).toEqual(result);artifactSchema.parse(result);
 });
 it('withholds flagged, invented and overly long answers instead of shortening away conditions',()=>{
  const {sources,material}=make(4);sources[0].flags=['unclear'];material.notes[1].evidence[0].quote='This never appeared in the source.';material.notes[2].text='Full explanation. '.repeat(100);
  expect(noteRecallCards(material,sources).practice.map(p=>p.answer)).toEqual([material.notes[3].text]);
 });
 it('caps40 items while retaining existing quizzes and distributing recall through the final topic',()=>{
  const {sources,material}=make(30);material.practice=Array.from({length:25},(_,i)=>({id:`quiz-${i}`,kind:'quiz' as const,question:`Authored concept ${i}?`,answer:'Check the source',choices:['Check the source','Skip the source'],evidence:material.notes[i].evidence}));
  const result=noteRecallCards(material,sources);expect(result.practice).toHaveLength(40);expect(result.practice.slice(0,25)).toEqual(material.practice);expect(result.practice.at(-1)?.answer).toBe(material.notes.at(-1)?.text);
 });
 it('keeps recall IDs stable on reads and distinct after the material or source explanation changes',()=>{
  const {sources,material}=make(2);const first=noteRecallCards(material,sources,1);expect(noteRecallCards(material,sources,1)).toEqual(first);expect(noteRecallCards(material,sources,2).practice[0].id).not.toBe(first.practice[0].id);
  material.notes[0].text+=' Keep the original qualification.';expect(noteRecallCards(material,sources,1).practice[0].id).not.toBe(first.practice[0].id);
 });
 it('deduplicates repeated notes and attributes PDF questions to the source in the saved language',()=>{
  const {material}=make(1);material.language='ar';material.notes.push(structuredClone(material.notes[0]));const pages=[{id:'s0',page:1,text:material.notes[0].text,flags:[]}];const result=noteRecallCards(material,pages);expect(result.practice).toHaveLength(1);expect(result.practice[0].question).toContain('المصدر');expect(result.practice[0].answer).toBe(material.notes[0].text);
 });
});
