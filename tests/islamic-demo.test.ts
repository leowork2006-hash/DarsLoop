import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { demoArtifacts, demoScript } from '../src/lib/demo';
import { exampleLesson } from '../src/lib/example';
import { evidenceValid, excerptAnswer, safePractice } from '../src/lib/evidence';

describe('authored Islamic demo consistency; no live ASR or scholar evaluation',()=>{
 it('keeps script, timed passages and generated audio aligned',()=>{
  const lesson=exampleLesson();expect(lesson.title).toBe('The five pillars of Islam');expect(lesson.segments.map(p=>p.text)).toEqual(demoScript);
  expect(readFileSync('fixtures/demo-five-pillars-script.txt','utf8').trim()).toBe(demoScript.join('\n\n'));
  for(let i=1;i<lesson.segments.length;i++)expect(lesson.segments[i].start).toBeCloseTo(lesson.segments[i-1].end,4);
  const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','json','fixtures/demo-five-pillars.mp3'],{encoding:'utf8'}));
  expect(Math.abs(Number(probe.format.duration)-lesson.duration)).toBeLessThan(.2);
  expect(lesson.artifacts?.notes).toHaveLength(4);expect(lesson.artifacts?.practice).toHaveLength(4);
 });
 it('uses only valid literal passages and canonical quiz choices',()=>{
  const lesson=exampleLesson(),a=demoArtifacts(lesson.segments);
  for(const item of [...a.notes,...a.terms,...a.practice])expect(evidenceValid(item.evidence,lesson.segments)).toBe(true);
  expect(safePractice(a)).toHaveLength(4);
  for(const item of a.practice.filter(p=>p.kind==='quiz'))expect(item.choices.filter(c=>c===item.answer)).toHaveLength(1);
 });
 it('answers a descriptive prayer query as original words and refuses a personal ruling',()=>{
  const lesson=exampleLesson(),answer=excerptAnswer('Explain prayer from this lesson.',lesson.segments,1);
  expect(answer.status).toBe('answered');expect(answer.mode).toBe('excerpt');expect(answer.blocks.some(b=>b.text.includes('Salah'))).toBe(true);
  expect(excerptAnswer('What is Salah?',lesson.segments,1).mode).toBe('excerpt');
  expect(excerptAnswer('According to the teacher, is my prayer valid?',lesson.segments,1)).toMatchObject({status:'needs_teacher',blocks:[]});
 });
});
