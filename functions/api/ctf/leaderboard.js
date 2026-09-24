import { handle, json, getState, publicState, getBoard } from '../../../ctf-lib/server.js';

// Public, projected leaderboard. Returns analyst handles only.
// Cost per poll: 1 row (event_state) while nothing has changed; see getBoard().
export const onRequestGet = handle(async ({ env }) => {
	const s = await getState(env, { withBoard: true });
	const state = publicState(s);
	if (s.leaderboard_frozen && !s.show_final_results && s.frozen_snapshot) {
		return json({ ok: true, mode: 'frozen', state, board: JSON.parse(s.frozen_snapshot) });
	}
	const board = await getBoard(env, s);
	return json({ ok: true, mode: s.show_final_results ? 'final' : 'live', state, board });
});
