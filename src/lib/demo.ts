import type { Artifacts, Segment } from "./types";
// Original authored synthetic lesson. Basic definitions checked against the
// publisher references in RELIGIOUS-SOURCES.md; never a live AI or scholar result.
export const demoTitle="The five pillars of Islam";
export const demoCourse="Introduction to Islam";
export const demoScript = [
 "Welcome to this fictional introductory lesson about the five pillars of Islam. The voice, class and study material are prepared for a product demonstration. This is an overview of basic terms, not a religious ruling or advice about anyone's situation.",
 "The five pillars named in this lesson are the testimony of faith, prayer, zakah, fasting in Ramadan, and pilgrimage. These are distinct parts of the overview. This short lesson introduces their meanings; it does not explain all their conditions or detailed rulings.",
 "Shahadah refers to the testimony of faith. In this overview, it concerns belief in Allah as the only one worthy of worship and Muhammad as His Messenger. The lesson describes the testimony as one pillar; it does not count its two parts as two separate pillars.",
 "Salah refers to prayer. The overview describes five daily prayers. Prayer is presented separately from fasting and charity. This lesson does not cover how to perform a prayer, what makes it valid, or exceptions for a particular person.",
 "Zakah is an obligatory financial act of worship. It is distinct from voluntary charity. Detailed rules depend on matters that this introduction has not covered. No amount due from an individual is calculated in this lesson.",
 "Sawm refers here to fasting during Ramadan. The basic description is abstaining from food and drink from dawn until sunset as worship. This introduction does not decide whether someone's fast is valid or discuss personal exemptions.",
 "Hajj refers to pilgrimage to Makkah. The overview describes it as a duty for those who are able. It does not assess an individual's ability or describe the pilgrimage rituals. Questions about those details require a qualified teacher and an appropriate source.",
 "To review this lesson, distinguish the five pillars and return to the original passage for each definition. The notes and practice only use this script. For religious interpretation, detailed rulings or applying a teaching to your own situation, ask a qualified teacher."
];
export function demoArtifacts(segments:Segment[]):Artifacts {
 const cite=(i:number)=>[{segmentId:segments[i].id,quote:segments[i].text}];
 return {
  language:"en",overview:"A prepared fictional introduction to the five pillars of Islam. Basic definitions, with clear limits on detailed rulings and personal advice.",
  notes:[
   {heading:"Five pillars, distinct parts",text:"The five pillars named in this lesson are the testimony of faith, prayer, zakah, fasting in Ramadan, and pilgrimage.",evidence:cite(1)},
   {heading:"The testimony of faith",text:"The lesson describes the testimony as one pillar; it does not count its two parts as two separate pillars.",evidence:cite(2)},
   {heading:"Prayer and charity",text:"The overview describes five daily prayers. Zakah is an obligatory financial act of worship. It is distinct from voluntary charity.",evidence:[...cite(3),...cite(4)]},
   {heading:"Fasting and pilgrimage",text:"The lesson introduces fasting during Ramadan and pilgrimage to Makkah for those who are able. It does not decide personal cases or detailed rulings.",evidence:[...cite(5),...cite(6)]},
  ],
  terms:[{term:"Shahadah",definition:"The testimony of faith, described as one pillar in this overview.",evidence:cite(2)},{term:"Salah",definition:"Prayer; the overview describes five daily prayers.",evidence:cite(3)}],
  practice:[
   {id:"quiz-testimony",kind:"quiz",question:"How does this overview count the two parts of the testimony of faith?",answer:"As one pillar, rather than two separate pillars.",choices:["As one pillar, rather than two separate pillars.","As two separate pillars.","It does not include the testimony of faith."],evidence:cite(2)},
   {id:"quiz-zakah",kind:"quiz",question:"What distinction does this lesson make about zakah?",answer:"It is an obligatory financial act of worship, distinct from voluntary charity.",choices:["It is an obligatory financial act of worship, distinct from voluntary charity.","It is described as only voluntary charity.","The lesson calculates each person's amount due."],evidence:cite(4)},
   {id:"card-prayer",kind:"flashcard",question:"What does the overview describe about daily prayer, and what does it leave out?",answer:"It describes five daily prayers. It does not cover how to perform prayer, its validity, or personal exceptions.",choices:[],evidence:cite(3)},
   {id:"card-pilgrimage",kind:"flashcard",question:"How does the overview describe pilgrimage and the limit of this lesson?",answer:"Hajj is pilgrimage to Makkah for those who are able. The lesson does not assess an individual's ability or describe the rituals.",choices:[],evidence:cite(6)},
  ]
 };
}
