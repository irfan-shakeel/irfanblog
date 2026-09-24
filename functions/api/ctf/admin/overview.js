import { handle, json, requireAdmin, getState, publicState, computeBoard } from '../../../../ctf-lib/server.js';

export const onRequestGet = handle(async ({ request, env }) => {
	await requireAdmin(env, request);
	const s = await getState(env);
	const [board, people] = await Promise.all([
		computeBoard(env, { includeHidden: false, limit: 15 }),
		env.CTF_DB.prepare(
			`SELECT p.id, p.full_name, p.email, p.handle, p.is_hidden, p.created_at, p.last_activity_at,
			        COALESCE(SUM(s.points),0) AS score, COUNT(s.challenge_id) AS solved, MAX(s.solved_at) AS last_solve_at,
			        (SELECT COUNT(*) FROM submissions x WHERE x.participant_id = p.id) AS attempts
			   FROM participants p LEFT JOIN solves s ON s.participant_id = p.id
			  GROUP BY p.id
			  ORDER BY score DESC, solved DESC, (last_solve_at IS NULL) ASC, last_solve_at ASC, p.created_at ASC`
		).all(),
	]);
	const rankById = Object.fromEntries(board.all.map((r) => [r.id, r.rank]));
	return json({
		ok: true,
		state: { ...publicState(s), hasSnapshot: !!s.frozen_snapshot },
		stats: board.stats,
		progress: board.progress,
		latest: board.latest,
		participants: people.results.map((r) => ({ ...r, rank: rankById[r.id] || null })),
	});
});
