// End-to-end simulation for the NMT CTF (V2: 5 cases, one final submission per case).
//   BASE=<url> ADMIN=<password> KEY='<answer key json>' node scripts/ctf-sim.mjs
// Defaults come from the gitignored .dev.vars. The answer key is never hard-coded: the repo is public.
// WARNING: performs a FULL RESET of the target event at start and end (KEEP=1 skips the final reset).
import { readFileSync } from 'node:fs';
import { CHALLENGES } from '../ctf-lib/content.js';

const devVars = (() => { try { return readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8'); } catch { return ''; } })();
const fromDev = (k) => (devVars.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1];
const BASE = process.env.BASE || 'http://127.0.0.1:8788';
const ADMIN = process.env.ADMIN || fromDev('CTF_ADMIN_PASSWORD');
const KEY = JSON.parse(process.env.KEY || fromDev('CTF_ANSWER_KEY') || 'null');
const N = Number(process.env.N || 30);
if (!KEY || !ADMIN) { console.error('Need KEY (answer key JSON) and ADMIN (password), or a .dev.vars'); process.exit(2); }

const IDS = CHALLENGES.map((c) => c.id);
const POINTS = Object.fromEntries(CHALLENGES.map((c) => [c.id, c.points]));
const Q = Object.fromEntries(CHALLENGES.map((c) => [c.id, c.questions]));

let fails = 0, passes = 0;
const ok = (cond, msg) => { if (cond) { passes++; console.log('  ✓', msg); } else { fails++; console.log('  ✗', msg); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function client() {
	const cookies = {};
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

// Correct answers from the key; a wrong variant changes exactly one question.
const right = (cid) => JSON.parse(JSON.stringify(KEY[cid]));
function wrong(cid, which = 0) {
	const a = right(cid);
	const q = Q[cid][which % Q[cid].length];
	if (q.type === 'multi') {
		const keep = a[q.id][0];
		const other = q.options.map((o) => o.id).find((x) => !a[q.id].includes(x));
		a[q.id] = [keep, other];
	} else {
		a[q.id] = q.options.map((o) => o.id).find((x) => x !== a[q.id]);
	}
	return a;
}
const submit = (s, cid, answers) => s('/api/ctf/submit', { method: 'POST', body: { challenge: cid, answers } });
const FAIL_KEYS = ['attempted', 'ok', 'passed', 'passedCount', 'points', 'score'].join();

const admin = client();
const act = (action, extra = {}) => admin('/api/ctf/admin/action', { method: 'POST', body: { action, ...extra } });

console.log(`Target: ${BASE}\nAdmin auth`);
ok((await admin('/api/ctf/admin/overview')).status === 401, 'overview requires admin');
ok((await admin('/api/ctf/admin/login', { method: 'POST', body: { password: 'wrong-password' } })).status === 401, 'wrong password rejected');
ok((await admin('/api/ctf/admin/login', { method: 'POST', body: { password: ADMIN } })).ok, 'admin login');
ok((await act('reset_all', { confirm: 'RESET' })).ok, 'full reset');
await sleep(1500);
{ const o = await admin('/api/ctf/admin/overview'); ok(o.participants?.length === 0, 'DB empty after reset'); }

console.log(`Registration x${N} (simultaneous)`);
const students = Array.from({ length: N }, (_, i) => ({ i, call: client(), handle: `Analyst_${String(i).padStart(2, '0')}`, email: `student${i}@NMT.edu`, name: `Student Number ${i}` }));
const regs = await Promise.all(students.map((s) => s.call('/api/ctf/register', { method: 'POST', body: { fullName: s.name, email: s.email, handle: s.handle } })));
ok(regs.every((r) => r.status === 201), `all ${N} registered (${regs.filter((r) => r.status === 201).length})`);
{ const o = await admin('/api/ctf/admin/overview'); ok(o.participants?.length === N, `DB has ${o.participants?.length} participants`); }
{ const ms = await Promise.all(students.map((s) => s.call('/api/ctf/me'))); ok(ms.every((m) => m.registered), 'all sessions valid'); }
const x = client();
ok((await x('/api/ctf/register', { method: 'POST', body: { fullName: 'Dup', email: 'STUDENT0@nmt.edu', handle: 'Fresh1' } })).status === 409, 'duplicate email (case-insensitive) rejected');
ok((await x('/api/ctf/register', { method: 'POST', body: { fullName: 'Dup', email: 'new@nmt.edu', handle: 'analyst_00' } })).status === 409, 'duplicate handle (case-insensitive) rejected');
ok((await x('/api/ctf/register', { method: 'POST', body: { fullName: 'Bad', email: 'bad@nmt.edu', handle: 'a b<script>' } })).status === 400, 'invalid handle rejected');
ok((await x('/api/ctf/register', { method: 'POST', body: { fullName: 'Bad', email: 'not-an-email', handle: 'Okhandle' } })).status === 400, 'invalid email rejected');
ok((await students[0].call('/api/ctf/register', { method: 'POST', body: { fullName: 'z', email: 'z@z.com', handle: 'zzz' } })).already === true, 'existing session is not re-registered');
{ const m = await students[0].call('/api/ctf/me'); ok(m.registered && m.handle === 'Analyst_00' && m.challenges.length === 5 && m.challenges.every((c) => c.status === 'open'), 'session persists; 5 open cases'); }
{ const m = await students[0].call('/api/ctf/me'); ok(!JSON.stringify(m).includes('FLAG{') && !m.challenges.some((c) => c.takeaway), 'no flags/takeaways before solving'); }

console.log('Before start');
{ const r = await submit(students[0].call, 'identity', right('identity')); ok(r.status === 403 && r.code === 'not_started', 'submit blocked before start'); }
ok((await submit(x, 'identity', right('identity'))).status === 401, 'submit without session rejected');
ok((await act('start', { minutes: 20 })).ok, 'START CHALLENGE');
{ const m = await students[0].call('/api/ctf/me'); ok(m.challenges.find((c) => c.id === 'identity').status === 'open' && m.state.started && m.state.endsAt, 'timer set; blocked pre-start submit did not consume the attempt'); }

console.log('Malformed submissions do not consume the attempt');
const s1 = students[1].call;
ok((await submit(s1, 'blind', { q1: KEY.blind.q1 })).status === 400, 'incomplete answers → 400');
ok((await submit(s1, 'boundary', { ...right('boundary'), q2: [KEY.boundary.q2[0]] })).status === 400, 'multi-select with 1 choice → 400');
ok((await submit(s1, 'boundary', { ...right('boundary'), q2: [...KEY.boundary.q2, Q.boundary[1].options.find((o) => !KEY.boundary.q2.includes(o.id)).id] })).status === 400, 'multi-select with 3 choices → 400');
ok((await submit(s1, 'boundary', { ...right('boundary'), q2: [KEY.boundary.q2[0], KEY.boundary.q2[0]] })).status === 400, 'multi-select duplicate choice → 400');
ok((await submit(s1, 'blind', { q1: 'zzz', q2: 'zzz', q3: 'zzz' })).status === 400, 'unknown option ids → 400');
ok((await s1('/api/ctf/submit', { method: 'POST', body: { challenge: 'nope', answers: {} } })).status === 400, 'unknown case → 400');
{ const m = await s1('/api/ctf/me'); ok(m.attempted === 0, 'no attempt consumed by malformed payloads'); }

console.log('One-attempt lock: wrong answer (each case)');
for (const cid of IDS) {
	const s = students[2].call;
	const w = await submit(s, cid, wrong(cid, 1));
	ok(w.status === 200 && w.passed === false && w.points === 0, `${cid}: wrong final decision → 0 points`);
	ok(Object.keys(w).filter((k) => k !== 'status').sort().join() === FAIL_KEYS, `${cid}: failed response carries only pass/fail + totals`);
	ok(!JSON.stringify(w).includes('FLAG{') && !('takeaway' in w) && !('correct' in w) && !('correctCount' in w), `${cid}: no flag / takeaway / per-question result leaked`);
	const again = await submit(s, cid, right(cid));
	ok(again.status === 409 && again.code === 'already_submitted' && !JSON.stringify(again).includes('FLAG{'), `${cid}: retry with the correct answer rejected (409), nothing leaked`);
}
{ const m = await students[2].call('/api/ctf/me'); ok(m.score === 0 && m.attempted === 5 && m.challenges.every((c) => c.status === 'failed' && !c.flag && !c.takeaway), 'refresh: all 5 cases stay failed/locked, score 0'); }

console.log('Re-entry keeps locked status');
{
	const o = await admin('/api/ctf/admin/overview');
	const pid = o.participants.find((p) => p.handle === 'Analyst_02').id;
	const link = await act('resume_link', { id: pid });
	const dev2 = client();
	const u = new URL(link.url);
	const rr = await dev2(u.pathname + u.search, { raw: true });
	ok(rr.status === 302, 're-entry link works');
	const m = await dev2('/api/ctf/me');
	ok(m.handle === 'Analyst_02' && m.challenges.every((c) => c.status === 'failed'), 're-entered session still shows all cases failed');
	ok((await submit(dev2, 'identity', right('identity'))).status === 409, 're-entered session cannot retry');
	ok((await students[2].call('/api/ctf/me')).registered === false, 'old device session signed out by re-entry link');
	students[2].call = dev2;
	const reuse = await client()(u.pathname + u.search, { raw: true });
	ok(reuse.headers.get('location')?.includes('invalid'), 're-entry link is single-use');
}

console.log('One-attempt lock: correct answer (each case)');
{
	const s = students[3].call;
	let total = 0;
	for (const cid of IDS) {
		const r = await submit(s, cid, right(cid));
		total += POINTS[cid];
		ok(r.passed === true && r.points === POINTS[cid] && /^FLAG\{[A-Z_]+\}$/.test(r.flag || '') && r.takeaway && r.score === total, `${cid}: correct → +${POINTS[cid]}, flag + takeaway revealed`);
		const dup = await submit(s, cid, right(cid));
		ok(dup.status === 409, `${cid}: second POST rejected, no double score`);
	}
	const m = await s('/api/ctf/me');
	ok(m.score === 100 && m.passed === 5 && m.challenges.every((c) => c.status === 'passed' && c.flag && c.takeaway), 'full solve = exactly 100, 5/5 passed');
}

console.log('Concurrent final submissions (x6 same case)');
{
	const s = students[4].call;
	const rs = await Promise.all(Array.from({ length: 6 }, (_, k) => submit(s, 'boundary', k % 2 ? right('boundary') : wrong('boundary'))));
	const accepted = rs.filter((r) => r.status === 200);
	ok(accepted.length === 1 && rs.filter((r) => r.status === 409).length === 5, `exactly one accepted, five rejected (${rs.map((r) => r.status).join(',')})`);
	const m = await s('/api/ctf/me');
	ok(m.attempted === 1 && m.score === accepted[0].points, 'score reflects the single accepted submission');
}

console.log('Play: 30 students, deterministic pass/fail mix');
const plan = students.map((s) => ({ s, res: Object.fromEntries(IDS.map((cid, ci) => [cid, s.i < 6 || (s.i + ci) % 3 !== 0])) }));
const skip = new Set([2, 3, 4]); // used above
await Promise.all(
	plan.filter(({ s }) => !skip.has(s.i)).map(async ({ s, res }) => {
		await sleep(Math.random() * 1500);
		for (const cid of IDS) {
			const r = await submit(s.call, cid, res[cid] ? right(cid) : wrong(cid, s.i));
			if (r.status !== 200 || r.passed !== res[cid]) console.log('   unexpected', s.handle, cid, r.status, r.error);
			await sleep(Math.random() * 250);
		}
	})
);
const expected = (i) => {
	if (i === 2) return 0;
	if (i === 3) return 100;
	if (i === 4) return null; // race winner decides
	return IDS.reduce((t, cid, ci) => t + (i < 6 || (i + ci) % 3 !== 0 ? POINTS[cid] : 0), 0);
};
const mes = await Promise.all(students.map((s) => s.call('/api/ctf/me')));
ok(mes.every((m, i) => expected(i) === null || m.score === expected(i)), 'every score matches expectation');
ok(mes.every((m) => m.passed === m.challenges.filter((c) => c.status === 'passed').length), 'passed counts consistent');

console.log('Public leaderboard');
const lb = await x('/api/ctf/leaderboard');
const txt = JSON.stringify(lb);
ok(!/@nmt\.edu|Student Number|answers|full_name|email|FLAG\{/i.test(txt), 'no names/emails/answers/flags in public API');
ok(lb.board.leaders.length === 15, 'top 15 returned');
ok(lb.board.stats.analysts === N && lb.board.stats.cases === 5, 'analyst count, 5 cases');
ok(lb.board.leaders.every((r) => r.solved <= 5), 'passed ≤ 5');
const adm = await admin('/api/ctf/admin/overview');
const perfect = adm.participants.filter((p) => p.score === 100).sort((a, b) => a.last_solve_at.localeCompare(b.last_solve_at)).map((p) => p.handle);
ok(lb.board.leaders.filter((r) => r.score === 100).map((r) => r.handle).join() === perfect.join(), 'ties at 100 broken by earliest completion');
ok(lb.board.leaders.every((r, i, a) => i === 0 || a[i - 1].score > r.score || (a[i - 1].score === r.score && a[i - 1].solved >= r.solved)), 'sorted by score, then passed');
const expPass = Object.fromEntries(IDS.map((cid) => [cid, mes.filter((m) => m.challenges.find((c) => c.id === cid).status === 'passed').length]));
ok(JSON.stringify(Object.fromEntries(lb.board.progress.map((p) => [p.id, p.solved]))) === JSON.stringify(expPass), 'case progress (passed) correct ' + JSON.stringify(expPass));
ok(lb.board.latest.length === 5 && lb.board.latest.every((l) => CHALLENGES.some((c) => c.title === l.challenge)), 'latest 5 solves use V2 case names');
const totalAttempts = mes.reduce((t, m) => t + m.attempted, 0);
ok(lb.board.stats.submissions === totalAttempts, `submissions metric = final submissions (${totalAttempts})`);

console.log('Freeze');
ok((await act('freeze')).ok, 'FREEZE');
const before = await x('/api/ctf/leaderboard');
ok(before.mode === 'frozen', 'public mode frozen');
const late = client();
await late('/api/ctf/register', { method: 'POST', body: { fullName: 'Late Joiner', email: 'late@nmt.edu', handle: 'LateJoiner' } });
const lateR = await submit(late, 'boundary', right('boundary'));
ok(lateR.passed && lateR.points === 35, 'submission accepted while frozen');
const after = await x('/api/ctf/leaderboard');
ok(JSON.stringify(after.board) === JSON.stringify(before.board), 'public board unchanged while frozen');
ok((await admin('/api/ctf/admin/overview')).participants.find((p) => p.handle === 'LateJoiner').score === 35, 'admin sees live score while frozen');

console.log('Hide / rename');
const pid5 = adm.participants.find((p) => p.handle === 'Analyst_05').id;
ok((await act('rename', { id: pid5, handle: 'Renamed_05' })).ok, 'rename handle');
ok((await act('rename', { id: pid5, handle: 'analyst_00' })).status === 409, 'rename to taken handle rejected');
ok((await act('hide', { id: pid5 })).ok, 'hide user');

console.log('Close / reopen / reveal');
ok((await act('close')).ok, 'CLOSE SUBMISSIONS');
{ const r = await submit(late, 'identity', right('identity')); ok(r.status === 403 && r.code === 'closed', 'submission rejected when closed'); }
{ const m = await late('/api/ctf/me'); ok(m.challenges.find((c) => c.id === 'identity').status === 'open', 'closed rejection did not consume the attempt'); }
ok((await act('reopen')).ok, 'REOPEN');
{ const r = await submit(late, 'identity', right('identity')); ok(r.passed === true, 'submission accepted after reopen'); }
ok((await act('close')).ok, 'CLOSE again');
ok((await act('reveal')).ok, 'REVEAL');
const fin = await x('/api/ctf/leaderboard');
ok(fin.mode === 'final', 'public mode final');
ok(!fin.board.leaders.some((r) => /Renamed_05|Analyst_05/.test(r.handle)), 'hidden user excluded from public board');
ok(fin.board.stats.analysts === N, 'hidden user excluded from counts (N-1 + late joiner)');

console.log('Admin detail + CSV');
{
	const d = await admin('/api/ctf/admin/participant?id=' + pid5);
	ok(d.participant.email === 'student5@NMT.edu' && d.attempts.length === 5 && d.attempts.every((a) => a.answers && typeof a.passed === 'boolean' && a.submitted_at), 'participant detail: identity + 5 submissions with answers, pass/fail, time');
	const p2 = adm.participants.find((p) => p.handle === 'Analyst_02');
	ok(Object.values(p2.cases).every((v) => v === 'F') && Object.keys(p2.cases).length === 5, 'admin overview shows per-case pass/fail');
	const csv = await (await admin('/api/ctf/admin/export?type=participants', { raw: true })).text();
	const lines = csv.split('\r\n').filter(Boolean);
	ok(lines.length === N + 2 && lines[0].includes('boundary_result'), `participants CSV: header + ${N + 1} rows, per-case columns`);
	const csv2 = await (await admin('/api/ctf/admin/export?type=submissions', { raw: true })).text();
	ok(csv2.split('\r\n').filter(Boolean).length === totalAttempts + 2 + 1, 'submissions CSV: one row per final submission');
	ok((await x('/api/ctf/admin/export', { raw: true })).status === 401, 'CSV requires admin');
	ok((await x('/api/ctf/admin/participant?id=' + pid5)).status === 401, 'participant detail requires admin');
}

console.log('Leaderboard polling load: 31 clients x 10 polls');
const t0 = Date.now();
await Promise.all(Array.from({ length: 31 }, async () => { for (let k = 0; k < 10; k++) await x('/api/ctf/leaderboard'); }));
ok(true, `310 polls in ${Date.now() - t0} ms`);

if (process.env.KEEP !== '1') {
	console.log('Reset');
	ok((await act('reset_all', { confirm: 'RESET' })).ok, 'RESET EVENT');
	const empty = await x('/api/ctf/leaderboard');
	ok(empty.board.stats.analysts === 0 && empty.board.stats.submissions === 0 && !empty.state.started, 'event empty after reset (0 analysts)');
	ok((await students[0].call('/api/ctf/me')).registered === false, 'old sessions invalid after reset');
}
console.log(fails ? `\n${fails} FAILURE(S), ${passes} passed` : `\nALL ${passes} CHECKS PASSED`);
process.exit(fails ? 1 : 0);
