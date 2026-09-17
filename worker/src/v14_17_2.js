import previousWorker from './v14_17_1.js';

const VERSION='14.17.2';
const ADMIN_HELPER='<script src="/youtube-source-v14.17.2.js?v=20260917a"></script>';

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-ainfo-version':VERSION}})}
function isChannelId(v){return /^UC[A-Za-z0-9_-]{20,}$/.test(String(v||'').trim())}
function extractYouTubeRef(value){const raw=String(value||'').trim();if(!raw)return{};if(isChannelId(raw))return{id:raw};const mChannel=raw.match(/youtube\.com\/channel\/(UC[A-Za-z0-9_-]{20,})/i);if(mChannel)return{id:mChannel[1]};const mHandle=raw.match(/youtube\.com\/@([^\/?#]+)/i);if(mHandle)return{handle:'@'+mHandle[1]};if(/^@?[A-Za-z0-9._-]+$/.test(raw))return{handle:raw.startsWith('@')?raw:'@'+raw};return{} }
async function resolveYouTube(env,input){const parsed=extractYouTubeRef(input);if(parsed.id)return{id:parsed.id,title:''};if(!parsed.handle)throw new Error('Gunakan Channel ID, @handle, atau URL channel YouTube.');const key=String(env.YOUTUBE_API_KEY||'').trim();if(!key)throw new Error('YOUTUBE_API_KEY belum diatur di Cloudflare Secret.');const u=new URL('https://www.googleapis.com/youtube/v3/channels');u.searchParams.set('part','id,snippet');u.searchParams.set('forHandle',parsed.handle);u.searchParams.set('key',key);const r=await fetch(u);const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error?.message||'Gagal membaca channel YouTube.');const ch=d.items?.[0];if(!ch?.id)throw new Error(`Channel YouTube ${parsed.handle} tidak ditemukan.`);return{id:ch.id,title:ch.snippet?.title||''}}
async function normalizeStoredSources(env){if(!env.DB||!env.YOUTUBE_API_KEY)return;let rows;try{rows=await env.DB.prepare("SELECT id,name,external_id FROM video_sources WHERE provider='youtube'").all()}catch{return}for(const s of rows.results||[]){if(isChannelId(s.external_id))continue;try{const r=await resolveYouTube(env,s.external_id);await env.DB.prepare("UPDATE video_sources SET external_id=?,name=CASE WHEN name IS NULL OR name='' OR lower(name)='youtube' THEN ? ELSE name END,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(r.id,r.title||'YouTube',s.id).run()}catch(e){console.warn('AINFO YouTube source normalize skipped',s.external_id,e?.message||e)}}}
async function rewriteYouTubeSourcePost(req,env){const d=await req.clone().json().catch(()=>null);if(!d||d.provider!=='youtube')return req;const r=await resolveYouTube(env,d.external_id);d.external_id=r.id;d.source_type='channel';if(!String(d.name||'').trim()||String(d.name).toLowerCase()==='youtube')d.name=r.title||'YouTube';const headers=new Headers(req.headers);headers.set('content-type','application/json; charset=utf-8');headers.delete('content-length');return new Request(req.url,{method:'POST',headers,body:JSON.stringify(d),redirect:req.redirect})}
function isHtml(req,res){return req.method==='GET'&&String(res.headers.get('content-type')||'').toLowerCase().includes('text/html')}
async function injectAdminHelper(req,res){if(!isHtml(req,res))return res;const path=new URL(req.url).pathname;if(!path.startsWith('/admin'))return res;let body=await res.text();if(!body.includes('/youtube-source-v14.17.2.js'))body=/<\/body>/i.test(body)?body.replace(/<\/body>/i,`${ADMIN_HELPER}</body>`):body+ADMIN_HELPER;const h=new Headers(res.headers);h.delete('content-length');h.set('x-ainfo-version',VERSION);return new Response(body,{status:res.status,statusText:res.statusText,headers:h})}

export default{
  async fetch(req,env,ctx){
    const u=new URL(req.url);
    if(u.pathname==='/api/admin/video-sources'&&req.method==='POST'){
      try{return previousWorker.fetch(await rewriteYouTubeSourcePost(req,env),env,ctx)}catch(e){return json({error:'youtube_source_invalid',message:String(e?.message||e)},400)}
    }
    if(u.pathname==='/api/admin/video-sources/sync'&&req.method==='POST'){
      await normalizeStoredSources(env);
      return previousWorker.fetch(req,env,ctx);
    }
    const res=await previousWorker.fetch(req,env,ctx);
    return injectAdminHelper(req,res);
  },
  async scheduled(event,env,ctx){
    await normalizeStoredSources(env);
    if(typeof previousWorker.scheduled==='function')return previousWorker.scheduled(event,env,ctx);
  }
};
