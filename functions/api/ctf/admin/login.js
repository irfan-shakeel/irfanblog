import { handle, readJson, json, err, adminCookie, clearCookie, ADMIN_COOKIE, hmac, safeEqual, throttle, throttleBlocked, clientIp, isAdmin } from '../../../../ctf-lib/server.js';

export const onRequestPost = handle(async ({ request, env }) => {
	if (!env.CTF_ADMIN_PASSWORD) return err('CTF_ADMIN_PASSWORD is not configured.', 503);
	if (throttleBlocked('adm:' + clientIp(request), 10, 5 * 60_000)) return err('Too many login attempts. Wait 5 minutes.', 429);
	const body = await readJson(request);
	const pw = String(body.password || '');
	const a = await hmac(env.CTF_SESSION_SECRET, 'pw:' + pw);
	const b = await hmac(env.CTF_SESSION_SECRET, 'pw:' + env.CTF_ADMIN_PASSWORD);
	if (!safeEqual(a, b)) {
		throttle('adm:' + clientIp(request), 10, 5 * 60_000); // count failures only
		return err('Incorrect password.', 401);
	}
	return json({ ok: true }, 200, { 'set-cookie': await adminCookie(env) });
});

export const onRequestGet = handle(async ({ request, env }) => json({ ok: true, admin: await isAdmin(env, request) }));

export const onRequestDelete = handle(async () => json({ ok: true }, 200, { 'set-cookie': clearCookie(ADMIN_COOKIE, '/api/ctf/admin') }));
