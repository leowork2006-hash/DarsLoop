# Source, tool and license register

Public product register, checked 5 October 2026. Core provider/source checks occurred on 4-5 October; import, release and fixture checks were updated on 5 October. Versions are pinned in package-lock.json. License notices are retained in dependencies and notices/. This is a provenance record, not a redistribution grant for external publisher content.

| Source/tool | Purpose | License or permission basis / origin |
| --- | --- | --- |
| Next.js 16.3.8 / React 19.3.0 | Web application | MIT; https://nextjs.org/docs and https://react.dev |
| TypeScript 7.0.2 / Node.js | Typed code / server runtime, SQLite | Apache-2.0 / MIT; https://www.typescriptlang.org and https://nodejs.org/api/sqlite.html |
| Zod 4.6.5 | Structured response validation | MIT; https://zod.dev |
| Google GenAI SDK 2.27.0 | Structured generation and support audit | Apache-2.0; https://github.com/googleapis/js-genai |
| Gemini `gemini-3.5-flash-lite` default | Notes, answers and practice | Hosted model, subject to Google API terms/account access; https://ai.google.dev/gemini-api/docs/models and https://ai.google.dev/gemini-api/terms |
| Groq `whisper-large-v3` default | Original-language timed transcription | Hosted model/API, subject to Groq/OpenAI model terms; https://console.groq.com/docs/speech-to-text and https://github.com/openai/whisper |
| Groq `whisper-large-v3-turbo` | Secondary key-word disagreement check | Same hosted API terms; small English and synthetic mixed-language checks. Correlated errors and omitted words remain possible; no calibrated confidence claim |
| Google `gemini-embedding-001`, 768 dimensions | Version-scoped lesson semantic retrieval | https://ai.google.dev/gemini-api/docs/embeddings ; vectors are normalized locally, cached privately and deleted with the lesson |
| Association MCP / HadeethEnc | Read-only candidate source records | Framework-approved source route; service terms at https://mcp.islamiccontent.org/terms.html ; canonical publisher https://hadeethenc.com . No blanket redistribution license is claimed |
| Supabase SSR 0.12.7 / JS 2.117.2 | Verified identity, private cloud database/storage and worker | MIT; https://github.com/supabase/ssr and https://github.com/supabase/supabase-js ; dependencies pinned, real database tests recorded separately |
| Lucide React 1.51.0 / Phosphor React 2.1.10 | Interface icons | ISC / MIT; https://lucide.dev/license and https://github.com/phosphor-icons/react |
| Busboy 1.6.0 | Bounded streaming multipart import | MIT; https://github.com/mscdex/busboy |
| Three.js 0.186.1 | Original interactive study illustrations | MIT; https://github.com/mrdoob/three.js |
| Inter / Bitter / Manrope / Lora / Noto Sans Arabic through Fontsource 5.3.0 | Self-hosted fonts | SIL Open Font License 1.1; https://fontsource.org ; installed packages retain licenses |
| FFmpeg / FFprobe | Audio inspection and mono WAV chunks | Local external tools; prepared Linux container installs the distribution's package. Builds can have LGPL/GPL components, https://ffmpeg.org/legal.html . Container licensing must accompany any redistribution |
| eSpeak NG 1.52.0 | Regenerated fictional example audio | GPL-3.0 tool used locally, no tool/voice model bundled. Original fictional script rendered to speech; output clause: https://espeak.sourceforge.net/license.html . Replaced the system-voice fixture before public preparation, with matching passage boundaries |
| Vitest 5.0.3 / Playwright Test 1.63.0 / tsx 4.23.15 | Testing tooling / TypeScript worker | MIT / Apache-2.0 / MIT; respective official npm packages. Authorized isolated Chrome browser checks executed; no personal browser session attached |
| Codex coding assistance | Implementation, original assets, tests and source checks | AI-assisted development. No claim of wholly hand-authored code |
| Original DarsLoop SVG logo, waveform, orbit and lesson illustrations | Visual identity / restrained motion | Created for this project in code; no competitor assets copied |
| Original fictional script and prepared study material | Example workflow | Written for DarsLoop; clearly labelled, not a live transcription/generation result |
| Google sign-in button PNG | Google authentication button | Official asset: https://developers.google.com/static/identity/gsi/web/images/standard-button-white.png ; use subject to https://developers.google.com/identity/branding-guidelines ; not original DarsLoop artwork |
| Simple Icons Apple SVG | Apple authentication button | CC0 icon: https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/apple.svg ; https://raw.githubusercontent.com/simple-icons/simple-icons/develop/LICENSE.md ; Apple trademark rights remain separate |

## External data and rights boundaries

The bundled script, synthetic speech and prepared lesson material were made for DarsLoop. Speech was rendered with eSpeak NG 1.52.0 on 5 October, with preserved passage boundaries. No engine/voice-model code is distributed. The public example never claims fresh transcription or a live learner result.

Original raster illustrations were generated using Codex's built-in OpenAI image tool on 4-5 October. Code-native visuals were created for the project. Image-model version is not claimed where the tool did not expose it. No competitor artwork, template, code or metrics are bundled. AI output is not represented as exclusively hand-drawn artwork. OpenAI terms: https://openai.com/policies/terms-of-use/ .

Groq receives fresh permitted audio chunks; Google receives transcript passages, questions and embedding inputs. Models depend on account availability and quota. Actual authored checks are scoped in docs/QA.md; neither model agreement nor those checks establish broad accuracy. Existing external source grades remain publisher-attributed metadata; the app does not grade hadith itself. External reference text is retrieved read-only and not bundled as a redistributable database.

The association source service initialized, listed tools and returned a small public Arabic candidate-record probe on 4 October. That does not prove arbitrary lecture matching, full-language coverage or uptime. Retrieved candidate wording, publisher, source URL, time and available metadata remain separate from class claims. Service terms: https://mcp.islamiccontent.org/terms.html .

Third-party source documents, dashboard screenshots, Muse files, private research, real recordings, accounts, secrets and raw development reports are excluded. The public release contains only purposeful product documentation and an explicitly selected set of runnable code/tests.

## Interface references

StudyFetch, Dars, Wispr Flow, Granola, Linear, Readwise and ThinkPlay informed visual/interaction research on 4-5 October. Their websites were viewed as references; their assets, code, logos, metrics and copy are not redistributed. Original reference-inspired interface content is adapted to the teacher-grounded DarsLoop workflow.

- https://www.studyfetch.com/
- https://darsapp.com/
- https://wisprflow.ai/
- https://www.granola.ai/
- https://linear.app/
- https://readwise.io/read
- https://quiz.bato.dev/

Native HTML dialogs, readable text, reduced motion and phone layouts were informed by HTML/WCAG guidance and Nielsen Norman Group onboarding research. Full WCAG compliance or native translation review is not claimed: https://www.w3.org/WAI/WCAG22/ and https://www.nngroup.com/articles/onboarding-tutorials/ .

## Runtime and deployment references

Official provider docs are used for implementation, not incorporated as project-owned content. Checked on 4-5 October.

- Groq transcription and quotas: https://console.groq.com/docs/speech-to-text and https://console.groq.com/docs/rate-limits
- Google structured generation, embeddings and terms: https://ai.google.dev/gemini-api/docs/structured-output , https://ai.google.dev/gemini-api/docs/embeddings , https://ai.google.dev/gemini-api/terms
- Supabase server-side accounts, private storage and migrations: https://supabase.com/docs/guides/auth/server-side/creating-a-client and https://supabase.com/docs/guides/storage/uploads/file-limits
- FFmpeg preparation/terms: https://ffmpeg.org/ffmpeg.html and https://ffmpeg.org/legal.html
- Node runtime/Docker: https://nodejs.org/api/sqlite.html and https://hub.docker.com/_/node
- Railway trial/configuration/request limits: https://docs.railway.com/pricing/free-trial , https://docs.railway.com/config-as-code/reference , https://docs.railway.com/networking/public-networking/specs-and-limits
- Alternative Render Free limitations: https://render.com/docs/free

Railway actually built and ran the Linux image, including a hosted fictional one-hour upload. One owner-authorized signup email arrived and the account became confirmed; general public email delivery and fresh OAuth consent remain limited evidence. Synthetic mixed-language checks are engineering fixtures, not native-speaker review or classroom accuracy proof.

## Organizer requirements

The current public terms were checked 5 October: https://islamicaich.org/terms . The previously supplied official Participant Guide and Scientific Framework, plus the supplied final dashboard, inform docs/SUBMISSION.md. The guide's public fetch failed during the latest check; no unseen later notice or new portal behavior is claimed. Organizer PDFs/screenshots and private source inputs are not bundled.

## Backup ASR and durable queue references

Checked 6 October 2026. Deepgram Nova-3 and Speechmatics Melia-1 are hosted APIs called through native fetch; no vendor SDK, weights, documentation corpus or vendor artwork is bundled. Private keys, account balances and raw probe outputs are excluded. Actual synthetic API checks are scoped in docs/QA.md; official supported-language claims are not treated as classroom accuracy proof.

- Deepgram supported models/languages and Token authentication: https://developers.deepgram.com/docs/models-languages-overview and https://developers.deepgram.com/reference/speech-to-text/listen-pre-recorded
- Speechmatics model/language limits, batch configuration, native word output and authentication: https://docs.speechmatics.com/speech-to-text/models , https://docs.speechmatics.com/speech-to-text/languages , https://docs.speechmatics.com/speech-to-text/batch/input , https://docs.speechmatics.com/speech-to-text/batch/output and https://docs.speechmatics.com/get-started/authentication
- Service-only Postgres functions and grants: https://supabase.com/docs/guides/database/functions

## Practice interface reference — 6 October 2026

The actual quiz.bato.dev interface and StudyFetch Test setup were inspected on 6 October, including material selection, question-type/count rows, preview cards and additional settings. One four-format reference practice test was created from an existing reference-account material and taken through submission, results and answer review using dummy responses. This is interaction evidence, not competitor grading-accuracy evidence. These references inform the centered full-screen quiz, raised choice surfaces and restrained mock-exam rows/preview. DarsLoop retains its Inter/Bitter typography, existing SVG icons, actual supported lesson questions and source/answer APIs. Competitor assets, code and content are not included. Reference: https://quiz.bato.dev and https://www.studyfetch.com .

`public/illustrations/practice-notebook-v27.png` is an original image made with OpenAI's built-in image-generation tool on 6 October 2026: an ivory notebook, pencil and audio card. It contains no competitor art or religious text. The tool did not expose a selectable model/version, so no particular image-model version is claimed. The previous bird is omitted from full-screen practice. Interface controls use the existing licensed SVG icon set; the image is decoration, not a clickable control.


## Mock exam formats — 6 October 2026

The actual StudyFetch test journey informed question-count rows, live previews, navigation and post-submission feedback. Official creation documentation: https://www.studyfetch.com/docs/docs/product-docs/6a63bfe5ee9569d818eecc3c . DarsLoop derives true/false, literal-word blanks and written recall from existing supported lesson questions/cards. Written recall uses a student self-check; no AI religious interpretation grade is supplied.

Retrieval-format/feedback research informed this design, without claiming measured DarsLoop learning benefit: Smith & Karpicke (2014), Memory 22(7), 784–802, DOI 10.1080/09658211.2013.831454, https://learninglab.psych.purdue.edu/downloads/2014/2014_Smith_Karpicke_Memory.pdf ; feedback study https://pubmed.ncbi.nlm.nih.gov/18491500/ . These sources are credited, not redistributed.

## Private PDF resources and study-material language — 6 October 2026

- `unpdf` 1.8.1 (MIT), parser based on PDF.js: https://github.com/unjs/unpdf . PDF.js text extraction API: https://mozilla.github.io/pdf.js/examples/ . No OCR, external book corpus or public book fixture is bundled. Source passages retain physical page numbers and literal extracted quotes.
- Native transcription and translated audio are separate API paths: https://console.groq.com/docs/speech-to-text . DarsLoop uses transcription and a separate generation-language choice. Language hints, extraction, audits and script checks do not establish native-speaker quality or complete word retention.
- Supabase Free per-file global limit and private bucket caps: https://supabase.com/docs/guides/storage/uploads/file-limits . Prepared audio is capped at48,000,000bytes and private PDFs at8,000,000bytes, within that global cap. Actual media/API checks are scoped in docs/QA.md.

One student’s private feedback motivated Arabic note choices, longer uploads and PDF resources. It is qualitative usability input, not a controlled student pilot or measured learning gain. Personal identity, class recordings, feedback screenshots and diagnostic data are excluded from this repository.

## Submission explainer and account confirmation — 6 October 2026

`public/explainer.mp4`, its captions and accessible transcript are original DarsLoop submission materials. The 100-second silent video uses actual product screenshots with fictional/authored example data and native text captions. No real classroom recording, beneficiary voice, music or competitor artwork is included. The associated editable deck was authored with OpenAI's artifact tooling; FFmpeg encoded H.264 video. Prepared screenshots are explicitly separate from the measured synthetic-hour processing test. See [EXPLAINER.md](docs/EXPLAINER.md).

The optional token-hash email confirmation route is informed by Supabase's official [email-template guidance](https://supabase.com/docs/guides/auth/auth-email-templates) and [custom SMTP limits](https://supabase.com/docs/guides/auth/auth-smtp). Its prepared template is project-authored; it is not proof that SMTP delivery or the hosted template is configured. The default signup flow remains PKCE until the operator opts in after configuration.

The generation admission helper uses Node's built-in [SQLite API](https://nodejs.org/api/sqlite.html) to coordinate requests from the current single container's web and worker processes. It is an application guard; the [Gemini project rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) remain authoritative. No third-party data or credentials are stored in the admission database.

## Landing hero and interactive tour — 6 October 2026

`public/art/hero-clouds-v40.webp` is original lavender/ivory cloud imagery generated with Codex's built-in image tool. No particular image model/version is claimed. Supplied screenshots and the current [Kloudboard homepage](https://www.kloudboard.com/) informed the cloud composition, centered headline and automatic dashboard tour; their artwork, code, branding, customer claims and statistics are not bundled. The interactive tour is project-authored React/CSS using the existing fictional lesson, with locally prepared answers and unsaved sample practice. It invokes no live AI and plays example audio only after a manual click. [W3C pause guidance](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) and [MDN reduced motion guidance](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion) informed its motion controls.

## Interactive landing sections — 6 October 2026

The cream feature showcase and charcoal study routine are original HTML/CSS/React compositions. [StudyFetch](https://www.studyfetch.com/) was checked as a visual reference for tabbed feature presentation; none of its images, copy, adoption figures or reported grade improvements were reused. The controls use the existing authored fictional lesson: manual audio, prepared notes/answer, supported quiz and class passages. They do not make external AI requests.

The routine links to original research on [classroom testing (Yang et al., 2021)](https://pubmed.ncbi.nlm.nih.gov/33683913/) and [learning techniques (Dunlosky et al., 2013)](https://pubmed.ncbi.nlm.nih.gov/26173288/). These support the general study-method rationale; they are not evidence of DarsLoop learning outcomes, native-language accuracy or a student pilot.


## Scroll narrative and full workspace preview — 6 October 2026 (V41)

The plain-text scroll section, Alimiyyah audience sticker, cohort ticker and rounded navigation are original project-authored React/CSS. Supplied screenshots are visual references only: no finance wording, institution logos, adoption figures or competitor assets are included. “Built for Alimiyyah students” states the intended audience, not accreditation or curriculum coverage. [MDN requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame), [W3C interaction-animation guidance](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) and [W3C pause guidance](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) informed scroll updates, reduced motion and the Pause motion control.

The expanded local tour follows current DarsLoop workspace styles and shared Home suggestions: Home, My lessons, Summary/Detailed notes, class chat, Review, Quiz, Flashcards and Study plan. It uses only the authored fictional lesson and prepared responses; it does not save student progress or call external AI. The full example link opens the actual public product workflow.

## Landing structure and original courtyard — 6 October 2026 (V42)

The current [Wispr Flow homepage](https://wisprflow.ai/) and [StudyFetch homepage](https://www.studyfetch.com/) were checked as visual references for normal/italic headings, compact navigation, feature grouping, FAQ and closing/footer hierarchy. Their images, copy, statistics, endorsements and product/security claims are not reused. The new feature bento, four-step process and lesson-to-tools diagram are project-authored React/CSS. The notes card embeds the actual shared LessonNotes component in preview mode; other compact cards use the actual fictional lesson data, supported source passages and product visual conventions. The existing complete animated tour remains available. No new AI service call or student data is used by these landing interactions.

`public/art/study-courtyard-v42.webp` is an original fictional Islamic-college courtyard at dawn, with a notebook, arches, hills and a hoopoe. It was generated with Codex’s built-in image tool, optimized to WebP, and displayed with aspect-preserving cover and a small CSS blur. The tool exposes no selectable model/version, so no specific image-model version is claimed. DarsLoop’s existing Inter/Bitter fonts, licensed icon sets and current Brand wordmark are reused. FAQ limits and language/recording behavior were checked against current upload, PDF, media, recorder and lesson-notes code; language support is not presented as measured Arabic accuracy.

## Full-screen narrative and Home tour — 6 October 2026 (V43)

Supplied screenshots informed the centered beige viewport-height narrative, browser-style preview bar and flush hero composition. This is original project-authored React/CSS; no competitor artwork or interface code is included. The animated Home exchange uses the existing authored fictional lesson and prepared supported passage before navigating to My lessons. It does not call a live AI service or play audio automatically.

The current human instruction removes visible motion controls throughout the landing; earlier V40/V41 control descriptions are historical. Existing OS reduced-motion behavior and viewport/visibility/manual-interaction suspension remain. No WCAG-conformance claim is made.

## Compact automatic product previews — 6 October 2026 (V44)

The current [Dars homepage](https://darsapp.com/#features) was inspected as a visual reference. Its small notes/card/progress/chat previews changed automatically during browser observation. DarsLoop's layout, copy and loops are original; no Dars code, images, religious answers, curriculum-coverage claims or reported results were copied.

The notes preview uses the shared product LessonNotes component, with preview-only controlled Summary/Detailed selection. The compact chat, flashcard, quiz and topic panels use the existing product interface styles and the authored public lesson's actual artifacts and source citations. These are prepared local previews, not live AI exchanges or saved student progress. Audio remains manual. Automatic React loops suspend offscreen, when the tab is hidden, under OS reduced motion and during manual/keyboard use. The footer and header reuse the product's current Brand wordmark. Audience badges describe the intended audience; they do not imply institution endorsement or complete syllabus coverage.
