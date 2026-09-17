import previousWorker from './v14_7.js';

const VERSION = '14.8.1';
const PICKER = '<script src="/comment-picker-v2.js?v=20260917b"></script>';
const MOBILE_FIX = '<script src="/comment-picker-mobile-fix.js?v=20260917f"></script>';

function shouldInject(req, res) {
  if (req.method !== 'GET') return false;
  return String(res.headers.get('content-type') || '').toLowerCase().includes('text/html');
}

async function injectPicker(req, res) {
  if (!shouldInject(req, res)) return res;
  let html = await res.text();
  let changed = false;
  if (!html.includes('/comment-picker-v2.js')) {
    html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${PICKER}</body>`) : `${html}${PICKER}`;
    changed = true;
  }
  if (!html.includes('/comment-picker-mobile-fix.js')) {
    html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${MOBILE_FIX}</body>`) : `${html}${MOBILE_FIX}`;
    changed = true;
  }
  if (!changed) return new Response(html, res);
  const headers = new Headers(res.headers);
  headers.delete('content-length');
  headers.set('x-ainfo-version', VERSION);
  return new Response(html, { status: res.status, statusText: res.statusText, headers });
}

export default {
  async fetch(req, env, ctx) {
    try {
      const res = await previousWorker.fetch(req, env, ctx);
      return await injectPicker(req, res);
    } catch (error) {
      console.error('AINFO V14.8.1 compact mobile picker wrapper error', error);
      return previousWorker.fetch(req, env, ctx);
    }
  },
  async scheduled(event, env, ctx) {
    if (typeof previousWorker.scheduled === 'function') return previousWorker.scheduled(event, env, ctx);
  },
};
