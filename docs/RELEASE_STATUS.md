# Release status

Checked 5 October 2026. [DarsLoop is live](https://darsloop-production.up.railway.app). [Try the fictional example](https://darsloop-production.up.railway.app/example) without an account. The product repository is [DarsLoop on GitHub](https://github.com/leowork2006-hash/DarsLoop); a fresh anonymous clone installed/built and passed the documented unit/API/example checks.

## Verified on the actual host

- Railway Linux Docker build/deployment succeeded; web and worker startup were observed.
- 14 public-example/audio/privacy boundary checks passed on the hosted HTTPS URL.
- 26 authenticated hosted assertions passed with fresh fictional audio, actual transcription/generation, notes, class answers, quiz, cards, private sharing/revocation, deletion and sign-out. Two disposable accounts were removed and their absence confirmed.
- The local worker was stopped during the fresh upload check; the hosted worker processed the job.
- Notes and practice screens were inspected at a mobile browser width. Real phone microphone and locked-screen recording were not tested.
- Full-trial eligibility was verified. The account showed $5 credit/30 trial days before usage; one replica and sleeping disabled were configured. Credits are finite and uptime is not promised.

## Verified from the clean release copy

- npm ci completed with zero reported vulnerabilities.
- Secret-free production build, TypeScript and 85 unit tests in 17 files passed.
- 18 isolated local HTTP checks passed: ownership, sharing/revocation, practice, source audio and upload guards. Temporary data removed.
- 14 example checks passed on the prior cloud-configured release: notes/practice, direct landing link, exact fictional audio, seeking and private boundaries.
- Five actual runtime-only cloud checks passed: sign-in, empty private workspace, sign-out and disposable account deletion. Keys were supplied only after building.
- Earlier actual large WAV, MP4 and AAC import/provider checks are scoped in QA.md.

## Pending verification

- In-flight worker process-kill recovery. Upload-session persistence across an actual deployment passed; this does not prove every crash window.
- Public signup/recovery delivery and any advertised social consent.
- Final starting-version/reused-work disclosure, deck/video and portal receipt.

## Default example and language update

Current source adds a prepared fictional lesson inside each signed-in workspace, remembers deletion, preserves the fresh upload path and keeps demo activity out of actual student Insights. Upload/recording can select a main spoken language, separately from interface language. Chat can fall back to explicitly labelled exact-passage search if AI generation fails. Production build/TypeScript and 130 unit tests pass; deployment and changed hosted-path evidence must be observed separately before this update is described as live.

No student learning benefit or physical locked-phone reliability is established. Account quotas and hosting credits must be checked in the actual accounts. Do not interpret the earlier local checks as additional hosted coverage.

Repository packaging pass, 5 October: curated the public runtime/check scripts and source register, added judge/architecture/submission guides, and rechecked TypeScript, dependency consistency, 18 isolated API checks and 14 key-free example boundaries. The example server ran with no AI connections and FFmpeg absent from its PATH. No new live model run or hosted execution is implied.


## Updated hosting release

Direct-storage upload changes passed 23 actual cloud/host assertions with a 38 MB fictional source, resumed across a deployment after more than five minutes. Detailed notes, timestamps, quizzes/cards, private replay and cleanup passed. Actual whole-container cgroup readings: 175.9 MB at startup, 292.4 MB peak, about 1 GB limit, zero OOM kills. The main build/typecheck and 87 unit tests passed; 14 HTTPS example checks passed again. Sources, budget scenarios and monitoring limits are in [DEPLOYMENT.md](../DEPLOYMENT.md). No current evidence guarantees continuous uptime through 15 October.

## Public repository verification

Published 183 scanned product-only files through the owner-authorized GitHub connector. The computer's separate Git credential still rejected push; no credential was requested or exposed. The remote file tree exactly matched the scanned local release. A fresh anonymous GitHub clone installed with no reported vulnerabilities, built without keys, passed TypeScript and 87 unit tests, 18 isolated local API checks and 14 example boundaries from its own production server. Private research/reports/credentials/real recordings remain excluded. Railway main-branch source connection succeeded.


## Current recovery/chat release — actual hosted checks, 5 October

The recovery fix is deployed. Six owner-authorized saved transcripts were repaired without resending audio: four contain supported notes plus quizzes/cards; two short clips retain notes/cards and an honest missing-quiz warning. An actual fresh one-hour fictional WAV (57,600,078 bytes, above the old source cap) then passed on the hosted worker: 55.708 seconds upload, 139.154 seconds processing, 878 transcript segments through 3598.74 seconds, six cited notes, two quiz items and two cards. These are bounded synthetic English results, not a classroom-accuracy or concurrency guarantee.

Latest production build/typecheck and 122 unit tests in 20 files passed. Sixteen real-adapter authored safety cases passed. Forty-three browser checks cover prepared example, sign-in, page navigation, narrow widths, settings/theme, practice, optional listening-first teacher handoff, private classes and fake-microphone recording through real hosted ASR/generation. Eighteen additional live chat/UI checks passed, including home/lesson answers, citations/replay, off-class/referral/disclosure boundaries, selected-question auto-send, exam schedule save/clear and term search. The unavailable-provider UI/retry check was simulated; physical microphone, locked phone, email delivery and all worker-crash windows remain unproven.

The full one-hour workflow reached a 773.6 MB whole-container peak under the measured 999,997,440-byte limit, with zero OOM kills. This supersedes smaller-fixture peaks as evidence of that workload. Private replay now streams exact requested byte ranges instead of buffering the entire stored recording. Long-lesson embeddings reuse identical text only within the same lesson version, preserving source indices and update fences. Separate final retrieval/replay measurements are in QA.md.

Automatic notes and practice retain optional teacher referral. There is no approval prerequisite or authenticated correction backend. Transcription agreement, quotes and support checks do not establish universal religious or audio accuracy. Final presentation/video claims must describe this implemented scope.

The signed-in Google project remains Free with no billing account, and a rate-limit warning was visible. Code reduces redundant calls and preserves completed work but cannot increase account allowances. Use Gemini API billing, not a Google AI consumer subscription, for additional external-app capacity. No purchase, account upgrade or card was added. See DEPLOYMENT.md for account-specific caps, dated sources and finite hosting budget.
