import { handle, readJson, json, err, nowIso, cleanText, HANDLE_RE, EMAIL_RE, issueSession, sessionCookie, getParticipant, throttle, clientIp } from '../../../ctf-lib/server.js';

export const onRequestPost = handle(async ({ request, env }) => {
	// Generous per-IP limit: a whole classroom on campus Wi-Fi shares one NAT address.
	if (!throttle('reg:' + clientIp(request), 150, 60_000)) return err('Too many attempts. Wait a moment and try again.', 429);

	const existing = await getParticipant(env, request);
	if (existing) return json({ ok: true, already: true, handle: existing.handle });

	const body = await readJson(request);
	const fullName = cleanText(body.fullName, 80);
	const email = cleanText(body.email, 254);
	const handleRaw = String(body.handle ?? '').trim();

	const fields = {};
	if (fullName.length < 2) fields.fullName = 'Full name is required.';
	if (!EMAIL_RE.test(email)) fields.email = 'Enter a valid email address.';
	if (!HANDLE_RE.test(handleRaw)) fields.handle = 'Handle must be 3–24 characters: letters, numbers, _ or -.';
	if (Object.keys(fields).length) return err('Please fix the highlighted fields.', 400, { fields });

	const emailN = email.toLowerCase();
	const handleN = handleRaw.toLowerCase();
	const db = env.CTF_DB;

	const count = await db.prepare('SELECT COUNT(*) AS n FROM participants').first('n');
	if (count >= 500) return err('Registration is full.', 403);

	const dupe = await db
		.prepare('SELECT email_normalized = ? AS e, handle_normalized = ? AS h FROM participants WHERE email_normalized = ? OR handle_normalized = ?')
		.bind(emailN, handleN, emailN, handleN)
		.all();
	if (dupe.results.some((r) => r.e)) return err('This email is already registered. If you lost your session, ask the instructor for a re-entry link.', 409, { fields: { email: 'Email already registered.' } });
	if (dupe.results.some((r) => r.h)) return err('That analyst handle is taken. Pick another.', 409, { fields: { handle: 'Handle already taken.' } });

	const now = nowIso();
	let id;
	try {
		const r = await db
			.prepare('INSERT INTO participants (full_name, email, email_normalized, handle, handle_normalized, created_at, last_activity_at) VALUES (?,?,?,?,?,?,?) RETURNING id')
			.bind(fullName, email, emailN, handleRaw, handleN, now, now)
			.first();
		id = r.id;
	} catch (e) {
		if (String(e).includes('UNIQUE')) {
			const which = String(e).includes('handle') ? 'handle' : 'email';
			return err(which === 'handle' ? 'That analyst handle is taken. Pick another.' : 'This email is already registered.', 409, { fields: { [which]: 'Already taken.' } });
		}
		throw e;
	}
	const token = await issueSession(env, id);
	return json({ ok: true, handle: handleRaw }, 201, { 'set-cookie': sessionCookie(token) });
});
