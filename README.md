# DarsLoop

Return to what your teacher taught. A student workspace for Islamic classes: recordings, timestamped transcripts, PDF page resources, automatic notes, lesson questions, quizzes, flashcards and private class sharing.

**Live app:** [DarsLoop](https://darsloop-production.up.railway.app) · [Try the fictional example without an account](https://darsloop-production.up.railway.app/example).

**Release status, updated 7 October 2026:** The latest V63 offline suite passed 525 tests across 63 files; TypeScript and the production build passed. See [release status](docs/RELEASE_STATUS.md) for the scope and limits. Earlier Linux Docker deployment and hosted upload/transcription/study checks remain separately scoped. The public product repository is [leowork2006-hash/DarsLoop](https://github.com/leowork2006-hash/DarsLoop); a fresh GitHub clone installed, built and passed the earlier release checks. One owner-authorized signup email arrived and the account became confirmed; a clean first-click callback and general public email delivery remain unproven. No student pilot or measured learning improvement is claimed.

[Dated development record](docs/WORK-LOG.md) · [Religious sources and demo limits](RELIGIOUS-SOURCES.md)

## Try it without keys

Requires Node.js 24 or later and npm. Verified on macOS with Node 26.4.0. FFmpeg and FFprobe are required for audio import/processing and the full test suite; the prepared example does not call them. A labelled fictional example is bundled and can be explored without an account.

```sh
npm ci
npm run build
npm start
```

Download the repository ZIP (Code > Download ZIP), extract it and run these commands from the folder containing package.json. Open http://127.0.0.1:3000/example. For the full local workspace, open http://127.0.0.1:3000/learn. Keep local mode on loopback; public authenticated hosting requires the cloud configuration below. Do not overwrite an existing environment file.

### Judge walkthrough

1. Open the [fictional example](https://darsloop-production.up.railway.app/example), or choose **Explore the full lesson** in the landing page's practice section. The hero's **Start learning** and **Explore the app** buttons open sign-in. Example notes and transcripts are clearly labelled prepared fictional material.
2. In **Ask this lesson**, ask “Is vaping halal?” The app refers rulings to a teacher.
3. Ask “What are the five pillars named in this lesson?” Follow the source passage and play its audio.
4. Ask about astronomy, which is outside the example. The app says it is not covered.
5. Read the transcript, then try **Quiz**, **Flashcards**, **Catch me up** and **Teacher’s terms**.
6. Sign in to find **Demo lesson · The five pillars of Islam** in My lessons. This is a prepared fictional lesson with audio, notes and practice; it can be deleted and will not be added again to that account.
7. In a configured authenticated workspace, upload permitted fictional audio or an authored PDF, choose the main spoken language for audio and choose Auto, Arabic, Urdu or English study material with Quick, Balanced or Detailed notes. This is the fresh AI path; it is separate from the prepared example.

Without AI keys, local questions use visibly labelled transcript search, and fresh audio waits for the worker connection. Prepared material is never presented as freshly generated output.

## Connect fresh transcription and generation

This repository contains no real API keys. The judging committee must use their own keys.

Install [FFmpeg and FFprobe](https://ffmpeg.org/download.html) and check `ffmpeg -version` and `ffprobe -version` in your terminal. Copy `.env.example` to `.env.local` only if that file does not already exist. Then create your own [Groq key](https://console.groq.com/keys) and [Google AI Studio key](https://aistudio.google.com/apikey). Put them in `.env.local`, restart the app, then run `npm run worker` in a second terminal. Defaults are `whisper-large-v3` and `gemini-3.5-flash-lite`; availability and quota depend on your account. A second Whisper pass checks disagreements, and a generation audit checks support. Agreement does not guarantee correctness. Enable both `whisper-large-v3` and `whisper-large-v3-turbo` in Groq → Organization → Limits → Allowed Models, and check project restrictions too. A denied comparison model stops fresh transcription; API keys cannot override that setting.

| Variable | Required for | Obtain / default |
| --- | --- | --- |
| GROQ_API_KEY | Fresh speech-to-text | [Groq console](https://console.groq.com/keys) |
| GEMINI_API_KEY | Fresh notes, chat and embeddings | [Google AI Studio](https://aistudio.google.com/apikey) |
| ASR_MODEL / GENERATION_MODEL | Optional model override | Defaults above; choose an available compatible model |
| TRANSCRIPTION_PROVIDER | Manual speech-to-text provider selection | `groq` by default; accepts `deepgram` or `speechmatics`. See [provider configuration](DEPLOYMENT.md#manual-transcription-backups-and-quota-queue). No automatic provider substitution |
| TRANSCRIPTION_CONCURRENCY | Local audio-section processing width | Default `2`, clamped to `1`–`2`; see [provider configuration](DEPLOYMENT.md#manual-transcription-backups-and-quota-queue) |
| DEEPGRAM_API_KEY | Optional Deepgram backup | Create a private key in the [Deepgram console](https://console.deepgram.com/) using its [API-key guide](https://developers.deepgram.com/docs/create-additional-api-keys) |
| SPEECHMATICS_API_KEY | Optional Speechmatics backup | Create a private key in the [Speechmatics portal](https://portal.speechmatics.com/) using its [authentication guide](https://docs.speechmatics.com/get-started/authentication). DarsLoop limits this provider to explicit Arabic/English |
| SPEECHMATICS_REGION | Speechmatics batch endpoint | Default `eu1`; DarsLoop also accepts `us1`. See [supported endpoints](https://docs.speechmatics.com/get-started/authentication#supported-endpoints) |
| NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Cloud accounts | [Supabase project settings](https://supabase.com/dashboard) |
| SUPABASE_SECRET_KEY | Private cloud server and worker | Supabase project API keys; never put it in client code |
| DARSLOOP_BACKEND | Hosted authenticated mode | `supabase`; empty uses local SQLite |
| DARSLOOP_ORIGIN | Public origin and cookie protection | Exact HTTPS host without a path |
| DARSLOOP_EMAIL_CONFIRMATION_FLOW | Optional email-confirmation route | Empty means PKCE. Set `token_hash` only after configuring the matching [email template and redirects](docs/email-confirmation.md); see [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates) and [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp) |
| DARSLOOP_DATA_DIR | Private temporary/local data | Default `.data`; never commit it |
| DARSLOOP_TRANSCRIPT_CACHE_SECRET | Optional local transcript reuse | Set your own private random secret as described in [transcript reuse](DEPLOYMENT.md#detailed-preparation-transcript-reuse-and-private-quiz-rounds). Empty disables local reuse; cloud mode uses the server secret |
| PORT | Host-assigned listening port | Default 3000 |
| FFMPEG_BIN / FFPROBE_BIN | Optional executable paths | Installed `ffmpeg` / `ffprobe` |
| ESPEAK_BIN | Regenerating the fictional fixture only | Installed `espeak-ng` |

Secrets stay server-side. The selected speech provider (Groq, Deepgram or Speechmatics) receives audio chunks; Google receives extracted source passages (audio transcript or PDF page text), questions and embeddings. The association reference service receives read-only source queries. Use permitted fictional or irreversibly anonymized material in this contest build; never upload real student details. Provider terms apply; no billing has been enabled by this build.

## Imports and recording

MP3, M4A, AAC, WAV, MP4, Ogg, WebM and FLAC: up to **500 MiB and two hours**. The app extracts audio from video and prepares a smaller audio copy when needed. Keep your original file. Stored private audio stays within a private 48 MB audio bucket limit (48,000,000 bytes); prepared copies are labelled in the player. Hosting request/time limits can be stricter than the app allowance.

Recording saves recoverable chunks on the device, offers Pause/Stop, and automatically stops at one hour while the browser is executing. Stop saves and queues the selected study material. Wake lock is best effort; a web app cannot guarantee continued recording with a locked phone or suspended browser. Use the phone recorder and import the file when unattended recording is needed. Permission and fictional-data confirmations remain explicit.

**Languages:** choose automatic detection or the main spoken language (Urdu, Arabic or English). This affects transcription, separately from the interface/guide language. Study material has its own Auto / Arabic / Urdu / English choice; Auto follows the captured text. Generated prose can change language, while literal quotations remain in the source language. Arabic and Urdu source/material text use right-to-left layout. The interface is not fully translated. The app requests transcription rather than English translation. Mixed-language words may be rendered in their original script or as transliteration, and can be misheard or omitted. Short synthetic Urdu tests showed improved script selection with Urdu selected; Arabic/English switches still exposed omissions. This is not native classroom accuracy proof. Original audio stays available; flags withhold detected questionable passages from generated material, but two recognizers can agree on the same mistake.

**PDF resources:** upload a permitted selectable-text PDF, up to **8 MB, 40 physical pages and 80,000 extracted characters**. All text-bearing pages are extracted; files beyond a bound are rejected rather than silently shortened. Private notes, practice and answers cite the original physical PDF page, never invented audio times or teacher speech. Open the source to check extraction and layout. Scanned/image-only, locked, damaged or overly complex PDFs are not supported; use an unlocked text PDF excerpt. DarsLoop does not perform OCR or infer missing book text. Religious rulings and hadith grading remain teacher referrals. PDFs need generation credentials, but never speech-to-text credentials.

## Cloud deployment

One Docker service runs Next.js and the queue worker; Supabase holds durable private data. This avoids relying on an ephemeral host filesystem for saved lessons. See [DEPLOYMENT.md](DEPLOYMENT.md). Docker includes FFmpeg. `npm run start:cloud` validates the cloud settings and runs both processes. The `/api/health` endpoint is a cheap process health check, not an AI quality or database availability claim.

Apply all SQL migrations in `supabase/migrations/` to your own Supabase project. Keep the private bucket and row access policies. Configure the HTTPS Site URL and `/auth/callback` redirect. Email delivery/social provider consent must be verified on the host; providers are shown only when configured. The public example remains available without sign-in or API keys.

## Verify

```sh
npm run typecheck
npm test
npm run test:api
npm run test:example
```

The API command starts an isolated temporary server and removes its fictional data afterward. The example command needs a running server (or `TEST_ORIGIN`). Tests create disposable fictional records. Unit provider/recovery mocks do not prove live AI behavior. `scripts/check-imports.ts` needs private cloud keys and a worker, creates a disposable account, and checks actual large WAV/AAC/MP4 imports. Historical private test archives are excluded from the public repository. A concise scope/limitation record is in [docs/QA.md](docs/QA.md).

## Product boundaries

Students receive automatic notes without mandatory teacher review. Evidence carries literal source quotes with audio times or PDF page numbers. Uncertain/disagreed passages are visibly marked and excluded from generated study material, but not every transcription error is detected. No fatwas, personal religious decisions or AI hadith grading. Candidate external source matches are separate from the lesson and require teacher checking.

The implemented path is `processLesson` → timed/flagged segments → `createArtifacts` → literal-evidence validation → independent claim-support audit → available study material. There is no teacher approval prerequisite. The optional teacher-question handoff requires passage playback before download; it cannot approve or correct the transcript. Instruction-like passages are withheld before generation, auditing and embedding, and are rejected as evidence in old saved outputs. The original transcript/audio remains available. These are fallible controls, not a guarantee of accurate transcription or complete injection detection.

Teacher review currently creates a source-first question handoff (playback for audio, page opening for PDF), with no approve-all or authenticated correction/approval backend. The mock exam uses this lesson’s supported questions and cards, with chosen counts and an optional timer. Formats include multiple choice, teacher-answer matching True / False, literal-word blanks and written recall. Written recall is self-checked against the captured answer and is separate from the automatic score. It is practice, not an official curriculum exam. Exam week plans and progress are device-local suggestions based on practice, not a promise of mastery or passing.

Private classes can run an optional quiz round from one shared lesson's supported conceptual multiple-choice questions. Members explicitly join with a nickname before seeing questions or participant results. Everyone receives the same saved question set; only the first submitted attempt counts. Withdrawal hides the nickname and result without resetting that attempt. Removing the share or changing the source/prepared material closes its round. These are correct-answer counts within that private class, never a public ranking or assessment of religious knowledge. Ordinary personal practice remains separate.

## Project map and provenance

`src/`: interface, routes, evidence/safety policy and processing. `scripts/`: worker and reproducible checks. `fixtures/`: original fictional script, synthetic audio and prepared timestamps. `supabase/`: private cloud schema. `public/`: original illustrations and licensed brand assets. `docs/`: release and verification notes.

A printable guide is in [docs/Repository-and-Judge-Guide.pdf](docs/Repository-and-Judge-Guide.pdf). Judge instructions and the required public-file boundary are in [docs/JUDGE_GUIDE.md](docs/JUDGE_GUIDE.md). Architecture is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md); the verified submission checklist is in [docs/SUBMISSION.md](docs/SUBMISSION.md).

Original project code is [MIT](LICENSE). Dependencies, fonts, external source content and logos retain their own terms: see [SOURCES.md](SOURCES.md) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Design references informed the interface; competitor code, assets and real recordings are not bundled. Built with AI assistance by Hamza Adam, team 965. Commit dates are actual creation dates; earlier local work is not reconstructed as invented historical commits.

## Earlier hosted performance measurement — 5 October 2026

The final V28 hosted fictional one-hour WAV completed in 55.112 seconds upload plus 121.374 seconds processing and passed 29 scoped assertions. Whole-container memory peaked at 841.5 MB under its 1000.0 MB limit, with zero OOM kills. These are synthetic sequential English measurements. They do not prove native classroom accuracy, concurrency or future uptime. V29 language/PDF and V30 chronological-note, private-round, cache and confirmation-route verification are recorded separately in [docs/QA.md](docs/QA.md).

Private audio replay streams requested ranges. Long-lesson search caches exact repeated wording while retaining original source references. Completed transcripts survive generation problems; available supported notes remain usable. If AI chat fails, a visibly labelled transcript-search response can return exact supported passages or abstain, with the same religious/scope boundaries. It does not invent an AI answer. Provider quotas can pause new work; the durable queue retains audio/checkpoints and schedules quota retries. Consumer Google AI plans do not raise this app's API-key allowance; see [DEPLOYMENT.md](DEPLOYMENT.md).

## Transcription resilience

Groq remains the default. Operator-selected Deepgram and Speechmatics backups use private runtime keys and retain native timestamps; their single-pass limitations are visible. Speechmatics is restricted to explicit Arabic/English after unsuccessful Urdu probes. Jobs preserve complete contiguous checkpoints, wait visibly on provider quota, and never publish a half-transcribed class as complete. See [DEPLOYMENT.md](DEPLOYMENT.md) for manual switching, migration order and exact limitations.

## Notes and full-screen practice

The two note views are **Short summary** and **Detailed**; key points appear inside the summary. Merely switching views does not generate anything. An owner can explicitly choose **Prepare detailed notes** to rebuild study material from the saved completed transcript or PDF pages. The original source stays unchanged; a failed upgrade preserves the existing study material. A successful upgrade replaces generated practice, so its new questions start fresh. Counts are supported items, not guaranteed minimums.

Long sources are divided into bounded chronological sections, with neighboring passages retained for qualifications. Each section receives literal-evidence and independent support checks; a failed section cannot become a complete replacement. The current interface does not include a personal-note editor. Previously saved private personal notes remain separate from captured quotations and AI/practice source data. Apply all migrations before deploying this revision.

Quiz, flashcards and mock exams open in a full-screen practice space with pausable motion and a reduced-motion option. Source audio remains available inside quiz/card feedback; mock exams show answers and sources after submission. Question counts reflect supported items actually present in the selected lesson.

## Demo content and trust limits

The public example uses an original, synthetic introductory lesson on the five pillars of Islam. Audio timings are generated locally, not an ASR test. Notes and practice are prepared, not live AI output or a scholarly review. [Religious sources and scope](RELIGIOUS-SOURCES.md) records the primary references and limits. Detailed rulings, personal advice and hadith grading are referred to a qualified teacher. Arabic/Urdu/English can be tried with limitations; native classroom quality has not been established.
