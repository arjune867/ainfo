import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const requireText = (value, name, max) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`Invalid ${name}`);
  return value.trim();
};
export function prepareArticle(input, now = new Date().toISOString()) {
  if (input.schemaVersion !== 1 || input.publish !== true) throw new Error('schemaVersion=1 and explicit publish=true required');
  const requestId = requireText(input.requestId, 'requestId', 140);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(requestId)) throw new Error('Invalid requestId');
  const slug = requireText(input.slug, 'slug', 140);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Invalid slug');
  const title = requireText(input.title, 'title', 300);
  const image = requireText(input.thumbnail, 'thumbnail', 220);
  if (!/^\/newsroom-images\/[a-z0-9][a-z0-9-]*\.(png|jpg|jpeg|webp)$/.test(image)) throw new Error('thumbnail must be a local newsroom image');
  if (!Array.isArray(input.blocks) || input.blocks.length < 1 || input.blocks.length > 500) throw new Error('Invalid blocks');
  let plain = '';
  const content = input.blocks.map(b => {
    const text = requireText(b.text, 'block text', 20000); plain += `${text} `;
    if (!['p','h2','h3','blockquote'].includes(b.type)) throw new Error('Unsupported block type');
    return `<${b.type}>${escapeHtml(text)}</${b.type}>`;
  }).join('\n');
  if (plain.trim().length < 80 || Buffer.byteLength(content) > 1200000) throw new Error('Invalid article length');
  if (input.sources !== undefined && (!Array.isArray(input.sources) || input.sources.length > 30)) throw new Error('Invalid sources');
  const sourceLinks = (input.sources || []).map(s => {
    const url = new URL(s.url);
    if (!['https:','http:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid source URL');
    return `<li><a href="${escapeHtml(url.href)}" rel="noopener noreferrer">${escapeHtml(requireText(s.title, 'source title', 300))}</a></li>`;
  });
  const contentHtml = content + (sourceLinks.length ? `<h2>Sumber</h2><ul>${sourceLinks.join('')}</ul>` : '');
  const description = requireText(input.metaDescription, 'metaDescription', 300);
  const author = input.author === undefined ? 'Tim AINFO' : requireText(input.author, 'author', 120);
  const tags = input.tags || [];
  if (!Array.isArray(tags) || tags.length > 20 || tags.some(t => typeof t !== 'string' || !t.trim() || t.length > 100)) throw new Error('Invalid tags');
  return {
    id: String(parseInt(createHash('sha256').update(`ainfo-newsroom:${requestId}`).digest('hex').slice(0,12),16)),
    slug, title, excerpt: description.slice(0,240), content_html: contentHtml,
    category: requireText(input.category || 'Nasional', 'category', 80), author_name: author,
    author_slug: author.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'tim-ainfo',
    image_url: image, image_caption: requireText(input.imageCaption, 'imageCaption', 300),
    status: 'published', read_minutes: String(Math.max(1,Math.ceil(plain.trim().split(/\s+/).length/220))),
    seo_title: requireText(input.metaTitle || title, 'metaTitle', 300), seo_description: description,
    canonical_url: `https://ainfo.web.id/read/${slug}/`, published_at: now,
    tags_json: JSON.stringify(tags), keywords: tags.join(', ').slice(0,1000), modified_at: now,
  };
}
export function insertQuery(article) {
  const columns = Object.keys(article);
  return {sql:`INSERT INTO articles (${columns.join(',')}) VALUES (${columns.map(()=>'?').join(',')})`,params:columns.map(k=>article[k])};
}
export function sameArticle(existing, article) {
  return Object.keys(article).filter(k=>!['published_at','modified_at'].includes(k)).every(k=>String(existing[k])===String(article[k]));
}

export function toAdminArticle(row) {
  let content = [];
  let tags = [];
  try { content = JSON.parse(row.content_json || '[]'); } catch {}
  try { tags = JSON.parse(row.tags_json || '[]'); } catch {}
  const published = row.published_at || row.modified_at || row.updated_at || '';
  const image = String(row.image_url || '');
  return {
    id: Number(row.id) || row.id, slug: String(row.slug || ''), title: String(row.title || ''),
    cat: String(row.category || 'Berita'), category: String(row.category || 'Berita'),
    excerpt: String(row.excerpt || ''), content: Array.isArray(content) ? content : [],
    contentHtml: String(row.content_html || ''), content_html: String(row.content_html || ''),
    author: String(row.author_name || 'Tim AINFO'), image, image_url: image,
    imageCaption: String(row.image_caption || ''), image_caption: String(row.image_caption || ''),
    status: String(row.status || 'draft'), publishedISO: String(published), published_at: String(row.published_at || ''),
    modifiedISO: String(row.modified_at || row.updated_at || published), modified_at: String(row.modified_at || row.updated_at || ''),
    time: published ? new Date(published).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB' : '',
    read: `${Number(row.read_minutes || 5)} menit baca`, read_time: `${Number(row.read_minutes || 5)} menit baca`,
    views: Number(row.views || 0), headline: Boolean(row.headline), breaking: Boolean(row.breaking),
    editorPick: Boolean(row.editor_pick), editor_pick: Boolean(row.editor_pick),
    tags: Array.isArray(tags) ? tags : [], keywords: String(row.keywords || ''),
    seoTitle: String(row.seo_title || ''), seo_title: String(row.seo_title || ''),
    seoDescription: String(row.seo_description || ''), seo_description: String(row.seo_description || ''),
    canonicalUrl: String(row.canonical_url || ''), canonical_url: String(row.canonical_url || ''),
    audioUrl: String(row.audio_url || ''), audio_url: String(row.audio_url || ''),
  };
}

export function mergePublishedArticles(existing, publishedRows) {
  const out = Array.isArray(existing) ? [...existing] : [];
  for (const row of publishedRows || []) {
    const article = toAdminArticle(row);
    const index = out.findIndex(item => String(item.slug || '') === article.slug || String(item.id) === String(article.id));
    if (index >= 0) out[index] = { ...out[index], ...article };
    else out.unshift(article);
  }
  return out;
}
export async function main() {
  const root = process.cwd();
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !account) throw new Error('Cloudflare credentials missing');
  // Resolve the deployed DB binding from the checked-in config; never print credentials.
  const configText = await fs.readFile(path.join(root,'wrangler.jsonc'),'utf8');
  const database = configText.match(/"database_id"\s*:\s*"([a-f0-9-]+)"/)?.[1];
  if (!database) throw new Error('Database ID missing');
  async function query(body) {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${database}/query`,{
      method:'POST', headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30000),
    });
    const data = await r.json();
    if (!r.ok || data.success === false || !Array.isArray(data.result) || data.result.some(x=>x.success===false)) throw new Error(`D1 query failed (${r.status}): ${JSON.stringify(data.errors || []).slice(0,300)}`);
    return data.result[0]?.results || [];
  }
  await query({sql:'SELECT id FROM articles LIMIT 1'});
  console.log('AINFO newsroom: authenticated database connection verified.');
  const files = (await fs.readdir(path.join(root,'newsroom/requests'))).filter(n=>n.endsWith('.json')).sort();
  const queue = [];
  // Validate every request and thumbnail before any publication occurs.
  for (const file of files) {
    const input = JSON.parse(await fs.readFile(path.join(root,'newsroom/requests',file),'utf8'));
    const article = prepareArticle(input);
    const bytes = await fs.readFile(path.join(root,'public',article.image_url.slice(1)));
    const png = bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const jpeg = bytes[0]===255 && bytes[1]===216 && bytes[2]===255;
    const webp = bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP';
    const ext = path.extname(article.image_url);
    if (!bytes.length || bytes.length > 8*1024*1024 || !({'.png':png,'.jpg':jpeg,'.jpeg':jpeg,'.webp':webp}[ext])) throw new Error(`Invalid thumbnail: ${file}`);
    const imageResponse = await fetch(`https://ainfo.web.id${article.image_url}`,{method:'HEAD',signal:AbortSignal.timeout(30000)});
    if (!imageResponse.ok || !imageResponse.headers.get('content-type')?.startsWith('image/')) throw new Error(`Thumbnail not deployed: ${file}`);
    queue.push({file,article});
  }
  if (process.argv.includes('--check')) {console.log(`Readiness check passed; ${queue.length} requests validated; no articles published.`);return;}
  const results=[];
  for (const {file,article} of queue) {
    const rows=await query({sql:'SELECT * FROM articles WHERE slug=? OR id=?',params:[article.slug,article.id]});
    if (rows.length) {
      if (rows.length!==1 || !sameArticle(rows[0],article)) throw new Error(`Existing article conflict: ${file}; no overwrite performed`);
      results.push({file,status:'already-published',url:article.canonical_url});continue;
    }
    await query(insertQuery(article));
    const saved=await query({sql:'SELECT * FROM articles WHERE id=?',params:[article.id]});
    if (saved.length!==1 || !sameArticle(saved[0],article)) throw new Error(`Publication verification failed: ${file}`);
    results.push({file,status:'published',url:article.canonical_url});
  }
  // Keep the public homepage and admin dashboard in sync with the canonical D1 articles.
  const publishedRows = await query({sql:"SELECT * FROM articles WHERE status='published' ORDER BY COALESCE(published_at, updated_at) DESC LIMIT 500"});
  const stateRows = await query({sql:"SELECT value_json FROM app_state WHERE key=?",params:["ainfo-admin-articles"]});
  let currentArticles = [];
  try { currentArticles = JSON.parse(stateRows[0]?.value_json || '[]'); } catch {}
  const syncedArticles = mergePublishedArticles(currentArticles, publishedRows);
  await query({
    sql:"INSERT INTO app_state(key,value_json,version,updated_at) VALUES(?,?,1,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,version=app_state.version+1,updated_at=CURRENT_TIMESTAMP",
    params:["ainfo-admin-articles", JSON.stringify(syncedArticles)]
  });
  console.log(JSON.stringify({publications:results, syncedPublishedArticles:publishedRows.length, adminStateArticles:syncedArticles.length},null,2));
  if (process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,`\n### AINFO publication\n${results.length ? results.map(r=>`- ${r.status}: [${r.file}](${r.url})`).join('\n') : 'No new publication requests.'}\n- Published articles synchronized to homepage/admin state: ${publishedRows.length}.\n`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e=>{console.error(e.message);process.exitCode=1;});
