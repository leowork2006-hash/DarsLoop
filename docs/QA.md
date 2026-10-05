# Verification and known limits

Checked 6 October 2026. These are scoped engineering results, not a student pilot or a promise of perfect transcription.

## Current checks

- Production build, TypeScript and 130 unit tests in 22 files passed.
- The signed-in demo and spoken-language code release is `e58cd309`. Its deployment succeeded, and the public health/example returned HTTP 200.
- Twenty-seven focused hosted assertions passed with two disposable test users and authored fictional audio. They covered demo insertion once per user, metadata preservation, remembered deletion, private lesson/audio access, exact bundled audio byte ranges, timestamped evidence, cited demo answers, religious referral and saved practice excluded from actual student Insights.
- A new 21.8-second synthetic Urdu/Arabic/English recording passed the actual private upload and hosted processing journey. Upload took 10.237 seconds; processing took 15.660 seconds. It produced eight transcript segments, two cited notes, one quiz and one flashcard. A Urdu question returned a supported quotation and timestamp. Stale-version and foreign-user access checks passed. The local worker was stopped. Disposable users and their upload data were removed and user absence was checked.
- The prepared lesson and main-language recording option were inspected on desktop and at 390px. The demo had no document-level horizontal overflow. No microphone was started in this focused visual check.
- Chat generation failure is covered by deterministic tests of the labelled exact-excerpt/referral fallback. A real provider outage was not deliberately forced.

## Earlier bounded hosted evidence

An authored synthetic English hour passed the live upload/transcription/notes/practice/chat journey: 57,600,078-byte WAV, 55.708-second upload, 139.154-second processing, 878 segments, six notes, two quizzes and two cards. This is a repeated synthetic fixture, not realistic classroom or concurrent-user performance.

Forty-three earlier browser checks and 18 chat/control follow-ups covered page navigation, narrow widths, themes, practice, private sharing, source replay and optional teacher-question handoff. A browser recording with fictional file audio stopped and automatically prepared study material. It does not prove physical microphone or locked-screen behavior.

## Language and safety limits

Automatic notes and practice do not require teacher approval. Flagged or instruction-like passages are excluded, literal evidence is validated and generated claims are audited. The optional teacher handoff approves or corrects nothing. These controls establish support against captured text; both recognizers can share an error.

Three additional synthetic mixed-language probes found script/term errors and shared omissions. In an Arabic/English clip, both full-clip recognizers missed English words that a short crop recovered. Another transcription provider also omitted portions. Choosing a main language is a hint, not translation or guaranteed word retention.

Native speech fidelity, physical screen-lock recording, clean first-click email confirmation, simultaneous uploads, duplicate-upload transcript cache, a hosted backup-switch rehearsal and student learning benefit remain unproven. Private recordings, raw reports, user identifiers, credentials and billing records are excluded from this repository.

## Reliability revision — 6 October 2026

Production build/TypeScript and 143 unit tests in 24 files passed. New mocked contracts cover manual provider selection/authentication, invalid timing, async rejection/cleanup, real Retry-After parsing, durable deferral, bounded parallel draining and contiguous resume. These mocks do not prove provider availability. Live database checks in a rolled-back disposable transaction confirmed service-only RPC privileges, delayed claims, checkpoint retention, stale-lease rejection and atomic two-model reservation without partial insertion.

Actual backup API calls used authored synthetic audio. Deepgram Nova-3 captured native word times from a 43.6-second mixed Urdu/Arabic/English clip in 6.937 seconds, with five low-confidence passages flagged; visible word errors remained. Speechmatics initially returned Hindi-script Urdu. Official language hints then produced unsuitable text/word times; that configuration was rejected and Urdu/Auto blocked. A separate 46-second Arabic/English Melia-1 clip returned 94 timed words in 7.112 seconds and retained both English sentences. Language labels were not reliably language-specific in that result. These observations do not establish broad accuracy or complete word retention.

The new production concurrency and queue release is awaiting its separate hosted hour measurement; earlier timings above must not be reused as a claim about the new build.

## UI, chat and private-note revision — 6 October 2026

The combined reliability/private-note source passed 160 unit tests in 27 files and its production build. Read-only checks on two existing authorized lessons confirmed that a suggested note topic returns its exact validated teacher passage via the note anchor. Private content is not published.

Scoped mocked-browser checks covered private-note save/reopen/conflicts, view switching and evidence preservation at desktop/390px in light/dark themes; anchored profile dismissal and dark upload/settings; full-screen quiz/cards/exam, countdown expiry, unanswered items, interrupted-save retry, source audio and 320px layout. These are controlled UI/API contracts, not a learner pilot or external-provider test. Final visual refinement uses the existing product type/icons, an original notebook image, a centered raised quiz action and actual-count mock-exam rows/preview.

Private personal notes are separate from captured teacher material and generated practice. Editing a note cannot rewrite transcript evidence or quiz answers. Quick, key-point and detailed views reuse the already prepared cited material; switching those views does not regenerate the class.
