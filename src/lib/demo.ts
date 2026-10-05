import type { Artifacts, Segment } from "./types";
// Original fictional script; prepared study material, never represented as a live AI result.
export const demoScript = [
  "Welcome to this fictional study lesson. Today we are practising how to listen, make useful notes, and return to a lesson afterwards. This is a demonstration of a learning workflow, not religious guidance.",
  "In this class I use the word adab to mean considerate conduct while learning. A practical example is letting the speaker finish before asking a question. Write your question down briefly, then return your attention to the explanation.",
  "Listening and writing can compete for your attention. Do not try to copy every sentence while the teacher is speaking. First follow the explanation. Afterwards, use the recording to fill in the points you missed.",
  "For revision, I use the term murajaah to mean returning to what we studied. After the lesson, close your notes and try to explain one idea in your own words. Then compare your explanation with the original passage.",
  "If you were absent, start with the lesson overview. Choose the point you do not understand, and listen to that part of the recording. A summary is a starting point; it is not a replacement for the full explanation.",
  "A short quiz can show you what you still need to revisit. If an answer is wrong, return to the passage before trying again. Tomorrow, review that question once more. This schedule is a practice suggestion, not a promise about memory.",
  "Sometimes a narration is mentioned without a full reference. Keep the teacher's words separate from any source you look up. If the wording or intended reference is unclear, ask the teacher rather than guessing.",
  "Finally, this lesson only covered listening, class conduct, catch-up, and revision. It did not discuss personal religious rulings. For interpretation or applying religious teachings to your own situation, ask a qualified teacher."
];
export function demoArtifacts(segments:Segment[]):Artifacts {
  const cite=(i:number)=>[{segmentId:segments[i].id,quote:segments[i].text}];
  return {
    overview:"A short fictional lesson about listening in class, catching up after an absence, and revising with the original explanation.",
    notes:[
      {heading:"Give the explanation your attention",text:"The teacher suggests following the explanation first and filling gaps from the recording afterwards. Trying to copy every sentence can distract from listening.",evidence:cite(2)},
      {heading:"Return to the idea, then check it",text:"Close your notes, explain one idea in your own words, and compare it with the teacher’s passage. In this lesson, the teacher calls this revision murajaah.",evidence:cite(3)},
      {heading:"Catch up one point at a time",text:"After an absence, start with the overview and replay the part you need. The teacher says a summary is a starting point, not a replacement for the full explanation.",evidence:cite(4)},
      {heading:"Use mistakes to choose your next review",text:"If a quiz answer is wrong, revisit the passage and try again. The teacher suggests another review tomorrow without promising a particular memory result.",evidence:cite(5)},
    ],
    terms:[{term:"Adab",definition:"Considerate conduct while learning, as used in this lesson.",evidence:cite(1)},{term:"Murajaah",definition:"Returning to what was studied, as defined by this teacher.",evidence:cite(3)}],
    practice:[
      {id:"quiz-listening",kind:"quiz",question:"What does the teacher suggest doing while the explanation is happening?",answer:"Follow the explanation first, then fill gaps afterwards.",choices:["Follow the explanation first, then fill gaps afterwards.","Copy every sentence as it is spoken.","Use only the summary and skip the recording."],evidence:cite(2)},
      {id:"quiz-absence",kind:"quiz",question:"Where does the teacher suggest starting after an absence?",answer:"Read the overview, then replay the point you need.",choices:["Read the overview, then replay the point you need.","Treat the summary as a replacement for the lesson.","Wait until the next class and ignore the missed lesson."],evidence:cite(4)},
      {id:"card-adab",kind:"flashcard",question:"How does this teacher use the word adab?",answer:"Considerate conduct while learning; for example, letting the speaker finish before asking a question.",choices:[],evidence:cite(1)},
      {id:"card-murajaah",kind:"flashcard",question:"What revision exercise does the teacher describe?",answer:"Close your notes, explain one idea in your own words, then compare it with the original passage.",choices:[],evidence:cite(3)},
    ]
  };
}
