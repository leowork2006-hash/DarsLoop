import Link from "next/link";
import Image from "next/image";
import { ArrowRight, AudioLines, BookOpen, ChevronDown, LockKeyhole, Play, Users } from "lucide-react";
import { Brand, Mark } from "@/components/brand";
import { ProductTour } from "@/components/product-tour";
import { LandingFeatureShowcase, LandingStudyLoop } from "@/components/landing-feature-sections";
import { PracticePreview } from "@/components/practice-preview";
import { exampleLesson } from "@/lib/example";
import styles from "./landing-hero.module.css";

const questions = [
  ["Do I have to write the notes?", "No. Record with permission, or upload lesson audio you can use. DarsLoop prepares a transcript, notes, questions and flashcards. Check important wording against the recording."],
  ["Can I use it on my phone?", "Yes. Record with this page open, or upload audio from your phone’s recorder. Locking the phone can pause browser recording. Recordings are limited to one hour; your account keeps lessons and reviews together."],
  ["What if the classroom is noisy?", "Keep your microphone close to the teacher and check the level before recording. Noise reduction can help, but unclear or distant words can still be missed. Replay important passages."],
  ["Can I share a class?", "You can share permitted lesson audio and its notes with invited classmates in a private class. Your personal practice responses stay private."],
  ["Does it give religious rulings?", "No. Answers use the selected lesson’s explanation. Hadith lookup separately suggests possible publisher records with their existing grades. Ask a qualified teacher about interpretation, personal advice or the intended narration."],
];
export default function Landing() {
  const lesson = exampleLesson();
  return <div className={`editorial-site ${styles.site}`}>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className={`editorial-header editorial-container ${styles.header}`}>
      <Link href="/" aria-label="DarsLoop home"><Brand/></Link>
      <nav aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#practice">Practice</a><a href="#questions">Questions</a></nav>
      <div><Link className="editorial-signin" href="/signin">Sign in</Link><Link className="editorial-button small" href="/signin">Start learning <ArrowRight size={16}/></Link></div>
    </header>
    <main id="main">
      <section className={styles.hero} aria-labelledby="hero-title">
        <Image className={styles.clouds} src="/art/hero-clouds-v40.webp" alt="" fill sizes="100vw" preload unoptimized/>
        <div className={styles.copy}>
          <p className={styles.overline}><span/> For students of Islamic knowledge</p>
          <h1 id="hero-title" className={styles.title}>AI notes for<br/><em>Islamic classes.</em></h1>
          <p className={styles.lead}>Stay with the explanation. Turn your lesson into clear notes, answers you can trace, and practice for later.</p>
          <div className={styles.actions}><Link href="/signin" className={styles.primary}>Start learning <ArrowRight size={18}/></Link><Link href="/example" className={styles.secondary}><Play size={14} fill="currentColor"/> Explore the app</Link></div>
          <p className={styles.private}><LockKeyhole size={13}/> Your lessons are private until you share them.</p>
        </div>
        <div id="product" className={styles.stage}>
          <ProductTour lesson={lesson}/>
        </div>
      </section>
      <div className="editorial-audience editorial-container"><span>Learning has many places.</span><div><span>Alimiyyah</span><i/><span>Halaqahs</span><i/><span>Arabic classes</span><i/><span>Online lessons</span></div></div>
      <LandingFeatureShowcase lesson={lesson}/>
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
      <LandingStudyLoop lesson={lesson}/>
      <section id="questions" className="editorial-faq studio-faq editorial-container"><div className="editorial-copy"><h2>Before your<br/><em>first class.</em></h2><p>A few things to know.</p></div><div>{questions.map(([q,a])=><details key={q}><summary>{q}<ChevronDown size={18}/></summary><p>{a}</p></details>)}</div></section>
      <section className="editorial-closing"><Image src="/art/study-courtyard-v4.webp" alt="A sunlit courtyard, a blue notebook and quiet hills" fill sizes="100vw" unoptimized/><div><span>ONE CLASS IS A GOOD START.</span><h2>Let the lesson<br/><em>stay with you.</em></h2><Link href="/signin" className="editorial-button light">Start with DarsLoop <ArrowRight size={18}/></Link></div></section>
    </main>
    <footer className="editorial-footer editorial-container"><div className="editorial-footer-top"><div><Brand/><p>Notes and revision<br/>for Islamic classes.</p></div><div><h3>Get started</h3><Link href="/signin">Start learning</Link><Link href="/signin">Sign in</Link><a href="/example">Explore the app</a></div><div><h3>Study with DarsLoop</h3><a href="#how-it-works">Notes & class answers</a><a href="#practice">Quizzes & flashcards</a><a href="#questions">Questions & privacy</a></div><div className="editorial-footer-note"><Mark/><p>Built by a student.<br/>For the class you’re in.</p></div></div><div className="editorial-wordmark" aria-hidden="true">DarsLoop<span>.</span></div><div className="editorial-footer-bottom"><span>© 2026 DarsLoop</span><span>Your class is the starting point.</span></div></footer>
  </div>;
}
