# Deploying DarsLoop

## Intended architecture

One Docker web service runs the Next.js app and durable worker together. Supabase provides verified accounts, private audio storage, database job leases and checkpoints. Hosting files are temporary; long-term lesson state remains in Supabase. Public example material is a bundled fictional fixture. This is a Next.js/Node application using hosted Groq/Google APIs, not the FastAPI/local-Whisper stack in the supplied research handoff.

## Railway first, with account checks

Select a free trial only after checking full-trial eligibility, usable outbound connections and remaining credit in the actual account. Trial credits are finite; no promise of judging-week uptime. Do not add a card, upgrade, or enable charges without the owner’s approval. Render Free is an alternative, with idle spin-down, cold starts and service limits. No self-ping or uptime workaround is installed.

1. Deploy this public GitHub repository using its Dockerfile. `railway.json` selects the Docker build, `/api/health` and bounded restarts.
2. Set the server variables privately in the host: `DARSLOOP_BACKEND=supabase`, Supabase URL/publishable key, private `SUPABASE_SECRET_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`, and exact HTTPS `DARSLOOP_ORIGIN`. The host supplies `PORT`; `.env.local` is never uploaded. No private key is a Docker build argument.
3. Configure Supabase Site URL and the exact HTTPS `/auth/callback` redirect. Verify signup confirmation or one configured provider. Public example needs no account.
4. Keep Serverless/sleep disabled only if supported by the selected trial. Check actual remaining credit/resource use through the judging period; do not invent a cost estimate from the Python research stack.
5. On the actual URL check landing, example, range playback, one refusal, one covered answer, one outside-class question, quiz and flashcard. For cloud access, create disposable accounts, test a permitted fictional upload, worker completion, private ownership and sign-out. Delete only those disposable records.
6. Record the actual URL and outcomes in docs/RELEASE_STATUS.md and README. A local build does not confirm Linux Docker or hosted execution.

## Limits to expose honestly

Railway request bodies must finish uploading within five minutes. The cloud upload interface now sends the source directly to private Supabase storage in separate 4 MiB pieces; Railway receives only small metadata requests. Finished pieces can be resumed while the file remains selected. This is an application-level resumable upload, not a Supabase TUS upload. Prepared stored audio remains below 24 MiB. The legacy multipart API still has the host request-body limit. One-hour browser recording is best effort under mobile suspension/lock. Retry/error states should retain saved audio/checkpoints; do not silently substitute prepared example outputs.

Official docs checked 5 October 2026:

- https://docs.railway.com/pricing/free-trial
- https://docs.railway.com/networking/public-networking/specs-and-limits
- https://docs.railway.com/config-as-code/reference
- https://docs.railway.com/deployments/healthchecks
- https://render.com/docs/free
- https://supabase.com/docs/guides/storage/uploads/file-limits

## Current deployment, 5 October 2026

[DarsLoop is live](https://darsloop-production.up.railway.app), with a [no-account fictional example](https://darsloop-production.up.railway.app/example). Railway built the Linux Docker image and started both web and worker processes. A fresh fictional upload passed the hosted two-ASR/generation workflow, source-linked practice and private-access checks. The local worker was stopped during that test so it could not process the hosted job.

The account was eligible for a full trial; the account check showed $5 credit and 30 trial days before usage. Sleeping is disabled and the service has one replica. Those are dated observations, not a future uptime guarantee. Credentials were configured privately with the owner's explicit approval; none are included in the repository or build arguments. The product code is public on GitHub, its main branch is connected to this Railway service, and a fresh anonymous clone installed/built and passed the documented bounded checks. The owner reported adding the production Supabase URL settings; email delivery and social consent remain untested. No paid upgrade, card addition or final contest submission was performed.


## Judging-week deployment checklist

Official sources checked **5 October 2026**. The target is 7–15 October; these checks reduce known risks, without promising uninterrupted service.

### 1. Confirm the actual stack and memory budget

- [ ] Keep one replica and sleeping disabled on the actual Railway service. Run the web app and worker with `npm run start:cloud`.
- [ ] Confirm the trial resource limit in Railway, rather than using the paid Hobby maximum. Trial resources are 1 GB RAM, shared CPU and up to five services. The grant expires after 30 days or when consumed. [Railway trial](https://docs.railway.com/pricing/free-trial), [plans](https://docs.railway.com/pricing/plans).
- [ ] In service deployment logs, filter by `@event:host-memory` (or inspect JSON log fields). The supervisor reads Linux cgroup `memory.current`, `memory.peak`, `memory.max` and `oom_kill` for the entire container at startup and every minute. These readings include Next, the worker and FFmpeg. A local run can report null cgroup values; it does not prove hosted memory use.
- [ ] Confirm `limitBytes` is about 1,000,000,000, `oomKills` is zero, and the peak after a fictional large-file job stays comfortably below the limit. Investigate peaks above 750 MB or repeated restarts.
- [ ] Confirm `/api/health` and `/example` respond after deployment. Exercise one new fictional lesson as well: the health endpoint alone does not prove the external APIs or worker journey.

The first Linux deployment's Railway 30-second averages measured 172.7 MB at startup and a 215.5 MB peak through the small fictional hosted journey. Those are averaged observations, not instantaneous peaks or a concurrency benchmark. The updated Linux deployment's actual cgroup readings measured 175.9 MB at five seconds, a 292.4 MB container peak after the large fictional import, a 999,997,440-byte limit, and zero OOM kills. No torch, sentence-transformers, Python backend or local Whisper model is installed or imported. Speech recognition runs through Groq; the only local media work is FFmpeg preparation. One worker processes one lesson at a time, uses bounded source-piece buffers, and removes temporary files. Do not introduce local ML models into this container.

### 2. Keep demo and new transcription paths distinct

- [ ] Keep `/example` available without signup or external AI. It contains an authored fictional audio/transcript fixture; label it as an example.
- [ ] New uploads must use the user's actual uploaded audio and hosted Groq ASR, then generation. Never substitute the example transcript when an API fails.
- [ ] Inspect Groq Console → organization Settings → Limits and Usage before judging. Published baseline limits currently list 20 requests/minute, 2,000/day, 7,200 audio seconds/hour and 28,800/day for each Whisper model; account-specific exceptions apply. Two transcription passes and overlaps consume more quota than the lesson's duration. [Groq limits](https://console.groq.com/docs/rate-limits).
- [ ] Keep ASR attachment chunks below 25,000,000 bytes. Our 16 kHz mono PCM chunks of at most 616 seconds are about 19.7 MB. Keep timestamp offsets and overlap handling. The app accepts AAC/video and prepares supported audio automatically. [Groq speech documentation](https://console.groq.com/docs/speech-to-text).
- [ ] Check Gemini account quota separately. Provider limits and billing are separate from Railway credits. An API failure must pause visibly with preserved audio/checkpoints and an owner retry.

This does not establish noisy classroom or multilingual speech accuracy. Browser recording while the phone is locked is still best effort and must not be promised.

### 3. Prevent a slow upload from occupying one long Railway request

- [ ] Cloud UI: start import → obtain signed piece URLs → PUT each 4 MiB piece directly to private storage → finish metadata → worker prepares audio and creates study material.
- [ ] Confirm `lesson-imports` is private, limited to 4,194,304 bytes per object, and has no broad browser read policy. Tokens authorize only an authenticated owner's specific piece and disallow overwrite. Finalization checks all sizes and is idempotent.
- [ ] Interrupt after one piece, then retry with the same selected file and options. Previously saved pieces must be skipped. Refreshing the page loses this in-memory file selection; no reload-resume claim is made.
- [ ] Complete a session lasting more than five minutes, with a deployment between the first piece and finalization. A session of several short storage requests avoids Railway's single request-body deadline; this is not a slow-phone bandwidth test. [Railway network limits](https://docs.railway.com/networking/public-networking/specs-and-limits).
- [ ] Verify source pieces disappear after the prepared private recording is saved. Unfinished unqueued imports expire after 24 hours and are swept while the worker runs. Failed queued imports retain their source for retry/deletion.
- [ ] Watch Supabase project Storage usage and egress. Its free per-object cap is 50 MB; separate 4 MiB objects fit it, while the application's total source cap is 500 MiB. Total project quotas still apply, so do not run several maximum-size demos simultaneously. [Supabase file limits](https://supabase.com/docs/guides/storage/uploads/file-limits), [standard uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads).

### 4. Watch credit through 15 October

- [ ] Open Railway → workspace selector → Usage. Watch total compute spend, remaining trial credit, estimated bill and other projects in the same workspace. Service → Metrics shows memory, CPU and egress; Deployments shows unexpected restarts. Spending is workspace-wide.
- [ ] On 5 October at about 13:22 UTC, the actual account reported approximately $4.998 remaining and 30 trial days. It is still a trial even though the API labels its feature plan HOBBY; no paid subscription was added.
- [ ] Use a **$3 spent / $2 remaining** warning and a **$4 forecast through 15 October** warning. Respond before the credit reaches zero. These are monitoring thresholds, not a Railway hard spending limit.
- [ ] Recalculate after a full day: remaining-days cost ≈ `(average RAM GB × $10 + average CPU × $20) × days/30 + egress GB × $0.05`. Resources are billed by minute. [Railway pricing](https://docs.railway.com/pricing).
- [ ] For 5–15 October (11 days), 0.30 GB average RAM, 0.05 average vCPU and 2 GB egress imply about **$1.57**. This is a low-traffic scenario, not a measured 11-day bill. Sustained 1 GB plus 2 vCPU would be about **$18.33** before egress and exceed the trial. A short idle sample is insufficient to guarantee the final bill.

Railway rejected the attempted compute email alert because this trial has no active subscription. **No Railway email alert is installed.** A twice-daily Codex desktop follow-up is scheduled through 15 October; it warns on credit, forecast, health, restart or memory problems and stays quiet otherwise. It depends on the desktop being available and is not an independent 24/7 monitor. Check the dashboard yourself daily, especially before submission and the first judging day.

Railway soft email alerts leave workloads running; compute hard limits stop them. Do not install a hard cutoff during judging or add a card/paid upgrade without the owner deciding. [Railway cost controls](https://docs.railway.com/pricing/cost-control).

### 5. Recovery and submission gates

- [ ] If health fails, check deployment logs and Railway status. Roll back to the last successful release when appropriate; keep private variables intact. Supabase retains lesson state independently of the container.
- [ ] If provider quota is exhausted, keep the preserved lesson and retry later. The bundled example remains usable. It is not a replacement for fresh-generation claims.
- [ ] If the credit forecast approaches the grant, ask the owner to choose a paid plan or an alternative host before the deadline. No zero-downtime or free migration promise.
- [ ] Keep a clean product-only repository and release archive. The fresh anonymous remote clone was installed/built and its unit/API/example checks passed on 5 October. Recheck these steps after later code changes.
- [ ] Verify signup email or an enabled social sign-in separately. Disposable password-account tests do not prove email delivery or provider consent.
- [ ] Keep a dated record of the actual hosted test outcomes, cleanup, remaining credit and unresolved limitations. No real classroom audio or private research belongs in the public repository.
