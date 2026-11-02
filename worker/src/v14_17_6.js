import previousWorker from './v14_17_5.js';

const VERSION='14.17.7';
const FAST_CSS='<link rel="stylesheet" href="/admin-video-sources-fast-v14.17.6.css?v=20260917a">';
const FAST_JS='<script src="/admin-video-sources-fast-v14.17.6.js?v=20260917a"></script>';
const ADSENSE='<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1267510049036918" crossorigin="anonymous"></script>';
const EVERGREEN_CATEGORIES=['Home & Garden','Home and Garden','Gardening','DIY','Home Improvement','Indoor Plants','Outdoor Living','Landscaping','Sustainable Living','Kitchen Garden','Houseplants'];

function isHtml(req,res){return req.method==='GET'&&String(res.headers.get('content-type')||'').toLowerCase().includes('text/html')}
function xmlEscape(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]))}
function site(env){return String(env.DOMAIN||'https://www.ainfo.web.id').replace(/\/$/,'')}
function categoryAllowed(value){return EVERGREEN_CATEGORIES.some(x=>x.toLowerCase()===String(value||'').trim().toLowerCase())}
function xml(body){return new Response(body,{status:200,headers:{'content-type':'application/xml; charset=utf-8','cache-control':'public, max-age=300','x-ainfo-version':VERSION}})}

async function publicArticles(req,env,ctx){
  const res=await previousWorker.fetch(req,env,ctx);
  if(!res.ok)return res;
  try{
    const data=await res.json();
    if(Array.isArray(data.articles))data.articles=data.articles.filter(a=>categoryAllowed(a.category||a.cat));
    return new Response(JSON.stringify(data),{status:res.status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-ainfo-version':VERSION}});
  }catch{return res}
}

async function evergreenSitemap(env){
  const rows=await env.DB.prepare("SELECT slug,title,published_at,COALESCE(modified_at,updated_at) AS modified_at FROM articles WHERE status='published' AND published_at IS NOT NULL ORDER BY published_at DESC LIMIT 50000").all();
  const items=(rows.results||[]).filter(a=>categoryAllowed(a.category));
  const base=site(env);
  const urls=[`<url><loc>${base}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,...items.map(a=>`<url><loc>${xmlEscape(base+'/read/'+encodeURIComponent(a.slug)+'/')}</loc>${a.modified_at?'<lastmod>'+xmlEscape(new Date(a.modified_at).toISOString().slice(0,10))+'</lastmod>':''}<changefreq>monthly</changefreq><priority>0.8</priority></url>`)];
  return xml('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls.join('')+'</urlset>');
}

async function decorate(req,res){
  const h=new Headers(res.headers);h.set('x-ainfo-version',VERSION);
  if(!isHtml(req,res))return new Response(res.body,{status:res.status,statusText:res.statusText,headers:h});
  const path=new URL(req.url).pathname;
  let body=await res.text();
  // The previous homepage injected every legacy news URL into visible HTML. Remove that list during the evergreen transition.
  body=body.replace(/<section[^>]*aria-label="Daftar artikel AINFO"[\s\S]*?<\/section>/i,'');
  if(path.startsWith('/read/')){
    body=body.replace(/<html lang="id"/i,'<html lang="en"');
    body=body.replace(/NewsArticle/g,'BlogPosting').replace(/NewsMediaOrganization/g,'Organization').replace(/id-ID/g,'en-US').replace(/id_ID/g,'en_US');
    body=body.replace(/Daftar Isi/g,'Table of Contents').replace(/Beranda/g,'Home').replace(/menit baca/g,'min read').replace(/Buka versi interaktif AINFO/g,'Read on AINFO');
    body=body.replace(/Berita yang Lebih Bermakna/g,'Practical ideas for better homes and gardens');
  }
  if(!body.includes('ca-pub-1267510049036918'))body=/<\/head>/i.test(body)?body.replace(/<\/head>/i,ADSENSE+'</head>'):ADSENSE+body;
  if(path.startsWith('/admin')){
    if(!body.includes('/admin-video-sources-fast-v14.17.6.css'))body=/<\/head>/i.test(body)?body.replace(/<\/head>/i,FAST_CSS+'</head>'):FAST_CSS+body;
    if(!body.includes('/admin-video-sources-fast-v14.17.6.js'))body=/<\/body>/i.test(body)?body.replace(/<\/body>/i,FAST_JS+'</body>'):body+FAST_JS;
    h.set('x-ainfo-admin-video-load','progressive');
  }
  h.delete('content-length');
  return new Response(body,{status:res.status,statusText:res.statusText,headers:h});
}

export default{
  async fetch(req,env,ctx){
    const u=new URL(req.url),p=u.pathname;
    try{
      if(p==='/api/articles'&&req.method==='GET')return publicArticles(req,env,ctx);
      if(p==='/sitemap.xml'&&req.method==='GET')return evergreenSitemap(env);
      if(p==='/news-sitemap.xml'&&req.method==='GET')return xml('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"></urlset>');
      const match=p.match(/^\/read\/([^/]+)\/?$/);
      if(match&&req.method==='GET'){
        const row=await env.DB.prepare("SELECT category FROM articles WHERE slug=? AND status='published' LIMIT 1").bind(decodeURIComponent(match[1])).first();
        if(row&&!categoryAllowed(row.category))return new Response('Article no longer available in the Home & Garden edition.',{status:404,headers:{'content-type':'text/plain; charset=utf-8','x-robots-tag':'noindex,follow','x-ainfo-version':VERSION}});
      }
      return decorate(req,await previousWorker.fetch(req,env,ctx));
    }catch(e){console.error('AINFO evergreen transition',e);return decorate(req,await previousWorker.fetch(req,env,ctx))}
  },
  async scheduled(event,env,ctx){if(typeof previousWorker.scheduled==='function')return previousWorker.scheduled(event,env,ctx)}
};
