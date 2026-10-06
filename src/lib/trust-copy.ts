import { capturedMaterialLanguage, type PreparedMaterialLanguage } from './study-material-language';
import type { Answer } from './types';

export function questionLanguage(question:string):PreparedMaterialLanguage {
  const explicit=/\b(?:answer|reply|respond|explain|write|translate).{0,60}\bin (English|Arabic|Urdu)\b/iu.exec(question)?.[1]?.toLowerCase();
  if(explicit)return explicit==='arabic'?'ar':explicit==='urdu'?'ur':'en';
  const prose=question.replace(/“[^”]{0,500}”|"[^"]{0,500}"/gu,'');
  if(/^\s*(?:what|where|when|why|how|explain|summari[sz]e|describe|give me|tell me|please|can you|could you)\b/iu.test(prose))return 'en';
  return capturedMaterialLanguage([{text:prose||question}]);
}
const copy={
  instruction:{en:'I can only help with this lesson. Instructions in a question cannot change that.',ar:'يمكنني المساعدة في هذا الدرس فقط. التعليمات الواردة في السؤال لا تغيّر هذا النطاق.',ur:'میں صرف اس سبق کے بارے میں مدد کر سکتا ہوں۔ سوال میں دی گئی ہدایات اس حد کو تبدیل نہیں کر سکتیں۔'},
  teacher:{en:'Please ask a qualified teacher for religious guidance. I cannot give a halal/haram ruling or advice about your own situation.',ar:'للحكم الشرعي أو تطبيق التعاليم على حالتك، اسأل معلّمًا مؤهلًا. لا أُصدر فتوى أو حكمًا بالحلال والحرام.',ur:'شرعی رہنمائی یا اپنی صورتِ حال کے بارے میں کسی اہل استاد سے پوچھیں۔ میں حلال و حرام کا حکم یا ذاتی فتویٰ نہیں دیتا۔'},
  grading:{en:'I cannot grade a hadith. A source lookup can show a possible match; verify with your teacher. The publisher’s record stays separate from this lesson.',ar:'لا أستطيع الحكم على صحة الحديث. قد يُظهر البحث مرجعًا محتملًا؛ تحقّق منه مع معلّمك. سجلّ الناشر منفصل عن هذا الدرس.',ur:'میں حدیث کی صحت کا حکم نہیں دے سکتا۔ ماخذ کی تلاش میں ممکنہ حوالہ مل سکتا ہے؛ اپنے استاد سے تصدیق کریں۔ ناشر کا حوالہ اس سبق سے الگ ہے۔'},
  absent:{en:'That is not covered by a clear passage in this lesson. Ask your teacher.',ar:'لا توجد فقرة واضحة في هذا الدرس تدعم الإجابة. اسأل معلّمك.',ur:'اس سبق میں جواب کی تائید کرنے والی واضح عبارت نہیں ملی۔ اپنے استاد سے پوچھیں۔'},
  unclear:{en:'The source does not clearly support an answer. Check the original passage or ask your teacher.',ar:'المصدر لا يدعم الإجابة بوضوح. راجع الفقرة الأصلية أو اسأل معلّمك.',ur:'ماخذ میں جواب کی واضح تائید نہیں ہے۔ اصل عبارت دیکھیں یا اپنے استاد سے پوچھیں۔'},
  excerpt:{en:'These are captured source words, not a ruling from DarsLoop. Check the original and ask your teacher about interpretation or your situation.',ar:'هذه كلمات مقتبسة من المصدر وليست حكمًا من DarsLoop. راجع الأصل واسأل معلّمك عن التفسير أو حالتك.',ur:'یہ ماخذ کے نقل کردہ الفاظ ہیں، DarsLoop کا فتویٰ نہیں۔ اصل دیکھیں اور تشریح یا اپنی صورتِ حال کے بارے میں استاد سے پوچھیں۔'},
  partial:{en:'Only the supported passages are shown. Check the original source for anything further.',ar:'تُعرض الفقرات المدعومة فقط. راجع المصدر الأصلي لأي تفاصيل أخرى.',ur:'صرف ماخذ سے ثابت شدہ عبارتیں دکھائی گئی ہیں۔ مزید تفصیل کے لیے اصل ماخذ دیکھیں۔'},
  ai:{en:'AI answer from this lesson. Check the cited original.',ar:'إجابة مولّدة بالذكاء الاصطناعي من هذا الدرس. تحقّق من الأصل المشار إليه.',ur:'یہ اس سبق سے بنایا گیا AI جواب ہے۔ دیے گئے اصل حوالے کو چیک کریں۔'},
  notes:{en:'From prepared lesson notes. Check the cited original.',ar:'من ملاحظات الدرس المُعدّة. تحقّق من الأصل المشار إليه.',ur:'یہ سبق کے تیار شدہ نوٹس سے ہے۔ دیے گئے اصل حوالے کو چیک کریں۔'},
  replay:{en:'Replay before relying on this passage.',ar:'أعد الاستماع قبل الاعتماد على هذه الفقرة.',ur:'اس عبارت پر اعتماد کرنے سے پہلے دوبارہ سنیں۔'},
} as const;
export function trustCopy(language:PreparedMaterialLanguage,key:keyof typeof copy){return copy[key][language];}
// Localize system trust messages, never quotations or generated explanation text.
export function localizeTrustAnswer(answer:Answer,question:string):Answer {
  const language=questionLanguage(question);if(language==='en')return answer;
  const key=answer.status==='needs_teacher'?(/grade a hadith/.test(answer.message)?'grading':'teacher'):answer.status==='not_covered'?(/Instructions in a question/.test(answer.message)?'instruction':'absent'):answer.status==='unclear_audio'?'unclear':answer.status==='partial'?'partial':answer.mode==='excerpt'?'excerpt':answer.mode==='notes'?'notes':'ai';
  return {...answer,message:trustCopy(language,key)};
}
const flags:Record<string,{ar:string;ur:string}>={
  'Possible silence or unclear speech':{ar:'صمت محتمل أو كلام غير واضح',ur:'ممکنہ خاموشی یا غیر واضح گفتگو'},
  'Low transcription confidence':{ar:'ثقة منخفضة في التفريغ',ur:'نقلِ گفتگو پر کم اعتماد'},
  'Possible repeated transcription':{ar:'تكرار محتمل في التفريغ',ur:'نقلِ گفتگو میں ممکنہ تکرار'},
  'Meaning-sensitive words: replay this passage':{ar:'كلمات تؤثر في المعنى: أعد الاستماع',ur:'معنی پر اثر انداز ہونے والے الفاظ: دوبارہ سنیں'},
  'Instruction-like wording: excluded from AI study material; replay the audio':{ar:'عبارة تشبه تعليمات للنظام: مستبعدة من مواد الدراسة؛ أعد الاستماع',ur:'نظام کے لیے ہدایات جیسی عبارت: مطالعے کے مواد سے خارج؛ دوبارہ سنیں'},
  'Low word confidence: replay this passage':{ar:'ثقة منخفضة في الكلمات: أعد الاستماع',ur:'الفاظ پر کم اعتماد: دوبارہ سنیں'},
};
export function uncertaintyText(values:string[],language:PreparedMaterialLanguage){
  return [...new Set(values.map(value=>{
    if(language!=='en')return flags[value]?.[language]||trustCopy(language,'unclear');
    return value.replace(/[.。۔]+$/u,'').trim();
  }))].join(' · ');
}
