# Release status

Checked 5 October 2026.

[DarsLoop](https://darsloop-production.up.railway.app) is live. [Try the fictional example](https://darsloop-production.up.railway.app/example) without signing in. Source is available in the [public repository](https://github.com/leowork2006-hash/DarsLoop).

## Implemented workflow

Record permitted fictional audio or upload supported audio/video. The hosted worker prepares timestamped transcription, supported notes, quizzes and flashcards. Lesson questions return captured quotations and timestamps or abstain/refer when unsupported. Private classes can share permitted lessons while practice remains personal.

Each signed-in workspace receives one complete prepared fictional demo. Deletion is remembered, demo activity is excluded from actual student Insights and its prepared playback/practice/chat uses no external AI calls. Upload and recording offer Auto, Urdu, Arabic and English as a main spoken-language hint, separately from interface language.

Teacher review is optional. The listening-first question handoff is not an approval or authenticated correction backend. Chat generation failure can use a visibly labelled exact-passage fallback with existing scope/referral/version boundaries.

## Verification

The code release `e58cd309` was deployed successfully. Public health/example returned HTTP 200. Production build/TypeScript and 130 units passed; 27 focused hosted assertions passed, including a new fictional mixed-language upload. Actual desktop and 390px views were inspected. Earlier one-hour, recording, privacy, sharing and source-replay evidence is separately scoped in [QA.md](QA.md).

A previously published anonymous clone installed/built without keys and passed its unit/API/example checks. That earlier clone check is not described as a new clone of every subsequent change. The curated release excludes private research, raw reports, credentials and real recordings.

## Remaining evidence gaps

Native code-switch fidelity, simultaneous upload capacity, physical screen-lock recording, clean first-click email confirmation, a tested backup ASR provider and measured learner benefit remain unproven. External service availability and every future model response are not guaranteed. [DEPLOYMENT.md](../DEPLOYMENT.md) explains setup and operational checks. No final contest submission is claimed.
