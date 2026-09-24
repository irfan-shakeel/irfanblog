import { handle, readJson, json, err, nowIso, getParticipant, getState, validChallenge, checkAnswers, flagFor, POINTS, throttle } from '../../../ctf-lib/server.js';
import { CHALLENGES } from '../../../ctf-lib/content.js';

const COOLDOWN_MS = 4000;

export const onRequestPost = handle(async ({ request, env }) => {
	const p = await getParticipant(env, request);
	if (!p) return err('Session not found. Please register first.', 401);
	if (!throttle('sub:' + p.session_hash, 30, 60_000)) return err('Too many submissions. Slow down.', 429);

	const body = await readJson(request);
	const challengeId = String(body.challenge || '');
	if (!validChallenge(challengeId)) return err('Unknown case.', 400);
	const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};
	const clean = {};
	for (const q of ['q1', 'q2', 'q3']) clean[q] = typeof answers[q] === 'string' ? answers[q].slice(0, 4) : null;
	if (Object.values(clean).some((v) => !v)) return err('Answer every question before submitting.', 400);

	const db = env.CTF_DB;
	const now = nowIso();
	const state = await getState(env);
	await db.prepare('UPDATE participants SET last_activity_at = ? WHERE id = ?').bind(now, p.id).run();
	if (!state.started_at) return err('The challenge has not started yet.', 403, { code: 'not_started' });
	if (!state.is_open) return err('Submissions are closed.', 403, { code: 'closed' });

	const ch = CHALLENGES.find((c) => c.id === challengeId);
	const already = await db.prepare('SELECT points, solved_at FROM solves WHERE participant_id = ? AND challenge_id = ?').bind(p.id, challengeId).first();
	if (already) return json({ ok: true, correct: true, alreadySolved: true, pointsAwarded: 0, flag: flagFor(env, challengeId), takeaway: ch.takeaway });

	const last = await db
		.prepare('SELECT created_at FROM submissions WHERE participant_id = ? AND challenge_id = ? AND is_correct = 0 ORDER BY id DESC LIMIT 1')
		.bind(p.id, challengeId)
		.first();
	if (last) {
		const wait = COOLDOWN_MS - (Date.now() - Date.parse(last.created_at));
		if (wait > 0) return err(`Cooldown: re-check your evidence (${Math.ceil(wait / 1000)}s).`, 429, { retryAfterMs: wait });
	}

	const result = checkAnswers(env, challengeId, clean);
	let awarded = 0;
	if (result.allCorrect) {
		const ins = await db
			.prepare('INSERT OR IGNORE INTO solves (participant_id, challenge_id, points, solved_at) VALUES (?,?,?,?)')
			.bind(p.id, challengeId, POINTS[challengeId], now)
			.run();
		awarded = ins.meta.changes === 1 ? POINTS[challengeId] : 0;
	}
	await db
		.prepare('INSERT INTO submissions (participant_id, challenge_id, answers_json, is_correct, points_awarded, created_at) VALUES (?,?,?,?,?,?)')
		.bind(p.id, challengeId, JSON.stringify(clean), result.allCorrect ? 1 : 0, awarded, now)
		.run();

	if (!result.allCorrect) {
		return json({ ok: true, correct: false, correctCount: result.correct, total: result.total, cooldownMs: COOLDOWN_MS });
	}
	const totals = await db.prepare('SELECT COALESCE(SUM(points),0) AS score, COUNT(*) AS solved FROM solves WHERE participant_id = ?').bind(p.id).first();
	return json({ ok: true, correct: true, pointsAwarded: awarded, alreadySolved: awarded === 0, flag: flagFor(env, challengeId), takeaway: ch.takeaway, score: totals.score, solved: totals.solved });
});
