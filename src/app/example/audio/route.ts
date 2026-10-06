import { readFile } from "node:fs/promises";
import path from "node:path";
import { fail, localRequest } from "@/lib/http";
import { parseRange } from "@/lib/media";

export const runtime = "nodejs";
async function audio(req: Request, head = false) {
  try {
    localRequest(req);
    const bytes = await readFile(path.join(process.cwd(), "fixtures/demo-five-pillars.mp3")), size = bytes.length;
    let range;
    try { range = parseRange(req.headers.get("range"), size); }
    catch { return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}`, "Cache-Control": "no-store" } }); }
    const start = range?.start ?? 0, end = range?.end ?? size - 1;
    return new Response(head ? null : new Uint8Array(bytes.subarray(start, end + 1)), {
      status: range ? 206 : 200,
      headers: { "Content-Type": "audio/mpeg", "Content-Length": String(end - start + 1), "Accept-Ranges": "bytes", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...(range ? { "Content-Range": `bytes ${start}-${end}/${size}` } : {}) },
    });
  } catch (e) { return fail(e); }
}
export async function GET(req: Request) { return audio(req); }
export async function HEAD(req: Request) { return audio(req, true); }
