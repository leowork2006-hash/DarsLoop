import Link from "next/link";
import Image from "next/image";
import { ArrowRight, LockKeyhole, Play, Plus } from "lucide-react";
import { LandingNav } from "@/components/landing-nav";
import { LandingFooter } from "@/components/landing-footer";
import { LandingNarrative } from "@/components/landing-narrative";
import { LandingProductGrid, LandingLessonJourney } from "@/components/landing-product-grid";
import { ProductTour } from "@/components/product-tour";
import { PracticePreview } from "@/components/practice-preview";
import { exampleLesson } from "@/lib/example";
import styles from "./landing-hero.module.css";

const questions = [
  ["How do I start?", "Start with a recording you have permission to use. Upload audio or video, add a selectable-text PDF, or record with this page open. DarsLoop prepares the available text, notes, questions and flashcards. Check important wording against the original lesson."],
  ["What files and lesson lengths can I upload?", "Audio and video imports can be up to 2 hours and 500 MiB. Supported formats include MP3, AAC/M4A, MP4, WAV, Ogg, WebM and FLAC. PDFs must contain selectable text, with a limit of 8 MB and 40 pages. Scanned image-only PDFs are not supported."],
  ["Can I use Arabic, Urdu or English?", "You can try Arabic, Urdu or English with the spoken-language hint. Speech recognition can miss meaning in noisy or mixed-language audio. Backup services cover fewer languages; native classroom quality is not yet verified. Choose a study-material language before preparation. Preparing notes in another language uses AI again. The interface stays in its current language, and source quotations keep their original words."],
  ["Can I record on my phone?", "Yes, with the browser page open. Browser recordings are limited to one hour, and locking your phone can pause recording. For a longer class, use your phone’s recorder, then upload the permitted file."],
  ["What if a lesson stops preparing or has missing words?", "Open the lesson to see its progress and any action needed. The original file and available text remain accessible. Long files can take longer; unclear speech may be missed, and partial notes only cover the prepared passages. If preparation fails, open the lesson and choose Try again or Retry study material. Check the original for any missing words."],
  ["Does DarsLoop give religious rulings?", "No. DarsLoop gives study answers from your selected lesson, with supporting passages. When support is missing or unclear, return to the original source or ask a qualified teacher. A citation to captured speech is not scholarly approval. DarsLoop can make mistakes; ask a qualified teacher for religious interpretation or advice about your situation."],
  ["Who can see my lessons and practice?", "Your lessons stay in your account until you share them. A private class lets invited members open permitted shared lessons. Your personal practice responses and review history stay private. Lesson preparation uses AI providers; only upload material you are allowed to use."],
  ["Can I try it before uploading anything?", "Yes. Explore the fictional example without signing in. Its prepared notes, audio and practice let you try the workflow without sending material to an AI provider. Practice on the landing page is not saved."],
];

export default function Landing() {
  const lesson = exampleLesson();
  return <div className={`editorial-site ${styles.site}`}>
    <a className="skip-link" href="#main">Skip to content</a>
    <LandingNav/>
    <main id="main">
      <section className={styles.hero} aria-labelledby="hero-title">
        <Image className={styles.clouds} src="/art/hero-clouds-v40.webp" alt="" fill sizes="100vw" preload unoptimized/>
        <div className={styles.copy}>
          <p className={styles.overline}><span/> For students of Islamic knowledge</p>
          <h1 id="hero-title" className={styles.title}>AI notes &amp; practice<br/><em>for Islamic classes.</em></h1>
          <p className={styles.lead}>Stay with the explanation. Read clear notes, ask about your lesson and practise what was covered.</p>
          <p className={styles.private}>Answers stay within your lesson, with passages you can check. Ask a qualified teacher for religious guidance.</p>
          <div className={styles.actions}><Link href="/signin" className={styles.primary}>Start learning <ArrowRight size={18}/></Link><Link href="/example" className={styles.secondary}><Play size={14} fill="currentColor"/> Explore the app</Link></div>
          <p className={styles.private}><LockKeyhole size={13}/> Your lessons are private until you share them.</p>
        </div>
        <div id="product" className={styles.stage}><ProductTour lesson={lesson}/></div>
      </section>
      <LandingNarrative/>
      <LandingProductGrid lesson={lesson}/>
      <LandingLessonJourney lesson={lesson}/>
      <section id="practice" className={styles.practice} aria-labelledby="practice-title">
        <div className={styles.practiceInner}><div className={styles.practiceCopy}><h2 id="practice-title">Make a little room<br/><em>for recall.</em></h2><p>Try a question. Turn over a card. Check what you remember against the class explanation.</p></div><PracticePreview lesson={lesson}/><Link href="/example" className={styles.exampleLink}>Explore the full lesson <ArrowRight size={15}/></Link></div>
      </section>
      <section id="questions" className={styles.faq} aria-labelledby="faq-title" data-landing-faq>
        <div className={styles.sectionHeading}><h2 id="faq-title">Before your<br/><em>first lesson.</em></h2><p>Clear answers, so you know where to start.</p></div>
        <div className={styles.faqGrid}>{questions.map(([q,a])=><details key={q}><summary>{q}<span><Plus size={17}/></span></summary><p>{a}</p></details>)}</div>
      </section>
      <section className={styles.closing} aria-labelledby="closing-title">
        <Image className={styles.closingImage} src="/art/study-courtyard-v42.webp" alt="An illustrated quiet courtyard at dawn, with a notebook, arches and distant hills" fill sizes="100vw" unoptimized/>
        <div className={styles.closingCopy}><h2 id="closing-title">Keep the lesson close.<br/><em>Keep learning.</em></h2><p>Notes, class answers and practice.<br/>Start with the lesson you already have.</p><Link href="/signin" className={styles.primary}>Start with DarsLoop <ArrowRight size={18}/></Link></div>
      </section>
    </main>
    <LandingFooter/>
  </div>;
}
