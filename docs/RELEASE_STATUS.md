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

No student learning benefit or physical locked-phone reliability is established. Account quotas and hosting credits must be checked in the actual accounts. Do not interpret the earlier local checks as additional hosted coverage.

Repository packaging pass, 5 October: curated the public runtime/check scripts and source register, added judge/architecture/submission guides, and rechecked TypeScript, dependency consistency, 18 isolated API checks and 14 key-free example boundaries. The example server ran with no AI connections and FFmpeg absent from its PATH. No new live model run or hosted execution is implied.


## Updated hosting release

Direct-storage upload changes passed 23 actual cloud/host assertions with a 38 MB fictional source, resumed across a deployment after more than five minutes. Detailed notes, timestamps, quizzes/cards, private replay and cleanup passed. Actual whole-container cgroup readings: 175.9 MB at startup, 292.4 MB peak, about 1 GB limit, zero OOM kills. The main build/typecheck and 87 unit tests passed; 14 HTTPS example checks passed again. Sources, budget scenarios and monitoring limits are in [DEPLOYMENT.md](../DEPLOYMENT.md). No current evidence guarantees continuous uptime through 15 October.

## Public repository verification

Published 183 scanned product-only files through the owner-authorized GitHub connector. The computer's separate Git credential still rejected push; no credential was requested or exposed. The remote file tree exactly matched the scanned local release. A fresh anonymous GitHub clone installed with no reported vulnerabilities, built without keys, passed TypeScript and 87 unit tests, 18 isolated local API checks and 14 example boundaries from its own production server. Private research/reports/credentials/real recordings remain excluded. Railway main-branch source connection succeeded.


## Latest recovery fix — deployment pending

The 5 October study-material fix preserves completed transcripts and independently supported notes when practice generation is incomplete. It retains conceptual practice, reuses audited notes for supported flashcards, identifies model permission failures and offers a prepared demo in the lesson library. The latest local build/typecheck, 111 unit tests and 18 isolated API checks passed. The safety update broadens deterministic routing and withholds instruction-like transcript passages from AI/evidence while retaining the source. Six owner-approved saved transcripts were repaired separately; four have notes plus both practice types, and two short clips show a missing-quiz warning. Their audio was not retranscribed.

Groq comparison access initially failed and was then successfully rechecked after the owner's permission change. The existing live release and no-account example still respond. Railway's reported build incident is delaying the new code rollout. Do not interpret the local checks or saved-data repair as proof that the latest code is already live. The one-hour hosted benchmark and updated startup memory reading are pending. Current provider quotas, billing choices and remaining limitations are documented in [DEPLOYMENT.md](../DEPLOYMENT.md).
