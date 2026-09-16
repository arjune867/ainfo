/// <reference types='@cloudflare/workers-types' />

type Env = {
  DB: D1Database;
  MEDIA: R2Bucket;
  ASSETS: Fetcher;
  APP_NAME: string;
  SITE_URL: string;
  AINFO_SITE_URL: string;
  DEFAULT_ARTICLE_LENGTH: string;
  DEFAULT_STYLE: string;
  DEV_AUTH_EMAIL?: string;
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  GROQ_API_KEY?: string;
  MISTRAL_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  OPENAI_MODEL?: string;
  GEMINI_MODEL?: string;
  ANTHROPIC_MODEL?: string;
  GROQ_MODEL?: string;
  MISTRAL_MODEL?: string;
  DEEPSEEK_MODEL?: string;
  OPENROUTER_MODEL?: string;
  AINFO_PUBLISH_URL?: string;
  AINFO_PUBLISH_TOKEN?: string;
  WORDPRESS_PUBLISH_URL?: string;
  WORDPRESS_AUTH_HEADER?: string;
  BLOGGER_PUBLISH_URL?: string;
  BLOGGER_AUTH_HEADER?: string;
  GENERIC_PUBLISH_URL?: string;
  GENERIC_AUTH_HEADER?: string;
};

type Member = {
  id?: number;
  user_id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'EDITOR';
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  created_at?: string;
  updated_at?: string;
};

type ArticleRow = Record<string, unknown> & {
  id: number;
  owner_user_id: string;
  title: string;
  meta_title: string;
  meta_description: string;
  slug: string;
  primary_keyword: string;
  secondary_keywords: string;
  article_markdown: string;
  seo_checklist: string;
  word_count: number;
  status: string;
  generation_mode: string;
  source_urls: string;
  source_text: string;
  facts: string;
  conflicts: string;
  author_id: string;
  author_name: string;
  category: string;
  thumbnail_key: string;
  fact_report: string;
  scheduled_at: string;
  publish_destination: string;
  published_url: string;
  created_at: string;
  updated_at: string;
};

type GeneratedArticle = {
  title: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  articleMarkdown: string;
  seoChecklist: string[];
  wordCount: number;
};

const json = (data: unknown, status = 200, extraHeaders: HeadersInit = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extraHeaders },
});

const fail = (message: string, status = 400) => json({ error: message }, status);
const now = () => new Date().toISOString();
const parseBody = async <T>(request: Request): Promise<T> => request.json() as Promise<T>;
const parseArray = <T>(value: unknown, fallback: T[] = []): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== 'string' || !value) return fallback;
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed as T[] : fallback; } catch { return fallback; }
};
const parseObject = <T>(value: unknown, fallback: T): T => {
  if (value && typeof value === 'object') return value as T;
  if (typeof value !== 'string' || !value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
};
const wordCount = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;
const slugify = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 90);
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] || ch));
const decodeEntities = (value: string) => value.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

const HIGH_VALUE = [
  'STANDAR HIGH VALUE CONTENT AINFO — WAJIB:',
  '1. Judul spesifik, menjawab kebutuhan pembaca, keyword utama natural. H1 hanya di field title.',
  '2. Intro maksimal 2-3 paragraf pendek dan paragraf pertama langsung menjawab esensi.',
  '3. Gunakan Markdown semantik: ## untuk H2, ### untuk H3, **teks** untuk bold, *teks* untuk italic, daftar dan blockquote sesuai kebutuhan. Heading wajib di baris tersendiri.',
  '4. Isi substantif: data, konteks, solusi, contoh, langkah konkret atau analisis. Hindari filler, repetisi dan paraphrase dangkal.',
  '5. Target 1.000-1.500 kata bila bahan cukup. Jangan mengarang fakta, angka, kutipan atau pengalaman hanya untuk mengejar panjang.',
  '6. E-E-A-T dibangun lewat sumber, atribusi, keahlian yang benar-benar tersedia dan sintesis editorial. Jangan mengarang otoritas penulis.',
  '7. Bahasa natural, mudah dipindai, kalimat ringkas bila tetap alami, gunakan bullet/numbered list untuk daftar.',
  '8. SEO mengikuti search intent tanpa keyword stuffing. Meta title, meta description, slug, H2/H3 dan internal link relevan.',
  '9. Topik YMYL wajib mengutamakan sumber primer/resmi atau ahli yang dapat diatribusikan dan menyebut keterbatasan bukti.',
  '10. Kesimpulan singkat dan CTA natural bila relevan. Struktur dan narasi harus orisinal.',
].join('\n');

const normalizeMarkdown = (value: string) => value
  .replace(/\s+(#{2,3})\s+/g, '\n\n$1 ')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const renderInline = (value: string) => escapeHtml(value)
  .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
  .replace(/`([^`\n]+)`/g, '<code>$1</code>')
  .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
  .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

const markdownToHtml = (markdown: string) => {
  const lines = normalizeMarkdown(markdown).split('\n');
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  const closeList = () => { if (list) out.push(`</${list}>`); list = null; };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { closeList(); continue; }
    if (line.startsWith('### ')) { closeList(); out.push(`<h3>${renderInline(line.slice(4))}</h3>`); continue; }
    if (line.startsWith('## ')) { closeList(); out.push(`<h2>${renderInline(line.slice(3))}</h2>`); continue; }
    if (line.startsWith('# ')) { closeList(); out.push(`<h1>${renderInline(line.slice(2))}</h1>`); continue; }
    if (/^[-*]\s+/.test(line)) { if (list !== 'ul') { closeList(); list = 'ul'; out.push('<ul>'); } out.push(`<li>${renderInline(line.replace(/^[-*]\s+/, ''))}</li>`); continue; }
    if (/^\d+\.\s+/.test(line)) { if (list !== 'ol') { closeList(); list = 'ol'; out.push('<ol>'); } out.push(`<li>${renderInline(line.replace(/^\d+\.\s+/, ''))}</li>`); continue; }
    if (line.startsWith('>')) { closeList(); out.push(`<blockquote>${renderInline(line.replace(/^>\s*/, ''))}</blockquote>`); continue; }
    closeList();
    out.push(`<p>${renderInline(line)}</p>`);
  }
  closeList();
  return out.join('\n');
};

const getIdentity = (request: Request, env: Env) => {
  const email = (request.headers.get('Cf-Access-Authenticated-User-Email') || env.DEV_AUTH_EMAIL || '').trim().toLowerCase();
  if (!email) return null;
  return { userId: email, email, name: email.split('@')[0], scope: 'openid email profile' };
};

const getMember = async (env: Env, userId: string) => env.DB.prepare('SELECT * FROM art_members WHERE user_id = ?').bind(userId).first<Member>();

const ensureSession = async (request: Request, env: Env) => {
  const user = getIdentity(request, env);
  if (!user) return { user: null, member: null };
  let member = await getMember(env, user.userId);
  if (!member) {
    const first = await env.DB.prepare('SELECT COUNT(*) AS count FROM art_members').first<{ count: number }>();
    const isFirst = Number(first?.count || 0) === 0;
    const role = isFirst ? 'ADMIN' : 'EDITOR';
    const status = isFirst ? 'ACTIVE' : 'PENDING';
    await env.DB.prepare('INSERT INTO art_members (user_id,email,name,role,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)')
      .bind(user.userId, user.email, user.name, role, status, now(), now()).run();
    member = await getMember(env, user.userId);
  }
  return { user, member };
};

const requireActive = async (request: Request, env: Env, roles: Array<'ADMIN' | 'EDITOR'> = ['ADMIN','EDITOR']) => {
  const session = await ensureSession(request, env);
  if (!session.user) return { error: fail('Cloudflare Access authentication required', 401) };
  if (!session.member || session.member.status !== 'ACTIVE' || !roles.includes(session.member.role)) return { error: fail('Workspace access denied', 403) };
  return session;
};

const articleFromRow = (row: ArticleRow) => ({
  id: String(row.id),
  title: row.title,
  metaTitle: row.meta_title || '',
  metaDescription: row.meta_description || '',
  slug: row.slug || '',
  primaryKeyword: row.primary_keyword || '',
  secondaryKeywords: parseArray<string>(row.secondary_keywords),
  articleMarkdown: row.article_markdown || '',
  seoChecklist: parseArray<string>(row.seo_checklist),
  wordCount: Number(row.word_count || 0),
  status: row.status || 'DRAFT',
  sourceUrls: parseArray<string>(row.source_urls),
  sourceText: row.source_text || '',
  facts: parseArray<string>(row.facts),
  conflicts: parseArray<string>(row.conflicts),
  generationMode: row.generation_mode || 'SOURCE',
  authorId: row.author_id || '',
  authorName: row.author_name || '',
  category: row.category || '',
  thumbnailPath: row.thumbnail_key || '',
  thumbnailUrl: row.thumbnail_key ? `/media/${encodeURIComponent(row.thumbnail_key)}` : '',
  factReport: parseObject(row.fact_report, undefined as any),
  scheduledAt: row.scheduled_at || '',
  publishDestination: row.publish_destination || '',
  publishedUrl: row.published_url || '',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const getArticle = async (env: Env, id: string, owner: string) => {
  const row = await env.DB.prepare('SELECT * FROM art_articles WHERE id = ? AND owner_user_id = ?').bind(Number(id), owner).first<ArticleRow>();
  return row || null;
};

const saveRevision = async (env: Env, article: ArticleRow, action: string) => {
  await env.DB.prepare('INSERT INTO art_article_revisions (article_id,owner_user_id,action,snapshot_json,created_at) VALUES (?,?,?,?,?)')
    .bind(article.id, article.owner_user_id, action, JSON.stringify(articleFromRow(article)), now()).run();
};

const createArticle = async (env: Env, owner: string, generated: GeneratedArticle, extra: Record<string, unknown> = {}) => {
  generated.articleMarkdown = normalizeMarkdown(generated.articleMarkdown);
  generated.wordCount = wordCount(generated.articleMarkdown);
  const created = now();
  const result = await env.DB.prepare(`INSERT INTO art_articles (
    owner_user_id,title,meta_title,meta_description,slug,primary_keyword,secondary_keywords,article_markdown,seo_checklist,word_count,status,generation_mode,source_urls,source_text,facts,conflicts,author_id,author_name,category,created_at,updated_at
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(
      owner,
      generated.title,
      generated.metaTitle,
      generated.metaDescription,
      generated.slug || slugify(generated.title),
      generated.primaryKeyword,
      JSON.stringify(generated.secondaryKeywords || []),
      generated.articleMarkdown,
      JSON.stringify(generated.seoChecklist || []),
      generated.wordCount,
      'DRAFT',
      String(extra.generationMode || 'SOURCE'),
      JSON.stringify(extra.sourceUrls || []),
      String(extra.sourceText || ''),
      JSON.stringify(extra.facts || []),
      JSON.stringify(extra.conflicts || []),
      String(extra.authorId || ''),
      String(extra.authorName || ''),
      String(extra.category || ''),
      created,
      created,
    ).run();
  const id = String(result.meta.last_row_id || '');
  const row = await getArticle(env, id, owner);
  if (!row) throw new Error('Draft creation failed');
  await saveRevision(env, row, 'CREATED');
  return articleFromRow(row);
};

const safeUrl = (value: string) => {
  try {
    const url = new URL(value);
    if (!['http:','https:'].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.local') || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host) || /^0\./.test(host) || host === '::1') return null;
    const private172 = host.match(/^172\.(\d+)\./);
    if (private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31) return null;
    return url;
  } catch { return null; }
};

const scrape = async (value: string) => {
  const url = safeUrl(value);
  if (!url) throw new Error('URL tidak diizinkan');
  const response = await fetch(url.toString(), { headers: { 'User-Agent': 'AINFO-Newsroom/1.0 (+https://ainfo.web.id)' }, redirect: 'follow' });
  if (!response.ok) throw new Error(`Sumber merespons ${response.status}`);
  const html = await response.text();
  const title = decodeEntities((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || url.hostname).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  const text = decodeEntities(html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 16000);
  return { url: url.toString(), title, text, wordCount: wordCount(text) };
};

type Provider = { id: string; label: string; key?: string; model: string; endpoint: string; kind: 'openai' | 'gemini' | 'anthropic' };
const providers = (env: Env): Provider[] => [
  { id: 'openai', label: 'OpenAI', key: env.OPENAI_API_KEY, model: env.OPENAI_MODEL || 'gpt-4o-mini', endpoint: 'https://api.openai.com/v1/chat/completions', kind: 'openai' },
  { id: 'gemini', label: 'Google Gemini', key: env.GEMINI_API_KEY, model: env.GEMINI_MODEL || 'gemini-2.5-flash', endpoint: 'https://generativelanguage.googleapis.com/v1beta/models', kind: 'gemini' },
  { id: 'anthropic', label: 'Anthropic', key: env.ANTHROPIC_API_KEY, model: env.ANTHROPIC_MODEL || 'claude-sonnet-4-5', endpoint: 'https://api.anthropic.com/v1/messages', kind: 'anthropic' },
  { id: 'groq', label: 'Groq', key: env.GROQ_API_KEY, model: env.GROQ_MODEL || 'llama-3.3-70b-versatile', endpoint: 'https://api.groq.com/openai/v1/chat/completions', kind: 'openai' },
  { id: 'mistral', label: 'Mistral AI', key: env.MISTRAL_API_KEY, model: env.MISTRAL_MODEL || 'mistral-small-latest', endpoint: 'https://api.mistral.ai/v1/chat/completions', kind: 'openai' },
  { id: 'deepseek', label: 'DeepSeek', key: env.DEEPSEEK_API_KEY, model: env.DEEPSEEK_MODEL || 'deepseek-chat', endpoint: 'https://api.deepseek.com/chat/completions', kind: 'openai' },
  { id: 'openrouter', label: 'OpenRouter', key: env.OPENROUTER_API_KEY, model: env.OPENROUTER_MODEL || 'openrouter/auto', endpoint: 'https://openrouter.ai/api/v1/chat/completions', kind: 'openai' },
];

const extractJson = <T>(value: string): T => {
  const clean = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('AI output bukan JSON');
  return JSON.parse(clean.slice(start, end + 1)) as T;
};

const providerCall = async (env: Env, provider: Provider, system: string, prompt: string, maxTokens = 6000) => {
  if (!provider.key) throw new Error('KEY_MISSING');
  if (provider.kind === 'gemini') {
    const response = await fetch(`${provider.endpoint}/${encodeURIComponent(provider.model)}:generateContent?key=${encodeURIComponent(provider.key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: `${system}\n\n${prompt}` }] }], generationConfig: { temperature: 0.25, maxOutputTokens: maxTokens, responseMimeType: 'application/json' } }),
    });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const data = await response.json() as any;
    return String(data?.candidates?.[0]?.content?.parts?.[0]?.text || '');
  }
  if (provider.kind === 'anthropic') {
    const response = await fetch(provider.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': provider.key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: provider.model, max_tokens: maxTokens, temperature: 0.25, system, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const data = await response.json() as any;
    return String(data?.content?.[0]?.text || '');
  }
  const headers: Record<string,string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.key}` };
  if (provider.id === 'openrouter') { headers['HTTP-Referer'] = env.SITE_URL; headers['X-Title'] = env.APP_NAME; }
  const response = await fetch(provider.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: provider.model, temperature: 0.25, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }], response_format: { type: 'json_object' } }),
  });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const data = await response.json() as any;
  return String(data?.choices?.[0]?.message?.content || '');
};

const aiJson = async <T>(env: Env, system: string, prompt: string, maxTokens = 6000): Promise<{ data: T; provider: string }> => {
  const all = providers(env).filter(item => item.key);
  if (!all.length) throw new Error('Belum ada API key AI yang dikonfigurasi');
  const offset = Math.abs(prompt.length + new Date().getUTCMinutes()) % all.length;
  const rotated = [...all.slice(offset), ...all.slice(0, offset)];
  let lastError = 'AI unavailable';
  for (const provider of rotated) {
    const started = Date.now();
    try {
      const text = await providerCall(env, provider, system, prompt, maxTokens);
      const data = extractJson<T>(text);
      await env.DB.prepare('INSERT INTO art_ai_usage (provider,task,success,latency_ms,created_at) VALUES (?,?,?,?,?)').bind(provider.id, 'generate', 1, Date.now()-started, now()).run();
      return { data, provider: provider.id };
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'AI error';
      await env.DB.prepare('INSERT INTO art_ai_usage (provider,task,success,latency_ms,error_code,created_at) VALUES (?,?,?,?,?,?)').bind(provider.id, 'generate', 0, Date.now()-started, lastError.slice(0,80), now()).run();
    }
  }
  throw new Error(lastError);
};

const normalizeGenerated = (value: GeneratedArticle) => {
  value.articleMarkdown = normalizeMarkdown(String(value.articleMarkdown || ''));
  value.title = String(value.title || '').trim();
  value.metaTitle = String(value.metaTitle || value.title).trim();
  value.metaDescription = String(value.metaDescription || '').trim();
  value.slug = slugify(String(value.slug || value.title));
  value.primaryKeyword = String(value.primaryKeyword || '').trim();
  value.secondaryKeywords = Array.isArray(value.secondaryKeywords) ? value.secondaryKeywords.map(String).slice(0,12) : [];
  value.seoChecklist = Array.isArray(value.seoChecklist) ? value.seoChecklist.map(String).slice(0,20) : [];
  value.wordCount = wordCount(value.articleMarkdown);
  return value;
};

const generateArticle = async (env: Env, prompt: string, sourceLocked: boolean) => {
  const system = `Anda adalah jurnalis dan editor digital Indonesia. Keluarkan HANYA satu object JSON valid dengan key: title, metaTitle, metaDescription, slug, primaryKeyword, secondaryKeywords (array), articleMarkdown, seoChecklist (array), wordCount.\n${sourceLocked ? 'Semua klaim faktual wajib berasal dari Source Lock yang diberikan. Jangan menambah fakta eksternal.' : 'Jangan mengarang berita terkini atau data spesifik yang tidak tersedia.'}\n\n${HIGH_VALUE}`;
  const result = await aiJson<GeneratedArticle>(env, system, prompt, 7800);
  let article = normalizeGenerated(result.data);
  if (article.wordCount < 1000) {
    try {
      const expanded = await aiJson<GeneratedArticle>(env, system, `${prompt}\n\nDraft awal baru ${article.wordCount} kata. Perluas secara substantif menjadi sekitar 1.050-1.250 kata. Jangan gunakan filler dan jangan menambah fakta yang tidak didukung.\n\nDRAFT:\n${article.articleMarkdown}`, 8000);
      const next = normalizeGenerated(expanded.data);
      if (next.wordCount > article.wordCount) article = next;
    } catch { /* keep factual shorter draft */ }
  }
  return article;
};

const publishArticle = async (env: Env, destination: string, article: ReturnType<typeof articleFromRow>) => {
  const html = markdownToHtml(article.articleMarkdown);
  let url = '';
  let auth = '';
  if (destination === 'AINFO') { url = env.AINFO_PUBLISH_URL || ''; auth = env.AINFO_PUBLISH_TOKEN ? `Bearer ${env.AINFO_PUBLISH_TOKEN}` : ''; }
  else if (destination === 'WORDPRESS') { url = env.WORDPRESS_PUBLISH_URL || ''; auth = env.WORDPRESS_AUTH_HEADER || ''; }
  else if (destination === 'BLOGGER') { url = env.BLOGGER_PUBLISH_URL || ''; auth = env.BLOGGER_AUTH_HEADER || ''; }
  else { url = env.GENERIC_PUBLISH_URL || ''; auth = env.GENERIC_AUTH_HEADER || ''; }
  if (!url) throw new Error('Publishing endpoint belum dikonfigurasi');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) },
    body: JSON.stringify({ title: article.title, contentMarkdown: article.articleMarkdown, contentHtml: html, metaTitle: article.metaTitle, metaDescription: article.metaDescription, slug: article.slug, primaryKeyword: article.primaryKeyword, secondaryKeywords: article.secondaryKeywords, author: article.authorName || 'AINFO', featuredImageUrl: article.thumbnailUrl, sourceUrls: article.sourceUrls, status: 'publish' }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Endpoint ${response.status}: ${text.slice(0,160)}`);
  try { const data = JSON.parse(text); return String(data.url || data.link || data.permalink || ''); } catch { return ''; }
};

const handleApi = async (request: Request, env: Env) => {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();

  if (method === 'GET' && path === '/api/_healthcheck') return json({ ok: true, app: env.APP_NAME, time: now() });
  if (method === 'GET' && path === '/api/me') {
    const user = getIdentity(request, env);
    return user ? json(user) : fail('Cloudflare Access authentication required', 401);
  }
  if (method === 'GET' && path === '/api/session') {
    const session = await ensureSession(request, env);
    if (!session.user) return fail('Cloudflare Access authentication required', 401);
    return json({ authorized: session.member?.status === 'ACTIVE', pending: session.member?.status === 'PENDING', membership: session.member ? { role: session.member.role, status: session.member.status, name: session.member.name, email: session.member.email } : null });
  }

  const active = await requireActive(request, env);
  if ('error' in active) return active.error;
  const owner = active.user!.userId;

  if (method === 'GET' && path === '/api/articles') {
    const rows = await env.DB.prepare('SELECT * FROM art_articles WHERE owner_user_id = ? ORDER BY updated_at DESC LIMIT 150').bind(owner).all<ArticleRow>();
    return json({ items: (rows.results || []).map(articleFromRow) });
  }

  if (method === 'POST' && path === '/api/analyze-sources') {
    const body = await parseBody<{ urls?: string[] }>(request);
    const urls = Array.from(new Set((body.urls || []).map(String).map(x => x.trim()).filter(Boolean))).slice(0,5);
    if (!urls.length) return fail('Minimal satu URL wajib diisi');
    const sources = [] as Awaited<ReturnType<typeof scrape>>[];
    for (const item of urls) { try { sources.push(await scrape(item)); } catch { /* skip failed source */ } }
    if (!sources.length) return fail('Tidak ada sumber yang dapat dibaca', 502);
    const sourceText = sources.map((item,index) => `SUMBER ${index+1}\nJudul: ${item.title}\nURL: ${item.url}\nIsi:\n${item.text}`).join('\n\n---\n\n').slice(0,42000);
    const prompt = `Analisis ${sources.length} sumber berikut. Keluarkan HANYA object JSON valid dengan key title, summary, facts (6-15 item), entities, quotes, angles (4-6 item), conflicts, sourceDate, wordCount. Gunakan hanya informasi dalam sumber, pertahankan atribusi, dan tandai perbedaan data.\n\n${sourceText}`;
    const result = await aiJson<any>(env, 'Anda adalah editor verifikasi berita Indonesia. Jangan menyimpulkan motif dan jangan membuat fakta baru.', prompt, 4200);
    result.data.wordCount = sources.reduce((sum,item) => sum + item.wordCount,0);
    return json({ sources: sources.map(x => ({ url:x.url, title:x.title, wordCount:x.wordCount })), sourceText, analysis: result.data, provider: result.provider });
  }

  if (method === 'POST' && path === '/api/generate-article') {
    const body = await parseBody<any>(request);
    if (!body.sourceText || !body.angle) return fail('Sumber dan angle wajib tersedia');
    const prompt = `Tulis artikel berita target ${body.length || env.DEFAULT_ARTICLE_LENGTH} kata dengan gaya ${body.style || env.DEFAULT_STYLE}. Angle: ${body.angle}.\n\nFACTSHEET:\n${(body.facts || []).map((x:string,i:number)=>`${i+1}. ${x}`).join('\n')}\n\nKUTIPAN:\n${(body.quotes || []).join('\n')}\n\nKONFLIK SUMBER:\n${(body.conflicts || []).join('\n')}\n\nSOURCE LOCK:\n${String(body.sourceText).slice(0,42000)}\n\nGunakan Markdown semantik dan SEO metadata lengkap.`;
    const generated = await generateArticle(env, prompt, true);
    const article = await createArticle(env, owner, generated, { generationMode:'SOURCE', sourceUrls:(body.sourceUrls || []).slice(0,5), sourceText:String(body.sourceText).slice(0,42000), facts:body.facts || [], conflicts:body.conflicts || [], authorId:body.authorId, authorName:body.authorName });
    return json(article);
  }

  if (method === 'POST' && path === '/api/generate-keyword') {
    const body = await parseBody<any>(request);
    const keyword = String(body.keyword || '').trim();
    if (!keyword) return fail('Keyword atau topik wajib diisi');
    const mode = String(body.contentMode || 'TOPIC');
    const locked = mode === 'PRESS_RELEASE';
    if (locked && String(body.sourceMaterial || '').trim().length < 80) return fail('Bahan press release terlalu pendek');
    const prompt = locked
      ? `Olah press release berikut menjadi berita jurnalistik target ${body.length || env.DEFAULT_ARTICLE_LENGTH} kata. Konteks: ${keyword}. Gaya: ${body.style || env.DEFAULT_STYLE}. Pertahankan atribusi dan jangan menambah fakta di luar rilis.\n\nPRESS RELEASE TERKUNCI:\n${String(body.sourceMaterial).slice(0,42000)}`
      : `Buat ${mode === 'EVERGREEN' ? 'artikel evergreen' : 'artikel topik/SEO'} tentang "${keyword}" target ${body.length || env.DEFAULT_ARTICLE_LENGTH} kata. Gaya: ${mode === 'EVERGREEN' ? 'SEO evergreen' : body.style || env.DEFAULT_STYLE}. Gunakan H2/H3, contoh/poin praktis dan kesimpulan. Jangan mengarang fakta terkini.`;
    const generated = await generateArticle(env, prompt, locked);
    const article = await createArticle(env, owner, generated, { generationMode:mode, sourceText:locked ? String(body.sourceMaterial).slice(0,42000) : '', authorId:body.authorId, authorName:body.authorName });
    return json(article);
  }

  if (method === 'POST' && path === '/api/bulk-generate') {
    const body = await parseBody<any>(request);
    const keywords = (body.keywords || []).map(String).map((x:string)=>x.trim()).filter(Boolean).slice(0,3);
    if (keywords.length < 2) return fail('Minimal dua keyword diperlukan');
    const items = [];
    for (const keyword of keywords) {
      const generated = await generateArticle(env, `Buat artikel SEO berkualitas tentang "${keyword}" target ${body.length || env.DEFAULT_ARTICLE_LENGTH} kata. Gaya ${body.style || env.DEFAULT_STYLE}. Jangan mengarang fakta aktual.`, false);
      items.push(await createArticle(env, owner, generated, { generationMode:'TOPIC', authorId:body.authorId, authorName:body.authorName }));
    }
    return json({ items });
  }

  const articleMatch = path.match(/^\/api\/articles\/(\d+)$/);
  if (articleMatch && method === 'PUT') {
    const row = await getArticle(env, articleMatch[1], owner);
    if (!row) return fail('Artikel tidak ditemukan',404);
    const body = await parseBody<any>(request);
    const updated = {
      title: typeof body.title === 'string' ? body.title : row.title,
      article_markdown: typeof body.articleMarkdown === 'string' ? normalizeMarkdown(body.articleMarkdown) : row.article_markdown,
      meta_title: typeof body.metaTitle === 'string' ? body.metaTitle : row.meta_title,
      meta_description: typeof body.metaDescription === 'string' ? body.metaDescription : row.meta_description,
      slug: typeof body.slug === 'string' ? body.slug : row.slug,
      primary_keyword: typeof body.primaryKeyword === 'string' ? body.primaryKeyword : row.primary_keyword,
      secondary_keywords: Array.isArray(body.secondaryKeywords) ? JSON.stringify(body.secondaryKeywords) : row.secondary_keywords,
      seo_checklist: Array.isArray(body.seoChecklist) ? JSON.stringify(body.seoChecklist) : row.seo_checklist,
      status: typeof body.status === 'string' ? body.status : row.status,
      author_id: typeof body.authorId === 'string' ? body.authorId : row.author_id,
      author_name: typeof body.authorName === 'string' ? body.authorName : row.author_name,
      category: typeof body.category === 'string' ? body.category : row.category,
    };
    const count = wordCount(updated.article_markdown);
    await env.DB.prepare('UPDATE art_articles SET title=?,article_markdown=?,meta_title=?,meta_description=?,slug=?,primary_keyword=?,secondary_keywords=?,seo_checklist=?,word_count=?,status=?,author_id=?,author_name=?,category=?,updated_at=? WHERE id=? AND owner_user_id=?')
      .bind(updated.title,updated.article_markdown,updated.meta_title,updated.meta_description,updated.slug,updated.primary_keyword,updated.secondary_keywords,updated.seo_checklist,count,updated.status,updated.author_id,updated.author_name,updated.category,now(),row.id,owner).run();
    const next = await getArticle(env, articleMatch[1], owner);
    if (!next) return fail('Artikel gagal diperbarui',500);
    await saveRevision(env,next, body.status ? `STATUS_${body.status}` : 'SAVED');
    return json(articleFromRow(next));
  }
  if (articleMatch && method === 'DELETE') {
    const row = await getArticle(env, articleMatch[1], owner);
    if (!row) return fail('Artikel tidak ditemukan',404);
    if (row.thumbnail_key) await env.MEDIA.delete(row.thumbnail_key);
    await env.DB.prepare('DELETE FROM art_articles WHERE id=? AND owner_user_id=?').bind(row.id,owner).run();
    return json({ deleted:true });
  }

  const rewriteMatch = path.match(/^\/api\/articles\/(\d+)\/rewrite$/);
  if (rewriteMatch && method === 'POST') {
    const row = await getArticle(env,rewriteMatch[1],owner); if(!row) return fail('Artikel tidak ditemukan',404);
    const body = await parseBody<{mode?:string}>(request); const mode = String(body.mode || 'REWRITE').toUpperCase();
    const instruction = mode === 'HUMANIZE' ? 'Buat bahasa lebih natural seperti editor manusia tanpa mengubah fakta.' : mode === 'EXPAND' ? 'Perluas substantif tanpa menambah fakta baru.' : mode === 'SHORTEN' ? 'Ringkas tanpa menghilangkan fakta utama.' : 'Tulis ulang dengan alur lebih kuat tanpa mengubah substansi.';
    const generated = await generateArticle(env, `${instruction}\n\nFAKTA TERKUNCI:\n${row.facts}\n\nSUMBER:\n${row.source_text.slice(0,24000)}\n\nARTIKEL:\n${row.article_markdown}`, Boolean(row.source_text));
    await env.DB.prepare('UPDATE art_articles SET title=?,meta_title=?,meta_description=?,slug=?,primary_keyword=?,secondary_keywords=?,article_markdown=?,seo_checklist=?,word_count=?,status=?,updated_at=? WHERE id=? AND owner_user_id=?')
      .bind(generated.title,generated.metaTitle,generated.metaDescription,generated.slug,generated.primaryKeyword,JSON.stringify(generated.secondaryKeywords),generated.articleMarkdown,JSON.stringify(generated.seoChecklist),generated.wordCount,'DRAFT',now(),row.id,owner).run();
    const next = await getArticle(env,rewriteMatch[1],owner); if(!next) return fail('Rewrite gagal',500); await saveRevision(env,next,mode); return json(articleFromRow(next));
  }

  const factMatch = path.match(/^\/api\/articles\/(\d+)\/fact-check$/);
  if (factMatch && method === 'POST') {
    const row = await getArticle(env,factMatch[1],owner); if(!row) return fail('Artikel tidak ditemukan',404);
    let report:any;
    if (!row.source_text) report = { score:0, checkedAt:now(), claims:[{ claim:'Artikel tidak memiliki Source Lock.', status:'NEEDS_SOURCE', evidence:'', note:'Tambahkan sumber sebelum menganggap klaim aktual terverifikasi.' }] };
    else {
      const result = await aiJson<any>(env,'Anda adalah fact checker. Nilai hanya dukungan klaim terhadap Source Lock. Keluarkan JSON valid.',`Bandingkan artikel dengan sumber. Output {score:0-100, claims:[{claim,status,evidence,note}]}. Status hanya SUPPORTED, NEEDS_REVIEW, CONFLICTING, UNSUPPORTED.\n\nSOURCE LOCK:\n${row.source_text.slice(0,30000)}\n\nARTIKEL:\n${row.article_markdown}`,5000);
      report = { ...result.data, checkedAt:now() };
    }
    await env.DB.prepare('UPDATE art_articles SET fact_report=?,updated_at=? WHERE id=? AND owner_user_id=?').bind(JSON.stringify(report),now(),row.id,owner).run();
    const next = await getArticle(env,factMatch[1],owner); return json(articleFromRow(next!));
  }

  const linkMatch = path.match(/^\/api\/articles\/(\d+)\/internal-links$/);
  if (linkMatch && method === 'POST') {
    const row = await getArticle(env,linkMatch[1],owner); if(!row) return fail('Artikel tidak ditemukan',404);
    const body = await parseBody<{apply?:boolean}>(request);
    const candidates = await env.DB.prepare('SELECT id,title,slug,primary_keyword FROM art_articles WHERE owner_user_id=? AND id<>? ORDER BY updated_at DESC LIMIT 40').bind(owner,row.id).all<any>();
    const baseTokens = new Set(`${row.title} ${row.primary_keyword}`.toLowerCase().split(/[^a-z0-9]+/).filter(x=>x.length>3));
    const suggestions = (candidates.results || []).map((x:any)=>{ const tokens = `${x.title} ${x.primary_keyword}`.toLowerCase().split(/[^a-z0-9]+/).filter((t:string)=>t.length>3); const score = tokens.filter((t:string)=>baseTokens.has(t)).length; return { id:String(x.id), title:x.title, url:`${env.AINFO_SITE_URL.replace(/\/$/,'')}/${x.slug || ''}`, score }; }).filter((x:any)=>x.score>0).sort((a:any,b:any)=>b.score-a.score).slice(0,5);
    let article:any = null;
    if (body.apply && suggestions.length) {
      const block = `\n\n## Baca Juga\n\n${suggestions.slice(0,3).map((x:any)=>`- [${x.title}](${x.url})`).join('\n')}`;
      const nextText = row.article_markdown.includes('## Baca Juga') ? row.article_markdown : `${row.article_markdown}${block}`;
      await env.DB.prepare('UPDATE art_articles SET article_markdown=?,word_count=?,updated_at=? WHERE id=? AND owner_user_id=?').bind(nextText,wordCount(nextText),now(),row.id,owner).run();
      const next = await getArticle(env,linkMatch[1],owner); if(next){ await saveRevision(env,next,'INTERNAL_LINKS'); article=articleFromRow(next); }
    }
    return json({ suggestions, article });
  }

  const historyMatch = path.match(/^\/api\/articles\/(\d+)\/history$/);
  if (historyMatch && method === 'GET') {
    const rows = await env.DB.prepare('SELECT id,action,snapshot_json,created_at FROM art_article_revisions WHERE article_id=? AND owner_user_id=? ORDER BY created_at DESC LIMIT 30').bind(Number(historyMatch[1]),owner).all<any>();
    return json({ items:(rows.results || []).map((x:any)=>{ const snap=parseObject<any>(x.snapshot_json,{}); return { id:String(x.id), action:x.action, title:snap.title || '', wordCount:snap.wordCount || 0, timestamp:x.created_at }; }) });
  }

  const restoreMatch = path.match(/^\/api\/articles\/(\d+)\/restore-history$/);
  if (restoreMatch && method === 'POST') {
    const body = await parseBody<{versionId?:string}>(request);
    const rev = await env.DB.prepare('SELECT * FROM art_article_revisions WHERE id=? AND article_id=? AND owner_user_id=?').bind(Number(body.versionId),Number(restoreMatch[1]),owner).first<any>();
    if(!rev) return fail('Versi tidak ditemukan',404);
    const snap = parseObject<any>(rev.snapshot_json,{});
    const row = await getArticle(env,restoreMatch[1],owner); if(!row) return fail('Artikel tidak ditemukan',404);
    await env.DB.prepare('UPDATE art_articles SET title=?,meta_title=?,meta_description=?,slug=?,primary_keyword=?,secondary_keywords=?,article_markdown=?,seo_checklist=?,word_count=?,status=?,updated_at=? WHERE id=? AND owner_user_id=?')
      .bind(snap.title || row.title,snap.metaTitle || row.meta_title,snap.metaDescription || row.meta_description,snap.slug || row.slug,snap.primaryKeyword || row.primary_keyword,JSON.stringify(snap.secondaryKeywords || []),snap.articleMarkdown || row.article_markdown,JSON.stringify(snap.seoChecklist || []),snap.wordCount || row.word_count,'DRAFT',now(),row.id,owner).run();
    const next=await getArticle(env,restoreMatch[1],owner); if(next) await saveRevision(env,next,'RESTORED'); return json(articleFromRow(next!));
  }

  if (method === 'POST' && path === '/api/generate-thumbnail') {
    const body = await parseBody<{articleId?:string;title?:string;summary?:string}>(request);
    const row = body.articleId ? await getArticle(env,body.articleId,owner) : null;
    if(!row) return fail('Artikel tidak ditemukan',404);
    let copy = { headline:String(body.title || row.title).slice(0,72).toUpperCase(), kicker:'AINFO NEWS' };
    try { const result=await aiJson<any>(env,'Anda adalah editor thumbnail berita. Keluarkan JSON valid.',`Ringkas judul berikut menjadi headline thumbnail maksimum 8 kata dan kicker maksimum 4 kata. Jangan mengubah fakta. Output {headline,kicker}.\nJudul: ${body.title || row.title}\nRingkasan: ${body.summary || row.meta_description}`,800); copy={ headline:String(result.data.headline || copy.headline).slice(0,72).toUpperCase(), kicker:String(result.data.kicker || copy.kicker).slice(0,32).toUpperCase() }; } catch { /* fallback */ }
    const lines = copy.headline.match(/.{1,24}(?:\s|$)/g)?.map(x=>x.trim()).filter(Boolean).slice(0,3) || [copy.headline];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#06172d"/><stop offset="1" stop-color="#0b63f6"/></linearGradient></defs><rect width="1280" height="720" fill="url(#g)"/><circle cx="1110" cy="140" r="260" fill="#ffffff" opacity=".08"/><text x="74" y="92" fill="#7dd3fc" font-family="Arial,sans-serif" font-size="30" font-weight="700">${escapeHtml(copy.kicker)}</text>${lines.map((line,i)=>`<text x="74" y="${260+i*105}" fill="white" font-family="Arial,sans-serif" font-size="86" font-weight="900">${escapeHtml(line)}</text>`).join('')}<rect x="74" y="610" width="305" height="56" rx="14" fill="#ef4444"/><text x="98" y="649" fill="white" font-family="Arial,sans-serif" font-size="27" font-weight="800">AINFO.WEB.ID</text></svg>`;
    const key = `art/thumbnails/${row.id}-${Date.now()}.svg`;
    await env.MEDIA.put(key,svg,{ httpMetadata:{ contentType:'image/svg+xml' } });
    await env.DB.prepare('UPDATE art_articles SET thumbnail_key=?,updated_at=? WHERE id=? AND owner_user_id=?').bind(key,now(),row.id,owner).run();
    return json({ path:key, url:`/media/${encodeURIComponent(key)}`, bytes:new TextEncoder().encode(svg).byteLength });
  }

  if (method === 'GET' && path === '/api/trends') {
    const response = await fetch('https://news.google.com/rss?hl=id&gl=ID&ceid=ID:id');
    const xml = await response.text();
    const titles = [...xml.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<\/item>/gi)].slice(0,30).map(m=>decodeEntities(m[1].replace(/<!\[CDATA\[|\]\]>/g,''))).filter(Boolean);
    if(!titles.length) return json({topics:[]});
    try { const result=await aiJson<any>(env,'Anda adalah editor agenda berita Indonesia. Keluarkan JSON valid.',`Kelompokkan headline berikut menjadi 6-10 cluster. Output {topics:[{topic,rationale,keywords:[...],angles:[...]}]}. Jangan memprediksi hasil politik atau membuat fakta di luar headline.\n\n${titles.join('\n')}`,3500); return json(result.data); }
    catch { return json({ topics:titles.slice(0,8).map(t=>({ topic:t, rationale:'Headline terkini dari feed berita Indonesia.', keywords:[t.split(' ').slice(0,3).join(' ')], angles:['Explainer berdasarkan sumber resmi'] })) }); }
  }

  if (method === 'GET' && path === '/api/authors') {
    const rows=await env.DB.prepare('SELECT * FROM art_authors ORDER BY created_at DESC').all<any>();
    return json({items:(rows.results || []).map((x:any)=>({id:String(x.id),name:x.name,role:x.role,email:x.email,bio:x.bio}))});
  }
  if (method === 'POST' && path === '/api/authors') {
    const body=await parseBody<any>(request); if(!String(body.name||'').trim()) return fail('Nama author wajib diisi');
    await env.DB.prepare('INSERT INTO art_authors (name,role,email,bio,created_at,updated_at) VALUES (?,?,?,?,?,?)').bind(String(body.name).trim(),String(body.role||'Reporter'),String(body.email||''),String(body.bio||''),now(),now()).run(); return json({created:true});
  }
  const authorDelete=path.match(/^\/api\/authors\/(\d+)$/); if(authorDelete && method==='DELETE'){ await env.DB.prepare('DELETE FROM art_authors WHERE id=?').bind(Number(authorDelete[1])).run(); return json({deleted:true}); }

  if (method === 'GET' && path === '/api/templates') {
    const count=await env.DB.prepare('SELECT COUNT(*) AS count FROM art_prompt_templates').first<{count:number}>();
    if(Number(count?.count||0)===0){ const seed=[['AINFO Hard News','NEWS','Lead langsung ke fakta terpenting, piramida terbalik, kutipan proporsional dan atribusi jelas.'],['SEO Evergreen','KEYWORD','Fokus search intent, heading informatif, contoh praktis, FAQ bila relevan, tanpa keyword stuffing.'],['Explainer Mendalam','ALL','Jelaskan konteks, istilah, kronologi dan dampak secara bertahap.']]; for(const item of seed){ await env.DB.prepare('INSERT INTO art_prompt_templates (name,type,instruction,created_at,updated_at) VALUES (?,?,?,?,?)').bind(...item,now(),now()).run(); } }
    const rows=await env.DB.prepare('SELECT * FROM art_prompt_templates ORDER BY created_at DESC').all<any>(); return json({items:(rows.results||[]).map((x:any)=>({id:String(x.id),name:x.name,type:x.type,instruction:x.instruction}))});
  }
  if (method === 'POST' && path === '/api/templates') { const body=await parseBody<any>(request); if(!body.name||!body.instruction) return fail('Nama dan instruksi wajib diisi'); await env.DB.prepare('INSERT INTO art_prompt_templates (name,type,instruction,created_at,updated_at) VALUES (?,?,?,?,?)').bind(String(body.name),String(body.type||'ALL'),String(body.instruction),now(),now()).run(); return json({created:true}); }
  const templateDelete=path.match(/^\/api\/templates\/(\d+)$/); if(templateDelete && method==='DELETE'){ await env.DB.prepare('DELETE FROM art_prompt_templates WHERE id=?').bind(Number(templateDelete[1])).run(); return json({deleted:true}); }

  if (method === 'GET' && path === '/api/workspace-settings') {
    const rows=await env.DB.prepare("SELECT key,value FROM art_settings WHERE key IN ('siteBaseUrl','defaultStyle','defaultLength')").all<any>(); const map=Object.fromEntries((rows.results||[]).map((x:any)=>[x.key,x.value])); return json({siteBaseUrl:map.siteBaseUrl||env.AINFO_SITE_URL,defaultStyle:map.defaultStyle||env.DEFAULT_STYLE,defaultLength:map.defaultLength||env.DEFAULT_ARTICLE_LENGTH});
  }
  if (method === 'PUT' && path === '/api/workspace-settings') { const body=await parseBody<any>(request); for(const key of ['siteBaseUrl','defaultStyle','defaultLength']){ if(typeof body[key]==='string'){ await env.DB.prepare('INSERT INTO art_settings (key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at').bind(key,body[key],now()).run(); } } return json({siteBaseUrl:body.siteBaseUrl||env.AINFO_SITE_URL,defaultStyle:body.defaultStyle||env.DEFAULT_STYLE,defaultLength:body.defaultLength||env.DEFAULT_ARTICLE_LENGTH}); }

  if (method === 'GET' && path === '/api/integrations/status') {
    return json({integrations:{ AINFO:{label:'ainfo.web.id',configured:Boolean(env.AINFO_PUBLISH_URL),authConfigured:Boolean(env.AINFO_PUBLISH_TOKEN)}, WORDPRESS:{label:'WordPress',configured:Boolean(env.WORDPRESS_PUBLISH_URL),authConfigured:Boolean(env.WORDPRESS_AUTH_HEADER)}, BLOGGER:{label:'Blogger Adapter',configured:Boolean(env.BLOGGER_PUBLISH_URL),authConfigured:Boolean(env.BLOGGER_AUTH_HEADER)}, API:{label:'Generic API',configured:Boolean(env.GENERIC_PUBLISH_URL),authConfigured:Boolean(env.GENERIC_AUTH_HEADER)} }});
  }

  if (method === 'GET' && path === '/api/ai/providers') return json({providers:providers(env).map((p,i)=>({id:p.id,label:p.label,model:p.model,configured:Boolean(p.key),secretName:`${p.id.toUpperCase()}_API_KEY`,position:i+1}))});
  if (method === 'POST' && path === '/api/ai/providers/test') {
    const admin=await requireActive(request,env,['ADMIN']); if('error' in admin) return admin.error;
    const results=[]; for(const p of providers(env)){ if(!p.key){ results.push({id:p.id,label:p.label,configured:false,ok:false,latencyMs:0,message:'API key belum diisi'}); continue; } const started=Date.now(); try{ const text=await providerCall(env,p,'Jawab dalam JSON valid.', 'Keluarkan {"ok":true}.',300); extractJson<any>(text); results.push({id:p.id,label:p.label,configured:true,ok:true,latencyMs:Date.now()-started,message:'ONLINE'}); }catch(e){ results.push({id:p.id,label:p.label,configured:true,ok:false,latencyMs:Date.now()-started,message:e instanceof Error?e.message:'ERROR'}); } } return json({results});
  }

  if (method === 'GET' && path === '/api/analytics') {
    const rows=await env.DB.prepare('SELECT status,generation_mode,author_name,word_count,created_at FROM art_articles WHERE owner_user_id=?').bind(owner).all<any>(); const items=rows.results||[]; const statuses:Record<string,number>={}; const modes:Record<string,number>={}; const authors:Record<string,number>={}; let totalWords=0; for(const x of items){ statuses[x.status]=(statuses[x.status]||0)+1; modes[x.generation_mode]=(modes[x.generation_mode]||0)+1; authors[x.author_name||'Tanpa author']=(authors[x.author_name||'Tanpa author']||0)+1; totalWords+=Number(x.word_count||0); } return json({total:items.length,totalWords,averageWords:items.length?Math.round(totalWords/items.length):0,statuses,modes,authors:Object.entries(authors).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count),recent:[]});
  }

  if (method === 'GET' && path === '/api/members') {
    const admin=await requireActive(request,env,['ADMIN']); if('error' in admin) return admin.error;
    const rows=await env.DB.prepare('SELECT * FROM art_members ORDER BY created_at DESC').all<Member>(); return json({items:(rows.results||[]).map((x:any)=>({id:String(x.id),userId:x.user_id,email:x.email,name:x.name,role:x.role,status:x.status}))});
  }
  const approveMatch=path.match(/^\/api\/members\/(.+)\/approve$/); if(approveMatch && method==='POST'){ const admin=await requireActive(request,env,['ADMIN']); if('error' in admin) return admin.error; const body=await parseBody<any>(request); const role=body.role==='ADMIN'?'ADMIN':'EDITOR'; await env.DB.prepare('UPDATE art_members SET role=?,status=?,updated_at=? WHERE user_id=?').bind(role,'ACTIVE',now(),decodeURIComponent(approveMatch[1])).run(); return json({approved:true,role}); }

  const scheduleMatch=path.match(/^\/api\/articles\/(\d+)\/schedule$/); if(scheduleMatch && method==='POST'){ const row=await getArticle(env,scheduleMatch[1],owner); if(!row) return fail('Artikel tidak ditemukan',404); const body=await parseBody<any>(request); const scheduledAt=new Date(String(body.scheduledAt||'')); if(!Number.isFinite(scheduledAt.getTime())||scheduledAt.getTime()<=Date.now()) return fail('Waktu jadwal harus di masa depan'); const destination=String(body.destination||'AINFO'); await env.DB.prepare('UPDATE art_articles SET status=?,scheduled_at=?,publish_destination=?,updated_at=? WHERE id=? AND owner_user_id=?').bind('SCHEDULED',scheduledAt.toISOString(),destination,now(),row.id,owner).run(); await env.DB.prepare('INSERT INTO art_publish_jobs (article_id,owner_user_id,destination,scheduled_at,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').bind(row.id,owner,destination,scheduledAt.toISOString(),'PENDING',now(),now()).run(); const next=await getArticle(env,scheduleMatch[1],owner); return json(articleFromRow(next!)); }

  const publishMatch=path.match(/^\/api\/articles\/(\d+)\/publish$/); if(publishMatch && method==='POST'){ const row=await getArticle(env,publishMatch[1],owner); if(!row) return fail('Artikel tidak ditemukan',404); if(row.status!=='APPROVED') return fail('Artikel harus APPROVED sebelum publish',409); const body=await parseBody<any>(request); const destination=String(body.destination||'AINFO'); try{ const url=await publishArticle(env,destination,articleFromRow(row)); await env.DB.prepare('UPDATE art_articles SET status=?,published_url=?,publish_destination=?,updated_at=? WHERE id=? AND owner_user_id=?').bind('PUBLISHED',url,destination,now(),row.id,owner).run(); const next=await getArticle(env,publishMatch[1],owner); return json(articleFromRow(next!)); }catch(e){ return fail(e instanceof Error?e.message:'Publish gagal',502); } }

  return fail('API route not found',404);
};

const runScheduled = async (env: Env) => {
  const jobs=await env.DB.prepare("SELECT * FROM art_publish_jobs WHERE status='PENDING' AND scheduled_at<=? ORDER BY scheduled_at ASC LIMIT 25").bind(now()).all<any>();
  for(const job of jobs.results||[]){ try{ const row=await env.DB.prepare('SELECT * FROM art_articles WHERE id=? AND owner_user_id=?').bind(job.article_id,job.owner_user_id).first<ArticleRow>(); if(!row){ await env.DB.prepare('UPDATE art_publish_jobs SET status=?,message=?,updated_at=? WHERE id=?').bind('SKIPPED','Artikel tidak ditemukan',now(),job.id).run(); continue; } const url=await publishArticle(env,job.destination,articleFromRow(row)); await env.DB.prepare('UPDATE art_articles SET status=?,published_url=?,updated_at=? WHERE id=?').bind('PUBLISHED',url,now(),row.id).run(); await env.DB.prepare('UPDATE art_publish_jobs SET status=?,message=?,updated_at=? WHERE id=?').bind('PUBLISHED',url||'Published',now(),job.id).run(); }catch(e){ await env.DB.prepare('UPDATE art_publish_jobs SET status=?,message=?,updated_at=? WHERE id=?').bind('FAILED',e instanceof Error?e.message:'Publish failed',now(),job.id).run(); } }
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url=new URL(request.url);
    if(url.pathname.startsWith('/api/')) return handleApi(request,env);
    if(url.pathname.startsWith('/media/')){ const key=decodeURIComponent(url.pathname.slice('/media/'.length)); const object=await env.MEDIA.get(key); if(!object) return new Response('Not found',{status:404}); const headers=new Headers(); object.writeHttpMetadata(headers); headers.set('etag',object.httpEtag); headers.set('Cache-Control','private, max-age=3600'); return new Response(object.body,{headers}); }
    return env.ASSETS.fetch(request);
  },
  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    await runScheduled(env);
  },
};
