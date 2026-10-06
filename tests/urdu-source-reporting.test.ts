import {describe,expect,it,vi} from 'vitest';
import {boundedQuestion,evidenceValid,excerptAnswer,needsPersonalReferral} from '../src/lib/evidence';
import type {Lesson,Segment} from '../src/lib/types';
const prayer:Segment={id:'prayer',start:0,end:15,text:'استاد نے کہا: نماز اسلام کے ارکان میں شامل ہے۔ یہ سبق ذاتی صورت حال پر حکم نہیں دیتا۔',flags:[]};
const review:Segment={id:'review',start:15,end:30,text:'استاد نے سبق کی دہرائی کا طریقہ بتایا: طالب علم نوٹس بند کرتا ہے، ایک بات اپنے الفاظ میں بیان کرتا ہے، پھر اصل وضاحت سے موازنہ کرتا ہے۔',flags:[]};
describe('Urdu source reporting and personal pronouns',()=>{
 it.each(['استاد نے نماز کے بارے میں کیا بتایا؟','اس سبق میں نماز کے بارے میں استاد نے کیا کہا؟'])('keeps literal source reporting available: %s',question=>{
  expect(needsPersonalReferral(question)).toBe(false);
  const answer=boundedQuestion(question,[prayer],1,'ai')!;
  expect(answer).toMatchObject({status:'answered',mode:'excerpt'});
  expect(answer.blocks[0].text).toBe(prayer.text);expect(evidenceValid(answer.blocks[0].evidence,[prayer])).toBe(true);
 });
 it('distinguishes an absent named book context from personal application',()=>{
  const question='استاد نے کتاب میں نماز کے بارے میں کیا کہا؟';
  expect(needsPersonalReferral(question)).toBe(false);
  expect(boundedQuestion(question,[prayer],1,'ai')).toMatchObject({status:'not_covered',blocks:[]});
 });
 it('does not let generic reporting words provide topic support',()=>{
  const question='استاد نے نماز اور کہکشاں کے بارے میں کیا بتایا؟';
  expect(needsPersonalReferral(question)).toBe(false);
  expect(excerptAnswer(question,[prayer,review],1)).toMatchObject({status:'not_covered',blocks:[]});
 });
 it('does not need an unrelated paragraph to supply a question word',()=>{
  expect(excerptAnswer('استاد نے سبق کی دہرائی کا کیا طریقہ بتایا؟',[review],1)).toMatchObject({status:'answered'});
  expect(excerptAnswer('استاد نے سبق کی دہرائی اور کہکشاں کا کیا طریقہ بتایا؟',[review],1)).toMatchObject({status:'not_covered',blocks:[]});
 });
 it.each(['کیا میں نماز چھوڑ سکتا ہوں؟','استاد نے کہا مگر کیا میں نماز چھوڑ سکتا ہوں؟','اس سبق میں کیا میں نماز چھوڑ سکتا ہوں؟','استاد نے نماز کے بارے میں بتایا مگر کیا میری نماز درست ہے؟','کیا میرے لیے نماز چھوڑنا جائز ہے؟'])('retains personal ruling referrals: %s',question=>{
  expect(needsPersonalReferral(question)).toBe(true);
  expect(boundedQuestion(question,[prayer],1,'ai')).toMatchObject({status:'needs_teacher',blocks:[]});
 });
 it('retains grading and unclear-source boundaries without provider requests',async()=>{
  const fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('No provider in this test'));
  try{
   const {answerLesson}=await import('../src/lib/ai');
   const lesson={id:'authored',version:1,segments:[prayer],sourceKind:'audio'} as Lesson;
   expect(await answerLesson('استاد نے نماز کے بارے میں کیا بتایا؟',lesson)).toMatchObject({status:'answered',mode:'excerpt'});
   expect(await answerLesson('کیا یہ حدیث صحیح ہے؟',lesson)).toMatchObject({status:'needs_teacher',blocks:[]});
   expect(await answerLesson('استاد نے نماز اور کہکشاں کے بارے میں کیا بتایا؟',lesson)).toMatchObject({status:'not_covered',blocks:[]});
   expect(excerptAnswer('استاد نے نماز کے بارے میں کیا بتایا؟',[{...prayer,flags:['Unclear']}],1)).toMatchObject({status:'not_covered',blocks:[]});
   expect(fetch).not.toHaveBeenCalled();
  }finally{fetch.mockRestore();}
 });
});
