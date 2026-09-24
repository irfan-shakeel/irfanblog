// Realistic single-event D1 read-cost simulation (LOCAL ONLY: needs CTF_D1_DEBUG=1 in .dev.vars,
// which makes the API return x-d1-rows-read headers). Mirrors real browser polling:
//   - 30 students: /me every 8 s from registration until the end (challenge page)
//   - projector:   /leaderboard every 4 s for the whole session
//   - presenter:   /admin/overview every 4 s with ?v= (version-gated)
//   - 10 students also keep the public leaderboard open on their phones from minute 8
//   - registrations over 5 minutes, START, 20-minute challenge, 150 final submissions,
//     FREEZE at 18:00, CLOSE at 20:00, REVEAL, CSV exports, some admin detail views.
// SCALE=1 is real time (25 min). SCALE=10 runs 10x faster with the same number of requests.
import { readFileSync } from 'node:fs';
import { CHALLENGES } from '../ctf-lib/content.js';

const devVars = readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8');
const fromDev = (k) => (devVars.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1];
const BASE = process.env.BASE || 'http://127.0.0.1:8788';
const ADMIN = fromDev('CTF_ADMIN_PASSWORD');
const KEY = JSON.parse(fromDev('CTF_ANSWER_KEY'));
const SCALE = Number(process.env.SCALE || 1);
const N = 30;
const MIN = 60_000 / SCALE;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const clock = () => ((Date.now() - t0) / MIN).toFixed(1).padStart(5) + ' min';

const tally = {};
function client(tag) {
	const cookies = {};
	return async (path, { method = 'GET', body, raw } = {}) => {
		const headers = { cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ') };
		if (body !== undefined) headers['content-type'] = 'application/json';
		const res = await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, redirect: 'manual' });
		for (const sc of res.headers.getSetCookie?.() || []) { const [kv] = sc.split(';'); const i = kv.indexOf('='); cookies[kv.slice(0, i)] = kv.slice(i + 1); }
		const rows = Number(res.headers.get('x-d1-rows-read') || 0);
		const k = tag + ' ' + method + ' ' + path.split('?')[0];
		(tally[k] ||= { requests: 0, rows: 0 }).requests++;
		tally[k].rows += rows;
		if (raw) return res;
		try { return await res.json(); } catch { return {}; }
	};
}
const right = (cid) => KEY[cid];
function wrong(cid) {
	const q = CHALLENGES.find((c) => c.id === cid).questions[0];
	const a = { ...KEY[cid] };
	a[q.id] = q.type === 'multi' ? [KEY[cid][q.id][0], q.options.find((o) => !KEY[cid][q.id].includes(o.id)).id] : q.options.find((o) => o.id !== KEY[cid][q.id]).id;
	return a;
}

let stop = false;
const loops = [];
const every = (ms, fn) => loops.push((async () => { while (!stop) { await fn(); await sleep(ms / SCALE); } })());

const admin = client('presenter');
await admin('/api/ctf/admin/login', { method: 'POST', body: { password: ADMIN } });
await admin('/api/ctf/admin/action', { method: 'POST', body: { action: 'reset_all', confirm: 'RESET' } });
for (const k of Object.keys(tally)) delete tally[k]; // measure the event only

// Projector + presenter from the start.
const projector = client('projector');
every(4000, () => projector('/api/ctf/leaderboard'));
let v = null;
every(4000, async () => { const r = await admin('/api/ctf/admin/overview' + (v !== null ? '?v=' + v : '')); if (r.version !== undefined && !r.unchanged) v = r.version; });

// Registrations spread over the first 5 minutes; each student then polls /me every 8 s.
const students = [];
for (let i = 0; i < N; i++) {
	(async () => {
		await sleep(Math.random() * 5 * MIN);
		const s = client('student');
		await s('/api/ctf/me'); // landing page
		await s('/api/ctf/me'); // register page
		await s('/api/ctf/register', { method: 'POST', body: { fullName: `Student ${i}`, email: `s${i}@nmt.edu`, handle: `Analyst_${i}` } });
		students.push({ i, s });
		every(8000, () => s('/api/ctf/me'));
	})();
}
await sleep(5 * MIN + 2000 / SCALE);
console.log(clock(), 'registered', students.length, '→ START');
await admin('/api/ctf/admin/action', { method: 'POST', body: { action: 'start', minutes: 20 } });
v = null;
const start = Date.now();

// 10 students keep the public leaderboard open on their phones from minute 8.
setTimeout(() => { for (let k = 0; k < 10; k++) { const p = client('student-phone-leaderboard'); every(4000, () => p('/api/ctf/leaderboard')); } }, 3 * MIN);

// Each student submits their 5 cases at realistic times across the 20 minutes (~80 % pass rate).
const subs = [];
for (const { i, s } of students) {
	const plan = CHALLENGES.map((c, ci) => ({ cid: c.id, at: (1.5 + ci * 3.6 + Math.random() * 3.5) * MIN, pass: Math.random() < 0.8 }));
	for (const p of plan) subs.push(sleep(p.at).then(() => (Date.now() - start < 20 * MIN ? s('/api/ctf/submit', { method: 'POST', body: { challenge: p.cid, answers: p.pass ? right(p.cid) : wrong(p.cid) } }) : null)));
}
// A few presenter detail views during the event.
setTimeout(() => admin('/api/ctf/admin/participant?id=3'), 6 * MIN);
setTimeout(() => admin('/api/ctf/admin/participant?id=7'), 12 * MIN);

await sleep(18 * MIN);
console.log(clock(), 'FREEZE');
await admin('/api/ctf/admin/action', { method: 'POST', body: { action: 'freeze' } });
await sleep(2 * MIN);
console.log(clock(), 'CLOSE + REVEAL');
await Promise.all(subs);
await admin('/api/ctf/admin/action', { method: 'POST', body: { action: 'close' } });
await admin('/api/ctf/admin/participant?id=1');
await admin('/api/ctf/admin/action', { method: 'POST', body: { action: 'reveal' } });
await sleep(1 * MIN); // results on screen, students still polling
await admin('/api/ctf/admin/export?type=participants', { raw: true });
await admin('/api/ctf/admin/export?type=submissions', { raw: true });
stop = true;
await Promise.all(loops);

const final = await projector('/api/ctf/leaderboard');
let total = 0, reqs = 0;
const rows = Object.entries(tally).sort((a, b) => b[1].rows - a[1].rows);
console.log('\nendpoint'.padEnd(58), 'requests'.padStart(9), 'rows read'.padStart(11), 'rows/req'.padStart(9));
for (const [k, t] of rows) { total += t.rows; reqs += t.requests; console.log(k.padEnd(57), String(t.requests).padStart(9), String(t.rows).padStart(11), (t.rows / t.requests).toFixed(1).padStart(9)); }
console.log('TOTAL'.padEnd(57), String(reqs).padStart(9), String(total).padStart(11));
console.log(`\nfinal board: ${final.board.stats.analysts} analysts, ${final.board.stats.submissions} final submissions, ${final.board.stats.solves} passes; duration ${((Date.now() - t0) / 60000).toFixed(1)} real min at SCALE=${SCALE}`);
