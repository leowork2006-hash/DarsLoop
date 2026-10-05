# Verification and known limits

Checked 5 October 2026. These are scoped engineering results, not a student pilot or a promise of perfect transcription.

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

Native speech fidelity, physical screen-lock recording, clean first-click email confirmation, simultaneous uploads, automatic quota-aware defer/cache, a tested backup recognizer and student learning benefit remain unproven. Private recordings, raw reports, user identifiers, credentials and billing records are excluded from this repository.
