import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const base = process.env.TEST_ORIGIN || "http://127.0.0.1:3000";
const checks: string[] = [];
function pass(name: string) { checks.push(name); process.stdout.write(`PASS ${name}\n`); }
const page = await fetch(`${base}/example`, { redirect: "manual" });
assert.equal(page.status, 200); const html = await page.text();
assert.ok(html.includes("No account needed")); assert.ok(html.includes("PREPARED EXAMPLE NOTES"));
assert.ok(html.includes("fictional-example")); assert.ok(html.includes("Teacher’s words"));
assert.ok(!html.includes("SUPABASE_SECRET_KEY")); assert.ok(!html.includes("fixtures/demo.mp3"));
assert.equal(page.headers.get("set-cookie"), null); pass("prepared example opens without an account or account cookie");
assert.ok(html.includes("quiz-listening") && html.includes("card-murajaah") && html.includes("Ask this lesson")); pass("example carries notes, passage search and prepared quiz/flashcard data");
assert.ok(html.includes("practice resets when you leave")); pass("temporary practice is labelled, without claiming saved reviews");
const landing = await (await fetch(base)).text(); assert.ok(landing.includes('href="/example"')); pass("landing links directly to the account-free example");
const old = await fetch(`${base}/learn?example=1`, { redirect: "manual" }); assert.ok([307,308].includes(old.status)); assert.equal(new URL(old.headers.get("location")!, base).pathname, "/example"); pass("old example link redirects to the public example");
const privateArea = await fetch(`${base}/api/workspace`);
if(privateArea.status===200){const local=await privateArea.json();assert.equal(local.accountMode,"local");assert.equal(local.lessons.length,1);assert.equal(local.lessons[0].demo,true);pass("loopback-only local workspace contains one explicitly fictional example");}
else{assert.equal(privateArea.status,401);pass("public example does not unlock a hosted private workspace");}
for (const action of ["chat", "review"]) { const r = await fetch(`${base}/api/lessons/fictional-example/${action}`, { method: "POST", headers: { "Content-Type": "application/json", Origin: base }, body: JSON.stringify({ question: "revision", version: 1, itemId: "quiz-listening", answer: "x" }) }); assert.equal(r.status, 401); pass(`private ${action} API still requires an account`); }
const fixture = await readFile("fixtures/demo.mp3"), audio = await fetch(`${base}/example/audio`); assert.equal(audio.status, 200); assert.equal(audio.headers.get("content-type"), "audio/mpeg"); assert.deepEqual(Buffer.from(await audio.arrayBuffer()), fixture); pass("public audio is exactly the authored fictional fixture");
const part = await fetch(`${base}/example/audio`, { headers: { Range: "bytes=32-127" } }); assert.equal(part.status, 206); assert.equal(part.headers.get("content-range"), `bytes 32-127/${fixture.length}`); assert.deepEqual(Buffer.from(await part.arrayBuffer()), fixture.subarray(32,128)); pass("audio seeking returns the exact requested bytes");
const invalid = await fetch(`${base}/example/audio`, { headers: { Range: `bytes=${fixture.length+1}-` } }); assert.equal(invalid.status, 416); pass("invalid audio ranges are rejected");
const head = await fetch(`${base}/example/audio`, { method: "HEAD" }); assert.equal(head.status, 200); assert.equal(head.headers.get("content-length"), String(fixture.length)); assert.equal((await head.arrayBuffer()).byteLength,0); pass("audio metadata request has no body");
const injected = await fetch(`${base}/example/audio?path=.env.local&lessonId=private`); assert.deepEqual(Buffer.from(await injected.arrayBuffer()),fixture); pass("audio route cannot select a private file or lesson through query parameters");
const mutate = await fetch(`${base}/example/audio`, { method:"POST" }); assert.equal(mutate.status,405); pass("public example exposes no audio mutation method");
await mkdir("verification", { recursive:true }); await writeFile("verification/public-example.json",JSON.stringify({checkedAt:new Date().toISOString(),scope:"Actual HTTP/SSR and audio-boundary checks, with explicit local-vs-hosted workspace expectations. No browser interaction, microphone or visual QA performed. Authored fictional speech was generated with eSpeak NG; see fixture provenance. No live AI request is made by the public example.",checks},null,2));
