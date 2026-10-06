import Link from "next/link";
import Image from "next/image";
import { ArrowRight, LockKeyhole, Play, Plus } from "lucide-react";
import { Brand } from "@/components/brand";
import { LandingAudienceTicker, LandingNarrative } from "@/components/landing-narrative";
import { LandingProductGrid, LandingLessonJourney } from "@/components/landing-product-grid";
import { ProductTour } from "@/components/product-tour";
import { PracticePreview } from "@/components/practice-preview";
import { exampleLesson } from "@/lib/example";
import styles from "./landing-hero.module.css";

const questions = [
  ["How do I start?", "Start with a recording you have permission to use. Upload audio or video, add a selectable-text PDF, or record with this page open. DarsLoop prepares the available text, notes, questions and flashcards. Check important wording against the original lesson."],
  ["What files and lesson lengths can I upload?", "Audio and video imports can be up to 2 hours and 500 MiB. Supported formats include MP3, AAC/M4A, MP4, WAV, Ogg, WebM and FLAC. PDFs must contain selectable text, with a limit of 8 MB and 40 pages. Scanned image-only PDFs are not supported."],
  ["Can I use Arabic, Urdu or English?", "Yes. Choose the spoken-language hint when adding audio, and the notes language when preparing a lesson. Speech recognition can miss words, especially in noisy or mixed-language classes. Preparing notes in another language makes a new AI request; changing between Summary and Detailed does not."],
  ["Can I record on my phone?", "Yes, with the browser page open. Browser recordings are limited to one hour, and locking your phone can pause recording. For a longer class, use your phone’s recorder, then upload the permitted file."],
  ["What if a lesson stops preparing or has missing words?", "Open the lesson to see its progress and any action needed. The original file and available text remain accessible. Long files can take longer; unclear speech may be missed, and partial notes only cover the prepared passages. Follow the lesson’s retry or preparation controls and check the original."],
  ["Does DarsLoop give religious rulings?", "Class answers stay within your selected lesson and show supporting passages where available. DarsLoop can make mistakes. Ask a qualified teacher for religious guidance, interpretation or advice for your own situation."],
  ["Who can see my lessons and practice?", "Your lessons stay in your account until you share them. A private class lets invited members open permitted shared lessons. Your personal practice responses and review history stay private. Lesson preparation uses AI providers; only upload material you are allowed to use."],
  ["Can I try it before uploading anything?", "Yes. Explore the fictional example without signing in. Its prepared notes, audio and practice let you try the workflow without sending material to an AI provider. Practice on the landing page is not saved."],
];

export default function Landing() {
  const lesson = exampleLesson();
  return <div className={`editorial-site ${styles.site}`}>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className={`editorial-header ${styles.header}`}>
      <Link href="/" aria-label="DarsLoop home"><Brand/></Link>
      <nav aria-label="Main navigation"><a href="#features">Features</a><a href="#how-it-works">How it works</a><a href="#practice">Practice</a><a href="#questions">Questions</a></nav>
      <div><Link className="editorial-signin" href="/signin">Sign in</Link><Link className="editorial-button small" href="/signin">Start learning <ArrowRight size={16}/></Link></div>
    </header>
    <main id="main">
      <section className={styles.hero} aria-labelledby="hero-title">
        <Image className={styles.clouds} src="/art/hero-clouds-v40.webp" alt="" fill sizes="100vw" preload unoptimized/>
        <div className={styles.copy}>
          <p className={styles.overline}><span/> For students of Islamic knowledge</p>
          <h1 id="hero-title" className={styles.title}>AI notes &amp; practice<br/><em>for Islamic classes.</em></h1>
          <p className={styles.lead}>Stay with the explanation. Read clear notes, ask about your lesson and practise what was covered.</p>
          <div className={styles.actions}><Link href="/signin" className={styles.primary}>Start learning <ArrowRight size={18}/></Link><Link href="/example" className={styles.secondary}><Play size={14} fill="currentColor"/> Explore the app</Link></div>
          <p className={styles.private}><LockKeyhole size={13}/> Your lessons are private until you share them.</p>
        </div>
        <div id="product" className={styles.stage}><ProductTour lesson={lesson}/></div>
      </section>
      <LandingNarrative/>
      <LandingAudienceTicker/>
      <LandingProductGrid lesson={lesson}/>
      <LandingLessonJourney lesson={lesson}/>
      <section id="practice" className={styles.practice} aria-labelledby="practice-title">
        <div className={styles.practiceInner}><div className={styles.practiceCopy}><span className={styles.eyebrow}>A SMALL START AFTER CLASS</span><h2 id="practice-title">Give the lesson<br/><em>a try.</em></h2><p>Try a question, turn over a card or take a mock exam. The class explanation is there when you need it.</p><p className={styles.sampleNote}>This is a fictional example. Practice here isn’t saved.</p><Link href="/example" className={styles.secondary}>Open the full example <ArrowRight size={17}/></Link></div><PracticePreview lesson={lesson}/></div>
      </section>
      <section id="questions" className={styles.faq} aria-labelledby="faq-title" data-landing-faq>
        <div className={styles.sectionHeading}><span className={styles.eyebrow}>A FEW THINGS TO KNOW</span><h2 id="faq-title">Before your<br/><em>first lesson.</em></h2><p>Clear answers, so you know where to start.</p></div>
        <div className={styles.faqGrid}>{questions.map(([q,a])=><details key={q}><summary>{q}<span><Plus size={17}/></span></summary><p>{a}</p></details>)}</div>
      </section>
      <section className={styles.closing} aria-labelledby="closing-title">
        <Image className={styles.closingImage} src="/art/study-courtyard-v42.webp" alt="An illustrated quiet courtyard at dawn, with a notebook, arches and distant hills" fill sizes="100vw" unoptimized/>
        <div className={styles.closingCopy}><span className={styles.eyebrow}>ONE CLASS IS A GOOD START</span><h2 id="closing-title">Keep the lesson close.<br/><em>Keep learning.</em></h2><p>Notes, class answers and practice.<br/>Start with the lesson you already have.</p><Link href="/signin" className={styles.primary}>Start with DarsLoop <ArrowRight size={18}/></Link></div>
      </section>
    </main>
    <footer className={styles.footer}>
      <div className={styles.footerLinks}><div className={styles.footerIntro}><Brand/><p>Notes and practice<br/>for Islamic classes.</p></div><div><h3>Get started</h3><Link href="/signin">Start learning</Link><Link href="/example">Explore the example</Link></div><div><h3>Your study tools</h3><a href="#features">Notes &amp; class answers</a><a href="#practice">Quizzes &amp; flashcards</a><a href="#how-it-works">How it works</a></div><div><h3>Good to know</h3><a href="#questions">Questions &amp; privacy</a><Link href="/signin">Your account</Link><p>Built by a student.<br/>For the class you’re in.</p></div></div>
      <Link className={styles.footerBrand} href="/" aria-label="DarsLoop home"><Brand/></Link>
      <div className={styles.footerBottom}><span>© 2026 DarsLoop</span><span>Your class is the starting point.</span></div>
    </footer>
  </div>;
}
