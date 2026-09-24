import { handle, readJson, json, err, nowIso, getParticipant, getState, validChallenge, normalizeAnswers, isCorrect, flagFor, POINTS, throttle } from '../../../ctf-lib/server.js';
import { TAKEAWAYS } from '../../../ctf-lib/server-content.js';

// ONE final submission per participant per case.
// - Malformed/incomplete payloads are rejected (400) WITHOUT consuming the attempt.
// - The attempt row is written atomically (PRIMARY KEY participant_id+challenge_id), so
//   concurrent or repeated POSTs can never score twice or retry.
// - A failed response carries no per-question result, no correct answer and no flag.
export const onRequestPost = handle(async ({ request, env }) => {
	const p = await getParticipant(env, request);
	if (!p) return err('Session not found. Please register first.', 401);
	if (!throttle('sub:' + p.session_hash, 30, 60_000)) return err('Too many requests. Slow down.', 429);

	const body = await readJson(request);
	const challengeId = String(body.challenge || '');
	if (!validChallenge(challengeId)) return err('Unknown case.', 400);
	const answers = normalizeAnswers(challengeId, body.answers);
	if (!answers) return err('Answer every question before submitting.', 400, { code: 'incomplete' });

	const db = env.CTF_DB;
	const now = nowIso();
	const state = await getState(env);
	await db.prepare('UPDATE participants SET last_activity_at = ? WHERE id = ?').bind(now, p.id).run();
	if (!state.started_at) return err('The challenge has not started yet.', 403, { code: 'not_started' });
	if (!state.is_open) return err('Submissions are closed.', 403, { code: 'closed' });

	const passed = isCorrect(env, challengeId, answers);
	const points = passed ? POINTS[challengeId] : 0;
	const ins = await db
		.prepare('INSERT OR IGNORE INTO attempts (participant_id, challenge_id, answers_json, passed, points_awarded, submitted_at) VALUES (?,?,?,?,?,?)')
		.bind(p.id, challengeId, JSON.stringify(answers), passed ? 1 : 0, points, now)
		.run();
	if (ins.meta.changes !== 1) return err('This case is already closed. Only one final submission is allowed.', 409, { code: 'already_submitted' });

	const totals = await db.prepare('SELECT COALESCE(SUM(points_awarded),0) AS score, COALESCE(SUM(passed),0) AS passed, COUNT(*) AS attempted FROM attempts WHERE participant_id = ?').bind(p.id).first();
	const base = { ok: true, passed, points, score: totals.score, passedCount: totals.passed, attempted: totals.attempted };
	return json(passed ? { ...base, flag: flagFor(env, challengeId), takeaway: TAKEAWAYS[challengeId] } : base);
});
