import Link from "next/link";
import Image from "next/image";
import { ArrowRight, AudioLines, BookOpen, ChevronDown, Headphones, LockKeyhole, Play, ShieldCheck, Users } from "lucide-react";
import { Brand, Mark, Wave } from "@/components/brand";
import { ProductTour } from "@/components/product-tour";
import { PracticePreview } from "@/components/practice-preview";
import { exampleLesson } from "@/lib/example";

const questions = [
  ["Do I have to write the notes?", "No. Record with permission, or upload lesson audio you can use. DarsLoop prepares a transcript, notes, questions and flashcards. Check important wording against the recording."],
  ["Can I use it on my phone?", "Yes. Record with this page open, or upload audio from your phone’s recorder. Locking the phone can pause browser recording. Recordings are limited to one hour; your account keeps lessons and reviews together."],
  ["What if the classroom is noisy?", "Keep your microphone close to the teacher and check the level before recording. Noise reduction can help, but unclear or distant words can still be missed. Replay important passages."],
  ["Can I share a class?", "You can share permitted lesson audio and its notes with invited classmates in a private class. Your personal practice responses stay private."],
  ["Does it give religious rulings?", "No. Answers use the selected lesson’s explanation. Hadith lookup separately suggests possible publisher records with their existing grades. Ask a qualified teacher about interpretation, personal advice or the intended narration."],
];
export default function Landing() {
  const lesson = exampleLesson();
  return <div className="editorial-site">
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="editorial-header editorial-container">
      <Link href="/" aria-label="DarsLoop home"><Brand/></Link>
      <nav aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#practice">Practice</a><a href="#questions">Questions</a></nav>
      <div><Link className="editorial-signin" href="/signin">Sign in</Link><Link className="editorial-button small" href="/signin">Start learning <ArrowRight size={16}/></Link></div>
    </header>
    <main id="main">
      <section className="editorial-hero editorial-container">
        <div className="editorial-hero-copy">
          <p className="editorial-overline"><span/> For students of Islamic knowledge</p>
          <h1>AI notes for<br/><em>Islamic classes.</em></h1>
          <p className="editorial-lead">Record your lesson. Get clear notes, ask questions and practise what you learned.</p>
          <div className="editorial-actions"><Link href="/signin" className="editorial-button">Start learning <ArrowRight size={18}/></Link><a href="/example" className="editorial-watch"><span><Play size={13} fill="currentColor"/></span> Explore the app</a></div>
          <p className="editorial-private"><LockKeyhole size={13}/> Your lessons are private until you share them.</p>
        </div>
        <div id="product" className="editorial-hero-stage">
          <Image className="editorial-textile" src="/art/study-textile-v5.webp" alt="" fill sizes="(max-width: 900px) 100vw, 60vw" unoptimized loading="eager"/>
          <ProductTour lesson={lesson}/>
        </div>
      </section>
      <div className="editorial-audience editorial-container"><span>Learning has many places.</span><div><span>Alimiyyah</span><i/><span>Halaqahs</span><i/><span>Arabic classes</span><i/><span>Online lessons</span></div></div>
      <section id="how-it-works" className="editorial-capture editorial-container">
        <div className="editorial-copy"><span className="editorial-step">01 / IN CLASS</span><h2>Less writing.<br/><em>More listening.</em></h2><p>Give the explanation your attention. Record with permission, or upload a lesson you’re allowed to use.</p><p>We’ll turn the audio into organised notes. Tap a time to hear the part you want to revisit.</p><a className="editorial-text-link" href="#product">See the notes <ArrowRight size={17}/></a></div>
        <div className="editorial-capture-art" aria-label="Illustration of recording and timestamp-linked notes">
          <div className="capture-orbit" aria-hidden="true"/>
          <div className="capture-audio-object"><span className="capture-object-icon"><AudioLines size={30}/></span><div><span>YOUR CLASS AUDIO</span><Wave animated/></div><span className="capture-object-light"/></div>
          <div className="capture-paper"><BookOpen size={21}/><span>FROM THE LESSON</span><h3>Listen first.<br/>Revisit later.</h3><p>Find the explanation in your notes. Hear it again in the teacher’s own words.</p><span className="capture-timestamp"><Play size={11} fill="currentColor"/> 0:24 <i>Original passage</i></span></div>
          <div className="capture-margin-note">The moment matters.<svg width="80" height="60" viewBox="0 0 80 60" fill="none" aria-hidden="true"><path d="M7 8C43 0 64 18 44 48M44 48l-2-15M44 48l15-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></div>
          <span className="editorial-art-caption">Illustrated recording and note</span>
        </div>
      </section>
      <section id="practice" className="editorial-practice">
        <div className="editorial-container editorial-practice-layout">
          <div className="editorial-copy"><span className="editorial-step">02 / AFTER CLASS</span><h2>Read it.<br/>Recall it.<br/><em>Remember it.</em></h2><p>A few questions from your class. A flashcard to turn over. The original explanation, one tap away.</p><p>Miss a point? It comes back sooner. Your review responses help you see what to revisit.</p><Link href="/signin" className="editorial-button">Make time for revision <ArrowRight size={18}/></Link><span className="editorial-preview-hint">Or try a question here →</span></div>
          <PracticePreview lesson={lesson}/>
        </div>
      </section>
      <section className="editorial-catchup editorial-container">
        <div className="editorial-circle-art" aria-label="Illustration of a privately shared lesson"><div className="circle-sheet back-sheet" aria-hidden="true"/><div className="circle-sheet"><span className="circle-share-heading"><Users size={21}/><span>Your study circle</span><LockKeyhole size={14}/></span><div className="circle-people" aria-hidden="true"><span>H</span><span>A</span><span>M</span><span>Y</span></div><h3>One lesson.<br/>A way to catch up.</h3><div className="circle-shared-lesson"><span><AudioLines size={25}/></span><div>Class audio & notes<small>Shared with invited classmates</small></div><ArrowRight size={18}/></div><p><LockKeyhole size={12}/> Private class · personal reviews stay yours</p></div><span className="editorial-art-caption">Illustrated private class</span></div>
        <div className="editorial-copy"><span className="editorial-step">03 / TOGETHER</span><h2>Missed a class?<br/><em>Keep up with your circle.</em></h2><p>Ask a classmate to share a permitted recording. Come back to the notes, ask about the lesson and practise at your own pace.</p><p>The audio and notes can be shared. Your answers and personal progress stay yours.</p><Link className="editorial-text-link" href="/signin">Create your study space <ArrowRight size={17}/></Link></div>
      </section>
      <section className="editorial-trust"><div className="editorial-container editorial-trust-layout"><div className="editorial-copy"><ShieldCheck size={30}/><h2>The teacher’s words.<br/><em>Always close.</em></h2><p>AI helps you study. Important wording still deserves a listen.</p></div><div className="editorial-trust-list"><article><Headphones size={22}/><div><h3>Go back to the moment.</h3><p>Notes and supported answers include the passage and its audio time.</p></div></article><article><BookOpen size={22}/><div><h3>A reference to check.</h3><p>Hadith lookup shows possible publisher records and their published grades. Your teacher confirms the intended source.</p></div></article><article><ShieldCheck size={22}/><div><h3>Room for “I don’t know.”</h3><p>When the lesson cannot support an answer, the app says so. Ask a qualified teacher for interpretation or personal advice.</p></div></article></div></div></section>
      <section id="questions" className="editorial-faq studio-faq editorial-container"><div className="editorial-copy"><h2>Before your<br/><em>first class.</em></h2><p>A few things to know.</p></div><div>{questions.map(([q,a])=><details key={q}><summary>{q}<ChevronDown size={18}/></summary><p>{a}</p></details>)}</div></section>
      <section className="editorial-closing"><Image src="/art/study-courtyard-v4.webp" alt="A sunlit courtyard, a blue notebook and quiet hills" fill sizes="100vw" unoptimized/><div><span>ONE CLASS IS A GOOD START.</span><h2>Let the lesson<br/><em>stay with you.</em></h2><Link href="/signin" className="editorial-button light">Start with DarsLoop <ArrowRight size={18}/></Link></div></section>
    </main>
    <footer className="editorial-footer editorial-container"><div className="editorial-footer-top"><div><Brand/><p>Notes and revision<br/>for Islamic classes.</p></div><div><h3>Get started</h3><Link href="/signin">Start learning</Link><Link href="/signin">Sign in</Link><a href="/example">Explore the app</a></div><div><h3>Study with DarsLoop</h3><a href="#how-it-works">Notes & class answers</a><a href="#practice">Quizzes & flashcards</a><a href="#questions">Questions & privacy</a></div><div className="editorial-footer-note"><Mark/><p>Built by a student.<br/>For the class you’re in.</p></div></div><div className="editorial-wordmark" aria-hidden="true">DarsLoop<span>.</span></div><div className="editorial-footer-bottom"><span>© 2026 DarsLoop</span><span>Your class is the starting point.</span></div></footer>
  </div>;
}
