import type { StudyNoteOptions } from "./types";
import type { SpokenLanguage } from "./spoken-language";

export const RECORDING_LIMIT_SECONDS = 60 * 60;
// Finish a little before the limit to allow a codec's final packet to flush.
export const RECORDING_STOP_SECONDS = RECORDING_LIMIT_SECONDS - 3;
export const RECORDING_BYTE_LIMIT = 23 * 1024 * 1024;
export type RecordingDraft = {
  id: string; ownerId: string; title: string; course: string; mime: string;
  createdAt: number; updatedAt: number; complete: boolean;
  permitted: boolean; synthetic: boolean; noteOptions: StudyNoteOptions;
  spokenLanguage?: SpokenLanguage;
};
type Chunk = { draftId: string; sequence: number; data: Blob };
const databaseName = "darsloop-recording-drafts-v1";

async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore("drafts", { keyPath: "id" });
      const chunks = db.createObjectStore("chunks", { keyPath: ["draftId", "sequence"] });
      chunks.createIndex("draftId", "draftId");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Local audio storage is busy."));
  });
}

async function write(operation: (transaction: IDBTransaction) => void): Promise<void> {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["drafts", "chunks"], "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Audio backup was interrupted."));
      operation(tx);
    });
  } finally { db.close(); }
}

export async function createRecordingDraft(draft: RecordingDraft) {
  await write(tx => { tx.objectStore("drafts").put(draft); });
}
export async function appendRecordingChunk(draft: RecordingDraft, sequence: number, data: Blob) {
  await write(tx => {
    tx.objectStore("chunks").put({ draftId: draft.id, sequence, data } satisfies Chunk);
    tx.objectStore("drafts").put({ ...draft, updatedAt: Date.now() });
  });
}
export async function completeRecordingDraft(draft: RecordingDraft) {
  await write(tx => { tx.objectStore("drafts").put({ ...draft, updatedAt: Date.now(), complete: true }); });
}

export async function recoverRecordingDraft(ownerId: string): Promise<{ draft: RecordingDraft; file: File } | null> {
  const db = await database();
  try {
    const drafts = await new Promise<RecordingDraft[]>((resolve, reject) => {
      const request = db.transaction("drafts").objectStore("drafts").getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    // Drafts never cross signed-in account boundaries on a shared device.
    const draft = drafts.filter(row => row.ownerId === ownerId).sort((a, b) => b.updatedAt - a.updatedAt)[0];
    if (!draft) return null;
    const chunks = await new Promise<Chunk[]>((resolve, reject) => {
      const request = db.transaction("chunks").objectStore("chunks").index("draftId").getAll(draft.id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (!chunks.length) { await deleteRecordingDraft(draft.id); return null; }
    const blob = new Blob(chunks.sort((a, b) => a.sequence - b.sequence).map(chunk => chunk.data), { type: draft.mime });
    return { draft, file: recordingFile(blob) };
  } finally { db.close(); }
}

export async function deleteRecordingDraft(id: string) {
  await write(tx => {
    tx.objectStore("drafts").delete(id);
    const request = tx.objectStore("chunks").index("draftId").openKeyCursor(IDBKeyRange.only(id));
    request.onsuccess = () => { const cursor = request.result; if (cursor) { tx.objectStore("chunks").delete(cursor.primaryKey); cursor.continue(); } };
  });
}
export function recordingFile(blob: Blob): File {
  const extension = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
  return new File([blob], `DarsLoop-recording.${extension}`, { type: blob.type });
}
