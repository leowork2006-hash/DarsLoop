# Architecture

## Student workflow

Permitted fictional recording/upload -> streamed temporary source -> format/duration inspection -> prepared private audio -> durable job -> two speech passes -> timed transcript and disagreement flags -> bounded generation/support audit -> source-linked notes, quiz/cards and selected-lesson questions.

Selectable-text PDF -> bounded native extraction worker -> original physical page passages -> the same evidence validation/support audit -> page-linked notes, quiz/cards and source questions. PDF resources never enter speech recognition and never receive invented audio times. Limits are 8 MB, 40 physical pages and 80,000 extracted characters; scans/locked files/over-limit extraction fail visibly.

Study-material language (Auto/Arabic/Urdu/English) is separate from the spoken-language hint. Original quotations retain their captured wording. Wrong-language whole items are withheld before the independent support audit; a wrong-language quiz choice withholds its entire quiz.

Notes can be disabled or set to Quick, Balanced or Detailed. Transcript/practice remain separate. Unclear passages are withheld from generated study material. Agreement between models is not proof that wording is correct.

Long sources use bounded chronological generation sections and neighboring context for conditions. All sections must complete before replacing material. The explicit Detailed upgrade uses saved completed passages, preserves the original transcript/PDF and personal notes, and commits a new material revision only on success. Switching display views has no generation cost.

## Runtime

- Next.js/React serves pages, authenticated APIs and byte-range audio. Node.js 24+ is required.
- FFmpeg/FFprobe inspect up to 500 MiB/two-hour inputs, extract video audio, repackage AAC or compress large inputs. Stored audio stays <=48,000,000 bytes; the UI discloses preparation. Original source files are not silently claimed to be preserved after compression.
- The worker leases/checkpoints queued jobs. Failures preserve stored lesson audio and expose retry states; no example output substitutes for failed processing.
- Hosted mode uses Supabase Auth, private Storage, database access policies and job leases. Only the server/worker receive the secret key. Runtime connections can be supplied after a secret-free build.
- Local development uses loopback-only SQLite/private files. It does not provide the hosted account security model.
- One Docker service runs web and worker processes. /api/health checks the web process; it is not a model, database or ongoing uptime guarantee.
- A shared local SQLite admission gate bounds generation calls across both processes. Completed eligible transcripts can be reused for an exact prepared-audio duplicate owned by the same account with identical transcription settings. Generation remains fresh; incomplete/shared/legacy checkpoints are excluded.

## Information boundaries

Groq receives audio chunks. Google receives extracted transcript or PDF page passages, questions and embedding inputs. A separate read-only reference service receives an explicitly selected source query. Personal religious application refers to a teacher; unsupported topics remain outside the class. Source candidates and publisher metadata are distinguished from teacher wording.

Private classes share permitted lesson material, not personal practice responses. Revocation blocks future access; already downloaded files cannot be recalled. Deleted lessons invalidate related stored material according to the implemented storage paths.

Optional private quiz rounds snapshot one shared source/material revision and one supported question set. Explicit nickname opt-in gates questions/results; a server-only first-attempt submission is immutable. Withdrawal hides the result while retaining the attempt lock. Membership, share and snapshot checks apply to every operation, and share/source/material changes permanently close a round. Round results do not feed personal review history.

## Implemented limits

Browser recording uses recoverable chunks and best-effort wake lock/one-hour stopping. Mobile browser suspension or screen lock can interrupt capture; use the phone recorder for unattended capture and import afterward. Teacher handoff is optional and has no authenticated approval backend. Lesson tests are not official curriculum exams. Exam-week suggestions are device-local. Privacy/accuracy/learning claims must remain within actual evidence in QA.md.
