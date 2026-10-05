# Release status

Checked 6 October 2026.

[DarsLoop](https://darsloop-production.up.railway.app) is live. [Try the fictional example](https://darsloop-production.up.railway.app/example) without signing in. Source is available in the [public repository](https://github.com/leowork2006-hash/DarsLoop).

## Implemented workflow

Record permitted fictional/anonymized audio or upload supported audio/video up to two hours and 500 MiB. The hosted worker prepares timestamped transcription, supported notes, quizzes and flashcards. A private selectable-text PDF resource can instead produce study material with genuine physical-page citations, within the documented extraction bounds. Lesson questions return supported source passages or abstain/refer when unsupported. Private classes can share permitted material while practice remains personal.

Each signed-in workspace receives one complete prepared fictional demo. Deletion is remembered and demo activity is excluded from actual student Insights. Spoken-language selection is separate from the new Auto/Arabic/Urdu/English study-material selection. Arabic and Urdu text has bidirectional-aware layout; the interface is not fully translated. Source quotations remain exact, including when generated explanations change language.

Teacher review is optional. The source-first question handoff is not an approval or authenticated correction backend. Chat generation failure can use a visibly labelled exact-passage fallback with existing scope/referral/version boundaries. Personal note edits stay separate from captured source and generated quiz answers.

Full-screen quiz, flashcards and lesson tests use supported saved material. Mixed lesson-test formats have real availability caps, raised previews and pausable motion. Written recall is self-checked separately from automatic marks. These are lesson exercises, not official syllabus exams.

## Verification

The V29 Arabic/PDF source deployed successfully. The hosted health and fictional example returned HTTP 200; the final PDF journey passed 24 assertions. See [QA.md](QA.md) for the dated build, local and actual hosted checks. An authored fictional one-hour upload completed the full hosted student workflow in the prior release. Arabic and PDF checks are separately scoped; none proves native classroom accuracy or future service availability.

A previously published anonymous clone installed/built without keys and passed its unit/API/example checks. That earlier clone check is not described as a new clone of every subsequent change. The curated release excludes private research, raw reports, credentials, student identifiers and real recordings.

## Remaining evidence gaps

Native code-switch fidelity and translation quality, simultaneous upload capacity, physical screen-lock recording, clean first-click email confirmation, a complete hosted backup-switch rehearsal, two-hour hosted performance and measured learner benefit remain unproven. Scanned/image-only or locked PDFs are unsupported. External services and every future model response are not guaranteed. [DEPLOYMENT.md](../DEPLOYMENT.md) explains setup and operational checks. No final contest submission is claimed.
