// End-to-end simulation for the NMT CTF. Usage:
//   BASE=http://127.0.0.1:8788 ADMIN=pw KEY='<answer key json>' node scripts/ctf-sim.mjs
// WARNING: performs a full RESET of the event at start and end.
const BASE = process.env.BASE || 'http://127.0.0.1:8788';
const N = Number(process.env.N || 30);
// Answer key comes from env KEY or the gitignored .dev.vars (CTF_ANSWER_KEY). Never hard-code it: the repo is public.
import { readFileSync } from 'node:fs';
const devVars = (() => { try { return readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8'); } catch { return ''; } })();
const KEY = JSON.parse(process.env.KEY || (devVars.match(/^CTF_ANSWER_KEY=(.*)$/m) || [])[1] || 'null');
const ADMIN = process.env.ADMIN || (devVars.match(/^CTF_ADMIN_PASSWORD=(.*)$/m) || [])[1];
if (!KEY) { console.error('Set KEY (answer key JSON) or CTF_ANSWER_KEY in .dev.vars'); process.exit(2); }
const POINTS = { impostor: 20, box: 25, green: 30, dlp: 25 };
const IDS = Object.keys(POINTS);

let fails = 0;
const ok = (cond, msg) => { if (cond) console.log('  ✓', msg); else { fails++; console.log('  ✗', msg); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function client() {
	let cookies = {};
	return async function call(path, { method = 'GET', body, raw } = {}) {
		const headers = { cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ') };
		if (body !== undefined) headers['content-type'] = 'application/json';
		const res = await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, redirect: 'manual' });
		for (const sc of res.headers.getSetCookie?.() || []) {
			const [kv] = sc.split(';');
			const i = kv.indexOf('=');
			cookies[kv.slice(0, i)] = kv.slice(i + 1);
		}
		if (raw) return res;
		const text = await res.text();
		try { return { status: res.status, ...JSON.parse(text) }; } catch { return { status: res.status, text }; }
	};
}

const admin = client();
const act = (action, extra = {}) => admin('/api/ctf/admin/action', { method: 'POST', body: { action, ...extra } });

console.log('Admin auth');
ok((await admin('/api/ctf/admin/overview')).status === 401, 'overview requires admin');
ok((await admin('/api/ctf/admin/login', { method: 'POST', body: { password: 'wrong' } })).status === 401, 'wrong password rejected');
ok((await admin('/api/ctf/admin/login', { method: 'POST', body: { password: ADMIN } })).ok, 'admin login');
ok((await act('reset_all', { confirm: 'RESET' })).ok, 'full reset');

console.log(`Registration x${N} (simultaneous)`);
const students = Array.from({ length: N }, (_, i) => ({ i, call: client(), handle: `Analyst_${String(i).padStart(2, '0')}`, email: `student${i}@NMT.edu`, name: `Student Number ${i}` }));
const regs = await Promise.all(students.map((s) => s.call('/api/ctf/register', { method: 'POST', body: { fullName: s.name, email: s.email, handle: s.handle } })));
ok(regs.every((r) => r.status === 201), `all ${N} registered (${regs.filter((r) => r.status === 201).length})`);
{ const o = await admin('/api/ctf/admin/overview'); ok(o.participants?.length === N, `DB has ${o.participants?.length} participants after registration`); }
{ const ms = await Promise.all(students.map((s) => s.call('/api/ctf/me'))); const bad = ms.filter((m) => !m.registered).length; ok(bad === 0, `all sessions valid right after registration (${bad} invalid)`); }

const x = client();
ok((await x('/api/ctf/register', { method: 'POST', body: { fullName: 'Dup', email: 'STUDENT0@nmt.edu', handle: 'Fresh1' } })).status === 409, 'duplicate email (case-insensitive) rejected');
ok((await x('/api/ctf/register', { method: 'POST', body: { fullName: 'Dup', email: 'new@nmt.edu', handle: 'analyst_00' } })).status === 409, 'duplicate handle (case-insensitive) rejected');
ok((await x('/api/ctf/register', { method: 'POST', body: { fullName: 'Bad', email: 'bad@nmt.edu', handle: 'a b<script>' } })).status === 400, 'invalid handle rejected');
ok((await x('/api/ctf/register', { method: 'POST', body: { fullName: 'Bad', email: 'not-an-email', handle: 'Okhandle' } })).status === 400, 'invalid email rejected');
ok((await x('/api/ctf/register', { method: 'POST', body: { fullName: 'X', email: 'x@nmt.edu', handle: 'ab' } })).status === 400, 'short handle rejected');
const again = await students[0].call('/api/ctf/register', { method: 'POST', body: { fullName: 'z', email: 'z@z.com', handle: 'zzz' } });
ok(again.already === true, 'existing session is not re-registered');
const me0 = await students[0].call('/api/ctf/me');
ok(me0.registered && me0.handle === 'Analyst_00', 'session persists (me)');

console.log('Before start');
const early = await students[0].call('/api/ctf/submit', { method: 'POST', body: { challenge: 'impostor', answers: KEY.impostor } });
ok(early.status === 403 && early.code === 'not_started', 'submit blocked before start');
ok((await x('/api/ctf/submit', { method: 'POST', body: { challenge: 'impostor', answers: KEY.impostor } })).status === 401, 'submit without session rejected');

ok((await act('start', { minutes: 20 })).ok, 'START CHALLENGE');

console.log('Wrong answers + cooldown');
const wrong = await students[1].call('/api/ctf/submit', { method: 'POST', body: { challenge: 'green', answers: { ...KEY.green, q2: KEY.green.q2 === 'a' ? 'b' : 'a' } } });
ok(wrong.ok && wrong.correct === false && wrong.correctCount === 2 && !wrong.flag, 'wrong answer: 0 points, no flag, partial count');
const cd = await students[1].call('/api/ctf/submit', { method: 'POST', body: { challenge: 'green', answers: KEY.green } });
ok(cd.status === 429, 'cooldown after wrong answer');
const badc = await students[1].call('/api/ctf/submit', { method: 'POST', body: { challenge: 'nope', answers: KEY.green } });
ok(badc.status === 400, 'unknown challenge rejected');
const partial = await students[2].call('/api/ctf/submit', { method: 'POST', body: { challenge: 'box', answers: { q1: 'a' } } });
ok(partial.status === 400, 'incomplete answers rejected');

console.log('Concurrent duplicate submissions (same student, same case x5)');
const dup = await Promise.all(Array.from({ length: 5 }, () => students[3].call('/api/ctf/submit', { method: 'POST', body: { challenge: 'impostor', answers: KEY.impostor } })));
ok(dup.reduce((a, r) => a + (r.pointsAwarded || 0), 0) === 20, 'points awarded exactly once (' + dup.map((r) => r.pointsAwarded).join(',') + ')');
ok(dup.every((r) => /^FLAG\{[A-Z_]+\}$/.test(r.flag || '')), 'flag revealed after solve');

console.log('Play: each student solves a deterministic subset in random order');
// Student i solves (i % 5) cases: 0..4; students 0-5 solve all 4.
const plan = students.map((s) => ({ s, cases: IDS.slice(0, s.i < 6 ? 4 : s.i % 5) }));
await Promise.all(
	plan.map(async ({ s, cases }) => {
		await sleep(Math.random() * 1500);
		for (const c of cases) {
			if (Math.random() < 0.3 && s.i !== 1) {
				await s.call('/api/ctf/submit', { method: 'POST', body: { challenge: c, answers: { q1: 'd', q2: 'b', q3: 'a' } } });
				await sleep(4100);
			}
			let r = await s.call('/api/ctf/submit', { method: 'POST', body: { challenge: c, answers: KEY[c] } });
			if (r.status === 429) { await sleep(r.retryAfterMs || 4100); r = await s.call('/api/ctf/submit', { method: 'POST', body: { challenge: c, answers: KEY[c] } }); }
			if (!r.correct) console.log('   unexpected', s.handle, c, r);
			await sleep(Math.random() * 300);
		}
	})
);
const expectedScore = (i) => (i < 6 ? IDS : IDS.slice(0, i % 5)).reduce((a, c) => a + POINTS[c], 0) || (i === 3 ? 20 : 0);
const mes = await Promise.all(students.map((s) => s.call('/api/ctf/me')));
ok(mes.every((m, i) => m.score === Math.max(expectedScore(i), i === 3 ? 20 : 0)), 'every score matches expectation');
ok(mes[0].score === 100 && mes[0].solved === 4, 'full solve = exactly 100');

console.log('Public leaderboard');
const lb = await x('/api/ctf/leaderboard');
const txt = JSON.stringify(lb);
ok(!/@nmt\.edu|Student Number|answers|full_name|email/i.test(txt), 'no names/emails/answers in public API');
ok(lb.board.leaders.length === 15, 'top 15 returned');
ok(lb.board.stats.analysts === N, 'analyst count');
const hundreds = lb.board.leaders.filter((r) => r.score === 100);
const allRanks = (await admin('/api/ctf/admin/overview')).participants;
const fullSolvers = allRanks.filter((p) => p.score === 100).sort((a, b) => a.last_solve_at.localeCompare(b.last_solve_at));
ok(hundreds.map((h) => h.handle).join() === fullSolvers.map((p) => p.handle).join(), 'ties at 100 broken by earliest completion');
const sorted = lb.board.leaders.every((r, i, a) => i === 0 || a[i - 1].score > r.score || (a[i - 1].score === r.score && a[i - 1].solved >= r.solved));
ok(sorted, 'sorted by score, solved');
const prog = Object.fromEntries(lb.board.progress.map((p) => [p.id, p.solved]));
const expProg = Object.fromEntries(IDS.map((c) => [c, plan.filter((p) => p.cases.includes(c)).length + (c === 'impostor' && !plan[3].cases.includes('impostor') ? 1 : 0)]));
ok(JSON.stringify(prog) === JSON.stringify(expProg), 'challenge progress correct ' + JSON.stringify(prog));
ok(lb.board.latest.length === 5, 'latest 5 solves');

console.log('Freeze');
ok((await act('freeze')).ok, 'FREEZE');
const before = await x('/api/ctf/leaderboard');
ok(before.mode === 'frozen', 'public mode frozen');
const late = students[7]; // has not solved dlp
const lateR = await late.call('/api/ctf/submit', { method: 'POST', body: { challenge: 'dlp', answers: KEY.dlp } });
ok(lateR.correct && lateR.pointsAwarded === 25, 'submission accepted while frozen');
const after = await x('/api/ctf/leaderboard');
ok(JSON.stringify(after.board.leaders) === JSON.stringify(before.board.leaders), 'public board unchanged while frozen');
const adm = await admin('/api/ctf/admin/overview');
ok(adm.participants.find((p) => p.handle === late.handle).score === lateR.score, 'admin sees live score while frozen');

console.log('Hide / rename');
const pid = adm.participants.find((p) => p.handle === 'Analyst_05').id;
ok((await act('rename', { id: pid, handle: 'Renamed_05' })).ok, 'rename handle');
ok((await act('rename', { id: pid, handle: 'analyst_00' })).status === 409, 'rename to taken handle rejected');
ok((await act('hide', { id: pid })).ok, 'hide user');

console.log('Close + reveal');
ok((await act('close')).ok, 'CLOSE SUBMISSIONS');
const closedR = await students[10].call('/api/ctf/submit', { method: 'POST', body: { challenge: 'dlp', answers: KEY.dlp } });
ok(closedR.status === 403 && closedR.code === 'closed', 'submission rejected when closed');
ok((await act('reveal')).ok, 'REVEAL');
const fin = await x('/api/ctf/leaderboard');
ok(fin.mode === 'final', 'public mode final');
ok(!fin.board.leaders.some((r) => r.handle === 'Renamed_05' || r.handle === 'Analyst_05'), 'hidden user excluded from public board');
ok(fin.board.stats.analysts === N - 1, 'hidden user excluded from counts');

console.log('Admin detail, re-entry, CSV');
const det = await admin('/api/ctf/admin/participant?id=' + pid);
ok(det.participant.email === 'student5@NMT.edu' && det.solves.length === 4 && det.submissions.length >= 4, 'participant detail maps handle to identity');
const link = await act('resume_link', { id: pid });
const newDevice = client();
const rr = await newDevice(new URL(link.url).pathname + new URL(link.url).search, { raw: true });
ok(rr.status === 302 && rr.headers.get('location') === '/ctf/challenge', 're-entry link redirects');
ok((await newDevice('/api/ctf/me')).handle === 'Renamed_05', 're-entry link restores session');
const reuse = await client()(new URL(link.url).pathname + new URL(link.url).search, { raw: true });
ok(reuse.headers.get('location')?.includes('invalid'), 're-entry link is single-use');
const csv = await admin('/api/ctf/admin/export?type=participants', { raw: true });
const csvText = await csv.text();
ok(csv.headers.get('content-type').includes('text/csv') && csvText.split('\r\n').filter(Boolean).length === N + 1, 'participants CSV has header + N rows');
const csv2 = await (await admin('/api/ctf/admin/export?type=submissions', { raw: true })).text();
ok(csv2.startsWith('submission_id'), 'submissions CSV');
ok((await x('/api/ctf/admin/export', { raw: true })).status === 401, 'CSV requires admin');

console.log('Leaderboard polling load: 31 clients x 10 polls');
const t0 = Date.now();
await Promise.all(Array.from({ length: 31 }, async () => { for (let k = 0; k < 10; k++) await x('/api/ctf/leaderboard'); }));
ok(true, `310 polls in ${Date.now() - t0} ms`);

if (process.env.KEEP !== '1') {
	console.log('Reset');
	ok((await act('reset_all', { confirm: 'RESET' })).ok, 'RESET EVENT');
	const empty = await x('/api/ctf/leaderboard');
	ok(empty.board.stats.analysts === 0 && !empty.state.started, 'event empty after reset');
	ok((await students[0].call('/api/ctf/me')).registered === false, 'old sessions invalid after reset');
}
console.log(fails ? `\n${fails} FAILURE(S)` : '\nALL CHECKS PASSED');
process.exit(fails ? 1 : 0);
