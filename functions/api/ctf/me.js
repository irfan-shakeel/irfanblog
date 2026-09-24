import { handle, json, getParticipant, getState, publicState, flagFor, TITLES } from '../../../ctf-lib/server.js';
import { CHALLENGES } from '../../../ctf-lib/content.js';

export const onRequestGet = handle(async ({ request, env }) => {
	const [p, s] = await Promise.all([getParticipant(env, request), getState(env)]);
	const state = publicState(s);
	if (!p) return json({ ok: true, registered: false, state });
	const solves = await env.CTF_DB.prepare('SELECT challenge_id, points, solved_at FROM solves WHERE participant_id = ?').bind(p.id).all();
	const byId = Object.fromEntries(solves.results.map((r) => [r.challenge_id, r]));
	const challenges = CHALLENGES.map((c) => {
		const sv = byId[c.id];
		return sv ? { id: c.id, solved: true, points: sv.points, flag: flagFor(env, c.id), solvedAt: sv.solved_at, takeaway: c.takeaway } : { id: c.id, solved: false };
	});
	const score = solves.results.reduce((a, r) => a + r.points, 0);
	return json({ ok: true, registered: true, handle: p.handle, score, solved: solves.results.length, challenges, state });
});
