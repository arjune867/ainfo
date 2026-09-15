import legacy from './index';

type D1Result<T = any> = { results?: T[]; success?: boolean; meta?: any };
type D1Statement = {
  bind: (...values: any[]) => D1Statement;
  first: <T = any>() => Promise<T | null>;
  all: <T = any>() => Promise<D1Result<T>>;
  run: () => Promise<any>;
};
type D1Database = {
  prepare: (sql: string) => D1Statement;
};
type R2Bucket = { get: (key: string) => Promise<any> };

type Env = {
  DB: D1Database;
  MEDIA: R2Bucket;
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  DOMAIN?: string;
  MIDTRANS_SERVER_KEY?: string;
  MIDTRANS_CLIENT_KEY?: string;
  MIDTRANS_ENV?: string;
  [key: string]: any;
};

type UserRow = {
  id: number;
  username: string | null;
  email: string;
  full_name: string;
  wa: string;
  address: string;
  city: string;
  postal_code: string;
  status: string;
};

const legacyWorker: any = legacy;
const enc = new TextEncoder();

function json(data: any, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

function appDomain(env: Env) {
  return (env.DOMAIN || 'https://www.ainfo.web.id').replace(/\/$/, '');
}

function cookies(req: Request) {
  const out: Record<string, string> = {};
  for (const part of (req.headers.get('cookie') || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function sha256Base64Url(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(value));
  return base64url(new Uint8Array(digest));
}

async function sha512Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-512', enc.encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafe(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function slugify(s: string) {
  return String(s || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 140) || 'author';
}

function randomId(prefix: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  const suffix = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `${prefix}-${Date.now()}-${suffix}`;
}

function csrfOk(req: Request) {
  const c = cookies(req).ainfo_csrf || '';
  const h = req.headers.get('x-csrf-token') || '';
  return Boolean(c && h && timingSafe(c, h));
}

async function currentUser(req: Request, env: Env): Promise<UserRow | null> {
  const token = cookies(req).ainfo_session;
  if (!token) return null;
  const hash = await sha256Base64Url(token);
  const epoch = Math.floor(Date.now() / 1000);
  return await env.DB.prepare(
    `SELECT u.id,u.username,u.email,u.full_name,u.wa,u.address,u.city,u.postal_code,u.status
     FROM sessions s JOIN users u ON u.id=s.user_id
     WHERE s.token_hash=? AND s.expires_at>? LIMIT 1`
  ).bind(hash, epoch).first<UserRow>();
}

function midtransConfigured(env: Env) {
  return Boolean(env.MIDTRANS_SERVER_KEY);
}

function midtransSnapBase(env: Env) {
  return String(env.MIDTRANS_ENV || 'sandbox').toLowerCase() === 'production'
    ? 'https://app.midtrans.com'
    : 'https://app.sandbox.midtrans.com';
}

function midtransAuthorization(env: Env) {
  return `Basic ${btoa(`${env.MIDTRANS_SERVER_KEY || ''}:`)}`;
}

async function midtransCreate(env: Env, payload: any) {
  if (!env.MIDTRANS_SERVER_KEY) throw new Error('midtrans_not_configured');
  const r = await fetch(`${midtransSnapBase(env)}/snap/v1/transactions`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: midtransAuthorization(env),
    },
    body: JSON.stringify(payload),
  });
  const data: any = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = Array.isArray(data?.error_messages)
      ? data.error_messages.join('; ')
      : data?.status_message || data?.message || `Midtrans HTTP ${r.status}`;
    throw new Error(msg);
  }
  if (!data?.redirect_url || !data?.token) throw new Error('midtrans_invalid_response');
  return { token: String(data.token), redirectUrl: String(data.redirect_url), raw: data };
}

function customerDetails(customer: any) {
  const name = String(customer?.name || 'AINFO User').slice(0, 100);
  const address = String(customer?.address || '').slice(0, 200);
  const city = String(customer?.city || '').slice(0, 100);
  const postal = String(customer?.postal_code || '').slice(0, 20);
  const phone = String(customer?.phone || '').slice(0, 32);
  const email = String(customer?.email || '').slice(0, 160);
  return {
    first_name: name,
    email,
    phone,
    billing_address: {
      first_name: name,
      email,
      phone,
      address,
      city,
      postal_code: postal,
      country_code: 'IDN',
    },
    shipping_address: {
      first_name: name,
      email,
      phone,
      address,
      city,
      postal_code: postal,
      country_code: 'IDN',
    },
  };
}

async function shopCheckout(req: Request, env: Env) {
  if (!csrfOk(req)) return json({ error: 'csrf_failed', message: 'Token keamanan tidak valid. Muat ulang halaman.' }, 403);
  const user = await currentUser(req, env);
  const d: any = await req.json().catch(() => ({}));
  const customer = d.customer || {};
  const items = Array.isArray(d.items) ? d.items.slice(0, 50) : [];
  const shipping = Math.max(0, Math.round(Number(d.shipping || 0)));
  if (!items.length || !customer.name || !customer.email || !customer.phone) {
    return json({ error: 'invalid_checkout', message: 'Data pembeli atau keranjang belum lengkap.' }, 400);
  }

  let subtotal = 0;
  const itemDetails: any[] = [];
  for (const item of items) {
    const price = Math.max(0, Math.round(Number(item.price || 0)));
    const qty = Math.max(1, Math.min(99, Math.round(Number(item.quantity || 1))));
    subtotal += price * qty;
    itemDetails.push({
      id: String(item.id || 'PRODUCT').slice(0, 50),
      price,
      quantity: qty,
      name: String(item.name || 'Produk AINFO').slice(0, 50),
      category: 'AINFO Shopping',
    });
  }
  if (shipping > 0) {
    itemDetails.push({ id: 'SHIPPING', price: shipping, quantity: 1, name: 'Ongkos Kirim', category: 'Shipping' });
  }

  const total = subtotal + shipping;
  const invoice = randomId('AINFO');
  const payload = {
    transaction_details: { order_id: invoice, gross_amount: total },
    item_details: itemDetails,
    customer_details: customerDetails(customer),
    callbacks: { finish: `${appDomain(env)}/#/payment-result` },
  };

  try {
    const pay = await midtransCreate(env, payload);
    await env.DB.prepare(
      `INSERT INTO orders(invoice,user_id,status,subtotal,shipping,total,customer_json,items_json,payment_provider,payment_url,payment_reference)
       VALUES(?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(
      invoice,
      user?.id || null,
      'pending',
      subtotal,
      shipping,
      total,
      JSON.stringify(customer),
      JSON.stringify(items),
      'MIDTRANS',
      pay.redirectUrl,
      pay.token,
    ).run();
    return json({
      ok: true,
      provider: 'midtrans',
      invoice_number: invoice,
      snap_token: pay.token,
      payment_url: pay.redirectUrl,
    });
  } catch (e: any) {
    const m = String(e?.message || e);
    return json({
      error: m.includes('midtrans_not_configured') ? 'midtrans_not_configured' : 'midtrans_unavailable',
      message: m.includes('midtrans_not_configured') ? 'MIDTRANS_SERVER_KEY belum dikonfigurasi.' : m,
    }, 503);
  }
}

async function giftCheckout(req: Request, env: Env) {
  if (!csrfOk(req)) return json({ error: 'csrf_failed', message: 'Token keamanan tidak valid. Muat ulang halaman.' }, 403);
  const user = await currentUser(req, env);
  if (!user) return json({ error: 'unauthorized', message: 'Silakan login terlebih dahulu.' }, 401);
  if (user.status !== 'active') return json({ error: 'account_suspended', message: 'Akun sedang ditangguhkan.' }, 403);

  const d: any = await req.json().catch(() => ({}));
  const author = String(d.author || 'Penulis AINFO').slice(0, 160);
  const amount = Math.max(5000, Math.min(5_000_000, Math.round(Number(d.amount || 0))));
  const message = String(d.message || '').slice(0, 300);
  const invoice = randomId('AINFO-GIFT');
  const customer = {
    name: user.full_name || user.username || 'AINFO User',
    email: user.email,
    phone: user.wa || '',
    address: user.address || '',
    city: user.city || '',
    postal_code: user.postal_code || '',
  };
  const payload = {
    transaction_details: { order_id: invoice, gross_amount: amount },
    item_details: [{ id: 'GIFT-AUTHOR', price: amount, quantity: 1, name: `Gift Author - ${author}`.slice(0, 50), category: 'Gift Author' }],
    customer_details: customerDetails(customer),
    callbacks: { finish: `${appDomain(env)}/#/payment-result` },
  };

  try {
    const pay = await midtransCreate(env, payload);
    await env.DB.prepare(
      `INSERT INTO gifts(invoice,user_id,author_name,author_slug,amount,message,status,payment_url,payment_reference)
       VALUES(?,?,?,?,?,?,?,?,?)`
    ).bind(invoice, user.id, author, slugify(author), amount, message, 'pending', pay.redirectUrl, pay.token).run();
    return json({
      ok: true,
      provider: 'midtrans',
      invoice_number: invoice,
      snap_token: pay.token,
      payment_url: pay.redirectUrl,
      method: 'Midtrans Snap',
    });
  } catch (e: any) {
    const m = String(e?.message || e);
    return json({
      error: m.includes('midtrans_not_configured') ? 'midtrans_not_configured' : 'midtrans_unavailable',
      message: m.includes('midtrans_not_configured') ? 'MIDTRANS_SERVER_KEY belum dikonfigurasi.' : m,
    }, 503);
  }
}

function mapOrderStatus(transactionStatus: string, statusCode: string, fraudStatus: string) {
  const tx = transactionStatus.toLowerCase();
  const fraud = fraudStatus.toLowerCase();
  if ((tx === 'settlement' || tx === 'capture') && statusCode === '200' && (!fraud || fraud === 'accept')) return 'paid';
  if (tx === 'pending' || (tx === 'capture' && fraud === 'challenge')) return 'pending';
  if (tx === 'deny' || tx === 'failure') return 'failed';
  if (tx === 'cancel') return 'cancelled';
  if (tx === 'expire') return 'expired';
  if (tx === 'refund' || tx === 'partial_refund') return 'refunded';
  return 'pending';
}

async function midtransWebhook(req: Request, env: Env) {
  if (!env.MIDTRANS_SERVER_KEY) return json({ error: 'midtrans_not_configured' }, 503);
  const raw = await req.text();
  let d: any;
  try { d = JSON.parse(raw); } catch { return json({ error: 'invalid_json' }, 400); }

  const orderId = String(d.order_id || '');
  const statusCode = String(d.status_code || '');
  const grossAmount = String(d.gross_amount || '');
  const signatureKey = String(d.signature_key || '').toLowerCase();
  const transactionStatus = String(d.transaction_status || '');
  const transactionId = String(d.transaction_id || '');
  const fraudStatus = String(d.fraud_status || '');
  if (!orderId || !statusCode || !grossAmount || !signatureKey) return json({ error: 'invalid_notification' }, 400);

  const expected = (await sha512Hex(`${orderId}${statusCode}${grossAmount}${env.MIDTRANS_SERVER_KEY}`)).toLowerCase();
  if (!timingSafe(expected, signatureKey)) return json({ error: 'invalid_signature' }, 401);

  const eventKey = await sha256Base64Url(`${orderId}|${transactionId}|${transactionStatus}|${statusCode}|${grossAmount}`);
  try {
    await env.DB.prepare(
      `INSERT INTO midtrans_webhook_events(event_key,order_id,transaction_id,status_code,transaction_status,fraud_status,payload_json,processed)
       VALUES(?,?,?,?,?,?,?,0)`
    ).bind(eventKey, orderId, transactionId, statusCode, transactionStatus, fraudStatus, raw).run();
  } catch {
    return json({ ok: true, duplicate: true });
  }

  const orderStatus = mapOrderStatus(transactionStatus, statusCode, fraudStatus);
  const giftStatus = orderStatus === 'cancelled' ? 'failed' : orderStatus;
  await env.DB.prepare(
    `UPDATE orders SET status=?,payment_provider='MIDTRANS',payment_reference=?,paid_at=CASE WHEN ?='paid' THEN COALESCE(paid_at,CURRENT_TIMESTAMP) ELSE paid_at END,updated_at=CURRENT_TIMESTAMP WHERE invoice=?`
  ).bind(orderStatus, transactionId, orderStatus, orderId).run();
  await env.DB.prepare(
    `UPDATE gifts SET status=?,payment_reference=?,paid_at=CASE WHEN ?='paid' THEN COALESCE(paid_at,CURRENT_TIMESTAMP) ELSE paid_at END,updated_at=CURRENT_TIMESTAMP WHERE invoice=?`
  ).bind(giftStatus, transactionId, giftStatus, orderId).run();
  await env.DB.prepare('UPDATE midtrans_webhook_events SET processed=1 WHERE event_key=?').bind(eventKey).run();
  return json({ ok: true, order_id: orderId, status: orderStatus });
}

async function health(req: Request, env: Env, ctx?: any) {
  const baseRes = await legacyWorker.fetch(req, env, ctx);
  let data: any = {};
  try { data = await baseRes.json(); } catch { data = { ok: true, version: '14.1.0', services: {} }; }
  const configured = midtransConfigured(env);
  data.version = '14.1.0';
  data.payment_provider = 'midtrans';
  data.midtrans_env = String(env.MIDTRANS_ENV || 'sandbox').toLowerCase();
  data.services = { ...(data.services || {}), midtrans: configured, doku: configured };
  return json(data, baseRes.status);
}

function rewriteHtml(html: string) {
  return html
    .replaceAll('/api/doku/checkout', '/api/midtrans/checkout')
    .replaceAll('DOKU Checkout', 'Midtrans Snap')
    .replaceAll('DOKU e-Wallet', 'Midtrans e-Wallet')
    .replaceAll('DOKU', 'Midtrans')
    .replaceAll('doku_not_configured', 'midtrans_not_configured');
}

async function maybeRewriteHtml(res: Response) {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('text/html')) return res;
  const headers = new Headers(res.headers);
  headers.delete('content-length');
  const body = rewriteHtml(await res.text());
  return new Response(body, { status: res.status, statusText: res.statusText, headers });
}

async function route(req: Request, env: Env, ctx?: any) {
  const url = new URL(req.url);
  const p = url.pathname;

  if (p === '/api/health' && req.method === 'GET') return health(req, env, ctx);
  if ((p === '/api/midtrans/checkout' || p === '/api/doku/checkout') && req.method === 'POST') return shopCheckout(req, env);
  if (p === '/api/gift/checkout' && req.method === 'POST') return giftCheckout(req, env);
  if (p === '/api/midtrans/webhook' && req.method === 'POST') return midtransWebhook(req, env);
  if (p === '/api/doku/webhook') return json({ error: 'provider_migrated', message: 'Payment provider telah dipindahkan ke Midtrans.' }, 410);

  const res = await legacyWorker.fetch(req, env, ctx);
  return maybeRewriteHtml(res);
}

export default {
  async fetch(req: Request, env: Env, ctx: any) {
    try {
      return await route(req, env, ctx);
    } catch (e: any) {
      console.error('AINFO Midtrans wrapper error', e);
      return json({ error: 'internal_error', message: 'Terjadi kesalahan server pembayaran.' }, 500);
    }
  },
  async scheduled(event: any, env: Env, ctx: any) {
    if (typeof legacyWorker.scheduled === 'function') return legacyWorker.scheduled(event, env, ctx);
  },
};
