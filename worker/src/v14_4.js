import previousWorker from './v14_3.js';

const VERSION = '14.4.0';

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

async function route(req, env, ctx) {
  const url = new URL(req.url);

  if (url.pathname === '/api/public/giphy-config' && req.method === 'GET') {
    const key = String(env.GIPHY_API_KEY_PUBLIC || '').trim();
    return json({
      ok: true,
      version: VERSION,
      configured: Boolean(key),
      apiKey: key,
      rating: 'pg',
      language: 'id',
    });
  }

  return previousWorker.fetch(req, env, ctx);
}

export default {
  async fetch(req, env, ctx) {
    try {
      return await route(req, env, ctx);
    } catch (error) {
      console.error('AINFO V14.4 wrapper error', error);
      return previousWorker.fetch(req, env, ctx);
    }
  },
  async scheduled(event, env, ctx) {
    if (typeof previousWorker.scheduled === 'function') return previousWorker.scheduled(event, env, ctx);
  },
};
