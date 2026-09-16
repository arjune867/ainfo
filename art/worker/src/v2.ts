/// <reference types='@cloudflare/workers-types' />
import previousWorker from './index';

type Env = {
  DB: D1Database;
  MEDIA: R2Bucket;
  ASSETS: Fetcher;
  AINFO_PUBLISH_URL?: string;
  AINFO_PUBLISH_TOKEN?: string;
  [key: string]: unknown;
};

type Member = {
  user_id: string;
  role: 'ADMIN' | 'EDITOR';
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
};

const previous = previousWorker;
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

const identityEmail = (request: Request) => String(request.headers.get('Cf-Access-Authenticated-User-Email') || '').trim().toLowerCase();

const getActiveMember = async (request: Request, env: Env) => {
  const email = identityEmail(request);
  if (!email) return null;
  const member = await env.DB.prepare('SELECT user_id,role,status FROM art_members WHERE user_id=? LIMIT 1').bind(email).first<Member>();
  if (!member || member.status !== 'ACTIVE') return null;
  return member;
};

const normalizePublishUrl = (env: Env) => {
  const configured = String(env.AINFO_PUBLISH_URL || '').trim();
  const fallback = 'https://ainfo.web.id/api/internal/publish';
  if (!configured) return fallback;
  try {
    const url = new URL(configured);
    // Production apex is already verified. Avoid a broken www record blocking newsroom publishing.
    if (url.hostname.toLowerCase() === 'www.ainfo.web.id') url.hostname = 'ainfo.web.id';
    if (!url.pathname || url.pathname === '/') url.pathname = '/api/internal/publish';
    return url.toString();
  } catch {
    return fallback;
  }
};

const runtimeEnv = (env: Env): Env => ({ ...env, AINFO_PUBLISH_URL: normalizePublishUrl(env) });

const extensionFor = (contentType: string) => {
  if (contentType === 'image/jpeg') return 'jpg';
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  if (contentType === 'image/avif') return 'avif';
  return '';
};

const uploadReference = async (request: Request, env: Env) => {
  const member = await getActiveMember(request, env);
  if (!member) return json({ error: 'unauthorized' }, 401);

  let form: FormData;
  try { form = await request.formData(); }
  catch { return json({ error: 'invalid_form_data' }, 400); }

  const articleId = String(form.get('articleId') || '').trim();
  const file = form.get('file');
  if (!/^\d+$/.test(articleId)) return json({ error: 'article_id_required' }, 400);
  if (!(file instanceof File)) return json({ error: 'image_required' }, 400);

  const ext = extensionFor(file.type);
  if (!ext) return json({ error: 'unsupported_image', message: 'Gunakan JPG, PNG, WebP, atau AVIF.' }, 415);
  if (file.size < 1 || file.size > 10 * 1024 * 1024) return json({ error: 'image_size_invalid', message: 'Ukuran gambar maksimal 10 MB.' }, 413);

  const article = await env.DB.prepare('SELECT id,owner_user_id,title FROM art_articles WHERE id=? AND owner_user_id=? LIMIT 1')
    .bind(Number(articleId), member.user_id).first<{ id:number; owner_user_id:string; title:string }>();
  if (!article) return json({ error: 'article_not_found' }, 404);

  const key = `art/references/${article.id}-${Date.now()}.${ext}`;
  await env.MEDIA.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' },
    customMetadata: { articleId, uploadedBy: member.user_id, source: 'newsroom-reference' },
  });

  await env.DB.prepare('UPDATE art_articles SET thumbnail_key=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND owner_user_id=?')
    .bind(key, article.id, member.user_id).run();

  return json({
    ok: true,
    articleId,
    path: key,
    url: `/media/${encodeURIComponent(key)}`,
    bytes: file.size,
    contentType: file.type,
    message: 'Gambar referensi tersimpan dan dipakai sebagai thumbnail/featured image.',
  }, 201);
};

const publishHealth = async (request: Request, env: Env) => {
  const member = await getActiveMember(request, env);
  if (!member) return json({ error: 'unauthorized' }, 401);
  if (!env.AINFO_PUBLISH_TOKEN) return json({ ok: false, error: 'publish_token_missing' }, 503);

  const endpoint = normalizePublishUrl(env);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.AINFO_PUBLISH_TOKEN}`,
      },
      body: '{}',
    });
    const text = await response.text();
    // A valid token reaches the portal and an empty payload is intentionally rejected as title_required (400).
    const tokenAccepted = response.status === 400 && /title_required/i.test(text);
    return json({
      ok: tokenAccepted,
      endpoint,
      status: response.status,
      message: tokenAccepted ? 'Koneksi publish AINFO siap.' : text.slice(0, 240),
    }, tokenAccepted ? 200 : 502);
  } catch (error) {
    return json({ ok: false, endpoint, error: 'publish_endpoint_unreachable', message: String((error as Error)?.message || error) }, 502);
  }
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method.toUpperCase();

    if (path === '/api/upload-thumbnail-reference' && method === 'POST') {
      return uploadReference(request, env);
    }

    if (path === '/api/publish-health' && method === 'GET') {
      return publishHealth(request, env);
    }

    // Admins can publish directly from Publish Center. The server performs the approval atomically before forwarding.
    const publishMatch = path.match(/^\/api\/articles\/(\d+)\/publish$/);
    if (publishMatch && method === 'POST') {
      const member = await getActiveMember(request, env);
      if (member?.role === 'ADMIN') {
        await env.DB.prepare("UPDATE art_articles SET status='APPROVED',updated_at=CURRENT_TIMESTAMP WHERE id=? AND owner_user_id=? AND status<>'PUBLISHED'")
          .bind(Number(publishMatch[1]), member.user_id).run();
      }
      return previous.fetch(request, runtimeEnv(env) as any, ctx as any);
    }

    return previous.fetch(request, runtimeEnv(env) as any, ctx as any);
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const scheduled = (previous as any).scheduled;
    if (typeof scheduled === 'function') return scheduled(event, runtimeEnv(env), ctx);
  },
};
