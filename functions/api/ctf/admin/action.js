import { handle, readJson, json, err, nowIso, requireAdmin, getState, getBoard, bumpVersion, HANDLE_RE, randomToken, hashSessionToken } from '../../../../ctf-lib/server.js';

export const onRequestPost = handle(async ({ request, env }) => {
	await requireAdmin(env, request);
	const body = await readJson(request);
	const db = env.CTF_DB;
	const now = nowIso();
	const setState = (sql, ...args) => db.prepare(`UPDATE event_state SET ${sql}, updated_at = ? WHERE id = 1`).bind(...args, now).run();
	await getState(env);

	switch (body.action) {
		case 'start': {
			const mins = Math.min(Math.max(parseInt(body.minutes, 10) || 20, 1), 180);
			const ends = new Date(Date.now() + mins * 60_000).toISOString();
			await setState('is_open = 1, started_at = ?, ends_at = ?, duration_minutes = ?, leaderboard_frozen = 0, show_final_results = 0, frozen_snapshot = NULL', now, ends, mins);
			break;
		}
		case 'extend': {
			const mins = Math.min(Math.max(parseInt(body.minutes, 10) || 1, -60), 60);
			const s = await getState(env);
			if (!s.ends_at) return err('Challenge has not started.');
			await setState('ends_at = ?', new Date(Date.parse(s.ends_at) + mins * 60_000).toISOString());
			break;
		}
		case 'close':
			await setState('is_open = 0');
			break;
		case 'reopen':
			await setState('is_open = 1');
			break;
		case 'freeze': {
			const snap = await getBoard(env, await getState(env, { withBoard: true }), { force: true });
			await setState('leaderboard_frozen = 1, frozen_snapshot = ?', JSON.stringify(snap));
			break;
		}
		case 'unfreeze':
			await setState('leaderboard_frozen = 0, frozen_snapshot = NULL');
			break;
		case 'reveal':
			await setState('show_final_results = 1');
			break;
		case 'unreveal':
			await setState('show_final_results = 0');
			break;
		case 'reset_scores':
		case 'reset_all': {
			if (body.confirm !== 'RESET') return err('Type RESET to confirm.');
			const stmts = [
				db.prepare('DELETE FROM attempts'),
				db.prepare('UPDATE participants SET score = 0, solved = 0, attempted = 0, last_solve_at = NULL'),
				bumpVersion(db),
				db.prepare(`UPDATE event_state SET is_open = 0, leaderboard_frozen = 0, show_final_results = 0, started_at = NULL, ends_at = NULL, frozen_snapshot = NULL, board_cache = NULL, board_cache_version = -1, board_cache_at = NULL, updated_at = ? WHERE id = 1`).bind(now),
			];
			if (body.action === 'reset_all') stmts.push(db.prepare('DELETE FROM participants'), db.prepare("DELETE FROM sqlite_sequence WHERE name = 'participants'"));
			await db.batch(stmts);
			break;
		}
		case 'hide':
		case 'unhide':
			await db.batch([db.prepare('UPDATE participants SET is_hidden = ? WHERE id = ?').bind(body.action === 'hide' ? 1 : 0, Number(body.id)), bumpVersion(db)]);
			break;
		case 'rename': {
			const h = String(body.handle || '').trim();
			if (!HANDLE_RE.test(h)) return err('Handle must be 3–24 characters: letters, numbers, _ or -.');
			try {
				await db.batch([db.prepare('UPDATE participants SET handle = ?, handle_normalized = ? WHERE id = ?').bind(h, h.toLowerCase(), Number(body.id)), bumpVersion(db)]);
			} catch (e) {
				if (String(e).includes('UNIQUE')) return err('Handle already taken.', 409);
				throw e;
			}
			break;
		}
		case 'resume_link': {
			const t = randomToken();
			await db.prepare('UPDATE participants SET session_hash = ? WHERE id = ?').bind(await hashSessionToken(env, 'resume:' + t), Number(body.id)).run();
			const url = new URL('/api/ctf/resume?t=' + t, request.url).toString();
			return json({ ok: true, url });
		}
		case 'delete': {
			if (body.confirm !== 'DELETE') return err('Type DELETE to confirm.');
			const id = Number(body.id);
			await db.batch([db.prepare('DELETE FROM attempts WHERE participant_id = ?').bind(id), db.prepare('DELETE FROM participants WHERE id = ?').bind(id), bumpVersion(db)]);
			break;
		}
		default:
			return err('Unknown action');
	}
	return json({ ok: true, state: await getState(env) });
});
