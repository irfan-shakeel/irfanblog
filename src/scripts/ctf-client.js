// Shared browser helpers for /ctf pages. Contains no answers or flags.
export async function api(path, { method = 'GET', body } = {}) {
	const opts = { method, credentials: 'same-origin', headers: {} };
	if (body !== undefined) {
		opts.headers['content-type'] = 'application/json';
		opts.body = JSON.stringify(body);
	}
	let res;
	try {
		res = await fetch('/api/ctf/' + path, opts);
	} catch {
		return { ok: false, status: 0, error: 'Network error. Check your connection and try again.' };
	}
	let data = {};
	try {
		data = await res.json();
	} catch {
		data = { ok: false, error: `Unexpected response (${res.status}).` };
	}
	return { status: res.status, ...data, ok: res.ok && data.ok !== false };
}

// Server/client clock offset so every screen shows the same countdown.
let offset = 0;
export function syncClock(serverNow) {
	if (serverNow) offset = Date.parse(serverNow) - Date.now();
}
export function remainingMs(endsAt) {
	if (!endsAt) return null;
	return Date.parse(endsAt) - (Date.now() + offset);
}
export function fmtClock(ms) {
	if (ms == null) return '--:--';
	const s = Math.max(0, Math.ceil(ms / 1000));
	return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

let toastTimer;
export function toast(msg, ms = 2600) {
	const el = document.getElementById('toast');
	if (!el) return;
	el.textContent = msg;
	el.classList.add('show');
	clearTimeout(toastTimer);
	toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

export function esc(s) {
	return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Single, brief confetti burst (skipped for reduced-motion users).
export function confetti() {
	if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
	const c = document.createElement('canvas');
	c.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:60';
	document.body.appendChild(c);
	const ctx = c.getContext('2d');
	const W = (c.width = innerWidth), H = (c.height = innerHeight);
	const colors = ['#22d3ee', '#22c55e', '#f59e0b', '#eaf1fb'];
	const P = Array.from({ length: 140 }, () => ({ x: W / 2, y: H * 0.35, vx: (Math.random() - 0.5) * 14, vy: Math.random() * -14 - 4, s: 4 + Math.random() * 5, c: colors[(Math.random() * 4) | 0], r: Math.random() * 6 }));
	let t = 0;
	(function frame() {
		ctx.clearRect(0, 0, W, H);
		for (const p of P) {
			p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.r += 0.1;
			ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); ctx.restore();
		}
		if (++t < 150) requestAnimationFrame(frame); else c.remove();
	})();
}
