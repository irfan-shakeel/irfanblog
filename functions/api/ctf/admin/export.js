import { handle, requireAdmin, computeBoard } from '../../../../ctf-lib/server.js';
import { CHALLENGES } from '../../../../ctf-lib/content.js';

const esc = (v) => {
	let s = v == null ? '' : String(v);
	if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // CSV/formula injection guard
	return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const csv = (rows) => rows.map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n';

export const onRequestGet = handle(async ({ request, env }) => {
	await requireAdmin(env, request);
	const type = new URL(request.url).searchParams.get('type') || 'participants';
	const db = env.CTF_DB;
	const stamp = new Date().toISOString().replace(/[:.]/g, '-');
	let body;
	if (type === 'submissions') {
		const r = await db
			.prepare(`SELECT x.id, p.handle, p.full_name, p.email, x.challenge_id, x.answers_json, x.is_correct, x.points_awarded, x.created_at
			            FROM submissions x JOIN participants p ON p.id = x.participant_id ORDER BY x.id`)
			.all();
		body = csv([['submission_id', 'handle', 'full_name', 'email', 'challenge', 'answers', 'correct', 'points_awarded', 'submitted_at'], ...r.results.map((s) => [s.id, s.handle, s.full_name, s.email, s.challenge_id, s.answers_json, s.is_correct, s.points_awarded, s.created_at])]);
	} else {
		const board = await computeBoard(env, { includeHidden: true });
		const rank = Object.fromEntries(board.all.map((r) => [r.id, r.rank]));
		const [people, solves] = await db.batch([
			db.prepare('SELECT id, full_name, email, handle, is_hidden, created_at, last_activity_at FROM participants'),
			db.prepare('SELECT participant_id, challenge_id, points, solved_at FROM solves'),
		]);
		const sv = {};
		for (const s of solves.results) (sv[s.participant_id] ||= {})[s.challenge_id] = s;
		const rows = people.results
			.map((p) => {
				const mine = sv[p.id] || {};
				const score = Object.values(mine).reduce((a, s) => a + s.points, 0);
				const last = Object.values(mine).map((s) => s.solved_at).sort().pop() || '';
				return { p, mine, score, last, rank: rank[p.id] };
			})
			.sort((a, b) => a.rank - b.rank);
		body = csv([
			['rank_incl_hidden', 'handle', 'full_name', 'email', 'score', 'solved', 'hidden', 'registered_at', 'last_activity_at', 'score_reached_at', ...CHALLENGES.map((c) => c.id + '_solved_at')],
			...rows.map(({ p, mine, score, last, rank }) => [rank, p.handle, p.full_name, p.email, score, Object.keys(mine).length, p.is_hidden ? 'yes' : 'no', p.created_at, p.last_activity_at, last, ...CHALLENGES.map((c) => mine[c.id]?.solved_at || '')]),
		]);
	}
	return new Response(body, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="nmt-ctf-${type}-${stamp}.csv"`,
			'cache-control': 'no-store',
		},
	});
});
