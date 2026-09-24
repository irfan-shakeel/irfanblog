// Server-only helpers for the CTF Pages Functions. Never imported by browser code.
import { CHALLENGES, CHALLENGE_IDS } from './content.js';

export const SESSION_COOKIE = 'ctf_session';
export const ADMIN_COOKIE = 'ctf_admin';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const ADMIN_MAX_AGE = 60 * 60 * 12; // 12 hours

export const POINTS = Object.fromEntries(CHALLENGES.map((c) => [c.id, c.points]));
export const TITLES = Object.fromEntries(CHALLENGES.map((c) => [c.id, c.title]));
export const CASE_COUNT = CHALLENGES.length;
const QUESTIONS = Object.fromEntries(CHALLENGES.map((c) => [c.id, c.questions]));

// ---------- responses ----------
export function json(data, status = 200, headers = {}) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'cache-control': 'no-store',
			'x-robots-tag': 'noindex',
			...headers,
		},
	});
}
export const err = (message, status = 400, extra = {}) => json({ ok: false, error: message, ...extra }, status);

export function nowIso() {
	return new Date().toISOString();
}

export async function readJson(request) {
	const ct = request.headers.get('content-type') || '';
	if (!ct.includes('application/json')) throw new HttpError('Expected JSON body', 415);
	const text = await request.text();
	if (text.length > 8192) throw new HttpError('Body too large', 413);
	try {
		return JSON.parse(text || '{}');
	} catch {
		throw new HttpError('Invalid JSON', 400);
	}
}

export class HttpError extends Error {
	constructor(message, status = 400) {
		super(message);
		this.status = status;
	}
}

export function handle(fn) {
	return async (ctx) => {
		try {
			requireConfig(ctx.env);
			return await fn(ctx);
		} catch (e) {
			if (e instanceof HttpError) return err(e.message, e.status);
			console.error('CTF error', e && e.stack ? e.stack : e);
			return err('Server error. Please try again.', 500);
		}
	};
}

function requireConfig(env) {
	if (!env.CTF_DB) throw new HttpError('CTF database is not configured', 503);
	if (!env.CTF_SESSION_SECRET || env.CTF_SESSION_SECRET.length < 16) throw new HttpError('CTF_SESSION_SECRET is not configured', 503);
}

// ---------- crypto ----------
const enc = new TextEncoder();
function b64url(bytes) {
	let s = '';
	for (const b of bytes) s += String.fromCharCode(b);
	return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function randomToken(n = 32) {
	return b64url(crypto.getRandomValues(new Uint8Array(n)));
}
async function hmacKey(secret) {
	return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}
export async function hmac(secret, msg) {
	const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(msg));
	return b64url(new Uint8Array(sig));
}
export function safeEqual(a, b) {
	if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
	let r = 0;
	for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return r === 0;
}
export const hashSessionToken = (env, token) => hmac(env.CTF_SESSION_SECRET, 'session:' + token);

// ---------- cookies ----------
export function getCookie(request, name) {
	const header = request.headers.get('cookie') || '';
	for (const part of header.split(';')) {
		const i = part.indexOf('=');
		if (i < 0) continue;
		if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
	}
	return null;
}
export function sessionCookie(token) {
	return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}
export function clearCookie(name, path = '/') {
	return `${name}=; Path=${path}; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

// ---------- student session ----------
export async function getParticipant(env, request) {
	const token = getCookie(request, SESSION_COOKIE);
	if (!token || token.length < 20 || token.length > 100) return null;
	const h = await hashSessionToken(env, token);
	return env.CTF_DB.prepare('SELECT * FROM participants WHERE session_hash = ?').bind(h).first();
}

export async function issueSession(env, participantId) {
	const token = randomToken();
	const h = await hashSessionToken(env, token);
	await env.CTF_DB.prepare('UPDATE participants SET session_hash = ? WHERE id = ?').bind(h, participantId).run();
	return token;
}

// ---------- admin session ----------
export async function adminCookie(env) {
	const exp = Math.floor(Date.now() / 1000) + ADMIN_MAX_AGE;
	const sig = await hmac(env.CTF_SESSION_SECRET, 'admin:' + exp + ':' + (env.CTF_ADMIN_PASSWORD || ''));
	return `${ADMIN_COOKIE}=${exp}.${sig}; Path=/api/ctf/admin; Max-Age=${ADMIN_MAX_AGE}; HttpOnly; Secure; SameSite=Strict`;
}
export async function isAdmin(env, request) {
	if (!env.CTF_ADMIN_PASSWORD) return false;
	const v = getCookie(request, ADMIN_COOKIE);
	if (!v) return false;
	const [exp, sig] = v.split('.');
	if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
	const expect = await hmac(env.CTF_SESSION_SECRET, 'admin:' + exp + ':' + env.CTF_ADMIN_PASSWORD);
	return safeEqual(sig, expect);
}
export async function requireAdmin(env, request) {
	if (!(await isAdmin(env, request))) throw new HttpError('Admin login required', 401);
}

// ---------- throttling (per isolate, best effort) ----------
const buckets = new Map();
export function throttle(key, limit, windowMs) {
	const now = Date.now();
	let b = buckets.get(key);
	if (!b || now - b.start > windowMs) b = { start: now, count: 0 };
	b.count++;
	buckets.set(key, b);
	if (buckets.size > 5000) buckets.clear();
	return b.count <= limit;
}
export function throttleBlocked(key, limit, windowMs) {
	const b = buckets.get(key);
	return !!b && Date.now() - b.start <= windowMs && b.count >= limit;
}
export const clientIp = (request) => request.headers.get('cf-connecting-ip') || 'local';

// ---------- answer key & flags ----------
let cachedKey = null;
export function answerKey(env) {
	if (cachedKey && cachedKey.raw === env.CTF_ANSWER_KEY) return cachedKey.key;
	if (!env.CTF_ANSWER_KEY) throw new HttpError('Answer key is not configured', 503);
	let key;
	try {
		key = JSON.parse(env.CTF_ANSWER_KEY);
	} catch {
		throw new HttpError('Answer key is malformed', 503);
	}
	cachedKey = { raw: env.CTF_ANSWER_KEY, key };
	return key;
}
export function flagFor(env, challengeId) {
	return env['CTF_FLAG_' + challengeId.toUpperCase()] || 'FLAG{NOT_CONFIGURED}';
}

// Validates the SHAPE of a submission against the public question definitions only
// (every question answered, option ids exist, multi-select has exactly `pick` distinct ids).
// Returns normalized answers or null. Never consults the answer key, so a 400 leaks nothing.
export function normalizeAnswers(challengeId, answers) {
	if (!answers || typeof answers !== 'object') return null;
	const out = {};
	for (const q of QUESTIONS[challengeId]) {
		const ids = new Set(q.options.map((o) => o.id));
		const a = answers[q.id];
		if (q.type === 'multi') {
			if (!Array.isArray(a) || a.length !== q.pick) return null;
			const uniq = [...new Set(a.map(String))];
			if (uniq.length !== q.pick || !uniq.every((x) => ids.has(x))) return null;
			out[q.id] = uniq.sort();
		} else {
			if (typeof a !== 'string' || !ids.has(a)) return null;
			out[q.id] = a;
		}
	}
	return out;
}

// All-or-nothing: returns only a boolean so callers cannot leak per-question results.
export function isCorrect(env, challengeId, normalized) {
	const key = answerKey(env)[challengeId];
	if (!key) throw new HttpError('Answer key missing for ' + challengeId, 503);
	return QUESTIONS[challengeId].every((q) => {
		const k = key[q.id], a = normalized[q.id];
		if (Array.isArray(k)) return Array.isArray(a) && a.length === k.length && [...k].sort().every((x, i) => x === a[i]);
		return a === k;
	});
}
export function validChallenge(id) {
	return CHALLENGE_IDS.includes(id);
}

// ---------- event state ----------
export async function getState(env) {
	const s = await env.CTF_DB.prepare('SELECT * FROM event_state WHERE id = 1').first();
	if (s) return s;
	await env.CTF_DB.prepare('INSERT OR IGNORE INTO event_state (id, updated_at) VALUES (1, ?)').bind(nowIso()).run();
	return env.CTF_DB.prepare('SELECT * FROM event_state WHERE id = 1').first();
}
export function publicState(s) {
	return {
		isOpen: !!s.is_open,
		started: !!s.started_at,
		startedAt: s.started_at,
		endsAt: s.ends_at,
		frozen: !!s.leaderboard_frozen,
		final: !!s.show_final_results,
		durationMinutes: s.duration_minutes,
		serverNow: nowIso(),
	};
}

// ---------- leaderboard ----------
// Score = sum of points from passed final submissions. Tie-break: passed count, then the
// time the current score was reached (latest passed submission), then registration time.
export async function computeBoard(env, { includeHidden = false, limit = 15 } = {}) {
	const db = env.CTF_DB;
	const hid = includeHidden ? '' : 'WHERE p.is_hidden = 0';
	const [rows, counts, perChal, latest] = await db.batch([
		db.prepare(
			`SELECT p.id, p.handle, COALESCE(SUM(a.points_awarded),0) AS score, COALESCE(SUM(a.passed),0) AS solved,
			        COUNT(a.challenge_id) AS attempted,
			        MAX(CASE WHEN a.passed = 1 THEN a.submitted_at END) AS last_solve_at, p.created_at
			   FROM participants p LEFT JOIN attempts a ON a.participant_id = p.id
			   ${hid}
			  GROUP BY p.id
			  ORDER BY score DESC, solved DESC, (last_solve_at IS NULL) ASC, last_solve_at ASC, p.created_at ASC, p.id ASC`
		),
		db.prepare(
			`SELECT (SELECT COUNT(*) FROM participants p ${hid}) AS analysts,
			        (SELECT COUNT(*) FROM attempts a JOIN participants p ON p.id = a.participant_id ${hid}) AS submissions,
			        (SELECT COALESCE(SUM(a.passed),0) FROM attempts a JOIN participants p ON p.id = a.participant_id ${hid}) AS solves`
		),
		db.prepare(
			`SELECT a.challenge_id, COALESCE(SUM(a.passed),0) AS passed, COUNT(*) AS attempted
			   FROM attempts a JOIN participants p ON p.id = a.participant_id ${hid} GROUP BY a.challenge_id`
		),
		db.prepare(
			`SELECT p.handle, a.challenge_id, a.submitted_at FROM attempts a JOIN participants p ON p.id = a.participant_id
			  ${hid ? hid + ' AND' : 'WHERE'} a.passed = 1 ORDER BY a.submitted_at DESC LIMIT 5`
		),
	]);
	const all = rows.results.map((r, i) => ({ rank: i + 1, id: r.id, handle: r.handle, score: r.score, solved: r.solved, attempted: r.attempted, lastSolveAt: r.last_solve_at }));
	const c = counts.results[0] || { analysts: 0, submissions: 0, solves: 0 };
	const pc = Object.fromEntries(perChal.results.map((r) => [r.challenge_id, r]));
	return {
		all,
		leaders: all.slice(0, limit).map(({ id, attempted, ...rest }) => rest),
		stats: { analysts: c.analysts, submissions: c.submissions, solves: c.solves, cases: CASE_COUNT },
		progress: CHALLENGES.map((ch) => ({ id: ch.id, title: ch.title, solved: pc[ch.id]?.passed || 0, attempted: pc[ch.id]?.attempted || 0 })),
		latest: latest.results.map((r) => ({ handle: r.handle, challenge: TITLES[r.challenge_id] || r.challenge_id, at: r.solved_at || r.submitted_at })),
	};
}

// Public shape: handles only. Never names, emails or answers.
export function publicBoard(b) {
	return { leaders: b.leaders, stats: b.stats, progress: b.progress, latest: b.latest, generatedAt: nowIso() };
}

// ---------- validation ----------
export const HANDLE_RE = /^[A-Za-z0-9_-]{3,24}$/;
export const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/;
export function cleanText(s, max) {
	return String(s ?? '')
		.replace(/[\u0000-\u001f\u007f<>]/g, '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, max);
}
