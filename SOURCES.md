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
| Groq `whisper-large-v3-turbo` | Secondary key-word disagreement check | Same hosted API terms; actual small English test. Correlated errors remain possible; no calibrated confidence claim |
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

The Node container digest was actually checked via registry, but a Linux container build/run and public host execution are pending. Supabase runtime authentication after a secret-free build passed; hosted signup delivery and social consent remain pending.

## Organizer requirements

The current public terms were checked 5 October: https://islamicaich.org/terms . The previously supplied official Participant Guide and Scientific Framework, plus the supplied final dashboard, inform docs/SUBMISSION.md. The guide's public fetch failed during the latest check; no unseen later notice or new portal behavior is claimed. Organizer PDFs/screenshots and private source inputs are not bundled.
