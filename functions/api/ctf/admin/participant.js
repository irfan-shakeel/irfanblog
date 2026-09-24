import { handle, json, err, requireAdmin } from '../../../../ctf-lib/server.js';

export const onRequestGet = handle(async ({ request, env }) => {
	await requireAdmin(env, request);
	const id = Number(new URL(request.url).searchParams.get('id'));
	if (!Number.isInteger(id)) return err('Bad id');
	const db = env.CTF_DB;
	const [p, attempts] = await db.batch([
		db.prepare('SELECT id, full_name, email, handle, is_hidden, created_at, last_activity_at FROM participants WHERE id = ?').bind(id),
		db.prepare('SELECT challenge_id, answers_json, passed, points_awarded, submitted_at FROM attempts WHERE participant_id = ? ORDER BY submitted_at').bind(id),
	]);
	if (!p.results[0]) return err('Not found', 404);
	return json({
		ok: true,
		participant: p.results[0],
		attempts: attempts.results.map((a) => ({ challenge_id: a.challenge_id, answers: JSON.parse(a.answers_json), passed: !!a.passed, points: a.points_awarded, submitted_at: a.submitted_at })),
		score: attempts.results.reduce((t, a) => t + a.points_awarded, 0),
	});
});
