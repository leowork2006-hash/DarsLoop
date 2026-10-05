"use client";

import { useRef, useState } from "react";
import { ArrowRight, Check, Copy, Headphones, LinkSimple, LockKey, Plus, ShareNetwork, UploadSimple, UsersThree, X } from "@phosphor-icons/react";
import { formatTime, type ClassGroup, type Lesson, type Workspace } from "@/lib/types";
import { api, message } from "./client-api";
import { Modal as NativeModal } from "./modal";

export type ClassesPageProps = {
  workspace: Workspace;
  refresh: () => Promise<void>;
  onOpen: (lesson: Lesson) => void;
  onError: (text: string) => void;
  onUpload: () => void;
};
type ClassAction = { action: "create"; name: string } | { action: "invite"; groupId: string }
  | { action: "share"; groupId: string; lessonId: string; permitted: true }
  | { action: "revoke"; groupId: string; lessonId: string };
type Invitation = { groupId: string; link: string; copied: boolean };
type Removal = { groupId: string; lessonId: string };

export function ClassesPage({ workspace, refresh, onOpen, onError, onUpload }: ClassesPageProps) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState("");
  const busyRef = useRef(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [notice, setNotice] = useState("");
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [lessonId, setLessonId] = useState("");
  const [permitted, setPermitted] = useState(false);
  const [search, setSearch] = useState("");
  const [removal, setRemoval] = useState<Removal | null>(null);

  const groups = workspace.groups;
  const ownLessons = workspace.lessons.filter(lesson => lesson.ownerId === workspace.userId && lesson.status === "ready" && !lesson.demo);
  const sharingClass = groups.find(group => group.id === sharingId);
  const chosenLesson = ownLessons.find(lesson => lesson.id === lessonId);
  const sharedIds = new Set(sharingClass?.lessons.map(lesson => lesson.id) ?? []);
  const eligibleLessons = ownLessons.filter(lesson => !sharedIds.has(lesson.id));
  const visibleLessons = eligibleLessons.filter(lesson => `${lesson.title} ${lesson.course}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const removingClass = groups.find(group => group.id === removal?.groupId);
  const removingLesson = removingClass?.lessons.find(lesson => lesson.id === removal?.lessonId);

  async function action(key: string, payload: ClassAction, done?: () => void) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(key); setNotice("");
    try {
      const result = await api<{ token?: string }>("/api/classes", { method: "POST", body: JSON.stringify(payload) });
      if (payload.action === "invite") {
        if (!result.token || !/^[a-f0-9]{48}$/.test(result.token)) throw new Error("The invitation wasn’t created. Please try again.");
        setInvitation({ groupId: payload.groupId, link: `${window.location.origin}/learn?invite=${result.token}`, copied: false });
      }
      done?.();
      await refresh();
      setNotice(payload.action === "create" ? "Private class created." : payload.action === "share" ? "Lesson shared with your class." : payload.action === "revoke" ? "Lesson removed from this class." : "Invitation ready to copy.");
    } catch (error) { onError(message(error)); }
    finally { busyRef.current = false; setBusy(""); }
  }

  function openSharing(group: ClassGroup) {
    setSharingId(group.id); setLessonId(""); setSearch(""); setPermitted(false);
  }

  async function copyInvitation(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setInvitation(current => current?.link === link ? { ...current, copied: true } : current);
    } catch { onError("Select the invitation link and copy it from the field below."); }
  }

  function openShared(id: string) {
    const lesson = workspace.lessons.find(value => value.id === id);
    if (lesson) onOpen(lesson);
    else onError("This lesson is no longer available. Refresh your workspace to check its access.");
  }

  function shareChosen() {
    if (!sharingClass || !chosenLesson || !permitted || sharedIds.has(chosenLesson.id)) return;
    void action(`share:${sharingClass.id}`, { action: "share", groupId: sharingClass.id, lessonId: chosenLesson.id, permitted: true }, () => setSharingId(null));
  }

  return <section className="classes-reference-page">
    <header className="classes-reference-heading"><div><h1>Private classes</h1><p>Catch up on lessons with your classmates.</p></div><span className="classes-private-pill"><LockKey size={15} /> Invite only</span></header>

    <aside className="classes-reference-intro"><span className="classes-intro-icon" aria-hidden="true"><UsersThree size={32} /></span><div><h2>A lesson you can return to together.</h2><p>Share permitted recordings, notes and practice. Each person’s answers stay private.</p></div></aside>

    <form className="classes-create-form" data-tour="classes-create" onSubmit={event => { event.preventDefault(); if (name.trim().length >= 2) void action("create", { action: "create", name: name.trim() }, () => setName("")); }}>
      <div><h2>Start a private class</h2><p>Give your class or study circle a name.</p></div>
      <label><span className="sr-only">Class name</span><input value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={80} required placeholder="e.g. Saturday Arabic circle" autoComplete="off" /></label>
      <button type="submit" className="classes-button classes-button-dark" disabled={!!busy || name.trim().length < 2}><Plus size={17} />{busy === "create" ? "Creating…" : "Create class"}</button>
    </form>

    <div className="classes-action-notice" role="status" aria-live="polite">{notice}</div>

    <section className="classes-content" data-tour="classes-content" aria-labelledby="classes-content-title">
      <header className="classes-content-heading"><h2 id="classes-content-title">Your classes <span>{groups.length}</span></h2><p>{groups.length ? "Lessons shared in your private classes." : "Your study circles will appear here."}</p></header>
      {groups.length ? <div className="classes-reference-list">{groups.map((group, index) => {
        const inviteForClass = invitation?.groupId === group.id ? invitation : null;
        const availableToShare = ownLessons.some(lesson => !group.lessons.some(shared => shared.id === lesson.id));
        return <article className="classes-reference-card" key={group.id}>
          <header className="classes-card-heading"><span className={`classes-group-icon ${index % 2 ? "lavender" : "cyan"}`} aria-hidden="true"><UsersThree size={25} /></span><div className="classes-card-title"><div><h3 dir="auto">{group.name}</h3><span className="classes-role-badge">{group.owner ? "Owner" : "Member"}</span></div><p>{group.memberCount} {group.memberCount === 1 ? "member" : "members"}<span>·</span>{group.lessons.length} shared {group.lessons.length === 1 ? "lesson" : "lessons"}</p></div><div className="classes-card-actions">{group.owner && <button type="button" className="classes-button" disabled={!!busy} onClick={() => void action(`invite:${group.id}`, { action: "invite", groupId: group.id })}><LinkSimple size={16} />{busy === `invite:${group.id}` ? "Creating…" : "Invite"}</button>}<button type="button" className="classes-button" disabled={!!busy} onClick={() => openSharing(group)}><Plus size={16} />Share a lesson</button></div></header>

          {inviteForClass && <div className="classes-invitation"><div className="classes-invitation-heading"><LinkSimple size={18} /><div><strong>Your private invitation</strong><p>One use · expires in 24 hours</p></div><button type="button" className="classes-icon-button" aria-label="Hide invitation" onClick={() => setInvitation(null)}><X size={18} /></button></div><div className="classes-invitation-copy"><label><span className="sr-only">Invitation link for {group.name}</span><input readOnly value={inviteForClass.link} onFocus={event => event.currentTarget.select()} /></label><button type="button" className="classes-button" onClick={() => void copyInvitation(inviteForClass.link)}>{inviteForClass.copied ? <Check size={16} /> : <Copy size={16} />}{inviteForClass.copied ? "Copied" : "Copy link"}</button></div><p className="classes-invitation-note">Send this link to one classmate. Create a new invitation for each person.</p></div>}

          <div className="classes-shared-lessons">{group.lessons.length ? group.lessons.map(shared => {
            const full = workspace.lessons.find(lesson => lesson.id === shared.id);
            const canRemove = group.owner || full?.ownerId === workspace.userId;
            return <div className="classes-shared-row" key={shared.id}><span className="classes-lesson-icon" aria-hidden="true"><Headphones size={23} /></span><button type="button" className="classes-lesson-open" onClick={() => openShared(shared.id)} disabled={!!busy || !full}><strong dir="auto">{shared.title}</strong><span dir="auto">{shared.course}{shared.demo ? " · Fictional example" : ""}{!full ? " · No longer available" : ""}</span></button><div className="classes-lesson-actions">{canRemove && <button type="button" className="classes-stop-sharing" disabled={!!busy} onClick={() => setRemoval({ groupId: group.id, lessonId: shared.id })}>Stop sharing</button>}<button type="button" className="classes-lesson-arrow" aria-label={`Open ${shared.title}`} disabled={!!busy || !full} onClick={() => openShared(shared.id)}><ArrowRight size={18} /></button></div></div>;
          }) : <div className="classes-shared-empty"><Headphones size={28} /><h4>No shared lessons yet</h4><p>{availableToShare ? "Choose one of your ready lessons to share with this class." : ownLessons.length ? "The lessons you can share will appear here." : "Upload a recording, or ask a classmate to share a lesson."}</p>{!ownLessons.length && <button type="button" className="classes-button" disabled={!!busy} onClick={onUpload}><UploadSimple size={16} /> Upload audio</button>}</div>}</div>
        </article>;
      })}</div> : <div className="classes-reference-empty"><span className="classes-empty-icon" aria-hidden="true"><UsersThree size={38} /></span><h3>Your first study circle starts here.</h3><p>Create a class above. Invite a classmate, then share a lesson you have permission to share.</p><div className="classes-empty-steps"><span><b>1</b>Create a class</span><ArrowRight size={15} /><span><b>2</b>Invite a classmate</span><ArrowRight size={15} /><span><b>3</b>Share a lesson</span></div></div>}
    </section>

    <footer className="classes-reference-note"><LockKey size={17} /><p>Only invited members can open shared lessons. Your review history stays private. Stopping a share blocks future access; it cannot remove a copy someone already downloaded.</p></footer>

    {sharingClass && <NativeModal title="Share a lesson" className="classes-reference-modal" onClose={() => setSharingId(null)}>
      <p className="classes-modal-description">Choose a recording for <strong dir="auto">{sharingClass.name}</strong>. Classmates receive its audio, transcript, notes and practice.</p>
      {eligibleLessons.length ? <form onSubmit={event => { event.preventDefault(); shareChosen(); }}>
        {eligibleLessons.length > 3 && <label className="classes-modal-search"><span className="sr-only">Find one of your lessons</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a lesson…" /></label>}
        <fieldset className="classes-choose-lessons"><legend>Choose one of your lessons</legend>{visibleLessons.length ? visibleLessons.map(lesson => <label key={lesson.id} className={lessonId === lesson.id ? "is-selected" : ""}><input type="radio" name="shared-lesson" value={lesson.id} checked={lessonId === lesson.id} onChange={() => { setLessonId(lesson.id); setPermitted(false); }} /><Headphones size={22} /><span><strong dir="auto">{lesson.title}</strong><small dir="auto">{lesson.course} · {formatTime(lesson.duration)}</small></span>{lessonId === lesson.id && <Check size={17} />}</label>) : <p className="classes-no-match">No lessons match that search.</p>}</fieldset>
        <label className="classes-share-permission"><input type="checkbox" checked={permitted} onChange={event => setPermitted(event.target.checked)} /><span>I have permission to share this recording and its study material with these classmates.</span></label>
        <p className="classes-share-detail">Your personal answers stay private. Only the current lesson version is shared.</p>
        <div className="classes-modal-actions"><button type="button" className="classes-button" onClick={() => setSharingId(null)}>Cancel</button><button type="submit" className="classes-button classes-button-dark" disabled={!!busy || !chosenLesson || !permitted || sharedIds.has(chosenLesson.id)}><ShareNetwork size={17} />{busy === `share:${sharingClass.id}` ? "Sharing…" : "Share lesson"}</button></div>
      </form> : <div className="classes-share-empty"><Headphones size={31} /><h3>{ownLessons.length ? "Your ready lessons are already shared here." : "Add a lesson to share."}</h3><p>{ownLessons.length ? "New recordings will be available here once they’re ready." : "You can share a recording you uploaded or recorded yourself, once it’s ready."}</p><button type="button" className="classes-button classes-button-dark" onClick={() => { setSharingId(null); onUpload(); }}><UploadSimple size={17} />Upload audio</button></div>}
    </NativeModal>}

    {removal && removingClass && removingLesson && <NativeModal title="Stop sharing this lesson?" className="classes-reference-modal classes-removal-modal" onClose={() => setRemoval(null)}><p className="classes-modal-description">Members of <strong dir="auto">{removingClass.name}</strong> will no longer be able to open this shared lesson. The original recording stays with its owner.</p><div className="classes-removal-preview"><Headphones size={24} /><div><strong dir="auto">{removingLesson.title}</strong><span dir="auto">{removingLesson.course}</span></div></div><p className="classes-share-detail">This cannot remove a copy already downloaded.</p><div className="classes-modal-actions"><button type="button" className="classes-button" disabled={!!busy} onClick={() => setRemoval(null)}>Keep sharing</button><button type="button" className="classes-button classes-button-dark" disabled={!!busy} onClick={() => void action(`revoke:${removal.groupId}:${removal.lessonId}`, { action: "revoke", groupId: removal.groupId, lessonId: removal.lessonId }, () => setRemoval(null))}>{busy.startsWith("revoke:") ? "Stopping…" : "Stop sharing"}</button></div></NativeModal>}
  </section>;
}
