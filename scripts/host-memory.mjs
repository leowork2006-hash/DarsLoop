import { readFile } from "node:fs/promises";

// Container-wide readings include Next, the worker and any FFmpeg child.
// No credentials, user content or account identifiers are logged.
export async function logHostMemory(phase = "manual") {
  const number = async name => {
    try { const value = (await readFile(`/sys/fs/cgroup/${name}`, "utf8")).trim(); return /^\d+$/.test(value) ? Number(value) : null; } catch { return null; }
  };
  const [currentBytes, peakBytes, limitBytes] = await Promise.all([number("memory.current"), number("memory.peak"), number("memory.max")]);
  let oomKills = null;
  try { oomKills = Number((await readFile("/sys/fs/cgroup/memory.events", "utf8")).match(/^oom_kill (\d+)$/m)?.[1] ?? 0); } catch { /* cgroup v2 may be unavailable locally. */ }
  let anonymousBytes=null,fileCacheBytes=null;
  try { const stat=await readFile("/sys/fs/cgroup/memory.stat","utf8");anonymousBytes=Number(stat.match(/^anon (\d+)$/m)?.[1]??0);fileCacheBytes=Number(stat.match(/^file (\d+)$/m)?.[1]??0); } catch { /* Optional Linux details. */ }
  const reading = { anonymousBytes,fileCacheBytes,event: "host-memory", phase, checkedAt: new Date().toISOString(), currentBytes, peakBytes, limitBytes, oomKills, supervisorRssBytes: process.memoryUsage().rss };
  console.log(JSON.stringify(reading));
  return reading;
}

if (process.argv[1]?.endsWith("host-memory.mjs")) await logHostMemory();
