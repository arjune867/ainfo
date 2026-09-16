import previousWorker from './v14_5.js';

const VERSION = '14.6.0';
const INJECT = '<script src="/engagement-persistence.js?v=20260917a"></script>';

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

function cookies(req) {
  const out = {};
  for (const part of String(req.headers.get('cookie') || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function timingSafe(a, b) {
  const x = String(a || ''), y = String(b || '');
  if (!x || !y || x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

function csrfOk(req) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;
  return timingSafe(cookies(req).ainfo_csrf || '', req.headers.get('x-csrf-token') || '');
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value || ''));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function initials(name) {
  return String(name || 'Pengguna').trim().split(/\s+/).slice(0, 2).map((x) => x[0] || '').join('').toUpperCase() || 'AN';
}

async function currentUser(req, env, ctx) {
  try {
    const u = new URL(req.url);
    u.pathname = '/api/auth/me';
    u.search = '';
    const probe = new Request(u.toString(), { method: 'GET', headers: req.headers });
    const res = await previousWorker.fetch(probe, env, ctx);
    const data = await res.json().catch(() => ({}));
    return data?.user || null;
  } catch {
    return null;
  }
}

async function engagementGet(req, env, ctx) {
  const u = new URL(req.url);
  const articleId = Number(u.searchParams.get('article_id') || 0);
  if (!articleId) return json({ error: 'invalid_article' }, 400);

  const article = await env.DB.prepare(`SELECT id,slug,title,views,rating,rating_count FROM articles WHERE id=? AND status='published' LIMIT 1`).bind(articleId).first();
  if (!article) return json({ error: 'article_not_found' }, 404);

  const user = await currentUser(req, env, ctx);
  const rows = await env.DB.prepare(`SELECT c.id,c.article_id,c.user_id,c.parent_id,c.body,c.sticker_token,c.is_pinned,c.created_at,
      u.username,u.full_name,u.avatar_url
    FROM comments c JOIN users u ON u.id=c.user_id
    WHERE c.article_id=? AND c.status='published'
    ORDER BY c.is_pinned DESC,c.created_at ASC LIMIT 500`).bind(articleId).all();

  const commentRows = rows.results || [];
  const ids = commentRows.map((x) => String(x.id));
  const reactionMap = new Map();
  const myReactionMap = new Map();
  if (ids.length) {
    const placeholders = ids.map(() => '?').join(',');
    const counts = await env.DB.prepare(`SELECT target_id,reaction,COUNT(*) count FROM reactions WHERE target_type='comment' AND target_id IN (${placeholders}) GROUP BY target_id,reaction`).bind(...ids).all();
    for (const r of counts.results || []) {
      const key = String(r.target_id);
      if (!reactionMap.has(key)) reactionMap.set(key, {});
      reactionMap.get(key)[String(r.reaction)] = Number(r.count || 0);
    }
    if (user?.id) {
      const mine = await env.DB.prepare(`SELECT target_id,reaction FROM reactions WHERE user_id=? AND target_type='comment' AND target_id IN (${placeholders})`).bind(user.id, ...ids).all();
      for (const r of mine.results || []) myReactionMap.set(String(r.target_id), String(r.reaction || ''));
    }
  }

  const byId = new Map();
  const roots = [];
  for (const row of commentRows) {
    const display = String(row.full_name || row.username || 'Pengguna');
    const item = {
      id: Number(row.id),
      user: display,
      avatar: row.avatar_url || initials(display),
      text: String(row.body || ''),
      sticker: String(row.sticker_token || ''),
      reactions: reactionMap.get(String(row.id)) || {},
      myReaction: myReactionMap.get(String(row.id)) || null,
      likes: 0,
      replies: [],
      created_at: row.created_at || null,
    };
    byId.set(Number(row.id), item);
  }
  for (const row of commentRows) {
    const item = byId.get(Number(row.id));
    if (row.parent_id && byId.has(Number(row.parent_id))) byId.get(Number(row.parent_id)).replies.push(item);
    else roots.push(item);
  }

  let myRating = 0;
  if (user?.id) {
    const mine = await env.DB.prepare('SELECT rating FROM ratings WHERE user_id=? AND article_id=? LIMIT 1').bind(user.id, articleId).first();
    myRating = Number(mine?.rating || 0);
  }

  return json({
    ok: true,
    version: VERSION,
    article: {
      id: Number(article.id),
      slug: article.slug,
      views: Number(article.views || 0),
      rating: Number(article.rating || 0),
      ratingCount: Number(article.rating_count || 0),
      commentCount: commentRows.length,
      myRating,
    },
    comments: roots,
  });
}

async function commentPost(req, env, ctx) {
  if (!csrfOk(req)) return json({ error: 'csrf_failed', message: 'Token keamanan tidak valid. Muat ulang halaman.' }, 403);
  const user = await currentUser(req, env, ctx);
  if (!user?.id) return json({ error: 'unauthorized', message: 'Silakan login terlebih dahulu.' }, 401);
  const data = await req.json().catch(() => ({}));
  const articleId = Number(data.article_id || 0);
  const parentId = data.parent_id ? Number(data.parent_id) : null;
  const body = String(data.body || '').trim().slice(0, 3000);
  const sticker = String(data.sticker || '').trim().slice(0, 1800);
  if (!articleId || (!body && !sticker)) return json({ error: 'invalid_comment' }, 400);
  if (sticker && !/^(sticker:(like|love|haha|wow|sad|angry)|custom:[a-z0-9-]+|gif:https?%3A%2F%2F.+|gif:https?:\/\/.+|[\p{Extended_Pictographic}\p{Emoji_Presentation}\u200d\ufe0f\s]+)$/iu.test(sticker)) {
    return json({ error: 'invalid_sticker' }, 400);
  }
  const article = await env.DB.prepare("SELECT id FROM articles WHERE id=? AND status='published' LIMIT 1").bind(articleId).first();
  if (!article) return json({ error: 'article_not_found' }, 404);
  if (parentId) {
    const parent = await env.DB.prepare('SELECT id FROM comments WHERE id=? AND article_id=? LIMIT 1').bind(parentId, articleId).first();
    if (!parent) return json({ error: 'parent_not_found' }, 404);
  }
  const run = await env.DB.prepare('INSERT INTO comments(article_id,user_id,parent_id,body,sticker_token,status) VALUES(?,?,?,?,?,?)')
    .bind(articleId, Number(user.id), parentId, body, sticker, 'published').run();
  return json({ ok: true, id: Number(run.meta?.last_row_id || run.meta?.lastRowId || 0) }, 201);
}

async function trackView(req, env, articleId, explicit = true) {
  if (!articleId) return json({ error: 'invalid_article' }, 400);
  const article = await env.DB.prepare("SELECT id,views FROM articles WHERE id=? AND status='published' LIMIT 1").bind(articleId).first();
  if (!article) return json({ error: 'article_not_found' }, 404);
  const ua = String(req.headers.get('user-agent') || '');
  const isBot = /bot|crawler|spider|slurp|facebookexternalhit|whatsapp|telegram/i.test(ua);
  if (isBot) return json({ ok: true, counted: false, views: Number(article.views || 0) });
  const ip = String(req.headers.get('cf-connecting-ip') || 'local');
  const date = new Date().toISOString().slice(0, 10);
  const visitorHash = await sha256(`${ip}|${ua}|${date}`);
  const run = await env.DB.prepare('INSERT OR IGNORE INTO article_view_events(article_id,visitor_hash,viewed_on) VALUES(?,?,?)').bind(articleId, visitorHash, date).run();
  const counted = Number(run.meta?.changes || 0) > 0;
  if (counted) await env.DB.prepare('UPDATE articles SET views=views+1,updated_at=updated_at WHERE id=?').bind(articleId).run();
  const fresh = await env.DB.prepare('SELECT views FROM articles WHERE id=?').bind(articleId).first();
  return json({ ok: true, counted, explicit, views: Number(fresh?.views || 0) });
}

async function viewPost(req, env) {
  if (!csrfOk(req)) return json({ error: 'csrf_failed' }, 403);
  const data = await req.json().catch(() => ({}));
  return trackView(req, env, Number(data.article_id || 0), true);
}

async function maybeTrackSsr(req, env) {
  const u = new URL(req.url);
  const m = u.pathname.match(/^\/read\/([^/]+)\/?$/);
  if (!m || req.method !== 'GET') return null;
  const slug = decodeURIComponent(m[1]);
  const row = await env.DB.prepare("SELECT id FROM articles WHERE slug=? AND status='published' LIMIT 1").bind(slug).first();
  if (!row) return null;
  try { await trackView(req, env, Number(row.id), false); } catch {}
  return null;
}

function shouldInject(req, res) {
  return req.method === 'GET' && String(res.headers.get('content-type') || '').toLowerCase().includes('text/html');
}

async function injectClient(req, res) {
  if (!shouldInject(req, res)) return res;
  const body = await res.text();
  if (body.includes('/engagement-persistence.js')) return new Response(body, res);
  const next = /<\/body>/i.test(body) ? body.replace(/<\/body>/i, `${INJECT}</body>`) : `${body}${INJECT}`;
  const headers = new Headers(res.headers);
  headers.delete('content-length');
  headers.set('x-ainfo-version', VERSION);
  return new Response(next, { status: res.status, statusText: res.statusText, headers });
}

async function route(req, env, ctx) {
  const u = new URL(req.url);
  if (u.pathname === '/api/engagement/article' && req.method === 'GET') return engagementGet(req, env, ctx);
  if (u.pathname === '/api/engagement/comment' && req.method === 'POST') return commentPost(req, env, ctx);
  if (u.pathname === '/api/engagement/view' && req.method === 'POST') return viewPost(req, env);
  await maybeTrackSsr(req, env);
  return previousWorker.fetch(req, env, ctx);
}

export default {
  async fetch(req, env, ctx) {
    try {
      const res = await route(req, env, ctx);
      return await injectClient(req, res);
    } catch (error) {
      console.error('AINFO V14.6 engagement wrapper error', error);
      return previousWorker.fetch(req, env, ctx);
    }
  },
  async scheduled(event, env, ctx) {
    if (typeof previousWorker.scheduled === 'function') return previousWorker.scheduled(event, env, ctx);
  },
};
