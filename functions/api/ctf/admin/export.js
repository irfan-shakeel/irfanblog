import { handle, requireAdmin, BOARD_ORDER } from '../../../../ctf-lib/server.js';
import { CHALLENGES } from '../../../../ctf-lib/content.js';

const esc = (v) => {
	let s = v == null ? '' : String(v);
	if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // CSV/formula injection guard
	return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const csv = (rows) => rows.map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n';
const OPT = {};
for (const c of CHALLENGES) for (const q of c.questions) for (const o of q.options) OPT[c.id + ':' + o.id] = o.text;
const readable = (cid, answers) =>
	Object.entries(answers)
		.map(([q, v]) => `${q}: ${(Array.isArray(v) ? v : [v]).map((x) => OPT[cid + ':' + x] || x).join(' + ')}`)
		.join(' | ');

export const onRequestGet = handle(async ({ request, env }) => {
	await requireAdmin(env, request);
	const type = new URL(request.url).searchParams.get('type') || 'participants';
	const db = env.CTF_DB;
	const stamp = new Date().toISOString().replace(/[:.]/g, '-');
	let body;
	if (type === 'submissions') {
		const r = await db
			.prepare(`SELECT p.handle, p.full_name, p.email, a.challenge_id, a.answers_json, a.passed, a.points_awarded, a.submitted_at
			            FROM attempts a JOIN participants p ON p.id = a.participant_id ORDER BY a.submitted_at`)
			.all();
		body = csv([
			['handle', 'full_name', 'email', 'case', 'result', 'points', 'answers', 'submitted_at'],
			...r.results.map((s) => [s.handle, s.full_name, s.email, s.challenge_id, s.passed ? 'passed' : 'failed', s.points_awarded, readable(s.challenge_id, JSON.parse(s.answers_json)), s.submitted_at]),
		]);
	} else {
		const [people, attempts] = await db.batch([
			db.prepare(`SELECT id, full_name, email, handle, is_hidden, created_at, last_activity_at, score, solved, attempted, last_solve_at FROM participants ORDER BY ${BOARD_ORDER}`),
			db.prepare('SELECT participant_id, challenge_id, passed, points_awarded, submitted_at FROM attempts'),
		]);
		const by = {};
		for (const a of attempts.results) (by[a.participant_id] ||= {})[a.challenge_id] = a;
		const rows = people.results.map((p, i) => ({ p, mine: by[p.id] || {}, rank: i + 1, score: p.score, passed: p.solved, reached: p.last_solve_at || '' }));
		body = csv([
			['rank_incl_hidden', 'handle', 'full_name', 'email', 'score', 'passed', 'attempted', 'hidden', 'registered_at', 'last_activity_at', 'score_reached_at', ...CHALLENGES.flatMap((c) => [c.id + '_result', c.id + '_points', c.id + '_submitted_at'])],
			...rows.map(({ p, mine, rank, score, passed, reached }) => [
				rank, p.handle, p.full_name, p.email, score, passed, Object.keys(mine).length, p.is_hidden ? 'yes' : 'no', p.created_at, p.last_activity_at, reached,
				...CHALLENGES.flatMap((c) => { const a = mine[c.id]; return a ? [a.passed ? 'passed' : 'failed', a.points_awarded, a.submitted_at] : ['not attempted', 0, '']; }),
			]),
		]);
	}
	return new Response(body, {
		headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="nmt-ctf-${type}-${stamp}.csv"`, 'cache-control': 'no-store' },
	});
});
