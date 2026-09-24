import { handle, json, err, requireAdmin } from '../../../../ctf-lib/server.js';

export const onRequestGet = handle(async ({ request, env }) => {
	await requireAdmin(env, request);
	const id = Number(new URL(request.url).searchParams.get('id'));
	if (!Number.isInteger(id)) return err('Bad id');
	const db = env.CTF_DB;
	const [p, subs, solves] = await db.batch([
		db.prepare('SELECT id, full_name, email, handle, is_hidden, created_at, last_activity_at FROM participants WHERE id = ?').bind(id),
		db.prepare('SELECT challenge_id, answers_json, is_correct, points_awarded, created_at FROM submissions WHERE participant_id = ? ORDER BY id').bind(id),
		db.prepare('SELECT challenge_id, points, solved_at FROM solves WHERE participant_id = ? ORDER BY solved_at').bind(id),
	]);
	if (!p.results[0]) return err('Not found', 404);
	return json({
		ok: true,
		participant: p.results[0],
		submissions: subs.results.map((s) => ({ ...s, answers: JSON.parse(s.answers_json), answers_json: undefined })),
		solves: solves.results,
		score: solves.results.reduce((a, s) => a + s.points, 0),
	});
});
