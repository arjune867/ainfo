/**
 * AINFO production Jooble proxy example for Cloudflare Workers.
 * Store the key with: npx wrangler secret put JOOBLE_API_KEY
 * Optional variable: JOOBLE_BASE_URL=https://id.jooble.org
 * Do not expose JOOBLE_API_KEY to the browser.
 */
export interface Env {
  JOOBLE_API_KEY: string;
  JOOBLE_BASE_URL?: string;
}

export async function handleJoobleJobs(request: Request, env: Env): Promise<Response> {
  if (!env.JOOBLE_API_KEY) {
    return Response.json({ error: 'jobs_not_configured' }, { status: 503 });
  }

  const url = new URL(request.url);
  const keywords = (url.searchParams.get('keywords') || 'HSE').slice(0, 120);
  const location = (url.searchParams.get('location') || 'Indonesia').slice(0, 120);
  const page = Math.max(1, Math.min(20, Number(url.searchParams.get('page') || 1)));
  const base = (env.JOOBLE_BASE_URL || 'https://id.jooble.org').replace(/\/$/, '');

  const cache = caches.default;
  const cacheKey = new Request(`${url.origin}/_cache/jooble?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}&page=${page}`);
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const upstream = await fetch(`${base}/api/${encodeURIComponent(env.JOOBLE_API_KEY)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      keywords,
      location,
      radius: '80',
      page,
      ResultOnPage: 20,
      companysearch: false,
    }),
  });

  const body = await upstream.text();
  const response = new Response(body, {
    status: upstream.status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': upstream.ok ? 'public, max-age=900' : 'no-store',
    },
  });
  if (upstream.ok) await cache.put(cacheKey, response.clone());
  return response;
}
