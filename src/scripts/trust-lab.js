// "Inside the Trust Pipeline" — presenter-controlled explainer engine + scenes.
// Static and self-contained: no network requests, no storage, no backend.

// ---------------------------------------------------------------- icons
const I = {
	doc: `<svg class="ficon" viewBox="0 0 64 80"><path d="M6 4h36l16 16v54a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="#12294a" stroke="#29d3f0" stroke-width="2.5"/><path d="M42 4v16h16" fill="none" stroke="#29d3f0" stroke-width="2.5"/><rect x="12" y="34" width="38" height="4" rx="2" fill="#5b7494"/><rect x="12" y="44" width="30" height="4" rx="2" fill="#5b7494"/><rect x="12" y="54" width="34" height="4" rx="2" fill="#5b7494"/><text x="12" y="26" font-family="monospace" font-size="11" font-weight="700" fill="#ff8a1f">PDF</text></svg>`,
	text: `<svg viewBox="0 0 40 40" class="ic"><path d="M8 10h24M8 17h24M8 24h24M8 31h15"/></svg>`,
	image: `<svg viewBox="0 0 40 40" class="ic"><rect x="5" y="8" width="30" height="24" rx="3"/><circle cx="14" cy="16" r="3"/><path d="M6 29l9-8 7 6 5-4 8 7"/></svg>`,
	layout: `<svg viewBox="0 0 40 40" class="ic"><rect x="5" y="6" width="30" height="28" rx="3"/><path d="M5 14h30M17 14v20"/></svg>`,
	code: `<svg viewBox="0 0 40 40" class="ic"><path d="M14 11l-8 9 8 9M26 11l8 9-8 9M22 8l-4 24"/></svg>`,
	clip: `<svg viewBox="0 0 40 40" class="ic"><path d="M27 13L15.5 24.5a4 4 0 0 0 5.7 5.7L33 18.4a7 7 0 0 0-9.9-9.9L11 20.6a10 10 0 0 0 14.1 14.1L35 25"/></svg>`,
	info: `<svg viewBox="0 0 40 40" class="ic"><circle cx="20" cy="20" r="14"/><path d="M20 18v10M20 12.5v.5"/></svg>`,
	lock: `<svg viewBox="0 0 40 40" class="ic" style="width:56px;height:56px"><rect x="8" y="18" width="24" height="17" rx="3"/><path d="M13 18v-5a7 7 0 0 1 14 0v5"/></svg>`,
};
const FILE = 'Mesa_Maintenance_Instructions.pdf';
const COMPONENTS = [
	{ k: 'text', n: 'VISIBLE TEXT', icon: I.text, need: 'keep' },
	{ k: 'image', n: 'IMAGES', icon: I.image, need: 'keep' },
	{ k: 'layout', n: 'FORMATTING', icon: I.layout, need: 'keep' },
	{ k: 'code', n: 'JAVASCRIPT', icon: I.code, need: 'q' },
	{ k: 'clip', n: 'EMBEDDED ATTACHMENT', icon: I.clip, need: 'q' },
	{ k: 'info', n: 'METADATA', icon: I.info, need: 'policy' },
];
const fileCard = (meta = '', cls = '') =>
	`<div class="file ${cls}">${I.doc}<div><div class="fname">${FILE}</div>${meta ? `<div class="fmeta">${meta}</div>` : ''}</div></div>`;
const choices = (list, answer) =>
	`<div class="choices">${list.map((c) => `<div class="choice" data-choice="${c}"${c === answer ? ' data-answer="1"' : ''}>${c}</div>`).join('')}</div>`;
const miniDoc = (label, extra = '') =>
	`<div class="doc" style="width:340px;height:440px"><div class="fold"></div><div class="dtitle">${label}</div><div class="page"><div class="pline" style="width:80%"></div><div class="pline"></div><div class="pimg" style="height:90px"></div><div class="pline" style="width:90%"></div><div class="pline" style="width:70%"></div><div class="pline" style="width:85%"></div></div>${extra}</div>`;

// Engine results for the multiscanning scenes (generic engines, no vendor names).
const V1 = [0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0]; // 3 / 12
const V2 = [0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1]; // 6 / 12

// ---------------------------------------------------------------- engine
const S = { i: 0, step: 0, timers: new Set(), busy: false };
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const stage = $('#stage');
const sceneEl = $('#scene');
function later(fn, ms) { const t = setTimeout(() => { S.timers.delete(t); fn(); }, ms); S.timers.add(t); return t; }
function clearTimers() { for (const t of S.timers) clearTimeout(t); S.timers.clear(); S.busy = false; $('#lockin').classList.remove('show'); }
// Sequence helper: run fn(i) for each item, staggered when animating, instantly otherwise.
function seq(n, gap, fn, animate, startDelay = 0) {
	for (let k = 0; k < n; k++) animate ? later(() => fn(k), startDelay + k * gap) : fn(k);
}

function applyStep(k, animate) {
	const sc = SCENES[S.i];
	$$('[data-step]', sceneEl).forEach((el) => el.classList.toggle('on', Number(el.dataset.step) <= k));
	$$('[data-until]', sceneEl).forEach((el) => el.classList.toggle('off', k >= Number(el.dataset.until)));
	if (sc.hooks && sc.hooks[k]) sc.hooks[k](sceneEl, animate);
	if (sc.answer && k >= sc.answer.step) $$('.choice[data-answer]', sceneEl).forEach((c) => c.classList.add('answer'));
	S.step = k;
	updateChrome();
}

function goTo(i, step = 0, animate = true) {
	clearTimers();
	i = Math.max(0, Math.min(SCENES.length - 1, i));
	const sc = SCENES[i];
	S.i = i;
	step = Math.max(0, Math.min(sc.steps, step));
	stage.classList.add('no-anim');
	sceneEl.innerHTML = sc.html;
	S.step = -1;
	if (step > 0 || !animate) {
		for (let k = 0; k <= step; k++) applyStep(k, false);
		void sceneEl.offsetWidth;
		requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.remove('no-anim')));
	} else {
		$$('[data-step]', sceneEl).forEach((el) => el.classList.remove('on'));
		void sceneEl.offsetWidth;
		stage.classList.remove('no-anim');
		requestAnimationFrame(() => applyStep(0, true));
		updateChrome();
	}
	const url = new URL(location.href);
	url.searchParams.set('scene', String(i));
	url.searchParams.delete('start');
	history.replaceState(null, '', url);
}

function advance() {
	if (S.busy) return;
	const sc = SCENES[S.i];
	if (S.step < sc.steps) {
		const k = S.step + 1;
		if (sc.lock && sc.lock.includes(k)) {
			S.busy = true;
			$('#lockin').classList.add('show');
			later(() => { $('#lockin').classList.remove('show'); S.busy = false; applyStep(k, true); }, 1100);
		} else applyStep(k, true);
	} else if (S.i < SCENES.length - 1) goTo(S.i + 1, 0, true);
}
const next = () => (S.i < SCENES.length - 1 ? goTo(S.i + 1, 0, true) : null);
const back = () => (S.step > 0 ? goTo(S.i, S.step - 1, false) : S.i > 0 ? goTo(S.i - 1, SCENES[S.i - 1].steps, false) : null);
const reset = () => goTo(S.i, 0, true);
const prevScene = () => (S.i > 0 ? goTo(S.i - 1, 0, true) : goTo(0, 0, true));

function updateChrome() {
	const sc = SCENES[S.i];
	const st = typeof sc.stage === 'function' ? sc.stage(Math.max(0, S.step)) : sc.stage;
	$('#progress').classList.toggle('hidden', st < 0);
	$$('.pstage').forEach((el, idx) => { el.classList.toggle('cur', idx === st); el.classList.toggle('done', idx < st); });
	$('#pos').textContent = `${S.i + 1}/${SCENES.length} · step ${Math.max(0, S.step)}/${sc.steps}`;
	const n = sc.notes || {};
	$('#notes-body').innerHTML = `<h4>${sc.module} · ${sc.title}</h4>${n.ask ? `<p><b>Ask:</b> ${n.ask}</p>` : ''}${n.key ? `<p><b>Key point:</b> ${n.key}</p>` : ''}${n.flow ? `<p style="color:#93a9c6">${n.flow}</p>` : ''}`;
}

// ---------------------------------------------------------------- scenes
const ring12 = (cx, cy, rx, ry) =>
	Array.from({ length: 12 }, (_, k) => {
		const a = (-90 + k * 30) * (Math.PI / 180);
		return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
	});
function resolveEngines(root, results, animate, gap = 260, countSel = '.count .n') {
	const cards = $$('.engine', root);
	let n = 0;
	const countEl = $(countSel, root);
	seq(cards.length, gap, (k) => {
		cards[k].classList.remove('scanning');
		cards[k].classList.add(results[k] ? 'det' : 'clean');
		$('.er', cards[k]).textContent = results[k] ? 'DETECTED' : 'CLEAN';
		if (results[k]) n++;
		if (countEl) countEl.textContent = String(n);
	}, animate);
	if (animate) cards.forEach((c) => c.classList.add('scanning'));
}

const SCENES = [
	// ------------------------------------------------ 0 OPENING
	{
		module: 'OPENING', title: 'Would you let this file in?', stage: 0, steps: 2, lock: [1],
		notes: { ask: '“Trusted vendor. Familiar filename. Maintenance document. Would you let it in?”', key: 'Trust needs evidence, not reputation.', flow: 'Point at the three options; take a show of hands. Space → reveal.' },
		html: `
			<div class="zone" style="left:40px;top:150px">OUTSIDE</div>
			<div class="zone" style="right:40px;top:150px">TRUSTED ENVIRONMENT</div>
			<div class="boundary" id="bd" style="top:140px"></div>
			<div class="abs" id="f0" style="left:40px;top:320px;transition:transform 1.4s cubic-bezier(.4,0,.2,1)" data-step="0" data-anim="left">
				${fileCard('Source: Trusted Vendor<br>Destination: Research Environment<br>Purpose: Maintenance Instructions')}
			</div>
			<div class="abs center" style="left:0;right:0;top:40px;--d:.3s" data-step="0"><div class="question">WOULD YOU LET THIS FILE IN?</div></div>
			<div class="abs" style="left:0;right:0;bottom:70px" data-step="0" data-until="1">${choices(['ALLOW', 'BLOCK', 'NOT ENOUGH EVIDENCE'])}</div>
			<div class="abs center" style="left:960px;right:0;top:330px" data-step="1" data-anim="pop">
				<div style="color:var(--orange)">${I.lock}</div>
				<div class="big" style="margin-top:14px">WE NEED<br>EVIDENCE.</div>
				<div class="lead" style="margin-top:18px">The boundary stays closed.</div>
			</div>
			<div class="abs center" style="left:0;right:0;bottom:60px" data-step="2"><span class="chip" style="border-color:var(--cyan);color:var(--cyan)">FIRST CHECKPOINT → MULTISCANNING</span></div>`,
		hooks: {
			1: (r) => $('#bd', r).classList.add('closed'),
			2: (r) => { $('#f0', r).style.transform = 'translate(120px, 0) scale(.96)'; $('#bd', r).classList.add('closed'); },
		},
	},
	// ------------------------------------------------ 1 1A ONE SCANNER
	{
		module: 'MULTISCANNING', title: '1A · One scanner', stage: 0, steps: 2, lock: [2],
		notes: { ask: '“One engine says clean. Case closed?”', key: 'One engine = one perspective.', flow: 'Space runs the scan, Space again reveals.' },
		html: `
			<div class="eyebrow" data-step="0">MODULE 1 · MULTISCANNING</div>
			<div class="title" data-step="0">ONE FILE. MANY OPINIONS.</div>
			<div class="abs row" style="left:0;right:0;top:250px;justify-content:center;gap:50px">
				<div data-step="0">${fileCard('', 'sm')}</div>
				<div class="lead" data-step="0">→</div>
				<div class="engine" id="e1" style="width:260px;padding:28px" data-step="0"><div class="en">ENGINE 01</div><div class="er">READY</div></div>
				<div class="lead" data-step="1">→</div>
				<div class="card center" id="r1" style="width:420px;border-color:var(--green);background:var(--green-a);--d:1.4s" data-step="1" data-anim="pop">
					<div class="label green">RESULT</div><div style="font-size:44px;font-weight:900;color:var(--green);margin-top:8px">NO THREAT<br>DETECTED</div>
				</div>
			</div>
			<div class="abs center" style="left:0;right:0;top:560px" data-step="1" data-until="2"><div class="question">CASE CLOSED?</div></div>
			<div class="abs center" style="left:0;right:0;top:560px" data-step="2" data-anim="pop"><div class="reveal-box reveal-line">One engine gives you <span class="cyan">one perspective.</span></div></div>`,
		hooks: {
			1: (r, a) => {
				const e = $('#e1', r);
				const done = () => { e.classList.remove('scanning', 'pulsing'); e.classList.add('clean'); $('.er', e).textContent = 'CLEAN'; };
				if (a) { e.classList.add('scanning', 'pulsing'); $('.er', e).textContent = 'SCANNING…'; $('#r1', r).style.transitionDelay = '1.5s'; later(done, 1400); } else done();
			},
		},
	},
	// ------------------------------------------------ 2 1B MANY ENGINES
	{
		module: 'MULTISCANNING', title: '1B · Twelve engines', stage: 0, steps: 1,
		notes: { ask: '“Same file, twelve independent engines. What will they say?”', key: 'Same file, analysis fan-out; not twelve different files.', flow: 'Space resolves the engines one by one.' },
		html: (() => {
			const pts = ring12(890, 420, 700, 330);
			return `
			<svg class="fill" viewBox="0 0 1780 870" style="pointer-events:none">${pts.map((p) => `<line x1="890" y1="420" x2="${p.x}" y2="${p.y}" stroke="#1d3a5e" stroke-width="2" stroke-dasharray="6 8"/>`).join('')}</svg>
			${pts.map((p, k) => `<div class="engine abs" style="left:${p.x - 100}px;top:${p.y - 42}px;--d:${k * 0.05}s" data-step="0" data-anim="pop"><div class="en">ENGINE ${String(k + 1).padStart(2, '0')}</div><div class="er">···</div></div>`).join('')}
			<div class="abs center" style="left:590px;width:600px;top:300px" data-step="0">
				<div style="display:inline-block">${fileCard('', 'sm')}</div>
				<div class="count" style="margin-top:22px"><span class="n">0</span><span class="of"> / 12</span></div>
				<div class="label" style="margin-top:6px">ENGINES FLAGGED</div>
			</div>`;
		})(),
		hooks: { 1: (r, a) => resolveEngines(r, V1, a, 280) },
	},
	// ------------------------------------------------ 3 1C DECISION
	{
		module: 'MULTISCANNING', title: '1C · Is 3/12 malicious?', stage: 0, steps: 2, lock: [1],
		notes: { ask: '“If 3 out of 12 engines flag this, who thinks it is malicious?”', key: 'Detection consensus is evidence, not mathematical truth.', flow: 'Click the option the room picks (marks ROOM).' },
		html: `
			<div class="abs center" style="left:0;right:0;top:10px" data-step="0"><span class="count" style="font-size:90px"><span class="red">3</span><span class="of"> / 12</span></span><div class="label">ENGINES FLAGGED</div></div>
			<div class="abs center" style="left:0;right:0;top:240px" data-step="0"><div class="question">IS 3 / 12 “MALICIOUS”?</div></div>
			<div class="abs" style="left:0;right:0;top:390px" data-step="0" data-until="1">${choices(['YES', 'NO', 'NOT ENOUGH INFORMATION'])}</div>
			<div class="abs center" style="left:0;right:0;top:370px" data-step="1" data-anim="pop"><div class="reveal-box reveal-line">DETECTION IS <span class="cyan">EVIDENCE</span> — NOT TRUTH.</div></div>
			<div class="abs row" style="left:0;right:0;top:560px;justify-content:center;gap:20px">
				${['SIGNATURES', 'HEURISTICS', 'REPUTATION', 'MACHINE LEARNING', 'UPDATE TIMING'].map((t, k) => `<div class="chip" data-step="2" data-anim="pop" style="--d:${k * 0.15}s;font-size:28px;padding:16px 26px">${t}</div>`).join('')}
			</div>
			<div class="abs center lead" style="left:0;right:0;top:680px;--d:.9s" data-step="2">Engines use <b>different combinations</b> of these — not every engine uses every technique.</div>`,
	},
	// ------------------------------------------------ 4 1D ONE BYTE
	{
		module: 'MULTISCANNING', title: '1D · One small change', stage: 0, steps: 3, lock: [3],
		notes: { ask: '“One byte changed and detections went from 3 to 6. Did the risk double?”', key: 'The evidence changed. More detections can raise confidence, but consensus ≠ analysis.', flow: 'Space: +1 byte → rescan → reveal.' },
		html: `
			<div class="abs row" style="left:60px;top:40px;gap:40px" data-step="0">
				${fileCard('', 'sm')}
				<span class="chip" id="ver" style="font-size:34px;color:var(--text)">v1</span>
				<span class="chip" data-step="1" data-anim="pop" style="border-color:var(--orange);color:var(--orange);font-size:34px">+ 1 BYTE</span>
			</div>
			<div class="abs" style="left:60px;top:180px" data-step="0">
				<div class="label">SHA-256</div>
				<div class="mono" id="hash" style="font-size:54px;font-weight:800;margin-top:6px;transition:color .4s">4332…d87</div>
			</div>
			<div class="abs" style="left:60px;right:60px;top:340px;display:grid;grid-template-columns:repeat(12,1fr);gap:10px" data-step="2">
				${Array.from({ length: 12 }, (_, k) => `<div class="engine" style="width:auto;padding:14px 4px"><div class="en" style="font-size:20px">${String(k + 1).padStart(2, '0')}</div><div class="er" style="font-size:19px">···</div></div>`).join('')}
			</div>
			<div class="abs" style="right:60px;top:40px;text-align:right" data-step="2">
				<div class="count" style="font-size:110px"><span class="n red">0</span><span class="of"> / 12</span></div>
				<div class="label">ENGINES FLAGGED (v2) · v1 was 3 / 12</div>
			</div>
			<div class="abs center" style="left:0;right:0;top:520px;--d:3.6s" data-step="2" data-until="3"><div class="question">DID THE RISK “DOUBLE”?</div></div>
			<div class="abs center" style="left:0;right:0;top:500px" data-step="3" data-anim="pop">
				<div class="reveal-box reveal-line" style="font-size:52px">No. The evidence changed. Our job is to <span class="cyan">interpret</span> it.</div>
				<div class="lead" style="margin-top:28px">More independent detections can increase confidence —<br>but <b>consensus is not a substitute for analysis.</b></div>
			</div>`,
		hooks: {
			1: (r, a) => {
				const h = $('#hash', r);
				const fin = () => { h.textContent = '29d1…d03'; h.style.color = 'var(--orange)'; $('#ver', r).textContent = 'v2'; };
				if (!a) return fin();
				const chars = '0123456789abcdef';
				let t = 0;
				const tick = () => { if (t++ > 12) return fin(); h.textContent = Array.from({ length: 4 }, () => chars[(Math.random() * 16) | 0]).join('') + '…' + Array.from({ length: 3 }, () => chars[(Math.random() * 16) | 0]).join(''); later(tick, 70); };
				later(tick, 400);
			},
			2: (r, a) => resolveEngines(r, V2, a, 250),
		},
	},
	// ------------------------------------------------ 5 1E TAKEAWAY
	{
		module: 'MULTISCANNING', title: '1E · Takeaway', stage: (k) => (k >= 2 ? 1 : 0), steps: 2,
		notes: { key: 'Multiscanning reduces dependence on a single detection perspective. 3/12 is a signal, not the decision.', flow: 'Step 2 moves the file to Deep CDR.' },
		html: `
			<div class="abs center" style="left:0;right:0;top:20px" data-step="0"><div class="eyebrow">MODULE 1 · TAKEAWAY</div><div class="huge" style="margin-top:14px">MULTISCANNING</div></div>
			<div class="abs" style="left:0;right:0;top:250px;--d:.3s" data-step="0"><div class="flowline"><span class="fx lit">ONE FILE</span><span class="ar">→</span><span class="fx lit">MULTIPLE INDEPENDENT ENGINES</span><span class="ar">→</span><span class="fx lit">BROADER EVIDENCE</span></div></div>
			<div class="abs center lead" style="left:0;right:0;top:370px;--d:.6s" data-step="0">It reduces dependence on a <b>single detection perspective</b>.</div>
			<div class="abs center" style="left:0;right:0;top:480px" data-step="1" data-anim="pop"><div class="big">3 / 12 IS A <span class="cyan">SIGNAL.</span></div><div class="big" style="margin-top:12px">IT IS NOT THE <span class="orange">FINAL DECISION.</span></div></div>
			<div class="abs center" style="left:0;right:0;bottom:40px" data-step="2"><span class="chip" style="border-color:var(--cyan);color:var(--cyan)">NEXT CHECKPOINT → DEEP CDR</span></div>`,
	},
	// ------------------------------------------------ 6 2A OPEN THE DOCUMENT
	{
		module: 'DEEP CDR', title: '2A · Open the document', stage: 1, steps: 1,
		notes: { ask: '“What is actually inside a PDF?”', key: 'A document is a container of content AND capabilities. Nothing here is labelled malicious.', flow: 'Space opens the container.' },
		html: `
			<div class="eyebrow" data-step="0">MODULE 2 · DEEP CDR</div>
			<div class="title" data-step="0">WHAT DOES THIS DOCUMENT <span class="cyan">ACTUALLY NEED?</span></div>
			<div class="abs" id="d2a" style="left:120px;top:210px;transition:transform 1s cubic-bezier(.2,.8,.2,1)" data-step="0">
				<div class="doc"><div class="fold"></div><div class="dtitle">${FILE}</div><div class="page"><div class="pline" style="width:80%"></div><div class="pline"></div><div class="pimg"></div><div class="pline" style="width:90%"></div><div class="pline" style="width:70%"></div><div class="pline"></div><div class="pline" style="width:60%"></div></div></div>
			</div>
			<div class="abs" style="left:700px;right:40px;top:200px;display:grid;grid-template-columns:1fr 1fr;gap:22px">
				${COMPONENTS.map((c, k) => `<div class="comp" data-step="1" data-anim="left" style="--d:${0.2 + k * 0.18}s;font-size:32px;padding:26px 28px">${c.icon}<span>${c.n}</span></div>`).join('')}
			</div>
			<div class="abs lead" style="left:700px;top:660px;--d:1.5s" data-step="1">Content <b>and</b> capabilities — not verdicts.</div>`,
		hooks: { 1: (r) => { $('#d2a', r).style.transform = 'scale(.92) rotate(-2deg)'; } },
	},
	// ------------------------------------------------ 7 2B BUSINESS REQUIREMENT
	{
		module: 'DEEP CDR', title: '2B · The business requirement', stage: 1, steps: 1, lock: [1],
		notes: { ask: '“If the user only needs to read this document, why should the document carry JavaScript?”', key: 'Start from what the business needs, not from what looks bad.', flow: 'Take suggestions, then Space.' },
		html: `
			<div class="abs col" style="left:0;top:20px;width:760px;gap:16px">
				${COMPONENTS.map((c) => `<div class="comp" data-c="${c.k}" data-step="0" style="font-size:32px;padding:22px 28px">${c.icon}<span>${c.n}</span><span class="ctag"></span></div>`).join('')}
			</div>
			<div class="abs" style="left:860px;right:0;top:20px" data-step="0">
				<div class="card" style="border-color:var(--cyan)"><div class="label cyan">USER NEED</div><div style="font-size:48px;font-weight:900;margin-top:10px">READ THE MAINTENANCE INSTRUCTIONS</div></div>
				<div class="question sm" style="margin-top:60px">WHICH CAPABILITIES DOES THE USER <span class="cyan">ACTUALLY NEED?</span></div>
			</div>`,
		hooks: {
			1: (r) => {
				COMPONENTS.forEach((c) => {
					const el = $(`.comp[data-c="${c.k}"]`, r);
					const tag = $('.ctag', el);
					if (c.need === 'keep') { el.classList.add('keep'); tag.innerHTML = '<span class="pill g">KEEP</span>'; }
					else if (c.need === 'q') { el.classList.add('q'); tag.innerHTML = '<span class="pill a">?</span>'; }
					else tag.innerHTML = '<span class="pill n">POLICY-DEPENDENT</span>';
				});
			},
		},
	},
	// ------------------------------------------------ 8 2C AV vs CDR
	{
		module: 'DEEP CDR', title: '2C · AV vs CDR', stage: 1, steps: 2,
		notes: { ask: '“AV says clean. Is the JavaScript still there?”', key: 'AV did not fail. Antivirus and CDR answer different questions.', flow: 'Key teaching moment — slow down.' },
		html: `
			<div class="abs" style="left:0;top:0;width:840px;bottom:120px" data-step="0" data-anim="left">
				<div class="card" style="height:100%">
					<div class="big">ANTIVIRUS</div>
					<div class="card" style="margin-top:30px;font-size:44px;font-weight:800;border-radius:30px">“Do I recognize<br>something bad?”</div>
					<div data-step="1" style="margin-top:40px"><span class="label">VERDICT</span><div style="font-size:64px;font-weight:900;color:var(--green)">CLEAN</div></div>
				</div>
			</div>
			<div class="abs" style="left:940px;right:0;top:0;bottom:120px" data-step="0" data-anim="right">
				<div class="card" style="height:100%;border-color:var(--cyan)">
					<div class="big cyan">CDR</div>
					<div class="card" style="margin-top:30px;font-size:44px;font-weight:800;border-radius:30px;border-color:var(--cyan)">“Does this document need<br>to carry this capability?”</div>
					<div data-step="1" style="margin-top:40px"><span class="label">STILL INSIDE THE DOCUMENT</span>
						<div class="row" style="gap:16px;margin-top:12px"><div class="comp q" style="font-size:28px">${I.code}JAVASCRIPT</div><div class="comp q" style="font-size:28px">${I.clip}ATTACHMENT</div></div></div>
				</div>
			</div>
			<div class="abs center" style="left:0;right:0;bottom:0" data-step="2" data-anim="pop"><div class="reveal-box reveal-line" style="font-size:50px">ANTIVIRUS AND CDR ANSWER <span class="cyan">DIFFERENT QUESTIONS.</span></div></div>`,
	},
	// ------------------------------------------------ 9 2D DISARM
	{
		module: 'DEEP CDR', title: '2D · Disarm', stage: 1, steps: 1,
		notes: { key: 'Policy-driven removal of capability the document does not need. Not a malware verdict.', flow: 'Space = SANITIZE.' },
		html: `
			<div class="abs" style="left:0;top:0" data-step="0"><div class="eyebrow">DEEP CDR · DISARM</div></div>
			<div class="abs center" style="right:0;top:0" data-step="0" data-until="1"><div class="chip" style="font-size:40px;padding:20px 44px;border-color:var(--orange);color:var(--orange)">▶ SANITIZE</div></div>
			<div class="abs" id="stack" style="left:260px;top:90px;width:1000px;height:720px">
				${COMPONENTS.map((c, k) => `<div class="comp abs" data-c="${c.k}" style="left:${k * 14}px;top:${k * 16}px;width:780px;font-size:34px;padding:22px 30px">${c.icon}<span>${c.n}</span><span class="ctag"></span></div>`).join('')}
			</div>`,
		hooks: {
			1: (r, a) => {
				const els = COMPONENTS.map((c) => $(`.comp[data-c="${c.k}"]`, r));
				const explode = () => els.forEach((el, k) => { el.style.left = '0px'; el.style.top = k * 118 + 'px'; });
				const mark = () => COMPONENTS.forEach((c, k) => {
					const el = els[k], tag = $('.ctag', el);
					if (c.need === 'keep') { el.classList.add('keep'); tag.innerHTML = '<span class="pill g">PRESERVE ✓</span>'; }
					else if (c.need === 'q') { el.classList.add('rm'); tag.innerHTML = '<span class="pill r">REMOVE ✕</span>'; }
					else tag.innerHTML = '<span class="pill n">PER POLICY</span>';
				});
				const remove = () => COMPONENTS.forEach((c, k) => { if (c.need === 'q') { els[k].style.left = '560px'; els[k].style.opacity = '.3'; } });
				if (!a) { explode(); mark(); remove(); return; }
				explode(); later(mark, 900); later(remove, 2100);
			},
		},
	},
	// ------------------------------------------------ 10 2E RECONSTRUCT
	{
		module: 'DEEP CDR', title: '2E · Reconstruct', stage: 1, steps: 2,
		notes: { key: 'The usable document is rebuilt: same business content, less capability.', flow: 'Space rebuilds, Space shows the result.' },
		html: `
			<div class="abs" style="left:0;right:0;top:0" data-step="0"><div class="flowline" id="fl"><span class="fx">ORIGINAL</span><span class="ar">→</span><span class="fx">DISARM</span><span class="ar">→</span><span class="fx">RECONSTRUCT</span><span class="ar">→</span><span class="fx">SANITIZED COPY</span></div></div>
			<div class="abs center" style="left:180px;top:130px" data-step="0"><div class="label" style="margin-bottom:12px">ORIGINAL</div>
				${miniDoc(FILE, '<div class="abs" style="right:-30px;bottom:40px;display:flex;flex-direction:column;gap:10px"><span class="pill a">JS</span><span class="pill a">📎</span></div>')}</div>
			<div class="abs center" style="right:180px;top:130px;--d:1.6s" data-step="1" data-anim="pop"><div class="label green" style="margin-bottom:12px">SANITIZED COPY</div>${miniDoc(FILE)}</div>
			<div class="abs center" style="left:640px;width:500px;top:330px;--d:.8s" data-step="1"><div style="font-size:120px;color:var(--cyan)">⟶</div><div class="label cyan">REBUILT FROM PRESERVED PARTS</div></div>
			<div class="abs col" id="survivors" style="left:700px;top:230px;gap:14px;width:380px" data-step="0" data-until="1">
				${COMPONENTS.filter((c) => c.need === 'keep').map((c) => `<div class="comp keep" style="font-size:24px">${c.icon}${c.n}</div>`).join('')}
			</div>
			<div class="abs row" style="left:0;right:0;bottom:10px;justify-content:center;gap:60px">
				<div class="card center" data-step="2" data-anim="pop" style="border-color:var(--green)"><div class="label">BUSINESS CONTENT</div><div style="font-size:48px;font-weight:900;color:var(--green)">PRESERVED</div></div>
				<div class="card center" data-step="2" data-anim="pop" style="border-color:var(--red);--d:.3s"><div class="label">UNNECESSARY CAPABILITY</div><div style="font-size:48px;font-weight:900;color:var(--red)">REMOVED</div></div>
			</div>`,
		hooks: {
			0: (r, a) => { const f = $$('#fl .fx', r); f[0].classList.add('lit'); f[1].classList.add('lit'); },
			1: (r, a) => { const f = $$('#fl .fx', r); seq(2, 700, (k) => f[2 + k].classList.add(k === 1 ? 'hot' : 'lit'), a, 200); if (a) $('#survivors', r).style.transform = 'translateX(420px) scale(.6)'; },
		},
	},
	// ------------------------------------------------ 11 2F NUANCE
	{
		module: 'DEEP CDR', title: '2F · Important nuance', stage: 1, steps: 1,
		notes: { key: 'CDR does not detect malware and does not prove removed content was malicious. It enforces a content policy.' },
		html: `
			<div class="abs center" style="left:0;right:0;top:170px" data-step="0"><div class="huge">CDR DID NOT<br>“<span class="orange">FIND MALWARE.</span>”</div></div>
			<div class="abs center" style="left:180px;right:180px;top:540px" data-step="1"><div class="lead" style="font-size:44px;color:var(--text)">It <span class="cyan">enforced a content policy</span> by removing capabilities the document <b>did not need.</b></div></div>`,
	},
	// ------------------------------------------------ 12 2G VERIFY
	{
		module: 'DEEP CDR', title: '2G · Verification', stage: (k) => (k >= 3 ? 2 : 1), steps: 3, lock: [1],
		notes: { ask: '“It says sanitized. Do we trust the label?”', key: 'Verify the output. ANALYZE → SANITIZE → VERIFY — exactly what we do in the live demo.', flow: 'Step 3 moves the file to DLP.' },
		html: `
			<div class="abs" style="left:0;top:20px" data-step="0">${fileCard('Sanitized copy', 'sm')}</div>
			<div class="abs center" style="left:0;right:0;top:170px" data-step="0" data-until="1"><div class="question">TRUST THE “SANITIZED” LABEL?</div></div>
			<div class="abs center" style="left:0;right:0;top:150px" data-step="1" data-anim="pop"><div class="reveal-box reveal-line">VERIFY THE OUTPUT.</div></div>
			<div class="abs row" style="left:0;right:0;top:330px;justify-content:center;gap:60px">
				<div class="card mono" data-step="1" data-anim="left" style="width:600px;font-size:34px;line-height:1.7;--d:.4s"><div class="label">ORIGINAL</div>JavaScript: <span class="amber">Present</span><br>Attachment: <span class="amber">Present</span></div>
				<div class="card mono" data-step="1" data-anim="right" style="width:600px;font-size:34px;line-height:1.7;border-color:var(--green);--d:.6s"><div class="label green">SANITIZED</div>JavaScript: <span class="green">Absent</span><br>Attachment: <span class="green">Absent</span></div>
			</div>
			<div class="abs" style="left:0;right:0;top:620px" data-step="2"><div class="flowline"><span class="fx lit">ANALYZE</span><span class="ar">→</span><span class="fx lit">SANITIZE</span><span class="ar">→</span><span class="fx hot">VERIFY</span></div></div>
			<div class="abs center" style="left:0;right:0;bottom:0" data-step="3"><span class="chip" style="border-color:var(--cyan);color:var(--cyan)">NEXT CHECKPOINT → DLP</span></div>`,
	},
	// ------------------------------------------------ 13 3A START GREEN
	{
		module: 'DLP', title: '3A · Start green', stage: 2, steps: 1,
		notes: { ask: '“Zero malware detections. Are we done? Safe to send outside?”', key: 'Many will say yes. That is the point.', flow: 'Space = CHECK DATA.' },
		html: `
			<div class="eyebrow" data-step="0">MODULE 3 · DLP</div>
			<div class="title" data-step="0">CLEAN FROM MALWARE. <span class="cyan">SAFE TO SEND?</span></div>
			<div class="abs center" style="left:0;right:0;top:220px" data-step="0" data-anim="pop">
				<div class="card" style="display:inline-block;border-color:var(--green);background:var(--green-a);padding:40px 90px"><div class="label green">MALWARE SCAN</div><div class="big green" style="margin-top:10px">0 THREATS DETECTED</div></div>
			</div>
			<div class="abs center" style="left:0;right:0;top:520px;--d:.5s" data-step="0"><div class="question">SAFE TO SEND <span class="orange">OUTSIDE</span> THE ENVIRONMENT?</div></div>
			<div class="abs center" style="left:0;right:0;bottom:30px" data-step="1" data-anim="pop"><span class="chip" style="font-size:40px;padding:20px 44px;border-color:var(--orange);color:var(--orange)">▶ CHECK DATA</span></div>`,
	},
	// ------------------------------------------------ 14 3B LOOK INSIDE
	{
		module: 'DLP', title: '3B · Look inside the content', stage: 2, steps: 1,
		notes: { key: 'DLP matches content against configured policy categories. Not every IP is inherently confidential.', flow: 'Lines appear, Space runs the DLP scan.' },
		html: `
			<div class="abs" style="left:0;top:0" data-step="0"><div class="eyebrow">DLP · CONTENT INSPECTION</div></div>
			<div class="abs card dlpdoc" id="dd" style="left:200px;right:200px;top:70px;height:600px">
				<div class="scanbar" id="sb"></div>
				<div class="ln">Research Access Roster</div>
				<div class="ln"> </div>
				<div class="ln">Employee:  Alex Example</div>
				<div class="ln">Badge:     NMT-4817</div>
				<div class="ln">SSN:       <span class="hl" data-h="0">123-45-6789</span><span class="tag">SSN-LIKE VALUE</span></div>
				<div class="ln">Card:      <span class="hl" data-h="1">4111 1111 1111 1111</span><span class="tag">CREDIT CARD-LIKE VALUE</span></div>
				<div class="ln">System IP: <span class="hl" data-h="2">192.0.2.25</span><span class="tag">IP ADDRESS</span></div>
			</div>
			<div class="abs center label" style="left:0;right:0;bottom:10px;--d:3s" data-step="1">Synthetic training data · matched against configured policy categories</div>`,
		hooks: {
			0: (r, a) => seq(7, 220, (k) => $$('.ln', r)[k].classList.add('on'), a, 300),
			1: (r, a) => {
				if (a) $('#sb', r).classList.add('go');
				seq(3, 700, (k) => { $(`.hl[data-h="${k}"]`, r).classList.add('lit'); $$('.tag', r)[k].classList.add('on'); }, a, 900);
			},
		},
	},
	// ------------------------------------------------ 15 3C DLP RESULT
	{
		module: 'DLP', title: '3C · DLP result', stage: 2, steps: 2,
		notes: { key: 'Both results are true at the same time. Different controls, different objectives.' },
		html: `
			<div class="abs center" style="left:0;right:0;top:0" data-step="0"><div class="label">DLP</div><div class="big" style="margin-top:6px"><span class="red">3</span> SENSITIVE OBJECTS DETECTED</div></div>
			<div class="abs row" style="left:0;right:0;top:220px;justify-content:center;gap:60px">
				<div class="card" data-step="1" data-anim="left" style="width:760px;border-color:var(--green)"><div class="label">MALWARE CONTROL</div><div style="font-size:40px;font-weight:800;margin:14px 0">Is this content malicious?</div><span class="pill g" style="font-size:28px">NO THREAT DETECTED</span></div>
				<div class="card" data-step="1" data-anim="right" style="width:760px;border-color:var(--red)"><div class="label">DLP CONTROL</div><div style="font-size:40px;font-weight:800;margin:14px 0">Does this content violate data policy?</div><span class="pill r" style="font-size:28px">POLICY ISSUE DETECTED</span></div>
			</div>
			<div class="abs center" style="left:0;right:0;top:560px" data-step="2" data-anim="pop"><div class="reveal-box huge" style="font-size:90px">BOTH RESULTS CAN BE TRUE.</div></div>`,
	},
	// ------------------------------------------------ 16 3D POLICY
	{
		module: 'DLP', title: '3D · Policy changes the action', stage: 2, steps: 2, lock: [1], answer: { step: 1 },
		notes: { ask: '“The policy allows it after approved redaction. What do we do?”', key: 'Policy decides the action: here SANITIZE / REDACT, keeping the useful content.' },
		html: `
			<div class="abs" style="left:0;top:0;width:900px" data-step="0"><div class="policy"><div class="ptag">RESEARCH DATA POLICY</div><div class="ptext">Sensitive values may cross this boundary only after approved redaction.</div></div></div>
			<div class="abs" style="left:0;top:330px;width:940px" data-step="0"><div class="question sm">WHAT SHOULD WE DO?</div><div style="margin-top:30px;text-align:left">${choices(['ALLOW', 'BLOCK', 'SANITIZE / REDACT', 'IGNORE'], 'SANITIZE / REDACT')}</div></div>
			<div class="abs card dlpdoc" style="left:1000px;right:0;top:0;height:620px;font-size:32px;padding:40px" data-step="0">
				<div class="ln on">Research Access Roster</div><div class="ln on"> </div>
				<div class="ln on">Employee:  Alex Example</div>
				<div class="ln on">Badge:     NMT-4817</div>
				<div class="ln on">SSN:       <span class="hl lit" data-r="***-**-6789">123-45-6789</span></div>
				<div class="ln on">Card:      <span class="hl lit" data-r="**** **** **** 1111">4111 1111 1111 1111</span></div>
				<div class="ln on">System IP: <span class="hl lit" data-r="192.0.2.***">192.0.2.25</span></div>
			</div>
			<div class="abs" style="left:0;top:640px;width:940px" data-step="1" data-anim="pop"><div class="reveal-box reveal-line" style="font-size:54px">SANITIZE / <span class="cyan">REDACT</span></div><div class="lead" style="margin-top:14px;font-size:28px">Remove the sensitive values. <b>Keep the useful content.</b></div></div>
			<div class="abs center label" style="left:1000px;right:0;top:650px;--d:2.2s" data-step="2"><span class="green">REDACTED COPY · BUSINESS CONTENT KEPT</span></div>`,
		hooks: {
			2: (r, a) => seq(3, 650, (k) => { const h = $$('.hl', r)[k]; h.textContent = h.dataset.r; h.classList.remove('lit'); h.classList.add('red'); }, a, 200),
		},
	},
	// ------------------------------------------------ 17 3E TAKEAWAY
	{
		module: 'DLP', title: '3E · Takeaway', stage: (k) => (k >= 2 ? 3 : 2), steps: 2,
		notes: { key: 'Different controls protect against different risks.', flow: 'Step 2 moves to DECIDE.' },
		html: `
			<div class="abs center" style="left:0;right:0;top:40px" data-step="0"><div class="huge" style="font-size:100px;white-space:nowrap">MALWARE-CLEAN <span class="orange">≠</span> DATA-SAFE</div><div class="lead" style="margin-top:24px">Different controls protect against <b>different risks.</b></div></div>
			<div class="abs row" style="left:0;right:0;top:380px;justify-content:center;gap:40px">
				${[['MULTISCANNING', 'Threat evidence'], ['DEEP CDR', 'Active / embedded capability'], ['DLP', 'Sensitive data / policy']].map(([a, b], k) => `<div class="card center" data-step="1" data-anim="pop" style="width:500px;--d:${k * 0.2}s"><div style="font-size:40px;font-weight:900" class="cyan">${a}</div><div class="lead" style="margin-top:10px;color:var(--text)">${b}</div></div>`).join('')}
			</div>
			<div class="abs center" style="left:0;right:0;bottom:40px" data-step="2"><span class="chip" style="border-color:var(--cyan);color:var(--cyan)">FINAL CHECKPOINT → DECIDE</span></div>`,
	},
	// ------------------------------------------------ 18 4A FULL PIPELINE
	{
		module: 'TRUST PIPELINE', title: '4A · The full pipeline', stage: 3, steps: 1,
		notes: { key: 'Every stage adds evidence. None of them alone is the decision.', flow: 'Space lights the stages in order.' },
		html: `
			<div class="eyebrow" data-step="0">THE TRUST PIPELINE</div>
			<div class="title" data-step="0">SO… CAN WE <span class="cyan">TRUST</span> THE FILE?</div>
			<div class="abs row" id="pipe" style="left:0;right:0;top:360px;justify-content:center;gap:12px" data-step="0">
				${[['UNTRUSTED FILE', ''], ['MULTISCANNING', 'threat evidence'], ['DEEP CDR', 'reduced capability'], ['DLP', 'data policy'], ['POLICY', 'the rules'], ['DECIDE', '']].map(([a, b], k) => `${k ? '<span class="lead">→</span>' : ''}<div class="card center pp" style="padding:26px 18px;min-width:200px;transition:all .5s"><div style="font-size:27px;font-weight:900;white-space:nowrap">${a}</div>${b ? `<div class="label" style="margin-top:8px;font-size:18px">${b}</div>` : ''}</div>`).join('')}
			</div>`,
		hooks: {
			1: (r, a) => seq(6, 550, (k) => { const c = $$('.pp', r)[k]; c.style.borderColor = k === 5 ? 'var(--orange)' : 'var(--cyan)'; c.style.background = k === 5 ? 'var(--orange-a)' : 'var(--cyan-a)'; c.style.boxShadow = '0 0 40px rgba(41,211,240,.25)'; }, a, 100),
		},
	},
	// ------------------------------------------------ 19 4B THREE QUESTIONS
	{
		module: 'TRUST PIPELINE', title: '4B · Three controls, three questions', stage: 3, steps: 1,
		notes: { key: 'Three controls, three different questions.' },
		html: `
			<div class="abs row" style="left:0;right:0;top:20px;justify-content:center;gap:36px;align-items:stretch">
				${[['MULTISCANNING', 'Do multiple detection perspectives see evidence of a threat?'], ['DEEP CDR', 'What capability can we safely remove while preserving the business content?'], ['DLP', 'Does the file contain data that policy restricts?']].map(([a, b], k) => `<div class="card" data-step="0" data-anim="pop" style="width:540px;--d:${k * 0.35}s"><div class="cyan" style="font-size:40px;font-weight:900">${a}</div><div style="font-size:38px;font-weight:700;margin-top:18px;line-height:1.3">${b}</div></div>`).join('')}
			</div>
			<div class="abs center" style="left:0;right:0;top:560px" data-step="1" data-anim="pop"><div class="reveal-box reveal-line" style="font-size:50px">NONE OF THESE QUESTIONS MEANS THE SAME THING.</div></div>`,
	},
	// ------------------------------------------------ 20 4C FINAL QUESTION
	{
		module: 'TRUST PIPELINE', title: '4C · Now would you let it in?', stage: 3, steps: 1, lock: [1],
		notes: { ask: '“Now would you let it in?”', key: 'Trust is a decision pipeline, the same one the whole workshop uses.' },
		html: `
			<div class="zone" style="left:40px">OUTSIDE</div>
			<div class="zone" style="right:40px">TRUSTED ENVIRONMENT</div>
			<div class="boundary closed"></div>
			<div class="abs" style="left:40px;top:120px" data-step="0">${fileCard('', 'sm')}
				<div class="col" style="gap:14px;margin-top:24px">
					<div class="card" style="padding:18px 24px"><div class="label">MULTISCAN</div><div style="font-size:30px;font-weight:800">Evidence collected</div></div>
					<div class="card" style="padding:18px 24px;border-color:var(--green)"><div class="label">CDR</div><div style="font-size:30px;font-weight:800" class="green">Sanitized + verified</div></div>
					<div class="card" style="padding:18px 24px;border-color:var(--green)"><div class="label">DLP</div><div style="font-size:30px;font-weight:800" class="green">Policy satisfied (redacted)</div></div>
				</div>
			</div>
			<div class="abs center" style="left:960px;right:0;top:160px" data-step="0" data-until="1"><div class="question">NOW WOULD YOU<br>LET IT IN?</div></div>
			<div class="abs center" style="left:960px;right:0;top:120px" data-step="1" data-anim="pop"><div class="big">TRUST IS A<br><span class="cyan">DECISION PIPELINE.</span></div></div>
			<div class="abs" style="left:0;right:0;bottom:30px;--d:.6s" data-step="1"><div class="flowline" style="gap:12px">${['IDENTIFY', 'INSPECT', 'DETECT', 'ANALYZE', 'SANITIZE', 'POLICY', 'DECIDE'].map((s, k, a) => `<span class="fx ${k === a.length - 1 ? 'hot' : 'lit'}" style="font-size:24px;padding:12px 18px">${s}</span>${k < a.length - 1 ? '<span class="ar">→</span>' : ''}`).join('')}</div></div>`,
	},
	// ------------------------------------------------ 21 CLOSING
	{
		module: 'CLOSING', title: 'Clean from what?', stage: -1, steps: 2,
		notes: { ask: '“So when someone tells you the file is clean… clean from what?”', key: '“Now that we understand what these controls are asking, let’s give them real files.” → live investigation.' },
		html: `
			<div class="abs center" style="left:0;right:0;top:10px" data-step="0" data-anim="pop"><div class="huge" style="font-size:150px">CLEAN FROM <span class="orange">WHAT?</span></div></div>
			<div class="abs" style="left:560px;top:250px">
				${['No malware?', 'No active capability?', 'No sensitive data?', 'Inspection completed?', 'Policy satisfied?'].map((t, k) => `<div data-step="1" data-anim="left" style="--d:${k * 0.25}s;font-size:46px;font-weight:700;margin:10px 0" class="mono"><span class="cyan">▢</span> ${t}</div>`).join('')}
			</div>
			<div class="abs center" style="left:0;right:0;bottom:70px" data-step="2" data-anim="pop"><div class="reveal-box reveal-line" style="font-size:54px">A GREEN VERDICT IS NOT THE WHOLE ANALYSIS.</div></div>
			<div class="abs center label" style="left:0;right:0;bottom:0;--d:.6s" data-step="2">NEXT: LIVE INVESTIGATION</div>`,
	},
];

// ---------------------------------------------------------------- modules / menu
const MODULES = [
	['opening', 'Opening', 0],
	['multiscan', 'Multiscanning', 1],
	['cdr', 'Deep CDR', 6],
	['dlp', 'DLP', 13],
	['pipeline', 'Trust Pipeline', 18],
	['closing', 'Closing', 21],
];
$('#menu-list').innerHTML = MODULES.map(([id, name, i], k) => `<button data-go="${i}"><span>${k + 1}</span>${name}</button>`).join('');
$('#menu').addEventListener('click', (e) => {
	const b = e.target.closest('[data-go]');
	if (b) { toggle('#menu', false); goTo(Number(b.dataset.go), 0, true); }
	else if (e.target.id === 'menu') toggle('#menu', false);
});
function toggle(sel, force) { const el = $(sel); const on = force ?? !el.classList.contains('open'); el.classList.toggle('open', on); el.setAttribute('aria-hidden', String(!on)); }
function fullscreen() { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => {}); }

// Presenter can click an option to mark what the room picked (visual only).
sceneEl.addEventListener('click', (e) => { const c = e.target.closest('.choice'); if (c) c.classList.toggle('room'); });

$('#controls').addEventListener('click', (e) => {
	const a = e.target.closest('button')?.dataset.act;
	({ back, reveal: advance, next, prevScene, reset, menu: () => toggle('#menu'), notes: () => toggle('#notes'), full: fullscreen, hide: () => $('#controls').classList.add('off') })[a]?.();
	e.target.blur();
});

document.addEventListener('keydown', (e) => {
	if (e.altKey || e.ctrlKey || e.metaKey) return;
	const k = e.key;
	if ($('#menu').classList.contains('open') && /^[1-6]$/.test(k)) { toggle('#menu', false); goTo(MODULES[Number(k) - 1][2], 0, true); return; }
	if (e.shiftKey && k === 'ArrowRight') { e.preventDefault(); return next(); }
	if (e.shiftKey && k === 'ArrowLeft') { e.preventDefault(); return prevScene(); }
	const map = {
		// → / Space / Enter / PageDown all REVEAL the next step, then move on to the next scene.
		ArrowRight: advance, ArrowLeft: back, ' ': advance, Enter: advance, PageDown: advance, PageUp: back, ArrowDown: advance, ArrowUp: back,
		r: reset, R: reset, f: fullscreen, F: fullscreen, Home: () => goTo(0, 0, true),
		p: () => $('#controls').classList.toggle('off'), P: () => $('#controls').classList.toggle('off'),
		n: () => toggle('#notes'), N: () => toggle('#notes'), m: () => toggle('#menu'), M: () => toggle('#menu'),
		Escape: () => { toggle('#menu', false); toggle('#notes', false); },
	};
	if (map[k]) { e.preventDefault(); map[k](); }
});

// ---------------------------------------------------------------- scale 1920x1080 canvas to any screen
function fit() {
	const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
	stage.style.margin = '-540px 0 0 -960px';
	stage.style.transformOrigin = '50% 50%';
	stage.style.transform = `scale(${s})`;
}
window.addEventListener('resize', fit);
fit();

// ---------------------------------------------------------------- start
const qs = new URLSearchParams(location.search);
const startMod = MODULES.find(([id]) => id === qs.get('start'));
const startIdx = startMod ? startMod[2] : Number(qs.get('scene')) || 0;
goTo(startIdx, 0, true);
window.__trustLab = { goTo, advance, back, next, reset, get state() { return { scene: S.i, step: S.step, total: SCENES.length, steps: SCENES[S.i].steps }; } };
