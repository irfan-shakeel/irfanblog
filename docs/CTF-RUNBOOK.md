# NMT SOC Decision Challenge: Runbook

**Can You Trust This File?** OPSWAT Academy × New Mexico Tech. 4 cases · 20 minutes · 100 points.

| What | URL |
|---|---|
| Student entry (QR target) | https://irfanshakeel.com/ctf |
| Projected leaderboard | https://irfanshakeel.com/ctf/leaderboard |
| Presenter console | https://irfanshakeel.com/ctf/admin |

The QR code (`public/ctf/qr.svg`, also shown in the leaderboard header) points to `https://irfanshakeel.com/ctf`.

## Architecture

- The Astro site stays a static build. `/ctf/*` pages are static HTML plus small client scripts.
- The API is in Cloudflare Pages Functions under `functions/api/ctf/*`. Shared code is in `ctf-lib/`.
- The database is D1 `nmt-ctf`, bound as `CTF_DB` (see `wrangler.toml`). The schema is in `migrations/`.
- Preview and production share the same D1 database. **Always reset after testing.**
- Secrets are Pages env vars (secret_text) on both the preview and production environments. They are never committed:
  `CTF_ADMIN_PASSWORD`, `CTF_SESSION_SECRET`, `CTF_ANSWER_KEY` (JSON), `CTF_FLAG_IMPOSTOR`, `CTF_FLAG_BOX`, `CTF_FLAG_GREEN`, `CTF_FLAG_DLP`.
- Scoring, answer checking and flag reveal all happen server-side. The public API returns handles only.

## Admin setup

1. Open `/ctf/admin` and log in with `CTF_ADMIN_PASSWORD`. The session lasts 12 hours.
2. To change the password: Cloudflare dashboard → Workers & Pages → irfanblog → Settings → Variables and Secrets → edit `CTF_ADMIN_PASSWORD` (Production). Changes apply on the next deployment. Use Deployments → Retry deployment to apply immediately.

## Reset procedure

- **Reset scores (keep registrations):** clears submissions, solves and the timer, and keeps students registered. Use it if you start too early.
- **RESET EVENT (delete everything):** deletes all participants, submissions and scores, and invalidates every student session.
- Both require typing `RESET`. **After a reset, confirm the console shows 0 analysts and "Not started" before showing the QR.**

## Event-day checklist

**Before the session (T-30 min)**
1. Open `/ctf/admin` on the presenter laptop and confirm the state shows "Not started (closed)".
2. On your phone, scan the QR and register a dummy analyst (e.g. `TestAnalyst`).
3. In admin, click **START CHALLENGE**. On the phone, solve all 4 cases (wrong answer once to see the retry and cooldown).
4. Open `/ctf/leaderboard` on the projector. Check that it updates within about 3 seconds, the top 3 are highlighted and the timer runs.
5. Tap **OPEN FILESCAN.IO** (it opens in a new tab) and **VIEW FALLBACK EVIDENCE**.
6. Try **Freeze**, **Close**, **Reveal**, **Export CSV**.
7. Click **RESET EVENT** and type `RESET`. Confirm 0 analysts and Not started.
8. Put the leaderboard on the projector (browser full screen, F11).

**Start**
1. Show the QR (on the leaderboard header, or the slide).
2. Students register. Watch the "Analysts" counter reach about 30.
3. Click **START CHALLENGE** (default 20 minutes). Cases unlock automatically on student screens within about 8 seconds.

**Final ~2 minutes**
1. Click **FREEZE LEADERBOARD**. Say: *"Leaderboard is frozen. Your submissions still count."*

**Finish**
1. When the timer hits 00:00, click **CLOSE SUBMISSIONS**. The timer never closes submissions on its own.
2. Check the top 3 privately in the admin table (rank, full name, email).
3. Click **REVEAL FINAL RESULTS**. The podium appears on the projector.
4. Announce the winners and debrief the four cases.
5. Click **EXPORT CSV** (participants, and all submissions) for your records.

## Fallback procedures

| Problem | Action |
|---|---|
| FileScan.IO slow or down | Tell students to use **VIEW FALLBACK EVIDENCE** in Case 03. It contains everything needed. |
| Weak Wi-Fi | Every case works from small hosted screenshots. Students can use mobile data. |
| Student lost their session (new phone, cleared browser) | Admin → click the student → **Generate re-entry link**. It is copied to your clipboard; send or show it. It works once and keeps their score. |
| Duplicate or inappropriate handle | Admin → student → **Rename handle**, or **Hide from public leaderboard**. |
| Need more time | Admin → **+1 min** (repeat as needed). |
| Started too early | **Reset scores (keep registrations)**, then **START** again. |
| Admin locked out after wrong passwords | Wait 5 minutes (10 failed attempts per 5 min per network). |

## Local development

```
cp .dev.vars.example .dev.vars   # local-only secrets (gitignored)
npm run ctf:dev                  # build + local D1 + wrangler pages dev on :8788
npm run ctf:sim                  # 30-student simulation (FULL RESET of the target!)
```

`BASE=<url> ADMIN=<password> KEY='<answer key json>' node scripts/ctf-sim.mjs` runs the simulation against a deployment. **It resets the event before and after.**

## Safety

- Only two safe artifacts are hosted: `02-nmt-safe-baseline-renamed.pdf` (plain text) and `05-nmt-maintenance-javascript.pdf` (its JavaScript only calls `app.alert`).
- No EICAR files, ZIPs or instructor package contents are hosted. Case 02 uses screenshots only.

## After the event

1. Export the CSVs, then **RESET EVENT** to delete personal data.
2. Delete the Cloudflare API token (My Profile → API Tokens).
3. Optionally delete the D1 database `nmt-ctf` and the `CTF_*` variables, and remove `/ctf` from the site.
