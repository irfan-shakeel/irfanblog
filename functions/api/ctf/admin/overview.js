import { handle, json, requireAdmin, getState, publicState, getBoard, BOARD_ORDER } from '../../../../ctf-lib/server.js';

// Admin dashboard. The client sends ?v=<data_version it already has>; if nothing changed the
// response is state-only (1 row read). Otherwise: participants (with stored aggregates),
// per-case pass/fail map, and the cached live board (live even while the public board is frozen).
export const onRequestGet = handle(async ({ request, env }) => {
	await requireAdmin(env, request);
	const s = await getState(env, { withBoard: true });
	const state = { ...publicState(s), hasSnapshot: !!s.frozen_snapshot };
	const v = new URL(request.url).searchParams.get('v');
	if (v !== null && Number(v) === s.data_version) return json({ ok: true, unchanged: true, version: s.data_version, state });

	const db = env.CTF_DB;
	const [board, [people, attempts]] = await Promise.all([
		getBoard(env, s, { force: s.board_cache_version !== s.data_version }),
		db.batch([
			db.prepare(
				`SELECT id, full_name, email, handle, is_hidden, created_at, last_activity_at, score, solved, attempted AS attempts, last_solve_at
				   FROM participants ORDER BY is_hidden ASC, ${BOARD_ORDER}`
			),
			db.prepare('SELECT participant_id, challenge_id, passed FROM attempts'),
		]),
	]);
	const cases = {};
	for (const a of attempts.results) (cases[a.participant_id] ||= {})[a.challenge_id] = a.passed ? 'P' : 'F';
	let rank = 0;
	return json({
		ok: true,
		version: s.data_version,
		state,
		stats: board.stats,
		progress: board.progress,
		latest: board.latest,
		participants: people.results.map((r) => ({ ...r, rank: r.is_hidden ? null : ++rank, cases: cases[r.id] || {} })),
	});
});
