# Verification and known limits

## Long Arabic processing and search correction — 6 October 2026 (V39)

The complete unit suite passed **327 tests across 49 files**, and the final production build/TypeScript passed. Two Arabic retrieval fixtures reproduced the old failures before the fix: a late review passage was missed, and generic classroom wording was retrieved for an unrelated question. The correction removes Arabic retrieval boilerplate, matches conservative word forms, weights distinctive topics, and bounds source context. Literal quotations, support audits and teacher-referral boundaries remain enforced.

An actual isolated production-pipeline check prepared and processed a **91-minute repeated authored synthetic Arabic recording** through the configured live Groq dual pass and Gemini generation/audit adapters. All ten chunks completed, producing 26 notes, six quizzes and 32 cards. Notes covered eight of ten sections. This is partial-material completion on a repeated fixture, not a natural lecture, hosted upload, native accuracy benchmark or full lesson coverage. The first chat check failed after an actual search-limit response; that initial run remains recorded as an end-to-end failure.

After the fix, a separate 66-passage authored Arabic saved-source fixture passed a correctly forced embedding-limit check with actual live answer/support auditing: the covered review question returned an exact cited answer, an unrelated question returned no claims, and a personal ruling request received a teacher referral. An initial test interceptor missed the SDK batch endpoint and exercised normal hybrid search instead; that result is retained separately and is not counted as outage proof. The 91-minute speech test was not repeated.

Library and Upload now distinguish Source ready, Partial notes/material and Needs attention. Missing notes or a practice kind cannot silently look fully ready. Partial notes show section coverage and a full-source action; service-limited chat offers a retry while retaining grounding. Actual isolated mobile interactions at391×844 confirmed readiness labels/counts, partial upload progress, available-material opening and full-transcript navigation without document overflow. No physical phone or new real-class processing was used. External availability, complete coverage of every recording and the exact unidentified student's failure remain unproven.

## Mobile chat and actionable Insights correction — 6 October 2026

Production build/TypeScript and17focused unit checks passed. Five grouped isolated production-build screen checks covered mobile individual-word/re-entry behavior, compact aligned controls, merged summary/key points, current-version review recommendations/UTC activity, desktop and320/390px fit, and recommended practice navigation. No browser/provider errors; three screenshots inspected. One fixture check expected3recommendations rather than up to3; corrected without inventing another item. No physical-phone/Safari-engine or learning-benefit proof.

Insights separates latest quiz correctness from self-rated flashcards, shows actual dated activity, untouched current practice and source-linked next steps. It derives no mastery, improvement or time-spent score. No new database fields or generation requests. Heading respects reduced motion, starts when visible and replays on return rather than looping indefinitely.

## Notes language and compact layout correction — 6 October 2026

TypeScript and final production build passed. Nineteen scoped unit checks passed. A rolled-back synthetic database fixture confirmed same-language reuse, explicit-language queueing, unchanged source, duplicate/busy guards, one job and service-only execution. Six grouped isolated browser checks covered centered individual-word headings, mobile account/library/breadcrumb fit, removed editor/aside cards, explicit preparation only, a single speed caret and320px notes without horizontal overflow. Three screenshots were inspected. An initial mock/selector/SQL-alias issue was corrected; an actual lesson-tab margin overflow was fixed. Initial reports remain private.

Saved note views and language selection make no AI request. Another language requires explicit Prepare and replaces the saved active set only after success; it is not a multi-language cache. Private previously saved personal notes were not erased. No provider processing, native translation approval, physical phone or broad regression was run for this revision.

## V34 mobile workspace — 6 October

- Mobile uses a full-height left drawer with the existing navigation, Page guide and Account/privacy. Bottom navigation and the separate header Guide/Settings are hidden. The drawer closes after navigation, on Escape/backdrop and when switching to desktop, and restores keyboard focus.
- Home suggestions use compact two-column icon chips; mobile headings are static without a play/pause control. The compact Home composer stays beneath scrollable content and above the audio player. Desktop controls remain available.
- TypeScript/production build and eight scoped fixture checks passed at1440/390/320px, including a short320×568 viewport. One mocked reply was used; no real provider request. The initial focus issue was fixed. This is viewport evidence, not a physical-phone or mobile-keyboard guarantee.

## V33 readable sources and recall — 6 October

- PDF pages and References use compact source cards with expandable complete text and an optional original line-break view. Stored text and citations are unchanged; extraction artifacts still require checking the original PDF.
- Home/lesson suggestions use six wrapping icon chips. Notes, practice and plan actions open the corresponding existing feature. Headings reveal words with pause and reduced-motion support.
- Quiz/card lesson choices show the full supported inventory separately from the selected quick-session size, with colored raised icon covers. Exam date/course controls have equal heights and stack on narrow screens.
- Complete already-supported notes can supply distinct recall cards, even when cards already exist. Full answers and citations are preserved; flagged evidence, duplicate answers and overlong notes are withheld. Existing practice IDs remain; derived IDs bind the full note, evidence and material revision. The inventory remains bounded to40 items. No fixed questions-per-minute promise or newly invented quiz choices.
- Verification is confined to changed paths:24 focused unit tests,49 Review/Exam fixture assertions, an isolated local HTTP recall-review check and one combined Chat/PDF viewport check. TypeScript and a production build passed. These checks do not establish real-language accuracy, physical-phone compatibility, learning gains, email delivery or provider failover.

## V32 suggestion styling — 6 October

Home and lesson chat retain four grounded suggestion actions in stacked rounded text-and-arrow buttons. TypeScript passed. One short isolated visual check covered both screens at 1440px and 390px, with no horizontal overflow or browser errors; screenshots were inspected. It made no AI or transcription requests.

## V31 chat, mobile and audio corrections — 6 October

- Targeted backend checks:49 tests in6 files pass, plus TypeScript. This is a bounded changed-path check, not a rerun of the entire release suite.
- Isolated sidebar/player UI:49 fixture checks pass at1440/390/320px. Desktop player64px and mobile96px preserve44px controls and matching content clearance. This is viewport evidence, not physical-phone proof.
- Actual Gemini check on four authored Urdu study-routine passages: the final overview and misspelled detail follow-up each returned four supported English explanation blocks with unchanged Urdu citations. Initial support-audit rejections are retained privately. It is not a native-language accuracy benchmark or a promise that every model reply passes.
- Chat now carries bounded prior-question/source-ID context, handles whole-lesson coverage and conservative lexical typos, matches explanation language to the question, and retains messages in account/source-scoped browser memory. Clear chat is explicit. Unsupported claims remain withheld; independently accepted points can be shown as partial, and already prepared source-backed notes can serve as a labelled fallback.
- Audio playback/download limits now share the48,000,000-byte prepared-audio limit. Previously the private playback endpoint still refused files above24MiB. Playback metadata caching retains neither audio bytes nor authorization, and membership/source checks still run for each request. Timestamp clicks call an existing player directly to preserve the browser gesture; newly mounted players can still require a Play tap on strict mobile browsers.
- Hosted playback delta:seven checks including cleanup passed on a44MB synthetic byte fixture; cold/warm1KiB ranges returned206 in4.004/3.773s, exact sizes,416 bounds and signed-out401. This verifies delivery, not decoding or physical-phone playback.
- Chat UI14fixturechecks/four layout measurements passed with0browsererrors; source/account scope, tab retention, Clear,+menu, centred Home, latest-response scroll and RTL were checked.
- No new full-hour transcription, real-class publication, paid plan or purchase was used for these corrections.


Checked 6 October 2026. These are scoped engineering results, not a student pilot or a promise of perfect transcription.

## Finishing release — 6 October 2026 (V30)

The combined source passed **288 tests across 43 files** and a production build. The later confirmation-header correction passed 25 focused auth/account/header checks, including two new tests of Next's actual header emission, and another production build. These overlapping subsets are not summed into a fabricated suite total. Both new server-only queue/private-round migrations were applied; their functions deny client roles, and the new private tables enable RLS and deny client reads/writes.

Eight bounded local Notes-control checks passed at 1440px/390px with no AI calls or page errors. Saved-view changes and warning navigation made no generation request; one explicit owner action queued the expected source/material revisions. Shared/demo preparation controls were absent. Thirty-three separate local private-round checks covered desktop/mobile/dark controls and first-attempt/privacy boundaries.

Actual hosted private-round checks passed for explicit nickname consent, foreign-account denial, hidden answers, server grading, idempotent retries, immutable first score, withdrawal and rejoining. A later model preparation invalidated the old round, and share revocation permanently closed a new round even after re-sharing. Scores are private-class exercises, not global rankings or measures of religious knowledge.

The final narrow preparation/cache run passed **21 assertions including cleanup**. Three sections of authored saved timed text produced **12 notes, 11 quizzes and 9 cards in 23.962 seconds**, with no speech recognition. The text had sparse synthetic timestamps across a lesson-shaped span; this is not a newly transcribed 35-minute class. All planned sections were covered, citations stayed literal, source text/times/version and separate personal notes were preserved. The owner-only Detailed action commits a new material revision atomically; old material remains available on failure.

Two exact owned uploads of the same 23-second synthetic Arabic recording proved real completed-transcript reuse. Both returned eight identical source passages including word metadata and flags; the second had a private completed reuse checkpoint, rebased IDs and newly audited material. Upload/processing times were 11.366/22.325 seconds and 10.441/22.836 seconds respectively. This short clip showed no processing-speed improvement; the verified benefit is avoiding another transcription. Other owners, incomplete/legacy records and different ASR settings are excluded.

A generated disposable signup token passed five live confirmation checks plus cleanup: HEAD/GET did not consume it, the page emitted no-store/no-referrer, a foreign-origin POST was rejected, and explicit confirmation created a session with a fixed workspace redirect. This did not send an email or verify SMTP/template configuration. Public email delivery remains a separate owner-dependent setup gate.

Two initial failures remain in private evidence: one real global-header override was fixed; one test compared JSON object-key order rather than source values and was corrected before a narrow successful repeat. Neither initial run is represented as fully passing. No full-hour transcription was repeated. The final source correction deployed successfully; health, presentation and video links were checked. Native language quality, hardware screen lock, concurrency, full backup switching, two-hour performance and learning benefit remain unproved.

## Arabic study material and private PDF release — 6 October 2026

The integrated PDF/language source passed a production build and 195 unit tests in 31 files. The final language-filter correction passed 34 focused checks, and the completion-notice correction passed 12 focused processing/PDF checks. The final source passed its production build/TypeScript again. These overlapping subsets are not added into a larger test total. Nineteen isolated local PDF HTTP/browser checks and ten language UI checks covered source access/version/sharing, recording-language preference recovery, RTL and narrow layouts.

An actual hosted 23-second authored synthetic Arabic/English clip completed: 14.777 seconds upload, 22.209 seconds processing, eight timed segments, Arabic notes and supported quiz/cards with literal quotations. Its original Arabic script was retained. This is a short synthetic check, not real classroom accuracy proof.

The final hosted English-only authored two-page PDF produced Arabic notes, quizzes and flashcards while keeping source pages and quotations in English: **8.703 seconds upload + 21.466 seconds processing**. Twenty-four assertions passed for completion without a false failure state, actual physical pages, literal evidence, unchanged private original PDF, source range/version/signed-out access, source-linked chat, off-source refusal, religious/hadith/prompt-disclosure boundaries, saved quiz/card reviews, no audio player, desktop/390px fit and browser error absence. Test account and source cleanup were checked. It used no speech recognition. This is not native translation approval.

Two failed checks are retained privately: one wrong-language glossary definition rejected otherwise Arabic output; whole wrong-language items are now filtered before the unchanged support audit. A later check exposed a successful material notice stored as a failure; notices now stay separate from errors. A missing practice type can still offer an explicit practice retry, without discarding usable notes. No full-hour ASR test was repeated for these fixes.

The two-hour upload boundary and full contiguous 91-minute/120-minute chunk coverage were checked without processing a real learner recording. Browser capture still stops at one hour. PDFs are bounded selectable-text resources, not scanned-book OCR. Private bucket readback confirmed audio 48,000,000 bytes and PDF 8,000,000 bytes, both non-public. Native speech/translation, two-hour hosted speed, concurrent load and learning benefit remain unproven.

## Prior release checks

- The mixed-format mock exam source passed its production build, TypeScript and 169 unit tests in 27 files; focused final format/helper checks also passed.
- The mixed-format source release `95aebcd` deployed successfully. Public health/example returned HTTP 200. The earlier default-demo/language checks below remain separately scoped.
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

Native speech fidelity, physical screen-lock recording, clean first-click email confirmation, simultaneous uploads, cross-owner/concurrent transcript reuse, a hosted backup-switch rehearsal and student learning benefit remain unproven. Private recordings, raw reports, user identifiers, credentials and billing records are excluded from this repository.

## Reliability revision — 6 October 2026

Production build/TypeScript and 143 unit tests in 24 files passed. New mocked contracts cover manual provider selection/authentication, invalid timing, async rejection/cleanup, real Retry-After parsing, durable deferral, bounded parallel draining and contiguous resume. These mocks do not prove provider availability. Live database checks in a rolled-back disposable transaction confirmed service-only RPC privileges, delayed claims, checkpoint retention, stale-lease rejection and atomic two-model reservation without partial insertion.

Actual backup API calls used authored synthetic audio. Deepgram Nova-3 captured native word times from a 43.6-second mixed Urdu/Arabic/English clip in 6.937 seconds, with five low-confidence passages flagged; visible word errors remained. Speechmatics initially returned Hindi-script Urdu. Official language hints then produced unsuitable text/word times; that configuration was rejected and Urdu/Auto blocked. A separate 46-second Arabic/English Melia-1 clip returned 94 timed words in 7.112 seconds and retained both English sentences. Language labels were not reliably language-specific in that result. These observations do not establish broad accuracy or complete word retention.

The final hosted V28 hour below measures this concurrency/queue release. Earlier timings remain dated evidence, not a new estimate.

## UI, chat and private-note revision — 6 October 2026

The combined reliability/private-note source passed 160 unit tests in 27 files and its production build. Read-only checks on two existing authorized lessons confirmed that a suggested note topic returns its exact validated teacher passage via the note anchor. Private content is not published.

Scoped mocked-browser checks covered private-note save/reopen/conflicts, view switching and evidence preservation at desktop/390px in light/dark themes; anchored profile dismissal and dark upload/settings; full-screen quiz/cards/exam, countdown expiry, unanswered items, interrupted-save retry, source audio and 320px layout. These are controlled UI/API contracts, not a learner pilot or external-provider test. Final visual refinement uses the existing product type/icons, an original notebook image, a centered raised quiz action and actual-count mock-exam rows/preview.

Private personal notes are separate from captured teacher material and generated practice. Editing a note cannot rewrite transcript evidence or quiz answers. Quick, key-point and detailed views reuse the already prepared cited material; switching those views does not regenerate the class.


## Mixed-format mock exam — 6 October 2026

The source passed 169 unit tests in 27 files. Nine added helper cases cover non-duplicating count allocation, valid canonical True / False review mapping, exact quote cloze and critical-passage exclusion in English/Arabic/Urdu fixtures, and written self-check separation. This is not a native-language accuracy evaluation.

Six controlled mixed-format browser journeys covered real count caps/live previews, MCQ/True / False/blank/written input, pre-submit source exclusion, interrupted-save retry without resubmitting acknowledged responses, source playback, separate written self-check retry and deadline expiry with unanswered items. An initial-paused follow-up confirmed newly mounted format rows/previews and navigated questions remain visible. Desktop and phone screenshots were inspected. An extra authored supported card exists only in this private UI harness, so all four formats could be exercised together without altering the bundled demo or actual lessons.

All formats reuse existing supported lesson items; no new AI generation request is made when selecting formats. Written text remains within the open attempt and receives no AI correctness grade. Count/time drafts persist only in this tab, scoped to account, lesson and source version.

## Final hosted workflow — 6 October 2026

One fresh authored fictional English hour completed on the actual V28 deployment with the local worker stopped: 57,600,078-byte WAV in 14 private pieces, **55.112 seconds upload + 121.374 seconds processing**, 878 segments through 3598.74 seconds, eight cited notes, two supported quizzes and one flashcard. Twenty-nine assertions passed: full duration/timestamps/citations, fresh class chat and note-topic anchors, source ranges, saved private note edits/reopen/conflicts without modifying teacher material, quiz/card review/Insights, stale source versions, off-class refusal, ruling/hadith referral, prompt-disclosure guard, signed-out access and disposable account/media cleanup.

Whole-container memory (web app, worker and file cache) was 205.3 MB at startup and peaked at 841.5 MB during this journey, below the actual 1000.0 MB container ceiling, with zero OOM kills. These are scoped measurements of one sequential synthetic repeated-English fixture; they do not establish native Arabic/Urdu accuracy, multiple simultaneous judge uploads or future uptime.

Actual live public-example UI completed MCQ/True-False/exact blank and separately written-only self-check on desktop and 390px. Supporting quotes/times appear after submission, and the written-only result has no automatic correctness grade. This public-example UI check did not write backend review state.

## Landing hero and interactive sections — 6 October 2026 (V40)

TypeScript, the production build and all 327 existing tests in 49 files passed. The browser preview was inspected at actual CSS widths of 1440, 390 and 320 pixels, with no document horizontal overflow in those checked states. At 320 pixels, detailed feature notes and the recall/source routine remained readable and usable within their bounded cards. These are desktop-browser viewport checks, not physical-device certification.

A 28-second observation at 390 pixels captured Notes, Ask, Quiz and Flashcards automatically changing, with distinct cursor positions and both audio elements paused throughout. Pause froze the scene; manual use and keyboard Home navigation worked, and leaving the tour viewport paused it. The prepared answer appeared progressively by words; unsupported sample questions returned the stated limited-topic fallback. Manual note/source/audio, incorrect quiz feedback/retry, and flashcard reveal/rating were exercised. The feature showcase's five tabs, Summary/Detailed, original passage, prepared question, quiz feedback/retry, study topics and Read/Recall/Check controls were exercised. Manual example audio played and stopped on tab/source dismissal.

The initial local audio attempt was refused because the preview origin differed from the configured origin; using the local test origin resolved playback without changing request protection. An initial waveform hydration warning was fixed by rendering integer heights. The final fresh browser page emitted no captured warnings or errors. Reduced-motion support was reviewed in code/CSS; this pass did not emulate an operating-system motion preference. The landing uses fictional data, no microphone request, no automatic audio and no external generation call.


## Focused landing follow-up — 6 October 2026 (V41)

The final source passed TypeScript and a production build. This focused follow-up did not rerun the 327-test suite; its V40 result above remains dated evidence. Actual browser viewport checks at 320 and 390 pixels found no document or checked preview-panel horizontal overflow. Manual preview navigation exercised Home, the searchable lesson library, Summary/Detailed notes, prepared word-by-word chat, Review, quiz selection/check, flashcard reveal and an expanded Study plan topic. Audio remained paused during these checks, and the fresh production preview emitted no captured warnings/errors. A mobile Home shortcut/composer overlap was corrected with a bounded prompt area and fixed shortcut spacing.

At 1440 pixels, actual scrolling advanced narrative emphasis through 0, 21 and all 26 authored words. The ticker Pause motion control stopped motion; the narrative also fits at 320 pixels. The complete sentence stays available to assistive technology. No-JavaScript/reduced-motion behavior was reviewed in source, not tested through an OS preference. Audience wording contains no accreditation, institution endorsement or unsupported user/result numbers. The walkthrough presents current product layouts through a local fictional preview; the complete authenticated app is not embedded or automatically exercised.

## Focused landing restructure — 6 October 2026 (V42)

The revised source passed TypeScript and its production build. Focused production-browser checks used actual CSS widths 1440, 390 and 320 pixels. The document and checked notes viewport, diagram, FAQ and footer had no horizontal overflow. Shared Summary/Detailed notes, prepared class answer, manual sample-audio play/pause, card reveal, topic expansion and each of the four diagram tools were exercised. Quiz/card diagram quotes match their selected item’s original passage. Native FAQ expansion and the separate audience-ticker/narrative controls were exercised. The current wordmark is centered in the footer, the hero extends behind the compact header, and the new closing artwork uses cover rather than stretched proportions. A fresh checked production preview emitted no captured browser warnings/errors.

This visual pass does not rerun the previous 327-test suite, call external AI, measure language accuracy or establish physical-device behavior. Reduced-motion support remains reviewed source/CSS evidence; no operating-system preference emulation is claimed. The detailed preview honestly exposes the fictional example’s existing single note set; generating extra notes is disabled. The full product is available through the actual public example link.

## Full-screen scroll and Home tour — 6 October 2026 (V43)

TypeScript and the production build passed. At 1440×1000, actual scrolling pinned the centered narrative within a 1000-pixel viewport on a warm beige background; emphasis advanced from 21 to all 26 words. The hero frame and hero bottom were equal in the checked desktop layout, with the entire caption/control row removed. The browser-style bar displays the actual public example address.

A 25-state automatic observation captured Home typing the fictional question, sending it, revealing the prepared answer and its 0:24 source, holding the reply, then moving to My lessons. Both audio elements stayed paused. Manual Home chat at 390×844 and 320×844 showed the full prepared reply/source and an 8-pixel separation between conversation and composer, with no document horizontal overflow. The mobile narrative occupied 844 pixels and its centered paragraph fit at 320 pixels. The checked fresh preview emitted no captured warnings/errors.

Visible tour/ticker/narrative motion controls were removed following the current human request. OS reduced-motion handling and suspension on visibility/manual interaction remain; audio pause controls remain. No WCAG-conformance claim is made. This focused visual pass did not rerun the earlier 327-test suite, emulate an OS motion preference, call external AI or test physical phones.

## Compact loops and footer — 6 October 2026 (V44)

The production build and its TypeScript check passed. Ten existing personal-notes/language-choice tests passed; the full suite was not rerun for this visual follow-up. At 1440×1000, the scroll paragraph displayed three distinct centered lines in a 1000-pixel pinned region. Scroll emphasis advanced from 22 to all 24 words. At 390×844 and 320×844, the document and checked notes/source/footer panels had no horizontal overflow. The 320-pixel final CTA measured 308 pixels wide, with a six-pixel margin on each side.

An 11-state automatic observation captured Summary/Detailed notes, flashcard answer/reset and a complete loop. A separate 12-state observation captured Notes, Ask, Quiz and Cards cycling automatically, including the prepared correct quiz answer. Both audio elements remained paused throughout. Manual Summary/Detailed, audio play/pause, flashcard reveal and its matching original quote were exercised. The first local audio attempt was rejected because the test server used the wrong origin variable; restarting with the correct local DARSLOOP_ORIGIN resolved playback without changing request protection. Offscreen loop suspension was observed. The browser accent had a changing computed transform, and the footer logo uses the same Brand component as the header with a subtle CSS loop.

These checks use prepared fictional data and desktop-browser viewport overrides. They do not invoke external AI, save practice, test physical devices or emulate an OS motion preference. Reduced-motion safeguards were reviewed in source/CSS. No visible motion-pause control was added and no accessibility-conformance claim is made.

## Mobile landing repair and original illustrations — 6 October 2026 (V45)

The production build and TypeScript check passed. Browser viewport checks at 390×844, 320×760 and 1440×900 found no document horizontal overflow. At 390 pixels the Home welcome measured 319px with equal scroll/client height; its main pane measured 554px with equal scroll/client height. The complete prepared mobile tour advanced through Home typing/reply, My lessons, notes, class chat, quiz/check, flashcard reveal, Study plan and back to Home. Across 32 observations the drawer stayed closed and all example audio stayed paused.

At 320 pixels, all three narrative spans remained individual nowrap lines; all three badges used the same stitched lavender background and the audience ticker was running. A focused Detailed button held its manual view for 12 seconds, then the feature tick advanced and resumed Summary/Detailed selection. A focused Notes source-tab button held for 12 seconds, then Notes, Ask, Quiz and Cards completed a full loop and repeated. Unlike the earlier implementation, persistent button focus does not stop these loops permanently. Active editable inputs still receive an indefinite hold until the input is left.

The mobile menu opened with section/sign-in links, Escape dismissed it, and a section link closed it. Actual quiz practice showed the incorrect-answer explanation and its matching 0:24 source passage, with the response explicitly unsaved. The redesigned preview retains the shared Practice component with landing-only compact styling. Its redundant introduction is hidden. The preview-only scene-motion control is removed; authenticated practice controls are unchanged.

All four generated alpha illustrations and the existing original cloud backdrop loaded at the process section. The footer entry changed from false to true on entering view, its animation iteration count was one, and it stayed entered after leaving/returning. Wordmark and AI text had the same 92px desktop size, matching the product's equal text proportions. The checked browser emitted no captured warnings/errors. These checks use desktop-browser viewport overrides, prepared fictional data and no external generation requests from product interactions. Physical phones and OS reduced-motion emulation were not tested; reduced-motion behavior was reviewed in source/CSS.
