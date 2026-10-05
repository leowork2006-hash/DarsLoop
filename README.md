# DarsLoop

Return to what your teacher taught. A student workspace for Islamic classes: recordings, timestamped transcripts, automatic notes, lesson questions, quizzes, flashcards and private class sharing.

**Live app:** [DarsLoop](https://darsloop-production.up.railway.app) · [Try the fictional example without an account](https://darsloop-production.up.railway.app/example).

**Release status, 5 October 2026:** Linux Docker deployment and a fresh hosted upload/transcription/study journey passed. Fourteen public-example checks and 26 authenticated hosted assertions passed; disposable accounts were removed and their absence confirmed. The public product repository is [leowork2006-hash/DarsLoop](https://github.com/leowork2006-hash/DarsLoop); a fresh GitHub clone installed, built and passed 87 unit tests, 18 isolated API checks and 14 example boundaries. Email delivery and social sign-in consent still need owner verification. No student pilot or measured learning improvement is claimed. See [release status](docs/RELEASE_STATUS.md).

## Try it without keys

Requires Node.js 24 or later and npm. Verified on macOS with Node 26.4.0. FFmpeg and FFprobe are required for audio import/processing and the full test suite; the prepared example does not call them. A labelled fictional example is bundled; no paid AI requests or account are needed for it.

```sh
npm ci
npm run build
npm start
```

Download the repository ZIP (Code > Download ZIP), extract it and run these commands from the folder containing package.json. Open http://127.0.0.1:3000/example. For the full local workspace, open http://127.0.0.1:3000/learn. Keep local mode on loopback; public authenticated hosting requires the cloud configuration below. Do not overwrite an existing environment file.

### Judge walkthrough

1. Open **Explore the app** on the landing page. Notes and transcripts are clearly labelled prepared fictional material.
2. In **Ask this lesson**, ask “Is vaping halal?” The app refers rulings to a teacher.
3. Ask “What should I do after missing a lesson?” Follow the source passage and play its audio.
4. Ask about astronomy, which is outside the example. The app says it is not covered.
5. Read the transcript, then try **Quiz**, **Flashcards**, **Catch me up** and **Teacher’s terms**.
6. In a configured authenticated workspace, upload permitted fictional audio and choose Quick, Balanced or Detailed notes. This is the fresh AI path; it is separate from the prepared example.

Without AI keys, local questions use visibly labelled transcript search, and fresh audio waits for the worker connection. Prepared material is never presented as freshly generated output.

## Connect fresh transcription and generation

Install [FFmpeg and FFprobe](https://ffmpeg.org/download.html) and check `ffmpeg -version` and `ffprobe -version` in your terminal. Copy `.env.example` to `.env.local` only if that file does not already exist. Then create your own [Groq key](https://console.groq.com/keys) and [Google AI Studio key](https://aistudio.google.com/apikey). Put them in `.env.local`, restart the app, then run `npm run worker` in a second terminal. Defaults are `whisper-large-v3` and `gemini-3.5-flash-lite`; availability and quota depend on your account. A second Whisper pass checks disagreements, and a generation audit checks support. Agreement does not guarantee correctness.

| Variable | Required for | Obtain / default |
| --- | --- | --- |
| GROQ_API_KEY | Fresh speech-to-text | [Groq console](https://console.groq.com/keys) |
| GEMINI_API_KEY | Fresh notes, chat and embeddings | [Google AI Studio](https://aistudio.google.com/apikey) |
| ASR_MODEL / GENERATION_MODEL | Optional model override | Defaults above; choose an available compatible model |
| NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Cloud accounts | [Supabase project settings](https://supabase.com/dashboard) |
| SUPABASE_SECRET_KEY | Private cloud server and worker | Supabase project API keys; never put it in client code |
| DARSLOOP_BACKEND | Hosted authenticated mode | `supabase`; empty uses local SQLite |
| DARSLOOP_ORIGIN | Public origin and cookie protection | Exact HTTPS host without a path |
| DARSLOOP_DATA_DIR | Private temporary/local data | Default `.data`; never commit it |
| PORT | Host-assigned listening port | Default 3000 |
| FFMPEG_BIN / FFPROBE_BIN | Optional executable paths | Installed `ffmpeg` / `ffprobe` |
| ESPEAK_BIN | Regenerating the fictional fixture only | Installed `espeak-ng` |

Secrets stay server-side. Groq receives audio chunks; Google receives transcript passages and questions/embeddings. The association reference service receives read-only source queries. Use permitted fictional or irreversibly anonymized material in this contest build; never upload real student details. Provider terms apply; no billing has been enabled by this build.

## Imports and recording

MP3, M4A, AAC, WAV, MP4, Ogg, WebM and FLAC: up to **500 MiB and one hour**. The app extracts audio from video and prepares a smaller audio copy when needed. Keep your original file. Stored private audio stays below the existing 24 MiB storage allowance; prepared copies are labelled in the player. Hosting request/time limits can be stricter than the app allowance.

Recording saves recoverable chunks on the device, offers Pause/Stop, and automatically stops at one hour while the browser is executing. Stop saves and queues the selected study material. Wake lock is best effort; a web app cannot guarantee continued recording with a locked phone or suspended browser. Use the phone recorder and import the file when unattended recording is needed. Permission and fictional-data confirmations remain explicit.

## Cloud deployment

One Docker service runs Next.js and the queue worker; Supabase holds durable private data. This avoids relying on an ephemeral host filesystem for saved lessons. See [DEPLOYMENT.md](DEPLOYMENT.md). Docker includes FFmpeg. `npm run start:cloud` validates the cloud settings and runs both processes. The `/api/health` endpoint is a cheap process health check, not an AI quality or database availability claim.

Apply both SQL migrations in `supabase/migrations/` to your own Supabase project. Keep the private bucket and row access policies. Configure the HTTPS Site URL and `/auth/callback` redirect. Email delivery/social provider consent must be verified on the host; providers are shown only when configured. The public example remains available without sign-in or API keys.

## Verify

```sh
npm run typecheck
npm test
npm run test:api
npm run test:example
```

The API command starts an isolated temporary server and removes its fictional data afterward. The example command needs a running server (or `TEST_ORIGIN`). Tests create disposable fictional records. Unit provider/recovery mocks do not prove live AI behavior. `scripts/check-imports.ts` needs private cloud keys and a worker, creates a disposable account, and checks actual large WAV/AAC/MP4 imports. Historical private test archives are excluded from the public repository. A concise scope/limitation record is in [docs/QA.md](docs/QA.md).

## Product boundaries

Students receive automatic notes without mandatory teacher review. Evidence carries captured quotes and audio times. Uncertain/disagreed passages are visibly marked and excluded from generated study material, but not every transcription error is detected. No fatwas, personal religious decisions or AI hadith grading. Candidate external source matches are separate from the lesson and require teacher checking.

Teacher review currently creates a listening-first question handoff, with no approve-all or authenticated correction/approval backend. Lesson test covers generated lesson questions; it is not an official curriculum mock exam. Exam week plans and progress are device-local suggestions based on practice, not a promise of mastery or passing. No public student competition/rank is inferred from private scores.

## Project map and provenance

`src/`: interface, routes, evidence/safety policy and processing. `scripts/`: worker and reproducible checks. `fixtures/`: original fictional script, synthetic audio and prepared timestamps. `supabase/`: private cloud schema. `public/`: original illustrations and licensed brand assets. `docs/`: release and verification notes.

A printable guide is in [docs/Repository-and-Judge-Guide.pdf](docs/Repository-and-Judge-Guide.pdf). Judge instructions and the required public-file boundary are in [docs/JUDGE_GUIDE.md](docs/JUDGE_GUIDE.md). Architecture is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md); the verified submission checklist is in [docs/SUBMISSION.md](docs/SUBMISSION.md).

Original project code is [MIT](LICENSE). Dependencies, fonts, external source content and logos retain their own terms: see [SOURCES.md](SOURCES.md) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Design references informed the interface; competitor code, assets and real recordings are not bundled. Built with AI assistance by Hamza Adam, team 965. Commit dates are actual creation dates; earlier local work is not reconstructed as invented historical commits.
