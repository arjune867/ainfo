import previousWorker from './v14_2.js';

const VERSION = '14.3.0';
const previous = previousWorker;

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

function site(env) {
  return String(env.DOMAIN || 'https://www.ainfo.web.id').replace(/\/$/, '');
}

function timingSafe(a, b) {
  const left = String(a || '');
  const right = String(b || '');
  if (!left || !right || left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}

function publishAuthorized(req, env) {
  const configured = String(env.AINFO_PUBLISH_TOKEN || '');
  if (!configured) return { ok: false, response: json({ error: 'publish_not_configured' }, 503) };
  const header = String(req.headers.get('authorization') || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match || !timingSafe(match[1], configured)) {
    return { ok: false, response: json({ error: 'unauthorized' }, 401) };
  }
  return { ok: true };
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 140) || 'artikel';
}

function stripTags(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeRichHtml(input) {
  let value = String(input || '');
  value = value.replace(/<(script|style|iframe|object|embed|form|input|button|textarea|select|svg|math)[^>]*>[\s\S]*?<\/\1>/gi, '');
  value = value.replace(/<(script|style|iframe|object|embed|form|input|button|textarea|select|svg|math)\b[^>]*\/?\s*>/gi, '');
  const allowed = new Set(['p', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 'mark', 'ul', 'ol', 'li', 'blockquote', 'a', 'br', 'code', 'pre']);
  value = value.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (full, rawTag, attrs) => {
    const tag = String(rawTag).toLowerCase();
    if (!allowed.has(tag)) return '';
    if (/^<\//.test(full)) return `</${tag}>`;
    if (tag === 'br') return '<br>';
    if (tag === 'a') {
      const m = String(attrs || '').match(/\bhref\s*=\s*(["'])(.*?)\1/i);
      const href = m ? m[2].trim() : '';
      const safe = /^(https?:\/\/|\/|#)/i.test(href) ? href : '#';
      const escaped = safe.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<a href="${escaped}" rel="nofollow noopener noreferrer" target="_blank">`;
    }
    return `<${tag}>`;
  });
  return value.trim();
}

function normalizeImageUrl(value, env) {
  const input = String(value || '').trim();
  if (!input) return '';
  if (input.startsWith('/')) return `${site(env)}${input}`;
  try {
    const url = new URL(input);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

function uniqueStrings(values) {
  const out = [];
  const seen = new Set();
  for (const value of values || []) {
    const text = String(value || '').trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

async function publishFromNewsroom(req, env) {
  const auth = publishAuthorized(req, env);
  if (!auth.ok) return auth.response;

  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > 1_500_000) return json({ error: 'payload_too_large' }, 413);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return json({ error: 'invalid_json' }, 400);

  const title = String(body.title || '').trim().slice(0, 300);
  if (!title) return json({ error: 'title_required' }, 400);

  const slug = slugify(body.slug || title);
  const existing = await env.DB.prepare('SELECT id,slug,status FROM articles WHERE slug=? LIMIT 1').bind(slug).first();
  if (existing) {
    return json({
      error: 'slug_exists',
      message: 'Slug sudah digunakan. Ubah slug di Newsroom sebelum menerbitkan.',
      existingId: existing.id,
      existingStatus: existing.status,
      url: `${site(env)}/read/${slug}/`,
    }, 409);
  }

  const rawHtml = String(body.contentHtml || '').trim();
  const contentHtml = sanitizeRichHtml(rawHtml);
  const plainText = stripTags(contentHtml || body.contentMarkdown || '');
  if (!plainText || plainText.length < 80) return json({ error: 'content_too_short' }, 400);
  if (contentHtml.length > 1_200_000) return json({ error: 'content_too_large' }, 413);

  const metaDescription = String(body.metaDescription || '').trim().slice(0, 500);
  const excerpt = (metaDescription || plainText).slice(0, 240);
  const author = String(body.author || 'Tim AINFO').trim().slice(0, 120) || 'Tim AINFO';
  const category = String(body.category || 'Berita').trim().slice(0, 80) || 'Berita';
  const primaryKeyword = String(body.primaryKeyword || '').trim();
  const secondaryKeywords = uniqueStrings(Array.isArray(body.secondaryKeywords) ? body.secondaryKeywords : []);
  const keywords = uniqueStrings([primaryKeyword, ...secondaryKeywords]).join(', ').slice(0, 1000);
  const tagsJson = JSON.stringify(secondaryKeywords.slice(0, 20));
  const imageUrl = normalizeImageUrl(body.featuredImageUrl, env);
  const canonical = `${site(env)}/read/${slug}/`;
  const publishedAt = new Date().toISOString();
  const words = plainText.split(/\s+/).filter(Boolean).length;
  const readMinutes = Math.max(1, Math.ceil(words / 220));
  const id = Date.now();

  try {
    await env.DB.prepare(`INSERT INTO articles(
      id,slug,title,excerpt,content_json,content_html,category,author_name,author_slug,image_url,image_caption,status,
      headline,breaking,editor_pick,rating,rating_count,views,read_minutes,seo_title,seo_description,canonical_url,
      scheduled_at,published_at,updated_at,created_at,audio_url,tags_json,keywords,modified_at
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,?,?,?,?)`)
      .bind(
        id,
        slug,
        title,
        excerpt,
        JSON.stringify([]),
        contentHtml,
        category,
        author,
        slugify(author),
        imageUrl,
        String(body.imageCaption || '').trim().slice(0, 300),
        'published',
        body.headline ? 1 : 0,
        body.breaking ? 1 : 0,
        body.editorPick ? 1 : 0,
        0,
        0,
        0,
        readMinutes,
        String(body.metaTitle || title).trim().slice(0, 300),
        metaDescription,
        canonical,
        null,
        publishedAt,
        String(body.audioUrl || '').trim().slice(0, 1000),
        tagsJson,
        keywords,
        publishedAt,
      ).run();
  } catch (error) {
    const message = String(error?.message || error);
    if (/unique|slug/i.test(message)) {
      return json({ error: 'slug_exists', url: canonical }, 409);
    }
    console.error('AINFO internal publish failed', error);
    return json({ error: 'publish_failed', message: 'Artikel gagal disimpan ke portal.' }, 500);
  }

  return json({
    ok: true,
    version: VERSION,
    id,
    slug,
    status: 'published',
    url: canonical,
    publishedAt,
  }, 201);
}

async function route(req, env, ctx) {
  const url = new URL(req.url);
  const path = url.pathname;

  if (path === '/api/internal/publish') {
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, { Allow: 'POST' });
    return publishFromNewsroom(req, env);
  }

  return previous.fetch(req, env, ctx);
}

export default {
  async fetch(req, env, ctx) {
    try {
      return await route(req, env, ctx);
    } catch (error) {
      console.error('AINFO V14.3 wrapper error', error);
      return previous.fetch(req, env, ctx);
    }
  },
  async scheduled(event, env, ctx) {
    if (typeof previous.scheduled === 'function') return previous.scheduled(event, env, ctx);
  },
};
