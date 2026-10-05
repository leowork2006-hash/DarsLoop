import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import { logHostMemory } from "./host-memory.mjs";

const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY", "GROQ_API_KEY", "GEMINI_API_KEY"];
if (process.env.DARSLOOP_BACKEND !== "supabase" || required.some(name => !process.env[name])) {
  console.error("Cloud mode and all private service connections must be configured before hosting.");
  process.exit(1);
}
let origin;
try { origin = new URL(process.env.DARSLOOP_ORIGIN); } catch { console.error("Set the exact HTTPS DarsLoop origin before hosting."); process.exit(1); }
if (origin.protocol !== "https:" || origin.pathname !== "/" || origin.search || origin.hash || origin.username || origin.password) {
  console.error("The hosted app requires an exact HTTPS origin, without a path or credentials."); process.exit(1);
}
const port = process.env.PORT || "3000";
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) { console.error("The hosting port is invalid."); process.exit(1); }

const env = { ...process.env, NODE_ENV: "production" };
// Cloud source pieces, prepared audio and job checkpoints are durable in
// Supabase. These directories contain only disposable processing files.
const dataDir = process.env.DARSLOOP_DATA_DIR || path.join(process.cwd(), ".data");
await Promise.all(["jobs", "imports"].map(name => rm(path.join(dataDir, name), { recursive: true, force: true })));
const children = [
  spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0", "--port", port], { stdio: "inherit", env }),
  spawn(process.execPath, ["--import", "tsx", "scripts/worker.ts"], { stdio: "inherit", env }),
];
await logHostMemory("spawned");
for (const seconds of [5, 30]) setTimeout(() => void logHostMemory(`startup-${seconds}s`), seconds * 1000).unref();
setInterval(() => void logHostMemory("running"), 60_000).unref();
let closing = false;
function shutdown(code) {
  if (closing) return;
  closing = true;
  children.forEach(child => { if (child.exitCode === null) child.kill("SIGTERM"); });
  const force = setTimeout(() => { children.forEach(child => { if (child.exitCode === null) child.kill("SIGKILL"); }); process.exit(code); }, 25_000);
  const finish = () => { if (children.every(child => child.exitCode !== null || child.signalCode !== null)) { clearTimeout(force); process.exit(code); } };
  children.forEach(child => child.once("exit", finish)); finish();
}
children.forEach(child => { child.once("error", () => shutdown(1)); child.once("exit", code => { if (!closing) shutdown(code || 1); }); });
process.on("SIGTERM", () => shutdown(0)); process.on("SIGINT", () => shutdown(0));
