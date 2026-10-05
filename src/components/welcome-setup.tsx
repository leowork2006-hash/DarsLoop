"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Compass, Microphone, UploadSimple } from "@phosphor-icons/react";
import { Modal } from "./modal";
import { guideCopy, guideSelectionCopy, guideLanguages, welcomeEntryCopy, type GuideLanguage } from "@/lib/guide-language";

export type WelcomeAction = "record" | "upload" | "tour";
export function WelcomeSetup({ initialLanguage, onClose, onStart }: {
  initialLanguage: GuideLanguage;
  onClose: (language: GuideLanguage) => void;
  onStart: (language: GuideLanguage, action: WelcomeAction) => void;
}) {
  const [language, setLanguage] = useState(initialLanguage);
  const [stage, setStage] = useState(0);
  const copy = guideCopy[language], entry = welcomeEntryCopy[language], selection = guideSelectionCopy[language];
  const content = useRef<HTMLDivElement>(null);
  const rtl = language !== "en";
  // Move keyboard focus to the new screen rather than leaving it on a removed button.
  useEffect(() => { content.current?.focus(); }, [stage]);

  return <Modal title={stage === 0 ? entry.languageTitle : entry.lessonTitle} className="onboarding-modal reference-onboarding" wide onClose={() => onClose(language)}>
    <div className="welcome-progress" lang={language} dir={rtl ? "rtl" : "ltr"}>
      <span>{entry.step} <bdi>{stage + 1} / 2</bdi></span>
      <div role="progressbar" aria-label={entry.step} aria-valuemin={0} aria-valuemax={2} aria-valuenow={stage + 1}><i style={{ width: `${(stage + 1) * 50}%` }} /></div>
    </div>
    <div key={stage} className="welcome-screen" ref={content} tabIndex={-1} lang={language} dir={rtl ? "rtl" : "ltr"} aria-label={stage === 0 ? entry.languageTitle : entry.lessonTitle}>
      {stage === 0 ? <div className="welcome-language">
        <p>{selection.intro}</p>
        <div className="welcome-language-options" role="group" aria-label={entry.languageTitle}>
          {guideLanguages.map(item => <button key={item.id} aria-pressed={language === item.id} onClick={() => setLanguage(item.id)}>
            <span className={`language-glyph glyph-${item.id}`} aria-hidden="true">{item.glyph}</span>
            <strong lang={item.id}>{item.name}</strong>
            <span className="language-check">{language === item.id && <Check size={16} />}</span>
          </button>)}
        </div>
        <p className="welcome-language-scope">{selection.scope}</p>
        <div className="welcome-footer"><button className="text-link" onClick={() => onClose(language)}>{entry.skip}</button><button className="button primary" onClick={() => setStage(1)}>{selection.continue}<ArrowRight size={17} /></button></div>
      </div> : <>
        <div className="welcome-first-lesson" lang={language} dir={rtl ? "rtl" : "ltr"}>
          <div className="welcome-reference-companion" aria-hidden="true"><img src="/art/hoopoe-guide-v10.png" width="88" height="88" alt=""/></div>
          <div className="welcome-entry-content">
            <p>{entry.description}</p>
            <div className="welcome-entry-actions">
              <button className="welcome-action" onClick={() => onStart(language, "record")}><span className="welcome-action-icon record-icon"><Microphone size={23} /></span><span><strong>{entry.record}</strong><small>{entry.recordHint}</small></span><ArrowRight size={18} /></button>
              <button className="welcome-action" onClick={() => onStart(language, "upload")}><span className="welcome-action-icon upload-icon"><UploadSimple size={23} /></span><span><strong>{entry.upload}</strong><small>{entry.uploadHint}</small></span><ArrowRight size={18} /></button>
            </div>
            <button className="welcome-explore" onClick={() => onStart(language, "tour")}><Compass size={17} /><span><strong>{entry.explore}</strong><small>{entry.exploreHint}</small></span><ArrowRight size={15} /></button>
          </div>
        </div>
        <div className="welcome-footer"><button className="text-link" onClick={() => setStage(0)}><ArrowLeft size={15} />{copy.back}</button><button className="text-link" onClick={() => onClose(language)}>{entry.skip}</button></div>
      </>}
    </div>
  </Modal>;
}
