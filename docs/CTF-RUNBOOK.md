# NMT SOC Decision Challenge: Runbook (V2)

**Can You Trust This File?** OPSWAT Academy × New Mexico Tech.
**5 cases · 20 minutes · 100 points · ONE final submission per case.**

| What | URL |
|---|---|
| Student entry (QR target) | https://irfanshakeel.com/ctf |
| Projected leaderboard | https://irfanshakeel.com/ctf/leaderboard |
| Presenter console | https://irfanshakeel.com/ctf/admin |
| Preview (testing only) | https://ctf-v2.irfanblog.pages.dev/ctf |

## ⚠️ Preview and production use DIFFERENT databases

| Environment | URL | D1 database |
|---|---|---|
| **Production** | irfanshakeel.com, irfanblog.pages.dev | `nmt-ctf` (**live event data**) |
| **Preview** | `*.irfanblog.pages.dev` branch/hash URLs | `nmt-ctf-preview` (test data) |

- The admin console shows a badge: **PRODUCTION · live event database** or **PREVIEW · test database**. Check it before you press anything.
- The preview admin password is not the production one. Both live in Cloudflare secrets.
- `scripts/ctf-sim.mjs` **fully resets** whatever `BASE` you point it at. Never run it against production during or after the event unless you intend to wipe it.

## Cases

| # | Case | Points | Target time | Evidence |
|---|---|---:|---:|---|
| 01 | WHO ARE YOU REALLY? | 10 | 2 min | Downloadable suspect file + built-in raw byte view |
| 02 | GREEN BUT BLIND | 15 | 3 min | Analysis record + import policy |
| 03 | CLEAN, BUT CAPABLE | 20 | 4 min | Sample PDF, optional FileScan.IO, local evidence (real FileScan screenshots + PDF structure) + policy |
| 04 | SAFE FOR WHICH OBJECTIVE? | 20 | 4 min | Downloadable synthetic export + scan report + data-transfer policy |
| 05 | THE FINAL BOUNDARY | 35 | 7 min | 4-step progressive evidence; all 4 must be viewed before submitting |

The answer key and flags live only in Cloudflare secrets. The instructor answer sheet is kept locally in `_ctf_source/` and is never committed.

## Scoring model

- Students can change answers freely until they press **SUBMIT FINAL DECISION** and confirm.
- All answers correct: the student gets the full case points, and the flag and takeaway are revealed.
- Any answer wrong: **CASE CLOSED**, 0 points, locked permanently. Nothing tells them which answer was wrong.
- Refreshing, logging in on another device or using a re-entry link never unlocks a case.
- Leaderboard ranking: score, then cases passed, then the time the current score was reached (earlier wins).
- A malformed submission (unanswered question, wrong number of picks) is rejected **without** using up the attempt.
- **There is no "retry" button.** Resetting a single student is intentionally not possible during the event.

## Event-day checklist

**Before the event (T-30 min)**
1. Open `/ctf/admin` on the presenter laptop and confirm the badge says **PRODUCTION** and the state is "Not started".
2. On your phone, scan the QR and register a dummy analyst.
3. Click **START CHALLENGE** and confirm each case opens:
   - Case 01 downloads the file and INSPECT RAW shows the bytes.
   - Case 03 opens FileScan.IO and the local evidence shows 3 screenshots, the PDF structure and the policy.
   - Case 05 steps through all 4 evidence cards.
4. Submit **one case wrong** and confirm it shows CASE CLOSED and stays closed after a refresh.
5. Submit **one case right** and confirm FLAG CAPTURED and the score.
6. Open `/ctf/leaderboard` on the projector and confirm it updates.
7. **RESET EVENT**, type `RESET`, and confirm **0 analysts** and "Not started".

**Start**
1. Show the QR. Students register.
2. At about 30 analysts, click **START CHALLENGE** (20 minutes).

**During**
- Students investigate independently. Clarify the wording of a question only.
- Never confirm or deny whether an individual answer is right.

**Final ~2 minutes**
- **FREEZE LEADERBOARD**. Say: *"Leaderboard is frozen. Your submissions still count."*

**Finish**
1. At 00:00, click **CLOSE SUBMISSIONS**. The timer does not close them for you.
2. Check the top 3 privately in the admin table (the ✓/✗ per case column, and click a row for answers).
3. **REVEAL FINAL RESULTS**. Announce the winners.
4. Debrief the correct reasoning for each case.

**After the event**
1. **Export CSV** (participants, and all submissions).
2. **RESET EVENT** to delete student personal data.
3. Delete the Cloudflare API token (My Profile → API Tokens) and `.cloudflare.env`.

## Fallbacks

| Problem | Action |
|---|---|
| FileScan.IO slow or down | Case 03 is fully solvable from **VIEW LOCAL EVIDENCE**. |
| Weak Wi-Fi | All evidence is small and hosted locally; mobile data works. |
| Student lost their session | Admin → student → **Generate re-entry link** (single use). Their locked or passed cases carry over. |
| Inappropriate handle | Admin → student → **Rename handle** or **Hide from public leaderboard**. |
| Need more time | Admin → **+1 min**. |
| Started too early, before anyone submitted | **Reset scores (keep registrations)**, then **START** again. This clears every final submission. |

## D1 read budget (Cloudflare free tier: 5,000,000 rows read per day, whole account)

Measured with `scripts/ctf-event-sim.mjs` (local, real time, 30 students, 25 minutes including registration):
the projector, the presenter console, 30 student phones polling status every 8 s, 10 phones also on the leaderboard and 150 final submissions came to about 77,000 rows read in total, roughly 1.5% of the daily limit.

How this stays low:
- **Leaderboard** (`/api/ctf/leaderboard`, every 4 s): the public board is cached in `event_state` and tagged with `data_version`. A poll reads 1 row. The first poll after a change (registration, submission, hide, rename, delete, reset) recomputes it once, at about 350 rows with 30 students.
- **Per-participant aggregates** (`score`, `solved`, `attempted`, `last_solve_at`) are recomputed from `attempts` inside the same transaction as each final submission. The leaderboard never scans submissions per poll.
- **Presenter console** (`/admin/overview`, every 4 s) sends `?v=` and gets a state-only reply (1 row) unless something changed.
- **Students** poll only `/api/ctf/me` (session + state + their own ≤5 attempts, about 3–7 rows) every 8 s. Students never poll the leaderboard.
- **Indexes:** `idx_participants_board`, `idx_attempts_passed_time`, `idx_attempts_challenge`, `idx_participants_session`, plus the primary key on `attempts(participant_id, challenge_id)`.

Before the event, **avoid heavy testing on the same UTC day**. The limit is account-wide, shared with other projects, and resets at 00:00 UTC (8 pm Eastern). If it is exceeded, D1 queries fail until the reset. Check with `npx wrangler d1 info nmt-ctf`.

To measure locally: set `CTF_D1_DEBUG=1` in `.dev.vars`. The API then returns `x-d1-rows-read` headers. This is never set in Cloudflare.
```
npm run build && npx wrangler pages dev dist     # then, in another terminal:
SCALE=1 node scripts/ctf-event-sim.mjs            # real time; SCALE=10 for a quick run
```

## Architecture notes

- The static Astro site is unchanged. `/ctf/*` is static HTML plus client scripts.
- The API is in `functions/api/ctf/*`. `functions/ctf-v2/artifacts/[name].js` serves the challenge files as forced downloads (`application/octet-stream`, attachment).
- Schema: `migrations/0001_init.sql` and `migrations/0002_one_attempt.sql` (the `attempts` table, one row per participant per case).
- **Public:** `ctf-lib/content.js` (question text and random option ids).
- **Server-only, but not secret:** `ctf-lib/server-content.js` (takeaways).
- **Secrets, per environment:** `CTF_ADMIN_PASSWORD`, `CTF_SESSION_SECRET`, `CTF_ANSWER_KEY`, `CTF_FLAG_IDENTITY`, `CTF_FLAG_BLIND`, `CTF_FLAG_CAPABLE`, `CTF_FLAG_OBJECTIVE`, `CTF_FLAG_BOUNDARY`.

## Safety

- Artifacts are benign:
  - `mesa-maintenance-notice.pdf` is plain text with a .pdf name.
  - `vendor-maintenance-brief.pdf` is a 1-page PDF with one embedded 33-byte `gateway.ini`. It has no JavaScript, actions, URIs or launch entries. FileScan.IO gives it a score of 0.00, 0 AV engines and the verdict Undetermined.
  - `research-access-export.txt` contains synthetic values only (test card 4111…, SSN 123-45-6789, IP 192.0.2.45 from the documentation range).
- No EICAR files, ZIPs or instructor package files are hosted. Cases 02 and 05 are evidence-only.

## Local development

```
cp .dev.vars.example .dev.vars          # local secrets (gitignored)
npm run ctf:dev                         # build + local D1 + wrangler pages dev on :8788
npm run ctf:sim                         # 30-student simulation (FULL RESET of target)
```
