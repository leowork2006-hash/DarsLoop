import busboy from "busboy";
import { createWriteStream } from "node:fs";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { MAX_IMPORT_BYTES } from "./upload-options";

export class ImportError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// Stream the source to a private, server-chosen path. Never accumulate a large
// multipart request in memory, trust its filename, or use its reported MIME.
export async function readImportForm(req: Request, target: string, maxBytes = MAX_IMPORT_BYTES) {
  if (!req.body) throw new ImportError(400, "Choose a recording first.");
  const length = Number(req.headers.get("content-length"));
  if (length > maxBytes + 50_000) throw new ImportError(413, "Choose a file up to 500 MB.");
  let parser;
  try {
    parser = busboy({ headers: { "content-type": req.headers.get("content-type") || "" }, limits: { files: 1, fileSize: maxBytes + 1, fields: 12, fieldSize: 4096, parts: 14 } });
  } catch { throw new ImportError(400, "Choose an audio or video file."); }
  const form = new FormData();
  let size = 0, total = 0, fileCount = 0, problem: ImportError | undefined;
  const writes: Promise<void>[] = [];
  parser.on("field", (name, value, info) => {
    if (info.nameTruncated || info.valueTruncated || form.has(name)) problem = new ImportError(400, "The upload settings are not valid.");
    form.append(name, value);
  });
  parser.on("file", (name, stream) => {
    fileCount++;
    if (name !== "audio") { problem = new ImportError(400, "Choose one recording."); stream.resume(); return; }
    stream.on("data", chunk => { size += chunk.length; if(size>maxBytes)problem=new ImportError(413,"Choose a file up to 500 MB."); });
    stream.on("limit", () => { problem = new ImportError(413, "Choose a file up to 500 MB."); });
    // Attach a rejection handler immediately; malformed/disconnected requests
    // must not leave an unhandled writer rejection or an open temporary file.
    writes.push(pipeline(stream, createWriteStream(target, { flags: "wx", mode: 0o600 })).catch(() => {
      problem ??= new ImportError(400, "The file did not finish uploading. Try again.");
    }));
  });
  for (const event of ["filesLimit", "fieldsLimit", "partsLimit"] as const) parser.on(event, () => { problem = new ImportError(400, "Choose one recording with valid upload settings."); });
  const bound = new Transform({ transform(chunk, _encoding, next) {
    total += chunk.length;
    next(total > maxBytes + 50_000 ? new ImportError(413, "Choose a file up to 500 MB.") : null, chunk);
  } });
  try {
    await pipeline(Readable.fromWeb(req.body as Parameters<typeof Readable.fromWeb>[0]), bound, parser, { signal: req.signal });
  } catch (error) {
    problem = error instanceof ImportError ? error : new ImportError(400, "The file did not finish uploading. Try again.");
  } finally { await Promise.all(writes); }
  if (problem) throw problem;
  if (fileCount !== 1 || !size) throw new ImportError(400, "Choose a recording first.");
  return form;
}
