import previousWorker from './v14_6.js';

const VERSION = '14.7.0';
const INJECT = '<script src="/comment-display-fix.js?v=20260917a"></script>';

function shouldInject(req, res) {
  if (req.method !== 'GET') return false;
  return String(res.headers.get('content-type') || '').toLowerCase().includes('text/html');
}

async function injectFix(req, res) {
  if (!shouldInject(req, res)) return res;
  const html = await res.text();
  if (html.includes('/comment-display-fix.js')) return new Response(html, res);
  const next = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${INJECT}</body>`) : `${html}${INJECT}`;
  const headers = new Headers(res.headers);
  headers.delete('content-length');
  headers.set('x-ainfo-version', VERSION);
  return new Response(next, { status: res.status, statusText: res.statusText, headers });
}

export default {
  async fetch(req, env, ctx) {
    try {
      const res = await previousWorker.fetch(req, env, ctx);
      return await injectFix(req, res);
    } catch (error) {
      console.error('AINFO V14.7 comment display wrapper error', error);
      return previousWorker.fetch(req, env, ctx);
    }
  },
  async scheduled(event, env, ctx) {
    if (typeof previousWorker.scheduled === 'function') return previousWorker.scheduled(event, env, ctx);
  },
};
