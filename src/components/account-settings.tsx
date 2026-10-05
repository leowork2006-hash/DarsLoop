"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, BookOpen, Laptop, Headphones, LockKey, SignOut, Translate, UsersThree } from "@phosphor-icons/react";
import { guideLanguages, type GuideLanguage } from "@/lib/guide-language";
import type { Workspace } from "@/lib/types";
import { api, message } from "./client-api";
import { ThemeControl } from "./theme-control";
import { Modal } from "./modal";

export type AccountSettingsProps = {
  workspace: Workspace;
  guideLanguage: GuideLanguage;
  onGuideLanguage: () => void;
  onClose: () => void;
  onError: (text: string) => void;
};
const sections = [{ id: "account", label: "Account" }, { id: "study", label: "Study preferences" }, { id: "privacy", label: "Privacy" }] as const;
type Section = typeof sections[number]["id"];

export function AccountSettings({ workspace, guideLanguage, onGuideLanguage, onClose, onError }: AccountSettingsProps) {
  const [section, setSection] = useState<Section>("account");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const cloud = workspace.accountMode === "supabase";
  const language = guideLanguages.find(value => value.id === guideLanguage)!;
  const ownLessonCount = workspace.lessons.filter(lesson => lesson.ownerId === workspace.userId && !lesson.demo).length;

  function moveTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % sections.length;
    else if (event.key === "ArrowLeft") next = (index + sections.length - 1) % sections.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = sections.length - 1;
    else return;
    event.preventDefault(); setSection(sections[next].id); tabs.current[next]?.focus();
  }

  async function signOut() {
    if (saving.current) return;
    saving.current = true; setBusy(true);
    try { await api("/api/account", { method: "POST", body: JSON.stringify({ action: "signout" }) }); window.location.assign("/"); }
    catch (error) { onError(message(error)); saving.current = false; setBusy(false); }
  }

  return <Modal title="Your account" className="account-settings-modal" onClose={onClose}>
    <div className="account-settings-tabs" role="tablist" aria-label="Account settings">{sections.map((value, index) => <button type="button" key={value.id} ref={element => { tabs.current[index] = element; }} id={`account-tab-${value.id}`} role="tab" aria-selected={section === value.id} aria-controls="account-settings-panel" tabIndex={section === value.id ? 0 : -1} onKeyDown={event => moveTab(event, index)} onClick={() => setSection(value.id)}>{value.label}</button>)}</div>
    <div className="account-settings-panel" id="account-settings-panel" role="tabpanel" aria-labelledby={`account-tab-${section}`} tabIndex={0}>
      {section === "account" ? <>
        <div className="account-settings-identity"><span className="account-settings-avatar" aria-hidden="true"><img src="/art/hoopoe-guide-v10.png" width="68" height="68" alt="" /></span><div><h3>Your study space</h3><p>{cloud ? "Saved to your private account" : "Saved on this device"}</p></div><span className="account-settings-mode"><LockKey size={13} />{cloud ? "Private account" : "Local session"}</span></div>
        <dl className="account-settings-details"><div><dt><BookOpen size={17} />Your recordings</dt><dd>{ownLessonCount} {ownLessonCount === 1 ? "lesson" : "lessons"}</dd></div><div><dt><UsersThree size={17} />Private classes</dt><dd>{workspace.groups.length}</dd></div><div><dt><Laptop size={17} />Storage</dt><dd>{cloud ? "Your account" : "This browser"}</dd></div></dl>
        <p className="account-settings-help">{cloud ? "Your recordings stay private until you choose to share one with a class. Each person’s practice history stays their own." : "This workspace uses a local browser session. Clearing its cookies removes access. Account sign-in is not active in this mode."}</p>
        {cloud && <div className="account-settings-signout"><div><h4>Sign out on this device</h4><p>Your saved lessons stay in your account.</p></div><button type="button" className="account-settings-button" disabled={busy} onClick={() => void signOut()}><SignOut size={17} />{busy ? "Signing out…" : "Sign out"}</button></div>}
      </> : section === "study" ? <>
        <div className="account-theme"><div><h3>Appearance</h3><p>Choose light, dark, or your device setting.</p></div><ThemeControl/></div><header className="account-settings-section-heading"><h3>A guide in your language</h3><p>Choose the language for welcome screens and feature guides.</p></header>
        <div className="account-settings-preference"><span className="account-settings-preference-icon" aria-hidden="true"><Translate size={25} /></span><div><h4>Guide language</h4><p lang={language.id}>{language.name}</p></div><button type="button" className="account-settings-button" onClick={() => { onClose(); onGuideLanguage(); }}>Change language<ArrowRight size={15} /></button></div>
        <p className="account-settings-help">The app currently uses English. This changes the guide only; your teacher’s lesson stays in its original language.</p>
        <div className="account-settings-tip"><Headphones size={21} /><div><h4>Start with the original words.</h4><p>You can replay the teacher’s audio from your notes, answers and practice.</p></div></div>
      </> : <>
        <header className="account-settings-section-heading"><h3>Your lessons, your choice</h3><p>Share with permission. Keep your own progress private.</p></header>
        <div className="account-settings-privacy-list"><article><LockKey size={22} /><div><h4>Only invited classmates</h4><p>A shared lesson includes its audio, transcript, notes and practice. Your responses remain private. You can stop sharing from Private classes.</p></div></article><article><BookOpen size={22} /><div><h4>Use fictional recordings for this demo</h4><p>Use made-up lessons without real student details. AI services process the audio and transcript when you add a lesson.</p></div></article><article><Laptop size={22} /><div><h4>Recording backups on this device</h4><p>This browser keeps audio chunks while you record. Open Record a lesson to recover or discard an unfinished recording. A successful save removes the local draft. Clearing browser storage removes these backups.</p></div></article><article><Headphones size={22} /><div><h4>Keep the teacher’s audio close</h4><p>AI notes and answers can be wrong. Replay important wording and ask a qualified teacher for religious guidance.</p></div></article></div>
        <p className="account-settings-help">Stopping a share blocks future access. It cannot remove a copy someone already downloaded.</p>
      </>}
    </div>
  </Modal>;
}
