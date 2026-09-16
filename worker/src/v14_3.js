import previousWorker from './v14_2.js';

const VERSION = '14.3.1';
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

function cookies(req) {
  const out = {};
  for (const part of String(req.headers.get('cookie') || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function csrfOk(req) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;
  const cookieToken = cookies(req).ainfo_csrf || '';
  const headerToken = req.headers.get('x-csrf-token') || '';
  return Boolean(cookieToken && headerToken && timingSafe(cookieToken, headerToken));
}

async function adminAllowed(req, env, ctx) {
  try {
    const url = new URL(req.url);
    url.pathname = '/api/admin/users';
    url.search = '';
    const probe = new Request(url.toString(), { method: 'GET', headers: req.headers });
    const res = await previous.fetch(probe, env, ctx);
    return res.status === 200;
  } catch {
    return false;
  }
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

function stickerOut(row) {
  return {
    id: Number(row.id),
    code: String(row.code || ''),
    name: String(row.name || ''),
    category: String(row.category || 'Karakter'),
    url: String(row.public_url || ''),
    mimeType: String(row.mime_type || ''),
    sizeBytes: Number(row.size_bytes || 0),
    active: Boolean(row.is_active),
    sortOrder: Number(row.sort_order || 0),
    createdAt: row.created_at || null,
  };
}

async function publicStickers(env) {
  try {
    const rows = await env.DB.prepare(`SELECT id,code,name,category,public_url,mime_type,size_bytes,is_active,sort_order,created_at
      FROM sticker_library WHERE is_active=1 ORDER BY sort_order ASC, id DESC LIMIT 300`).all();
    return json({ ok: true, stickers: (rows.results || []).map(stickerOut) }, 200, { 'cache-control': 'public, max-age=60, s-maxage=120' });
  } catch (error) {
    console.error('AINFO sticker public list failed', error);
    return json({ ok: true, stickers: [] });
  }
}

async function adminStickers(req, env, ctx) {
  if (!(await adminAllowed(req, env, ctx))) return json({ error: 'forbidden' }, 403);
  try {
    const rows = await env.DB.prepare(`SELECT id,code,name,category,public_url,mime_type,size_bytes,is_active,sort_order,created_at
      FROM sticker_library ORDER BY sort_order ASC, id DESC LIMIT 500`).all();
    return json({ ok: true, stickers: (rows.results || []).map(stickerOut) });
  } catch (error) {
    console.error('AINFO sticker admin list failed', error);
    return json({ error: 'sticker_list_failed' }, 500);
  }
}

async function uploadSticker(req, env, ctx) {
  if (!(await adminAllowed(req, env, ctx))) return json({ error: 'forbidden' }, 403);
  if (!csrfOk(req)) return json({ error: 'csrf_failed' }, 403);

  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > 6 * 1024 * 1024) return json({ error: 'file_too_large', message: 'Maksimal 5 MB per stiker.' }, 413);

  const fd = await req.formData().catch(() => null);
  if (!fd) return json({ error: 'invalid_form' }, 400);
  const file = fd.get('file');
  if (!(file instanceof File)) return json({ error: 'missing_file' }, 400);
  if (file.size > 5 * 1024 * 1024) return json({ error: 'file_too_large', message: 'Maksimal 5 MB per stiker.' }, 413);

  const allowed = new Map([
    ['image/gif', 'gif'],
    ['image/png', 'png'],
    ['image/webp', 'webp'],
    ['image/jpeg', 'jpg'],
    ['image/avif', 'avif'],
  ]);
  const ext = allowed.get(String(file.type || '').toLowerCase());
  if (!ext) return json({ error: 'invalid_media_type', message: 'Gunakan GIF, PNG, WebP, JPG, atau AVIF.' }, 415);

  const rawName = String(fd.get('name') || file.name || 'Stiker').trim();
  const name = (rawName.replace(/\.[^.]+$/, '') || 'Stiker').slice(0, 80);
  const category = (String(fd.get('category') || 'Karakter').trim() || 'Karakter').slice(0, 60);
  const uuid = crypto.randomUUID();
  const code = `${slugify(name).slice(0, 42)}-${uuid.slice(0, 8)}`;
  const key = `stickers/custom/${new Date().toISOString().slice(0, 7)}/${uuid}.${ext}`;
  const publicUrl = `/media/${key}`;

  try {
    await env.MEDIA.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000, immutable',
      },
      customMetadata: { kind: 'comment-sticker', name, category },
    });

    const run = await env.DB.prepare(`INSERT INTO sticker_library(code,name,category,r2_key,public_url,mime_type,size_bytes,is_active,sort_order)
      VALUES(?,?,?,?,?,?,?,1,0)`).bind(code, name, category, key, publicUrl, file.type, file.size).run();
    const id = Number(run.meta?.last_row_id || run.meta?.lastRowId || 0);
    const row = id ? await env.DB.prepare('SELECT * FROM sticker_library WHERE id=?').bind(id).first() : null;
    return json({ ok: true, sticker: row ? stickerOut(row) : { id, code, name, category, url: publicUrl, mimeType: file.type, sizeBytes: file.size, active: true, sortOrder: 0 } }, 201);
  } catch (error) {
    try { await env.MEDIA.delete(key); } catch {}
    console.error('AINFO sticker upload failed', error);
    return json({ error: 'sticker_upload_failed', message: 'Stiker gagal disimpan.' }, 500);
  }
}

async function updateSticker(req, env, ctx, id) {
  if (!(await adminAllowed(req, env, ctx))) return json({ error: 'forbidden' }, 403);
  if (!csrfOk(req)) return json({ error: 'csrf_failed' }, 403);
  const body = await req.json().catch(() => ({}));
  const active = body.active === false || body.active === 0 ? 0 : 1;
  const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Math.max(-9999, Math.min(9999, Number(body.sortOrder))) : 0;
  const name = String(body.name || '').trim().slice(0, 80);
  const category = String(body.category || '').trim().slice(0, 60);
  const row = await env.DB.prepare('SELECT * FROM sticker_library WHERE id=?').bind(id).first();
  if (!row) return json({ error: 'sticker_not_found' }, 404);
  await env.DB.prepare(`UPDATE sticker_library SET name=?,category=?,is_active=?,sort_order=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .bind(name || row.name, category || row.category, active, sortOrder, id).run();
  const updated = await env.DB.prepare('SELECT * FROM sticker_library WHERE id=?').bind(id).first();
  return json({ ok: true, sticker: stickerOut(updated) });
}

async function deleteSticker(req, env, ctx, id) {
  if (!(await adminAllowed(req, env, ctx))) return json({ error: 'forbidden' }, 403);
  if (!csrfOk(req)) return json({ error: 'csrf_failed' }, 403);
  const row = await env.DB.prepare('SELECT id,r2_key FROM sticker_library WHERE id=?').bind(id).first();
  if (!row) return json({ error: 'sticker_not_found' }, 404);
  try { await env.MEDIA.delete(String(row.r2_key || '')); } catch {}
  await env.DB.prepare('DELETE FROM sticker_library WHERE id=?').bind(id).run();
  return json({ ok: true, id });
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

  if (path === '/api/public/stickers' && req.method === 'GET') return publicStickers(env);
  if (path === '/api/admin/stickers' && req.method === 'GET') return adminStickers(req, env, ctx);
  if (path === '/api/admin/stickers' && req.method === 'POST') return uploadSticker(req, env, ctx);

  const stickerMatch = path.match(/^\/api\/admin\/stickers\/(\d+)$/);
  if (stickerMatch && req.method === 'PATCH') return updateSticker(req, env, ctx, Number(stickerMatch[1]));
  if (stickerMatch && req.method === 'DELETE') return deleteSticker(req, env, ctx, Number(stickerMatch[1]));

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
