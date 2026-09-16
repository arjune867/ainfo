import legacyWorker from './main';

const legacy = legacyWorker;
const VERSION = '14.2.0';

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

function html(body, status = 200, headers = {}) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', ...headers },
  });
}

function xml(body, status = 200) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=60, s-maxage=300' },
  });
}

function site(env) {
  return String(env.DOMAIN || 'https://www.ainfo.web.id').replace(/\/$/, '');
}

function h(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function stripTags(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
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

function cookies(req) {
  const out = {};
  for (const part of (req.headers.get('cookie') || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function timingSafe(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function csrfOk(req) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;
  return timingSafe(cookies(req).ainfo_csrf || '', req.headers.get('x-csrf-token') || '');
}

function sanitizeRichHtml(input) {
  let value = String(input || '');
  value = value.replace(/<(script|style|iframe|object|embed|form|input|button|textarea|select)[^>]*>[\s\S]*?<\/\1>/gi, '');
  value = value.replace(/<(script|style|iframe|object|embed|form|input|button|textarea|select)\b[^>]*\/?\s*>/gi, '');
  const allowed = new Set(['p', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'u', 'mark', 'ul', 'ol', 'li', 'blockquote', 'a', 'br']);
  value = value.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (full, rawTag, attrs) => {
    const tag = String(rawTag).toLowerCase();
    if (!allowed.has(tag)) return '';
    const closing = /^<\//.test(full);
    if (closing) return `</${tag}>`;
    if (tag === 'br') return '<br>';
    if (tag === 'a') {
      const m = String(attrs || '').match(/\bhref\s*=\s*(["'])(.*?)\1/i);
      const href = m ? m[2].trim() : '';
      const safe = /^(https?:\/\/|\/|#)/i.test(href) ? href : '#';
      return `<a href="${h(safe)}" rel="nofollow noopener">`;
    }
    return `<${tag}>`;
  });
  return value;
}

function parseJson(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function parseTags(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  const parsed = parseJson(String(value || ''), null);
  if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean);
  return String(value || '').split(',').map((v) => v.trim()).filter(Boolean);
}

function articleOut(row) {
  const content = parseJson(row.content_json || '[]', []);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title || '',
    category: row.category || 'Berita',
    cat: row.category || 'Berita',
    author: row.author_name || 'Tim AINFO',
    author_slug: row.author_slug || slugify(row.author_name || 'Tim AINFO'),
    excerpt: row.excerpt || '',
    content: Array.isArray(content) ? content : [],
    content_html: row.content_html || '',
    contentHtml: row.content_html || '',
    status: row.status || 'draft',
    read_time: `${Number(row.read_minutes || 5)} menit baca`,
    read: `${Number(row.read_minutes || 5)} menit baca`,
    views: Number(row.views || 0),
    image_url: row.image_url || '',
    image: row.image_url || '',
    image_caption: row.image_caption || '',
    audio_url: row.audio_url || '',
    audioUrl: row.audio_url || '',
    headline: Boolean(row.headline),
    breaking: Boolean(row.breaking),
    editor_pick: Boolean(row.editor_pick),
    tags: parseTags(row.tags_json || '[]'),
    keywords: row.keywords || '',
    seo_title: row.seo_title || '',
    seoTitle: row.seo_title || '',
    seo_description: row.seo_description || '',
    seoDescription: row.seo_description || '',
    canonical_url: row.canonical_url || '',
    scheduled_at: row.scheduled_at || null,
    published_at: row.published_at || null,
    publishedISO: row.published_at || '',
    modified_at: row.modified_at || row.updated_at || null,
    modifiedISO: row.modified_at || row.updated_at || '',
    updated_at: row.updated_at || null,
    rating: Number(row.rating || 0),
    rating_count: Number(row.rating_count || 0),
  };
}

async function adminAllowed(req, env, ctx) {
  try {
    const u = new URL(req.url);
    u.pathname = '/api/admin/metrics';
    u.search = '';
    const probe = new Request(u.toString(), { method: 'GET', headers: req.headers });
    const res = await legacy.fetch(probe, env, ctx);
    return res.status === 200;
  } catch {
    return false;
  }
}

async function listArticles(env, all = false) {
  try {
    const where = all ? '' : "WHERE status='published'";
    const rows = await env.DB.prepare(`SELECT * FROM articles ${where} ORDER BY COALESCE(published_at, updated_at) DESC LIMIT 500`).all();
    return json({ ok: true, version: VERSION, articles: (rows.results || []).map(articleOut) });
  } catch (error) {
    console.error('V14.2 listArticles', error);
    return json({ ok: false, error: 'articles_unavailable', articles: [] }, 500);
  }
}

async function syncRichArticles(env, list) {
  if (!Array.isArray(list) || !env.DB) return;
  for (const a of list.slice(0, 5000)) {
    const id = Number(a.id);
    if (!Number.isFinite(id) || !id) continue;
    const title = String(a.title || 'Untitled');
    const slug = String(a.slug || slugify(title));
    const contentHtml = sanitizeRichHtml(a.contentHtml || a.content_html || '');
    const tags = JSON.stringify(parseTags(a.tags || []));
    const readMinutes = Math.max(1, parseInt(String(a.read || a.read_time || '5'), 10) || 5);
    const canonical = String(a.canonicalUrl || a.canonical_url || `${site(env)}/read/${slug}/`);
    const modified = String(a.modifiedISO || a.modified_at || new Date().toISOString());
    try {
      await env.DB.prepare(`UPDATE articles SET
        content_html=?, audio_url=?, tags_json=?, keywords=?, seo_title=?, seo_description=?, canonical_url=?,
        image_caption=?, editor_pick=?, read_minutes=?, modified_at=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=?`).bind(
        contentHtml,
        String(a.audioUrl || a.audio_url || ''),
        tags,
        String(a.keywords || ''),
        String(a.seoTitle || a.seo_title || ''),
        String(a.seoDescription || a.seo_description || ''),
        canonical,
        String(a.imageCaption || a.image_caption || ''),
        a.editorPick || a.editor_pick ? 1 : 0,
        readMinutes,
        modified,
        id,
      ).run();
    } catch (error) {
      console.warn('V14.2 rich article sync skipped; run migration 0007', error);
      return;
    }
  }
}

async function upsertArticle(req, env) {
  const a = await req.json().catch(() => ({}));
  const id = Number(a.id) || Date.now();
  const title = String(a.title || '').trim();
  if (!title) return json({ error: 'invalid_title' }, 400);
  const slug = String(a.slug || slugify(title));
  const plain = Array.isArray(a.content) ? a.content.map((v) => String(v)) : [];
  const contentHtml = sanitizeRichHtml(a.contentHtml || a.content_html || '');
  const tags = JSON.stringify(parseTags(a.tags || []));
  const readMinutes = Math.max(1, parseInt(String(a.read || a.read_time || '5'), 10) || 5);
  const views = Math.max(0, parseInt(String(a.views || '0').replace(/[^0-9]/g, ''), 10) || 0);
  const status = ['draft', 'review', 'scheduled', 'published', 'archived'].includes(String(a.status)) ? String(a.status) : 'draft';
  const published = a.publishedISO || a.published_at || (status === 'published' ? new Date().toISOString() : null);
  const modified = a.modifiedISO || a.modified_at || new Date().toISOString();
  const canonical = a.canonicalUrl || a.canonical_url || `${site(env)}/read/${slug}/`;
  await env.DB.prepare(`INSERT INTO articles(
    id,slug,title,excerpt,content_json,content_html,category,author_name,author_slug,image_url,image_caption,status,
    headline,breaking,editor_pick,views,read_minutes,seo_title,seo_description,canonical_url,published_at,updated_at,
    audio_url,tags_json,keywords,modified_at
  ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,?,?,?,?)
  ON CONFLICT(id) DO UPDATE SET
    slug=excluded.slug,title=excluded.title,excerpt=excluded.excerpt,content_json=excluded.content_json,content_html=excluded.content_html,
    category=excluded.category,author_name=excluded.author_name,author_slug=excluded.author_slug,image_url=excluded.image_url,
    image_caption=excluded.image_caption,status=excluded.status,headline=excluded.headline,breaking=excluded.breaking,
    editor_pick=excluded.editor_pick,views=excluded.views,read_minutes=excluded.read_minutes,seo_title=excluded.seo_title,
    seo_description=excluded.seo_description,canonical_url=excluded.canonical_url,published_at=COALESCE(excluded.published_at,articles.published_at),
    audio_url=excluded.audio_url,tags_json=excluded.tags_json,keywords=excluded.keywords,modified_at=excluded.modified_at,updated_at=CURRENT_TIMESTAMP`).bind(
    id, slug, title, String(a.excerpt || ''), JSON.stringify(plain), contentHtml,
    String(a.category || a.cat || 'Berita'), String(a.author || 'Tim AINFO'), slugify(String(a.author || 'Tim AINFO')),
    String(a.image || a.image_url || ''), String(a.imageCaption || a.image_caption || ''), status,
    a.headline ? 1 : 0, a.breaking ? 1 : 0, a.editorPick || a.editor_pick ? 1 : 0, views, readMinutes,
    String(a.seoTitle || a.seo_title || ''), String(a.seoDescription || a.seo_description || ''), String(canonical), published,
    String(a.audioUrl || a.audio_url || ''), tags, String(a.keywords || ''), String(modified),
  ).run();
  const row = await env.DB.prepare('SELECT * FROM articles WHERE id=?').bind(id).first();
  return json({ ok: true, article: articleOut(row) });
}

async function deleteArticle(id, env) {
  await env.DB.prepare('DELETE FROM articles WHERE id=?').bind(Number(id)).run();
  return json({ ok: true });
}

async function submitIndexNow(req, env) {
  if (!env.INDEXNOW_KEY) return json({ error: 'indexnow_not_configured', message: 'Set INDEXNOW_KEY sebagai Cloudflare Secret.' }, 503);
  const data = await req.json().catch(() => ({}));
  let slug = String(data.slug || '');
  if (!slug && data.article_id) {
    try {
      const row = await env.DB.prepare('SELECT slug FROM articles WHERE id=?').bind(Number(data.article_id)).first();
      slug = String(row?.slug || '');
    } catch {}
  }
  if (!slug) slug = slugify(data.title || 'artikel');
  const base = site(env);
  const targetUrl = `${base}/read/${slug}/`;
  const payload = {
    host: new URL(base).host,
    key: env.INDEXNOW_KEY,
    keyLocation: `${base}/${env.INDEXNOW_KEY}.txt`,
    urlList: [targetUrl],
  };
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  });
  return json({ ok: res.ok, status: res.status, url: targetUrl }, res.ok ? 200 : 502);
}

function enrichHeadings(contentHtml) {
  const toc = [];
  const used = new Map();
  const out = String(contentHtml || '').replace(/<h([23])>([\s\S]*?)<\/h\1>/gi, (full, level, inside) => {
    const label = stripTags(inside);
    let id = slugify(label || `bagian-${toc.length + 1}`);
    const n = used.get(id) || 0;
    used.set(id, n + 1);
    if (n) id = `${id}-${n + 1}`;
    toc.push({ level: Number(level), id, label });
    return `<h${level} id="${h(id)}">${inside}</h${level}>`;
  });
  return { html: out, toc };
}

async function articleSsr(req, env) {
  const url = new URL(req.url);
  const slug = decodeURIComponent(url.pathname.replace(/^\/read\//, '').replace(/\/$/, ''));
  if (!slug) return legacy.fetch(req, env);
  let a;
  try {
    a = await env.DB.prepare("SELECT * FROM articles WHERE slug=? AND status='published' LIMIT 1").bind(slug).first();
  } catch {
    return legacy.fetch(req, env);
  }
  if (!a) return legacy.fetch(req, env);

  const base = site(env);
  const canonical = a.canonical_url || `${base}/read/${a.slug}/`;
  const title = a.seo_title || `${a.title} - AINFO`;
  const desc = a.seo_description || a.excerpt || a.title;
  const image = a.image_url || `${base}/AINFO.png`;
  const author = a.author_name || 'Tim AINFO';
  const published = a.published_at || a.modified_at || a.updated_at || new Date().toISOString();
  const modified = a.modified_at || a.updated_at || published;
  const tags = parseTags(a.tags_json || '[]');
  const keywordText = [String(a.keywords || ''), ...tags].filter(Boolean).join(', ');
  const paragraphs = parseJson(a.content_json || '[]', []);
  const rawContent = a.content_html || (Array.isArray(paragraphs) ? paragraphs.map((p) => `<p>${h(p)}</p>`).join('') : '');
  const structured = enrichHeadings(sanitizeRichHtml(rawContent));
  const toc = structured.toc.length ? `<nav class="toc" aria-label="Daftar Isi"><strong>Daftar Isi</strong><ol>${structured.toc.map((x) => `<li class="lv${x.level}"><a href="#${h(x.id)}">${h(x.label)}</a></li>`).join('')}</ol></nav>` : '';
  const tagsHtml = tags.length ? `<div class="tags">${tags.map((t) => `<span>#${h(t)}</span>`).join('')}</div>` : '';

  const newsLd = {
    '@context': 'https://schema.org', '@type': 'NewsArticle', headline: a.title, description: desc, image: [image],
    datePublished: published, dateModified: modified, articleSection: a.category || 'Berita', keywords: keywordText,
    author: [{ '@type': 'Person', name: author, url: `${base}/author/${a.author_slug || slugify(author)}/` }],
    publisher: { '@type': 'NewsMediaOrganization', name: 'AINFO', url: base, logo: { '@type': 'ImageObject', url: `${base}/AINFO.png` } },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical }, inLanguage: 'id-ID', isAccessibleForFree: true,
  };
  const breadcrumbLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'AINFO', item: `${base}/` },
      { '@type': 'ListItem', position: 2, name: a.category || 'Berita', item: `${base}/#/${slugify(a.category || 'berita')}` },
      { '@type': 'ListItem', position: 3, name: a.title, item: canonical },
    ],
  };

  const page = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0b5ed7"><title>${h(title)}</title><meta name="description" content="${h(desc)}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"><meta name="googlebot" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">${keywordText ? `<meta name="keywords" content="${h(keywordText)}">` : ''}<link rel="canonical" href="${h(canonical)}"><link rel="alternate" type="application/rss+xml" href="${base}/rss.xml"><meta property="og:locale" content="id_ID"><meta property="og:site_name" content="AINFO"><meta property="og:type" content="article"><meta property="og:title" content="${h(title)}"><meta property="og:description" content="${h(desc)}"><meta property="og:url" content="${h(canonical)}"><meta property="og:image" content="${h(image)}"><meta property="article:published_time" content="${h(published)}"><meta property="article:modified_time" content="${h(modified)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${h(title)}"><meta name="twitter:description" content="${h(desc)}"><meta name="twitter:image" content="${h(image)}"><script type="application/ld+json">${JSON.stringify(newsLd).replace(/</g, '\u003c')}</script><script type="application/ld+json">${JSON.stringify(breadcrumbLd).replace(/</g, '\u003c')}</script><style>body{margin:0;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;color:#172033;background:#fff}a{color:#0b5ed7;text-decoration:none}.top{border-bottom:1px solid #e7ebf0}.wrap{width:min(850px,calc(100% - 28px));margin:auto}.top .wrap{display:flex;align-items:center;justify-content:space-between;padding:12px 0}.logo{width:72px;height:48px;object-fit:contain}.crumb,.meta{color:#6b778c;font-size:13px}.article{padding:28px 0 60px}.article h1{font-size:clamp(32px,6vw,54px);line-height:1.08;letter-spacing:-1px;margin:10px 0 14px}.lead{font-size:19px;line-height:1.6;color:#46556d}.hero{width:100%;max-height:520px;object-fit:cover;border-radius:18px;margin:22px 0 8px}.caption{font-size:12px;color:#7b8797}.toc{border:1px solid #dce8f8;background:#f7fbff;border-radius:16px;padding:16px 18px;margin:24px 0}.toc ol{margin:10px 0 0;padding-left:20px}.toc li{margin:7px 0}.toc .lv3{margin-left:18px}.content{font-size:19px;line-height:1.78}.content h2{font-size:30px;line-height:1.25;margin:34px 0 12px}.content h3{font-size:23px;line-height:1.3;margin:28px 0 10px}.content blockquote{border-left:4px solid #0b5ed7;margin:22px 0;padding:10px 18px;background:#f7f9fc}.content a{text-decoration:underline}.tags{display:flex;flex-wrap:wrap;gap:8px;margin:30px 0}.tags span{background:#edf5ff;color:#0b5ed7;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:800}.open{display:inline-flex;padding:11px 16px;border-radius:10px;background:#0b5ed7;color:#fff;font-weight:800}.foot{border-top:1px solid #e7ebf0;padding:20px 0;color:#7b8797;font-size:13px}@media(max-width:600px){.article{padding-top:20px}.content{font-size:17px}.lead{font-size:17px}.content h2{font-size:25px}.content h3{font-size:21px}}</style></head><body><header class="top"><div class="wrap"><a href="/"><img class="logo" src="/AINFO.png" alt="AINFO"></a><a href="/#/home">Beranda</a></div></header><main class="wrap article"><div class="crumb">Beranda › ${h(a.category || 'Berita')}</div><h1>${h(a.title)}</h1><p class="lead">${h(a.excerpt || '')}</p><div class="meta">${h(author)} · ${h(published)} · ${Number(a.read_minutes || 5)} menit baca</div>${image ? `<img class="hero" src="${h(image)}" alt="${h(a.title)}" fetchpriority="high">` : ''}${a.image_caption ? `<div class="caption">${h(a.image_caption)}</div>` : ''}${toc}<article class="content">${structured.html}</article>${tagsHtml}<a class="open" href="/#/article/${encodeURIComponent(a.id)}">Buka versi interaktif AINFO →</a></main><footer class="foot"><div class="wrap">© AINFO · Berita yang Lebih Bermakna</div></footer></body></html>`;
  return html(page, 200, { 'cache-control': 'public, max-age=60, s-maxage=300', 'x-ainfo-version': VERSION });
}

async function dynamicSitemap(env, news = false) {
  const base = site(env);
  const rows = await env.DB.prepare("SELECT slug,title,published_at,COALESCE(modified_at,updated_at) modified_at FROM articles WHERE status='published' AND published_at IS NOT NULL ORDER BY published_at DESC LIMIT 5000").all();
  const items = rows.results || [];
  if (news) {
    const now = Date.now();
    const recent = items.filter((a) => {
      const t = Date.parse(a.published_at || a.modified_at || '');
      return t && now - t <= 2 * 86400000;
    }).slice(0, 1000);
    return xml(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${recent.map((a) => `<url><loc>${h(`${base}/read/${a.slug}/`)}</loc><news:news><news:publication><news:name>AINFO</news:name><news:language>id</news:language></news:publication><news:publication_date>${h(a.published_at)}</news:publication_date><news:title>${h(a.title)}</news:title></news:news></url>`).join('')}</urlset>`);
  }
  return xml(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${base}/</loc><changefreq>hourly</changefreq><priority>1.0</priority></url>${items.map((a) => `<url><loc>${h(`${base}/read/${a.slug}/`)}</loc><lastmod>${h(a.modified_at || a.published_at)}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`).join('')}</urlset>`);
}

async function route(req, env, ctx) {
  const url = new URL(req.url);
  const path = url.pathname;

  if (env.INDEXNOW_KEY && path === `/${env.INDEXNOW_KEY}.txt`) {
    return new Response(env.INDEXNOW_KEY, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
  }

  if (path === '/api/articles' && req.method === 'GET') return listArticles(env, false);

  if (path === '/api/admin/articles' && req.method === 'GET') {
    if (!(await adminAllowed(req, env, ctx))) return json({ error: 'forbidden' }, 403);
    return listArticles(env, true);
  }

  if (path === '/api/admin/articles' && req.method === 'POST') {
    if (!csrfOk(req)) return json({ error: 'csrf_failed' }, 403);
    if (!(await adminAllowed(req, env, ctx))) return json({ error: 'forbidden' }, 403);
    try { return await upsertArticle(req, env); }
    catch (error) { console.error('V14.2 article save', error); return json({ error: 'article_save_failed', message: String(error?.message || error) }, 500); }
  }

  const deleteMatch = path.match(/^\/api\/admin\/articles\/(\d+)$/);
  if (deleteMatch && req.method === 'DELETE') {
    if (!csrfOk(req)) return json({ error: 'csrf_failed' }, 403);
    if (!(await adminAllowed(req, env, ctx))) return json({ error: 'forbidden' }, 403);
    return deleteArticle(deleteMatch[1], env);
  }

  if (path === '/api/admin/indexnow/submit' && req.method === 'POST') {
    if (!csrfOk(req)) return json({ error: 'csrf_failed' }, 403);
    if (!(await adminAllowed(req, env, ctx))) return json({ error: 'forbidden' }, 403);
    return submitIndexNow(req, env);
  }

  if (path === '/api/admin/state' && req.method === 'POST') {
    const copy = req.clone();
    let statePayload = null;
    try { statePayload = await copy.json(); } catch {}
    const response = await legacy.fetch(req, env, ctx);
    if (response.ok && statePayload?.key === 'ainfo-admin-articles' && Array.isArray(statePayload.value)) {
      ctx?.waitUntil?.(syncRichArticles(env, statePayload.value));
      if (!ctx?.waitUntil) await syncRichArticles(env, statePayload.value);
    }
    return response;
  }

  if (/^\/read\/[^/]+\/?$/.test(path) && req.method === 'GET') return articleSsr(req, env);
  if (path === '/sitemap.xml' && req.method === 'GET') {
    try { return await dynamicSitemap(env, false); } catch { return legacy.fetch(req, env, ctx); }
  }
  if (path === '/news-sitemap.xml' && req.method === 'GET') {
    try { return await dynamicSitemap(env, true); } catch { return legacy.fetch(req, env, ctx); }
  }

  return legacy.fetch(req, env, ctx);
}

export default {
  async fetch(req, env, ctx) {
    try { return await route(req, env, ctx); }
    catch (error) {
      console.error('AINFO V14.2 wrapper error', error);
      return legacy.fetch(req, env, ctx);
    }
  },
  async scheduled(event, env, ctx) {
    if (typeof legacy.scheduled === 'function') return legacy.scheduled(event, env, ctx);
  },
};
