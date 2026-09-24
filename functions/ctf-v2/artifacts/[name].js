// Serves challenge artifacts as forced downloads with a generic content type, so browsers
// never try to render them inline (Case 01's "PDF" is intentionally not a PDF).
const ALLOWED = new Set(['mesa-maintenance-notice.pdf', 'vendor-maintenance-brief.pdf', 'research-access-export.txt']);

export async function onRequestGet({ request, env, params }) {
	const name = String(params.name || '');
	if (!ALLOWED.has(name)) return new Response('Not found', { status: 404 });
	const res = await env.ASSETS.fetch(request);
	if (!res.ok) return res;
	return new Response(res.body, {
		status: 200,
		headers: {
			'content-type': 'application/octet-stream',
			'content-disposition': `attachment; filename="${name}"`,
			'x-content-type-options': 'nosniff',
			'cache-control': 'no-store',
			'x-robots-tag': 'noindex',
		},
	});
}
