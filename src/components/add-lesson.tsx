"use client";
import type { SpokenLanguage } from "@/lib/spoken-language";
import { SpokenLanguageField } from "./spoken-language";
import type { StudyMaterialLanguage } from "@/lib/study-material-language";
import { StudyMaterialLanguageField } from "./study-material-language";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, Cards, Check, DownloadSimple, Microphone, Square, UploadSimple, WarningCircle } from "@phosphor-icons/react";
import { Modal } from "./modal";
import { api, message } from "./client-api";
import { uploadLesson } from "./import-client";
import { formatTime, type Lesson, type StudyNoteOptions } from "@/lib/types";
import { appendRecordingChunk, completeRecordingDraft, createRecordingDraft, deleteRecordingDraft, recoverRecordingDraft, recordingFile, RECORDING_BYTE_LIMIT, RECORDING_STOP_SECONDS, type RecordingDraft } from "@/lib/recording-draft";

type Props = { onClose: () => void; onAdded: (lesson: Lesson) => void; initialMode?: "upload" | "record"; onUpload?: () => void; userId: string };
export function AddLesson({ onClose, onAdded, onUpload, userId }: Props) {
  const [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState("");
  const [title, setTitle] = useState(""), [course, setCourse] = useState("");
  const [spokenLanguage,setSpokenLanguage]=useState<SpokenLanguage>("auto");
  const [studyLanguage,setStudyLanguage]=useState<StudyMaterialLanguage>("auto");
  const [permitted, setPermitted] = useState(false), [synthetic, setSynthetic] = useState(false);
  const [notes, setNotes] = useState(true), [detail, setDetail] = useState<StudyNoteOptions["detail"]>("standard");
  const [recording, setRecording] = useState(false), [starting, setStarting] = useState(false), [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0), [level, setLevel] = useState(0), [error, setError] = useState("");
  const [notice, setNotice] = useState(""), [backupWarning, setBackupWarning] = useState("");
  const [awake, setAwake] = useState(true), [wakeState, setWakeState] = useState(false), [confirmClose, setConfirmClose] = useState(false), [recovering, setRecovering] = useState(true);
  const recorder = useRef<MediaRecorder | null>(null), media = useRef<MediaStream | null>(null), audioContext = useRef<AudioContext | null>(null);
  const mounted = useRef(true), active = useRef(false), startingRef = useRef(false), saving = useRef(false), started = useRef(0), stopping = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null), frame = useRef(0), wake = useRef<WakeLockSentinel | null>(null);
  const draft = useRef<RecordingDraft | null>(null), chunks = useRef<Blob[]>([]), persisted = useRef<Promise<void>>(Promise.resolve()), bytes = useRef(0);
  const keepAwake = useRef(awake);
  useEffect(() => { keepAwake.current = awake; if (!awake) void releaseWake(); else if (active.current) void acquireWake(); }, [awake]);
  useEffect(() => { if (!file) return; const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  function closeContext() { const context = audioContext.current; audioContext.current = null; if (context && context.state !== "closed") void context.close().catch(() => {}); }
  async function releaseWake() { const lock = wake.current; wake.current = null; if (lock && !lock.released) await lock.release().catch(() => {}); if (mounted.current) setWakeState(false); }
  async function acquireWake() {
    if (!keepAwake.current || !active.current || document.visibilityState !== "visible" || wake.current && !wake.current.released) return;
    try {
      const lock = await navigator.wakeLock?.request("screen"); if (!lock) return;
      if (!active.current || !mounted.current || !keepAwake.current) { await lock.release(); return; }
      wake.current = lock; setWakeState(true);
      lock.addEventListener("release", () => { if (wake.current === lock) wake.current = null; if (mounted.current) setWakeState(false); });
    } catch { if (mounted.current) setWakeState(false); }
  }
  function finishCapture(reason?: string) {
    if (!active.current || stopping.current) return; stopping.current = true;
    if (reason && mounted.current) setNotice(reason);
    if (recorder.current?.state !== "inactive") recorder.current?.stop();
  }
  function tick() {
    if (!active.current) return;
    const elapsed = Math.floor((Date.now() - started.current) / 1000); if (mounted.current) setSeconds(elapsed);
    if (elapsed >= RECORDING_STOP_SECONDS) finishCapture("The one-hour limit was reached. Preparing the audio captured so far.");
  }
  useEffect(() => {
    mounted.current = true;
    void recoverRecordingDraft(userId).then(recovered => {
      if (!mounted.current || !recovered) return;
      draft.current = recovered.draft; setFile(recovered.file); setTitle(recovered.draft.title); setCourse(recovered.draft.course);
      setPermitted(recovered.draft.permitted); setSynthetic(recovered.draft.synthetic); setNotes(recovered.draft.noteOptions.enabled); setDetail(recovered.draft.noteOptions.detail); setSpokenLanguage(recovered.draft.spokenLanguage||"auto"); setStudyLanguage(recovered.draft.noteOptions.language||"auto");
      setNotice(recovered.draft.complete ? "Your saved recording is still on this device. Listen, then prepare it when you’re ready." : "Recovered the audio this browser saved before it closed. Listen first; the end may be missing.");
    }).catch(() => { if (mounted.current) setBackupWarning("This browser could not open local audio backups. Keep this page open while recording."); }).finally(() => { if (mounted.current) setRecovering(false); });
    const visibility = () => {
      if (!active.current) return; tick();
      if (document.visibilityState === "hidden") { try { if (recorder.current?.state === "recording") recorder.current.requestData(); } catch {} }
      else { void acquireWake(); if (mounted.current) setNotice("You left the recording screen. Check the audio afterward; your phone may have paused the microphone."); }
    };
    const leaving = (event: BeforeUnloadEvent) => { if (active.current || saving.current || startingRef.current) { event.preventDefault(); event.returnValue = ""; } };
    document.addEventListener("visibilitychange", visibility); window.addEventListener("beforeunload", leaving);
    return () => {
      mounted.current = false; document.removeEventListener("visibilitychange", visibility); window.removeEventListener("beforeunload", leaving);
      if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
      media.current?.getTracks().forEach(track => track.stop()); if (timer.current) clearInterval(timer.current);
      cancelAnimationFrame(frame.current); closeContext(); void releaseWake();
    };
  }, [userId]);
  function backup(operation: () => Promise<void>) {
    persisted.current = persisted.current.then(operation).catch(() => { if (mounted.current) setBackupWarning("Local backup did not finish. Keep this page open, then download your audio if saving fails."); });
  }
  async function save(audio: File, captured: RecordingDraft) {
    if (saving.current) return; saving.current = true; setBusy(true); setError("");
    draft.current = captured; await createRecordingDraft({ ...captured, updatedAt: Date.now(), complete: true }).catch(() => {});
    try {
      const controller = new AbortController();
      const lesson = await uploadLesson(audio,{title:captured.title,course:captured.course||"My lessons",permitted:captured.permitted,synthetic:captured.synthetic,spokenLanguage:captured.spokenLanguage||"auto",noteOptions:captured.noteOptions},controller.signal);
      if (!lesson.id) throw new Error("Saving was not confirmed. Check My lessons before trying again.");
      await deleteRecordingDraft(captured.id).catch(() => {}); draft.current = null; if (mounted.current) onAdded(lesson);
    } catch (failure) { if (mounted.current) setError(`${message(failure)} Your audio is still here. Check My lessons before retrying if the connection dropped.`); }
    finally { saving.current = false; if (mounted.current) setBusy(false); }
  }
  async function start() {
    if (startingRef.current || active.current || saving.current || file || recovering) return;
    if (!permitted || !synthetic) { setError("Confirm both audio permissions before starting."); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setError("This browser cannot record audio. Upload a recording instead."); return; }
    startingRef.current = true; setStarting(true); setError(""); setNotice("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true } });
      if (!mounted.current) { stream.getTracks().forEach(track => track.stop()); return; } media.current = stream;
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find(type => MediaRecorder.isTypeSupported(type));
      const rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 48_000 });
      recorder.current = rec; chunks.current = []; bytes.current = 0; stopping.current = false;
      const captured: RecordingDraft = { id: crypto.randomUUID(), ownerId: userId, title: title.trim() || `Lesson · ${new Date().toLocaleDateString()}`, course: course.trim() || "My lessons", mime: rec.mimeType || mime || "audio/webm", createdAt: Date.now(), updatedAt: Date.now(), complete: false, permitted, synthetic, spokenLanguage, noteOptions: { enabled: notes, detail, language:studyLanguage } };
      draft.current = captured; setTitle(captured.title);
      await createRecordingDraft(captured).catch(() => setBackupWarning("Local backup is unavailable. Keep this page open until the audio is saved."));
      if (!mounted.current) { stream.getTracks().forEach(track => track.stop()); return; }
      rec.ondataavailable = event => {
        if (!event.data.size) return; const sequence = chunks.current.length; chunks.current.push(event.data); bytes.current += event.data.size;
        backup(() => appendRecordingChunk(captured, sequence, event.data));
        if (bytes.current >= RECORDING_BYTE_LIMIT) finishCapture("The file limit was reached. Preparing the audio captured so far."); else tick();
      };
      rec.onstop = async () => {
        active.current = false; if (timer.current) clearInterval(timer.current); cancelAnimationFrame(frame.current); closeContext(); void releaseWake(); stream.getTracks().forEach(track => track.stop());
        backup(() => completeRecordingDraft(captured)); await persisted.current;
        const audio = recordingFile(new Blob(chunks.current, { type: captured.mime })); if (!mounted.current) return;
        setRecording(false); setLevel(0); setConfirmClose(false);
        if (!audio.size) { setError("No audio was captured. Check microphone access and try again."); await deleteRecordingDraft(captured.id).catch(() => {}); draft.current = null; return; }
        setFile(audio); await save(audio, captured);
      };
      rec.onerror = () => { if (mounted.current) setNotice("The microphone was interrupted. Saving the audio captured so far."); finishCapture(); };
      stream.getAudioTracks().forEach(track => {
        track.addEventListener("ended", () => finishCapture("The microphone disconnected. Preparing the audio captured so far."));
        track.addEventListener("mute", () => { if (mounted.current && active.current) setNotice("The microphone is paused by your device. Keep this page open and listen to the recording afterward."); });
      });
      started.current = Date.now(); active.current = true; rec.start(5_000); setSeconds(0); setRecording(true); timer.current = setInterval(tick, 1_000); void acquireWake();
      // Level metering must never block microphone capture.
      try {
        const context = new AudioContext(); audioContext.current = context; const source = context.createMediaStreamSource(stream), analyser = context.createAnalyser(); analyser.fftSize = 256; source.connect(analyser);
        const values = new Uint8Array(analyser.fftSize);
        const meter = () => { if (!mounted.current || !active.current) return; analyser.getByteTimeDomainData(values); setLevel(Math.max(...values.map(value => Math.abs(value - 128))) / 128); frame.current = requestAnimationFrame(meter); }; meter();
      } catch {}
    } catch { active.current = false; media.current?.getTracks().forEach(track => track.stop()); closeContext(); setError("Microphone access is unavailable. Allow it in your browser, or upload an audio file."); setRecording(false); }
    finally { startingRef.current = false; if (mounted.current) setStarting(false); }
  }
  function close() { if (recording || startingRef.current) { setConfirmClose(true); return; } if (saving.current) { setNotice("Keep this window open while your audio saves."); return; } onClose(); }
  async function discard() { try { if (draft.current) await deleteRecordingDraft(draft.current.id); draft.current = null; setFile(null); setSeconds(0); setNotice(""); setError(""); setPreview(""); } catch { setError("The local draft could not be removed. Try again before starting a new recording."); } }
  const locked = recording || starting || busy;
  return <Modal title={busy ? "Saving your recording" : file ? "Your recording" : "Record a lesson"} onClose={close} className="recording-modal">
    <p className="recording-intro">{busy ? "Your notes and practice will prepare next." : file ? "Listen to the audio, then continue." : "Record your class. We’ll prepare the rest."}</p>
    <div className={`recording-studio ${recording ? "is-recording" : ""} ${busy ? "is-saving" : ""}`} aria-live="off"><span className="recording-mic"><Microphone size={32}/></span><span className="recording-state">{busy ? "Saving audio…" : recording ? "Recording" : recovering ? "Checking for saved audio…" : file ? "Audio recovered on this device" : "Ready when you are"}</span><strong className="recording-clock" aria-label={`${formatTime(seconds)} elapsed`}>{formatTime(seconds)}</strong><div className="recording-levels" aria-label={`Microphone level ${Math.round(level * 100)} percent`}>{Array.from({ length: 25 }, (_, i) => <i key={i} className={recording && i / 25 < level ? "lit" : ""}/>)}</div><span className="recording-limit">1 hour max · Private audio</span></div>
    {file && <audio className="recording-preview" controls src={preview} aria-label="Preview recovered recording"/>}
    {notice && <p className="recording-notice" role="status">{notice}</p>}
    {!recording && !busy && <label className="field recording-title">Lesson name <span>(optional)</span><input value={title} maxLength={160} disabled={locked} onChange={event => setTitle(event.target.value)} placeholder="e.g. Arabic · Lesson 1"/></label>}
    {!recording && !busy && <SpokenLanguageField value={spokenLanguage} onChange={setSpokenLanguage} disabled={locked}/>}
    {!recording && !busy && <StudyMaterialLanguageField value={studyLanguage} onChange={setStudyLanguage} disabled={locked}/>}
    {!recording && !busy && <details className="recording-options"><summary>Study options <span>{notes ? detail === "short" ? "Quick notes" : detail === "detailed" ? "Detailed notes" : "Balanced notes" : "Notes off"}</span></summary><label className="field">Course <span>(optional)</span><input value={course} maxLength={100} onChange={event => setCourse(event.target.value)} placeholder="e.g. Arabic"/></label><label className="recording-check"><input type="checkbox" checked={notes} onChange={event => setNotes(event.target.checked)}/> Make study notes</label>{notes && <label className="field">Note detail<select value={detail} onChange={event => setDetail(event.target.value as StudyNoteOptions["detail"])}><option value="short">Quick · main points</option><option value="standard">Balanced · points and explanations</option><option value="detailed">Detailed · more of the lesson</option></select></label>}<p>{notes ? "Notes, a short summary, transcript and supported practice are prepared from your audio." : "Your transcript and supported practice are prepared. Notes and summary stay off."}</p></details>}
    {!file && !busy && <div className="recording-consent"><label><input type="checkbox" checked={permitted} onChange={event => setPermitted(event.target.checked)} disabled={locked}/><span>I have permission to record and use this lesson.</span></label><label><input type="checkbox" checked={synthetic} onChange={event => setSynthetic(event.target.checked)} disabled={locked}/><span>This contest demo uses fictional audio only, with no real personal or sensitive information.</span></label></div>}
    {!file && <div className="recording-screen-option"><label><input type="checkbox" checked={awake} onChange={event => setAwake(event.target.checked)}/> Keep my screen awake</label>{recording && <span>{wakeState ? "Active" : "Unavailable"}</span>}<p>Keep this page open. Locking your phone can pause the microphone. For screen-off recording, use your phone’s recorder and upload the audio.</p></div>}
    {backupWarning && <p className="recording-backup-warning"><WarningCircle size={16}/>{backupWarning}</p>}{error && <p className="inline-error" role="alert">{error}</p>}
    {confirmClose ? <div className="recording-close-choice"><p>Stop and prepare your lesson?</p><div><button className="recording-button" onClick={() => setConfirmClose(false)}>Keep recording</button><button className="recording-button recording-button-dark" disabled={starting} onClick={() => finishCapture()}><Square size={14} weight="fill"/> Stop & prepare</button></div></div> : <footer className="recording-footer">{file ? <><button className="recording-button" disabled={busy} onClick={() => void discard()}>Discard local draft</button><div><a className="recording-button" href={preview} download={file.name}><DownloadSimple size={17}/> Download</a><button className="recording-button recording-button-dark" disabled={busy || !permitted || !synthetic} onClick={() => { if (draft.current) { const updated = { ...draft.current, title: title.trim() || draft.current.title, course: course.trim() || "My lessons", permitted, synthetic, spokenLanguage, noteOptions: { enabled: notes, detail, language:studyLanguage } }; void save(file, updated); } }}>{busy ? "Saving…" : "Save & prepare"}<ArrowRight size={17}/></button></div></> : <><button className="recording-button" disabled={locked} onClick={onUpload}><UploadSimple size={17}/> Upload instead</button><button className={`recording-button recording-button-dark ${recording ? "recording-stop" : ""}`} disabled={busy || starting || recovering || !permitted || !synthetic} onClick={() => recording ? finishCapture() : void start()}>{recording ? <><Square size={14} weight="fill"/> Stop & prepare</> : <><Microphone size={18}/>{starting ? "Opening microphone…" : "Start recording"}</>}</button></>}</footer>}
    {!file && !recording && !busy && <div className="recording-includes"><span><BookOpen size={14}/> Notes & transcript</span><span><Cards size={14}/> Quiz & cards</span><span><Check size={14}/> Study plan</span></div>}
  </Modal>;
}
