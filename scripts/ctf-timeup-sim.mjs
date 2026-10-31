// Tests for auto-close at 00:00, +1 min / reopen after time up, and STOP CHALLENGE.
//   BASE=<url> ADMIN=<password> KEY='<answer key json>' node scripts/ctf-timeup-sim.mjs
// WARNING: performs a FULL RESET of the target event at start and end. Never point at production.
import { readFileSync } from 'node:fs';
import { CHALLENGES } from '../ctf-lib/content.js';
const devVars = (() => { try { return readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8'); } catch { return ''; } })();
const fromDev = (k) => (devVars.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1];
const BASE = process.env.BASE || 'http://127.0.0.1:8788';
const ADMIN = process.env.ADMIN || fromDev('CTF_ADMIN_PASSWORD');
const KEY = JSON.parse(process.env.KEY || fromDev('CTF_ANSWER_KEY') || 'null');
if (/irfanshakeel\.com|^https:\/\/irfanblog\.pages\.dev/.test(BASE)) { console.error('Refusing to run against production.'); process.exit(2); }
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) { passes++; console.log('  ✓', m); } else { fails++; console.log('  ✗', m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function client() {
	const cookies = {};
	return async (path, { method = 'GET', body } = {}) => {
		const headers = { cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ') };
		if (body !== undefined) headers['content-type'] = 'application/json';
		const res = await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, redirect: 'manual' });
		for (const sc of res.headers.getSetCookie?.() || []) { const [kv] = sc.split(';'); const i = kv.indexOf('='); cookies[kv.slice(0, i)] = kv.slice(i + 1); }
		const t = await res.text(); try { return { status: res.status, ...JSON.parse(t) }; } catch { return { status: res.status, text: t }; }
	};
}
const admin = client();
const act = (action, extra = {}) => admin('/api/ctf/admin/action', { method: 'POST', body: { action, ...extra } });
const sub = (s, cid) => s('/api/ctf/submit', { method: 'POST', body: { challenge: cid, answers: KEY[cid] } });
const reg = async (h) => { const s = client(); const r = await s('/api/ctf/register', { method: 'POST', body: { fullName: 'Test ' + h, email: h + '@example.edu', handle: h } }); return [s, r]; };
const pub = () => client()('/api/ctf/leaderboard');

console.log('Setup');
ok((await admin('/api/ctf/admin/login', { method: 'POST', body: { password: ADMIN } })).ok, 'admin login');
ok((await act('reset_all', { confirm: 'RESET' })).ok, 'reset event');
const [A, ra] = await reg('alpha_t'); const [B, rb] = await reg('bravo_t');
ok(ra.ok && rb.ok, 'two analysts registered');
ok((await act('start', { minutes: 20 })).ok, 'START 20 min');
ok((await sub(A, 'identity')).passed === true, 'A passes case 01 while open');

console.log('Auto-close at 00:00');
ok((await act('extend', { minutes: -20 })).ok, 'move end time to now (-20 min)');
let me = await B('/api/ctf/me');
ok(me.state.timeUp === true, 'state.timeUp true right after 00:00');
const g = await sub(B, 'blind');
ok(g.ok && g.passed === true, 'press within 10 s grace is accepted');
await sleep(11000);
me = await B('/api/ctf/me');
ok(me.state.isOpen === false && me.state.timeUp === true, 'after grace: isOpen false, timeUp true');
const late = await sub(B, 'capable');
ok(late.status === 403 && late.code === 'closed' && /Time's up/.test(late.error), "late submission refused with \"Time's up\" (403 closed)");
me = await B('/api/ctf/me');
ok(me.challenges.find((c) => c.id === 'capable').status === 'open', 'refused late submission did not consume the attempt');
const lb = await pub();
ok(lb.state.isOpen === false && lb.state.timeUp === true, 'leaderboard sees submissions closed');
const ov = await admin('/api/ctf/admin/overview');
ok(ov.state.timeUp === true && ov.state.isOpen === false, 'console sees TIME UP and closed');

console.log('+1 min after time up');
ok((await act('extend', { minutes: 1 })).ok, '+1 min');
me = await B('/api/ctf/me');
const rem = Date.parse(me.state.endsAt) - Date.parse(me.state.serverNow);
ok(rem > 50_000 && rem <= 61_000, `+1 min counts from now (${Math.round(rem / 1000)} s left)`);
ok(me.state.isOpen === true && me.state.timeUp === false, 'submissions open again');
ok((await sub(B, 'capable')).ok, 'B submits case 03 after +1 min');

console.log('Reopen after time up');
await act('extend', { minutes: -1 }); await sleep(11000);
ok((await sub(B, 'objective')).status === 403, 'closed again after second 00:00');
ok((await act('reopen')).ok, 'REOPEN');
me = await B('/api/ctf/me');
const rem2 = Date.parse(me.state.endsAt) - Date.parse(me.state.serverNow);
ok(me.state.isOpen === true && rem2 > 50_000 && rem2 <= 61_000, `reopen after time up gives 1 more minute (${Math.round(rem2 / 1000)} s)`);
ok((await sub(B, 'objective')).ok, 'B submits case 04 after reopen');

console.log('Manual CLOSE still works before 00:00');
ok((await act('close')).ok, 'CLOSE');
ok((await sub(A, 'blind')).status === 403, 'refused while manually closed');
ok((await act('reopen')).ok, 'REOPEN');

console.log('Stop challenge');
await act('freeze'); await act('reveal');
const before = (await admin('/api/ctf/admin/overview')).participants;
ok((await act('stop')).ok, 'STOP CHALLENGE');
me = await A('/api/ctf/me');
ok(me.state.started === false && me.state.isOpen === false && me.state.endsAt === null && me.state.timeUp === false, 'back to Not started, timer cleared');
ok(me.state.frozen === false && me.state.final === false, 'freeze and reveal cleared');
const after = (await admin('/api/ctf/admin/overview')).participants;
ok(after.length === 2 && JSON.stringify(after.map((p) => [p.handle, p.score])) === JSON.stringify(before.map((p) => [p.handle, p.score])), 'registrations and scores kept');
const ns = await sub(A, 'blind');
ok(ns.status === 403 && ns.code === 'not_started', 'submissions refused while stopped');
ok((await pub()).mode === 'live' && (await pub()).state.started === false, 'leaderboard shows waiting to start');

console.log('Start again after stop');
ok((await act('start', { minutes: 20 })).ok, 'START again');
const again = await sub(A, 'identity');
ok(again.status === 409 && again.code === 'already_submitted', 'one-attempt lock survives a stop/start');
ok((await sub(A, 'blind')).ok, 'new submissions accepted after restart');
ok((await act('reset_scores', { confirm: 'RESET' })).ok, 'Reset scores');
ok((await act('start', { minutes: 20 })).ok, 'START');
ok((await sub(A, 'identity')).ok, 'after Reset scores a case can be submitted fresh');

console.log('Cleanup');
ok((await act('reset_all', { confirm: 'RESET' })).ok, 'reset event');
console.log(fails ? `\n${fails} CHECK(S) FAILED, ${passes} passed` : `\nALL ${passes} CHECKS PASSED`);
process.exit(fails ? 1 : 0);
