import { handle, json, getParticipant, getState, publicState, flagFor } from '../../../ctf-lib/server.js';
import { TAKEAWAYS } from '../../../ctf-lib/server-content.js';
import { CHALLENGES } from '../../../ctf-lib/content.js';

// Student status. Flags and takeaways are returned only for PASSED cases; failed cases
// return status only (no answers, no hint about which answer was wrong).
export const onRequestGet = handle(async ({ request, env }) => {
	const [p, s] = await Promise.all([getParticipant(env, request), getState(env)]);
	const state = publicState(s);
	if (!p) return json({ ok: true, registered: false, state });
	const rows = await env.CTF_DB.prepare('SELECT challenge_id, passed, points_awarded, submitted_at FROM attempts WHERE participant_id = ?').bind(p.id).all();
	const byId = Object.fromEntries(rows.results.map((r) => [r.challenge_id, r]));
	const challenges = CHALLENGES.map((c) => {
		const a = byId[c.id];
		if (!a) return { id: c.id, status: 'open' };
		if (a.passed) return { id: c.id, status: 'passed', points: a.points_awarded, flag: flagFor(env, c.id), takeaway: TAKEAWAYS[c.id], submittedAt: a.submitted_at };
		return { id: c.id, status: 'failed', points: 0, submittedAt: a.submitted_at };
	});
	const score = rows.results.reduce((t, r) => t + r.points_awarded, 0);
	const passed = rows.results.filter((r) => r.passed).length;
	return json({ ok: true, registered: true, handle: p.handle, score, passed, attempted: rows.results.length, challenges, state });
});
