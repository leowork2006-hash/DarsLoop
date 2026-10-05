# Architecture

## Student workflow

Permitted fictional recording/upload -> streamed temporary source -> format/duration inspection -> prepared private audio -> durable job -> two speech passes -> timed transcript and disagreement flags -> bounded generation/support audit -> source-linked notes, quiz/cards and selected-lesson questions.

Notes can be disabled or set to Quick, Balanced or Detailed. Transcript/practice remain separate. Unclear passages are withheld from generated study material. Agreement between models is not proof that wording is correct.

## Runtime

- Next.js/React serves pages, authenticated APIs and byte-range audio. Node.js 24+ is required.
- FFmpeg/FFprobe inspect up to 500 MiB/one-hour inputs, extract video audio, repackage AAC or compress large inputs. Stored audio stays <=24 MiB; the UI discloses preparation. Original source files are not silently claimed to be preserved after compression.
- The worker leases/checkpoints queued jobs. Failures preserve stored lesson audio and expose retry states; no example output substitutes for failed processing.
- Hosted mode uses Supabase Auth, private Storage, database access policies and job leases. Only the server/worker receive the secret key. Runtime connections can be supplied after a secret-free build.
- Local development uses loopback-only SQLite/private files. It does not provide the hosted account security model.
- One Docker service runs web and worker processes. /api/health checks the web process; it is not a model, database or ongoing uptime guarantee.

## Information boundaries

Groq receives audio chunks. Google receives transcript passages, questions and embedding inputs. A separate read-only reference service receives an explicitly selected source query. Personal religious application refers to a teacher; unsupported topics remain outside the class. Source candidates and publisher metadata are distinguished from teacher wording.

Private classes share permitted lesson material, not personal practice responses. Revocation blocks future access; already downloaded files cannot be recalled. Deleted lessons invalidate related stored material according to the implemented storage paths.

## Implemented limits

Browser recording uses recoverable chunks and best-effort wake lock/one-hour stopping. Mobile browser suspension or screen lock can interrupt capture; use the phone recorder for unattended capture and import afterward. Teacher handoff is optional and has no authenticated approval backend. Lesson tests are not official curriculum exams. Exam-week suggestions are device-local. Privacy/accuracy/learning claims must remain within actual evidence in QA.md.
