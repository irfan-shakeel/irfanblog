import { handle, json, requireAdmin, getState, publicState, computeBoard } from '../../../../ctf-lib/server.js';

export const onRequestGet = handle(async ({ request, env }) => {
	await requireAdmin(env, request);
	const s = await getState(env);
	const db = env.CTF_DB;
	const [board, people, attempts] = await Promise.all([
		computeBoard(env, { includeHidden: false, limit: 15 }),
		db.prepare(
			`SELECT p.id, p.full_name, p.email, p.handle, p.is_hidden, p.created_at, p.last_activity_at,
			        COALESCE(SUM(a.points_awarded),0) AS score, COALESCE(SUM(a.passed),0) AS solved, COUNT(a.challenge_id) AS attempts,
			        MAX(CASE WHEN a.passed = 1 THEN a.submitted_at END) AS last_solve_at
			   FROM participants p LEFT JOIN attempts a ON a.participant_id = p.id
			  GROUP BY p.id
			  ORDER BY score DESC, solved DESC, (last_solve_at IS NULL) ASC, last_solve_at ASC, p.created_at ASC`
		).all(),
		db.prepare('SELECT participant_id, challenge_id, passed FROM attempts').all(),
	]);
	const rankById = Object.fromEntries(board.all.map((r) => [r.id, r.rank]));
	const cases = {};
	for (const a of attempts.results) (cases[a.participant_id] ||= {})[a.challenge_id] = a.passed ? 'P' : 'F';
	return json({
		ok: true,
		state: { ...publicState(s), hasSnapshot: !!s.frozen_snapshot },
		stats: board.stats,
		progress: board.progress,
		latest: board.latest,
		participants: people.results.map((r) => ({ ...r, rank: rankById[r.id] || null, cases: cases[r.id] || {} })),
	});
});
