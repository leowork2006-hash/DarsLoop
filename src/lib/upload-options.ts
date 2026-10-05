// Source imports may be large. The prepared private audio stays within the
// existing storage/provider limit, independently of this upload allowance.
export const MAX_IMPORT_BYTES = 500 * 1024 * 1024;
export const MAX_STORED_AUDIO_BYTES = 24 * 1024 * 1024;
export const IMPORT_PART_BYTES = 4 * 1024 * 1024;
export function importPartSize(bytes:number,index:number) {
  if(!Number.isSafeInteger(bytes)||bytes<1||bytes>MAX_IMPORT_BYTES||!Number.isSafeInteger(index)||index<0||index>=Math.ceil(bytes/IMPORT_PART_BYTES))throw new Error("Invalid import part");
  return Math.min(IMPORT_PART_BYTES,bytes-index*IMPORT_PART_BYTES);
}
export const MEDIA_ACCEPT = "audio/*,video/mp4,video/webm,.mp3,.m4a,.aac,.wav,.mp4,.ogg,.webm,.flac";
export const MEDIA_EXTENSION = /\.(mp3|m4a|aac|wav|mp4|ogg|webm|flac)$/i;
