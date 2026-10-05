# Judge guide

Checked 6 October 2026. This guide describes what is runnable and what requires external services. Start at the [hosted fictional example](https://darsloop-production.up.railway.app/example), which needs no account. The Linux deployment and a fresh authenticated fictional upload were tested; clean first-click email confirmation and social sign-in consent remain unproven. See RELEASE_STATUS.md for the exact scope.

## Start with the prepared example

1. Download and extract the public repository, or clone it. Open a terminal in the folder containing package.json.
2. Install Node.js 24 or later with npm. The clean release was tested with Node 26.4.0 on macOS.
3. Run `npm ci`, then `npm run build`, then `npm start`.
4. Open http://127.0.0.1:3000/example. No account, environment file, AI key or FFmpeg call is needed for this prepared example.

The example is authored fictional material. It does not claim to demonstrate a fresh AI request. Notes, transcript, source passages and practice are available; example practice resets when leaving. Questions use a visibly labelled passage search.

## Five-minute walkthrough

1. Open a note and play its timestamp. Compare the captured quote with the fictional recording.
2. Open Ask this lesson. Ask what to do after missing a lesson and follow the supported passage.
3. Ask a topic absent from the class. Check the lesson-scope response.
4. Ask "Is vaping halal?" Check referral to a teacher instead of a ruling.
5. Try a quiz and a flashcard. Open the audio evidence behind the answer. Open Mock exam to choose available formats and a timer; answers and source audio appear after submission. Written recall uses your self-check, separately from automatic marks.
6. Open Catch me up, Teacher's terms and the transcript. Distinguish prepared notes from original captured wording.

The runtime has an optional listening-first teacher-question handoff. It is not an authenticated teacher approval/correction system. Hadith candidates remain a separate reference lookup, never AI authenticity grading.

## Test fresh audio processing

Follow README.md to install FFmpeg/FFprobe, privately configure your own Groq/Google keys and start the worker in a second terminal. Open /learn locally. Upload the bundled fictional demo.mp3, confirm permitted fictional material, and choose note detail. Wait for real processing; inspect transcript times, flags, notes, quizzes and cards. Existing prepared example material must never be substituted for this new result.

Public deployment uses authenticated Supabase accounts and private storage. Configure the migrations, host origin and auth delivery as described in DEPLOYMENT.md. Local SQLite mode is restricted to loopback and is not a public authentication alternative. Quotas and service availability depend on the connected accounts.

## Reproduce checks

- `npm run typecheck`: TypeScript checks.
- `npm test`: unit checks, including real FFmpeg import checks; install FFmpeg/FFprobe first.
- `npm run test:api`: isolated local HTTP, privacy, sharing, practice and upload checks. Starts its own temporary server; removes temporary data.
- `npm run test:example`: example/audio boundaries against the running server. Set TEST_ORIGIN for a different address.
- `scripts/check-imports.ts`: optional actual cloud import/provider check, requiring private cloud connections and an active worker. Creates/removes a disposable account and fictional inputs; uses service quota.

See QA.md for measured scope and limits. No student-learning improvement, broad multilingual accuracy, locked-phone recording guarantee or predicted contest score is claimed.

## Public repository boundary

Included: app source, pinned dependencies, safe migrations, runtime/test scripts, original illustrations, synthetic fixture, empty environment template, setup/architecture/deployment guidance, source and license notices.

Excluded: personal documents, Muse drafts, private research, dashboard screenshots/PDFs, conversation history, API keys, environment values, account credentials, databases, real class recordings, raw private verification reports and build caches. The release is produced from an explicit allowlist and scanned; .gitignore alone is not treated as proof.
