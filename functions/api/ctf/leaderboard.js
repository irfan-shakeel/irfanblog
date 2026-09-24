import { handle, json, getState, publicState, computeBoard, publicBoard } from '../../../ctf-lib/server.js';

// Public, projected leaderboard. Returns analyst handles only.
export const onRequestGet = handle(async ({ env }) => {
	const s = await getState(env);
	const state = publicState(s);
	if (s.leaderboard_frozen && !s.show_final_results && s.frozen_snapshot) {
		return json({ ok: true, mode: 'frozen', state, board: JSON.parse(s.frozen_snapshot) });
	}
	const board = publicBoard(await computeBoard(env));
	return json({ ok: true, mode: s.show_final_results ? 'final' : 'live', state, board });
});
