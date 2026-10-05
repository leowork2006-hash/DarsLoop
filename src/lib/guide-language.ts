export type GuideLanguage = "en" | "ar" | "ur";
export const guideLanguages = [{id:"en",name:"English",glyph:"Aa"},{id:"ar",name:"العربية",glyph:"ع"},{id:"ur",name:"اردو",glyph:"ا"}] as const;
export const guideSelectionCopy = {
 en:{intro:"A short introduction, in a language you’re comfortable with.",scope:"This changes the welcome guide. The rest of the interface is currently in English. Your teacher’s lesson stays in its original language.",continue:"Continue"},
 ar:{intro:"تعرّف على التطبيق باللغة التي تناسبك.",scope:"يغيّر هذا لغة الدليل الترحيبي فقط. بقية واجهة التطبيق بالإنجليزية حالياً، ويبقى درس المعلّم بلغته الأصلية.",continue:"متابعة"},
 ur:{intro:"اپنی پسند کی زبان میں ایپ کا مختصر تعارف دیکھیں۔",scope:"اس سے صرف تعارفی رہنما کی زبان بدلتی ہے۔ باقی ایپ فی الحال انگریزی میں ہے۔ استاد کا سبق اپنی اصل زبان میں رہے گا۔",continue:"آگے بڑھیں"},
} as const;
export const guideCopy = {
 en:{welcome:"Your first class starts here.",description:"Add a recording. We’ll prepare the notes, questions and flashcards, with a way back to the teacher’s explanation.",add:"Add my first lesson",tour:"Show me around",back:"Back",skip:"Skip",next:"Next",done:"Got it",label:"QUICK TOUR",change:"Guide language",step:[
 ["Start with your class.","Record or upload permitted audio. Your notes and practice follow from that recording."],
 ["Come back to what you learned.","Quizzes and flashcards save when to return. Missed points come back sooner."],
 ["See what needs another look.","Insights brings together your saved responses and points you found difficult."],
 ["Keep up with your classmates.","Create a private class and share recordings you have permission to share."]]},
 ar:{welcome:"ابدأ بدرسك الأول.",description:"أضف تسجيلاً مسموحاً به. نُعدّ لك الملاحظات والأسئلة وبطاقات المراجعة، مع رابط للعودة إلى شرح المعلّم.",add:"إضافة درسي الأول",tour:"عرّفني بالتطبيق",back:"السابق",skip:"تخطّي",next:"التالي",done:"فهمت",label:"جولة سريعة",change:"لغة الدليل",step:[
 ["ابدأ بدرسك.","سجّل الصوت بإذن أو ارفع تسجيلاً مسموحاً به. تُعدّ الملاحظات والمراجعة من هذا التسجيل."],
 ["راجع ما تعلّمته.","تحدّد الأسئلة وبطاقات المراجعة موعد العودة. تظهر النقاط التي فاتتك في وقت أقرب."],
 ["اعرف ما يحتاج إلى مراجعة.","يجمع قسم التقدّم إجاباتك المحفوظة والنقاط التي وجدتها صعبة."],
 ["تعلّم مع زملائك.","أنشئ صفاً خاصاً وشارك التسجيلات التي لديك إذن بمشاركتها."]]},
 ur:{welcome:"اپنے پہلے سبق سے آغاز کریں۔",description:"اجازت کے ساتھ کی گئی ریکارڈنگ شامل کریں۔ ہم نوٹس، سوالات اور یادداشت کے کارڈ تیار کریں گے، اور استاد کی وضاحت تک واپس جانے کا راستہ بھی دیں گے۔",add:"میرا پہلا سبق شامل کریں",tour:"ایپ کا تعارف دکھائیں",back:"پیچھے",skip:"چھوڑ دیں",next:"اگلا",done:"سمجھ گیا",label:"مختصر تعارف",change:"رہنما کی زبان",step:[
 ["اپنے سبق سے آغاز کریں۔","اجازت کے ساتھ ریکارڈ کریں یا ریکارڈنگ اپ لوڈ کریں۔ نوٹس اور مشق اسی ریکارڈنگ سے بنیں گے۔"],
 ["جو سیکھا ہے اسے دہرائیں۔","سوالات اور کارڈ اگلی مشق کا وقت محفوظ کرتے ہیں۔ چھوٹے ہوئے نکات جلد دوبارہ آئیں گے۔"],
 ["دیکھیں کہاں دوبارہ توجہ دینی ہے۔","پیش رفت کا حصہ آپ کے محفوظ جوابات اور مشکل نکات ایک جگہ دکھاتا ہے۔"],
 ["اپنے ہم جماعتوں کے ساتھ سیکھیں۔","نجی کلاس بنائیں اور وہ ریکارڈنگ شیئر کریں جس کی اجازت آپ کے پاس ہے۔"]]},
} as const;
const key="darsloop-welcome-guide-language";
export const welcomeEntryCopy = {
 en:{languageTitle:"Choose your guide language.",lessonTitle:"Start with your first lesson.",step:"WELCOME",description:"Record a class or upload audio. Get notes, questions and flashcards from that lesson.",record:"Record a lesson",recordHint:"Use your microphone",upload:"Upload a recording",uploadHint:"Choose an audio file",explore:"Explore first",exploreHint:"A quick tour of your study space",skip:"Skip for now",notes:"Class notes",audio:"Teacher’s words",practice:"A little practice"},
 ar:{languageTitle:"اختر لغة الدليل.",lessonTitle:"ابدأ بدرسك الأول.",step:"مرحباً بك",description:"سجّل درساً أو ارفع تسجيلاً. احصل على ملاحظات وأسئلة وبطاقات مراجعة من الدرس نفسه.",record:"تسجيل درس",recordHint:"استخدم الميكروفون",upload:"رفع تسجيل",uploadHint:"اختر ملفاً صوتياً",explore:"استكشف أولاً",exploreHint:"جولة قصيرة في مساحة الدراسة",skip:"التخطّي الآن",notes:"ملاحظات الدرس",audio:"كلمات المعلّم",practice:"مراجعة قصيرة"},
 ur:{languageTitle:"رہنما کی زبان منتخب کریں۔",lessonTitle:"اپنے پہلے سبق سے آغاز کریں۔",step:"خوش آمدید",description:"سبق ریکارڈ کریں یا آڈیو اپ لوڈ کریں۔ اسی سبق سے نوٹس، سوالات اور یادداشت کے کارڈ حاصل کریں۔",record:"سبق ریکارڈ کریں",recordHint:"اپنا مائیکروفون استعمال کریں",upload:"ریکارڈنگ اپ لوڈ کریں",uploadHint:"آڈیو فائل منتخب کریں",explore:"پہلے ایپ دیکھیں",exploreHint:"اپنی مطالعے کی جگہ کا مختصر تعارف",skip:"ابھی چھوڑ دیں",notes:"سبق کے نوٹس",audio:"استاد کے الفاظ",practice:"مختصر مشق"},
} as const;
export function readGuideLanguage():GuideLanguage {try{const value=localStorage.getItem(key);if(value==="ar"||value==="ur")return value;}catch{}return "en";}
export function saveGuideLanguage(language:GuideLanguage){try{localStorage.setItem(key,language);}catch{}}
