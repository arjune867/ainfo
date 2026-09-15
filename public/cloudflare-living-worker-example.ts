/**
 * AINFO V6 - example Cloudflare Worker proxy for prayer schedule data.
 * Data provider documents Kemenag Bimas Islam as the source.
 * Merge these routes into the production Worker rather than deploying separately.
 */
const MYQURAN = 'https://api.myquran.com/v3';

export async function prayerProxy(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname === '/api/prayer/search') {
    const q = (url.searchParams.get('q') || 'jakarta').slice(0, 120);
    const upstream = `${MYQURAN}/sholat/kabkota/cari/${encodeURIComponent(q)}`;
    return proxy(upstream, 86400);
  }
  if (url.pathname === '/api/prayer/month') {
    const id = (url.searchParams.get('id') || '').slice(0, 80);
    const period = (url.searchParams.get('period') || '').slice(0, 7);
    if (!id || !/^\d{4}-\d{2}$/.test(period)) {
      return Response.json({ error: 'invalid_query' }, { status: 400 });
    }
    const upstream = `${MYQURAN}/sholat/jadwal/${encodeURIComponent(id)}/${encodeURIComponent(period)}?tz=Asia%2FJakarta`;
    return proxy(upstream, 21600);
  }
  return null;
}

async function proxy(upstream: string, ttl: number): Promise<Response> {
  const response = await fetch(upstream, {
    headers: { Accept: 'application/json', 'User-Agent': 'AINFO/6.0' },
    cf: { cacheTtl: ttl, cacheEverything: true },
  } as RequestInit);
  const body = await response.text();
  return new Response(body, {
    status: response.status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `public, max-age=${Math.min(ttl, 3600)}, s-maxage=${ttl}`,
    },
  });
}
