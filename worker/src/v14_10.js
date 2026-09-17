import previousWorker from './v14_7.js';

const VERSION = '14.10.0';

function isHtml(req, res) {
  if (req.method !== 'GET') return false;
  return String(res.headers.get('content-type') || '').toLowerCase().includes('text/html');
}

async function restoreWhatsAppPicker(req, res) {
  if (!isHtml(req, res)) return res;
  let html = await res.text();

  // V14.10 intentionally restores the original WhatsApp-style picker
  // provided by engagement-motion.js. Remove newer picker injections if
  // they ever appear in a cached/static HTML response.
  html = html
    .replace(/<script[^>]+src=["'][^"']*comment-picker-v2\.js[^"']*["'][^>]*><\/script>/gi, '')
    .replace(/<script[^>]+src=["'][^"']*comment-picker-mobile-fix\.js[^"']*["'][^>]*><\/script>/gi, '')
    .replace(/<script[^>]+src=["'][^"']*mobile-sticker-fix\.js[^"']*["'][^>]*><\/script>/gi, '');

  const headers = new Headers(res.headers);
  headers.delete('content-length');
  headers.set('x-ainfo-version', VERSION);
  headers.set('x-ainfo-comment-picker', 'whatsapp');
  return new Response(html, { status: res.status, statusText: res.statusText, headers });
}

export default {
  async fetch(req, env, ctx) {
    try {
      const res = await previousWorker.fetch(req, env, ctx);
      return await restoreWhatsAppPicker(req, res);
    } catch (error) {
      console.error('AINFO V14.10 WhatsApp picker restore error', error);
      return previousWorker.fetch(req, env, ctx);
    }
  },
  async scheduled(event, env, ctx) {
    if (typeof previousWorker.scheduled === 'function') {
      return previousWorker.scheduled(event, env, ctx);
    }
  },
};
