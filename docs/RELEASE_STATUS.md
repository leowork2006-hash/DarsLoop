# Release status

Checked 6 October 2026.

[DarsLoop](https://darsloop-production.up.railway.app) is live. [Try the fictional example](https://darsloop-production.up.railway.app/example) without signing in. Source is available in the [public repository](https://github.com/leowork2006-hash/DarsLoop).

## Implemented workflow

Record permitted fictional audio or upload supported audio/video. The hosted worker prepares timestamped transcription, supported notes, quizzes and flashcards. Lesson questions return captured quotations and timestamps or abstain/refer when unsupported. Private classes can share permitted lessons while practice remains personal.

Each signed-in workspace receives one complete prepared fictional demo. Deletion is remembered, demo activity is excluded from actual student Insights and it includes prepared playback, practice and cited lesson answers. Upload and recording offer Auto, Urdu, Arabic and English as a main spoken-language hint, separately from interface language.

Teacher review is optional. The listening-first question handoff is not an approval or authenticated correction backend. Chat generation failure can use a visibly labelled exact-passage fallback with existing scope/referral/version boundaries.

## Verification

The code release `e58cd309` was deployed successfully. Public health/example returned HTTP 200. Production build/TypeScript and 130 units passed; 27 focused hosted assertions passed, including a new fictional mixed-language upload. Actual desktop and 390px views were inspected. Earlier one-hour, recording, privacy, sharing and source-replay evidence is separately scoped in [QA.md](QA.md).

A previously published anonymous clone installed/built without keys and passed its unit/API/example checks. That earlier clone check is not described as a new clone of every subsequent change. The curated release excludes private research, raw reports, credentials and real recordings.

## Remaining evidence gaps

Native code-switch fidelity, simultaneous upload capacity, physical screen-lock recording, clean first-click email confirmation, a complete hosted backup-switch rehearsal and measured learner benefit remain unproven. External service availability and every future model response are not guaranteed. [DEPLOYMENT.md](../DEPLOYMENT.md) explains setup and operational checks. No final contest submission is claimed.

## Reliability revision prepared — 6 October 2026

Manual transcription adapters, a service-only durable quota queue and two-section lossless processing are implemented. Groq remains primary. The actual short backup checks and Urdu limitation are documented in [QA.md](QA.md). This revision's hosted deployment and full-hour performance are recorded separately after deployment; no new speed target is claimed here.

## UI and private-note revision prepared — 6 October 2026

Full-screen quiz/flashcards/mock exams, three saved-material note views, private editable notes, anchored profile dismissal and dark upload/settings contrast are implemented. Topic suggestions resolve their validated note citation directly, supporting English topic headings over Urdu passages without treating the heading as evidence. Local production verification and final hosted results are recorded in [QA.md](QA.md); deployment is recorded separately after rollout.
