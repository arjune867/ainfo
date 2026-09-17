import previousWorker from './v14_17_3.js';

const VERSION='14.17.4';
const PROD_CSS='<link rel="stylesheet" href="/video-production-v14.17.4.css?v=20260917a">';
const PROD_JS='<script src="/video-production-v14.17.4.js?v=20260917a"></script>';

function isHtml(req,res){return req.method==='GET'&&String(res.headers.get('content-type')||'').toLowerCase().includes('text/html')}

async function scrubPublicVideoFeed(res){
  try{
    const d=await res.clone().json();
    if(!Array.isArray(d?.videos))return res;
    d.videos=d.videos.map(v=>v?.provider&&v.provider!=='ainfo'?{...v,stats:{}}:v);
    const h=new Headers(res.headers);
    h.delete('content-length');
    h.set('content-type','application/json; charset=utf-8');
    h.set('x-ainfo-version',VERSION);
    h.set('x-ainfo-video-stats','external-hidden');
    return new Response(JSON.stringify(d),{status:res.status,statusText:res.statusText,headers:h});
  }catch{return res}
}

async function decorateHtml(req,res){
  if(!isHtml(req,res))return res;
  let body=await res.text();
  if(!body.includes('/video-production-v14.17.4.css'))body=/<\/head>/i.test(body)?body.replace(/<\/head>/i,`${PROD_CSS}</head>`):PROD_CSS+body;
  if(!body.includes('/video-production-v14.17.4.js'))body=/<\/body>/i.test(body)?body.replace(/<\/body>/i,`${PROD_JS}</body>`):body+PROD_JS;
  const h=new Headers(res.headers);h.delete('content-length');h.set('x-ainfo-version',VERSION);h.set('x-ainfo-video-mode','production-clean');
  return new Response(body,{status:res.status,statusText:res.statusText,headers:h});
}

export default{
  async fetch(req,env,ctx){
    const u=new URL(req.url);
    const res=await previousWorker.fetch(req,env,ctx);
    if(u.pathname==='/api/videos/feed'&&req.method==='GET')return scrubPublicVideoFeed(res);
    return decorateHtml(req,res);
  },
  async scheduled(event,env,ctx){
    if(typeof previousWorker.scheduled==='function')return previousWorker.scheduled(event,env,ctx);
  }
};
