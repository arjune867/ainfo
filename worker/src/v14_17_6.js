import previousWorker from './v14_17_5.js';

const VERSION='14.17.6';
const FAST_CSS='<link rel="stylesheet" href="/admin-video-sources-fast-v14.17.6.css?v=20260917a">';
const FAST_JS='<script src="/admin-video-sources-fast-v14.17.6.js?v=20260917a"></script>';

function isHtml(req,res){return req.method==='GET'&&String(res.headers.get('content-type')||'').toLowerCase().includes('text/html')}
async function decorate(req,res){
  const h=new Headers(res.headers);h.set('x-ainfo-version',VERSION);
  if(!isHtml(req,res))return new Response(res.body,{status:res.status,statusText:res.statusText,headers:h});
  const path=new URL(req.url).pathname;
  if(!path.startsWith('/admin'))return new Response(res.body,{status:res.status,statusText:res.statusText,headers:h});
  let body=await res.text();
  if(!body.includes('/admin-video-sources-fast-v14.17.6.css'))body=/<\/head>/i.test(body)?body.replace(/<\/head>/i,`${FAST_CSS}</head>`):FAST_CSS+body;
  if(!body.includes('/admin-video-sources-fast-v14.17.6.js'))body=/<\/body>/i.test(body)?body.replace(/<\/body>/i,`${FAST_JS}</body>`):body+FAST_JS;
  h.delete('content-length');h.set('x-ainfo-admin-video-load','progressive');
  return new Response(body,{status:res.status,statusText:res.statusText,headers:h});
}

export default{
  async fetch(req,env,ctx){return decorate(req,await previousWorker.fetch(req,env,ctx))},
  async scheduled(event,env,ctx){if(typeof previousWorker.scheduled==='function')return previousWorker.scheduled(event,env,ctx)}
};
