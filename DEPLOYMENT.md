# Deploying DarsLoop

## Architecture

One Docker service runs the Next.js web app and durable worker. Supabase stores private audio/PDF sources, lessons, job leases and checkpoints. FFmpeg prepares supported media; Groq performs hosted speech recognition and Gemini prepares/audits study material. No local Torch or Whisper model is installed. The public and signed-in examples use authored fictional fixtures.

## Setup

1. Create Supabase resources using the repository migrations. Keep lesson audio and import-piece buckets private. Follow README.md for setup order.
2. Deploy this public repository with its Dockerfile. Use one replica and `npm run start:cloud`; configure the health check at `/api/health`. Check the current host documentation before changing sleep/restart settings.
3. Supply variables privately at runtime: `DARSLOOP_BACKEND=supabase`, Supabase URL/publishable key, `SUPABASE_SECRET_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY` and exact HTTPS `DARSLOOP_ORIGIN`. The host supplies `PORT`. Never commit private configuration or put server secrets in build arguments or browser code.
4. Set the Supabase Site URL and exact HTTPS `/auth/callback` redirect. Verify first-time confirmation/provider sign-in separately from an already-confirmed password login. Do not disable confirmation to conceal delivery errors.
5. Allow both Groq `whisper-large-v3` and `whisper-large-v3-turbo`. A model appearing in a limits table does not prove permission; test access with a small authored fictional clip.
6. Verify public health/example, private sign-in, one new fictional upload through notes/practice/chat, exact source replay, foreign-user rejection and sign-out. Remove only disposable test records. Record actual results and limits in docs/QA.md.

## Upload and recording behavior

The cloud interface sends sources directly to private storage in 4 MiB pieces; the host receives small metadata requests. Saved pieces can resume while the same file remains selected. Finalization checks sizes and is idempotent. The total source cap is 500 MiB and duration cap is two hours. Prepared stored audio stays below 48 MB. Legacy multipart uploads still depend on the host request-body timeout.

Do not describe this as Supabase TUS or page-reload resume. Interrupted unqueued imports expire and are swept while the worker runs. Queued failed imports preserve source data for retry/deletion. Browser recording is best effort under mobile suspension: keep the page open, or use the phone recorder and upload for screen-off capture.

## Operational checks

- Inspect whole-container memory logs (`host-memory`) after startup and a fictional job. The supervisor reads Linux cgroup current/peak/limit and OOM kills. Local null readings are not hosted proof. One worker handles one job at a time with bounded buffers.
- Check actual provider permissions, limits and service capacity privately. Two recognizers, overlap, generation audits, chat, embeddings and retries consume allowance. Do not infer access or remaining capacity from a historical peak chart.
- Observe host health/restarts and storage/egress. Confirm the projected operating runway privately before judging. An optional desktop check depends on the desktop being available and is not independent uptime monitoring.
- Provider failures must preserve completed transcripts/audio and display an honest retry state. Durable automatic quota waiting is implemented. Exact duplicate prepared audio can reuse a completed eligible transcript within the same owner's account and unchanged transcription settings; study material is generated afresh. Partial, legacy, shared and different-owner transcripts are not reused.
- Prepared demo playback/practice/answers remain usable without external AI. Never substitute the example for a failed new upload.
- Validate any backup provider through timestamps, captured quotations, mixed-language speech and the complete private lesson journey before calling it a working fallback.

## Recovery

If health fails, inspect logs and the host's status page; roll back to a known successful deployment when appropriate while preserving private variables. Supabase stores lesson state independently. If an API is limited, retain the lesson and retry when capacity returns. Never remove user lessons to make room for tests. No uninterrupted-uptime or universal accuracy promise is supported.

## Official references

Checked 6 October 2026. Recheck mutable provider contracts before deployment:

- [Railway networking limits](https://docs.railway.com/networking/public-networking/specs-and-limits)
- [Railway health checks](https://docs.railway.com/deployments/healthchecks)
- [Groq speech recognition](https://console.groq.com/docs/speech-to-text)
- [Groq rate limits](https://console.groq.com/docs/rate-limits)
- [Groq model permissions](https://console.groq.com/docs/model-permissions)
- [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Supabase file limits](https://supabase.com/docs/guides/storage/uploads/file-limits)
- [Supabase standard uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads)

Account-specific financial/status readings and credentials belong in private operator records, not this public guide.

## Manual transcription backups and quota queue

`TRANSCRIPTION_PROVIDER` accepts `groq` (default), `deepgram`, or `speechmatics`. Set the selected private key at runtime; both backup keys can remain configured while Groq is primary. Do not put secrets in the repository. Apply `20261005190532_provider_queue.sql` before this release. New queue RPCs and provider reservation records are service-only.

Groq preserves the two-recognizer check. Two overlapped lossless FLAC sections run at a time (`TRANSCRIPTION_CONCURRENCY` is clamped to 1–2 for this host); each section retains its two ASR requests. Failed sections prevent completion. Only a contiguous completed prefix is saved. Generation audits remain staged because later calls depend on earlier outputs.

The worker reserves audio seconds against both Groq models with headroom below the documented hourly/daily caps. Overlap means an hour uses roughly 3,680 seconds per recognizer, so even two one-hour jobs can cause waiting. HTTP 429s preserve audio/checkpoints, release the lease and schedule a visible retry. Quota waits do not exhaust the crash-retry budget. After 48 deferrals, the worker fails visibly for operator intervention. Other account traffic can still consume provider quota.

Deepgram uses Nova-3 and requires the main spoken language. Its multilingual set does not cover Urdu/Arabic; mixed-language words can be wrong. Speechmatics uses a Melia-1 batch job, polls for native word times and deletes its completed remote job. Actual Urdu probes returned the wrong script, and language hints worsened that fixture; this adapter therefore rejects Urdu and Auto, allowing only explicitly selected Arabic/English. Both backups are single-pass and show that limitation on the lesson. Invalid timestamps fail; they are never invented or clamped into correctness.

Manual switching affects new/unstarted jobs. An already started lesson remains pinned to its original provider to avoid mixing checkpoints. For an outage during a started job, preserve it and retry after recovery, or explicitly upload a new permitted copy after choosing the backup. No automatic cross-provider switch or administrator rewrite of an existing transcript is implemented.

The actual backup tests used short authored synthetic recordings and native timestamps, not a native-speaker classroom pilot or a hosted provider-switch rehearsal. See [QA.md](docs/QA.md) for evidence and limits.

## Detailed preparation, transcript reuse and private quiz rounds

Apply `20261005220213_detailed_material_queue.sql` and `20261005220424_class_quiz_rounds.sql` in migration order before deploying this revision. Both use service-only actions; quiz tables deny direct browser reads/writes. Detailed preparation atomically checks ownership, source version, material revision and existing job state. It preserves the completed source and previous material until a complete audited replacement succeeds. Private rounds close on source/material change or share revocation.

Transcript reuse uses an owner-bound server HMAC of prepared audio plus transcription settings and policy. Cloud mode uses the private Supabase server secret. Local mode must explicitly set `DARSLOOP_TRANSCRIPT_CACHE_SECRET` to enable reuse; an absent secret simply disables it. A secret change causes safe cache misses. No raw audio hash or origin lesson identifier is persisted. Concurrent unfinished duplicate uploads are not coalesced.

Gemini generation admission uses the web and worker's shared `DARSLOOP_DATA_DIR` SQLite file. It permits at most two in-flight generation calls and twelve starts per rolling minute per model, including failed requests and format repairs. Interactive questions fall back promptly to labelled source excerpts when capacity is busy; queued material waits/retries. This guard assumes the documented single-container deployment. Separate replicas need a distributed limiter, and calls from AI Studio or another app can still consume the same account quota.

## Confirmation emails

See [email-confirmation.md](docs/email-confirmation.md) for the prepared token-hash template and scanner-safe explicit confirmation step. Default signup remains PKCE until the hosted template, allowed redirects and optional `DARSLOOP_EMAIL_CONFIRMATION_FLOW=token_hash` setting are configured together. A custom SMTP sender must be configured and actual public inbox delivery tested; a locally passing confirmation route does not prove delivery. Do not commit SMTP credentials.

## Personal notes migration

Apply `20261005193131_personal_notes.sql` before deploying the editable-notes revision. Personal edits use a separate per-user/per-lesson/version table. Browser writes and RPC execution are revoked; the authenticated server performs an access/version check and the service-only save function enforces optimistic revisions. Teacher transcripts, generated citations and practice are never overwritten by these edits.

## PDF resources

Apply the service-only PDF claim migration. The server creates/checks the private `lesson-documents` bucket with an 8,000,000-byte limit and PDF MIME restriction. The JSON lesson payload stores physical page passages; no fake timestamps are used. `unpdf` stays external and is loaded in a bounded extraction worker only when a PDF is processed (128 MB heap, 15-second deadline). Image-only, encrypted, malformed, over-40-page and over-80,000-character inputs fail with an actionable message. Test a permitted authored PDF on the deployed Linux worker. Keep PDFs/private transcripts and credentials out of GitHub.
