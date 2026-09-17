import previousWorker from './v14_17_4.js';

const VERSION='14.17.5';
const AUTO_CSS='<link rel="stylesheet" href="/video-autohide-v14.17.5.css?v=20260917a">';
const AUTO_JS='<script src="/video-autohide-v14.17.5.js?v=20260917a"></script>';

function isHtml(req,res){return req.method==='GET'&&String(res.headers.get('content-type')||'').toLowerCase().includes('text/html')}
async function decorate(req,res){
  if(!isHtml(req,res)){
    const h=new Headers(res.headers);h.set('x-ainfo-version',VERSION);return new Response(res.body,{status:res.status,statusText:res.statusText,headers:h});
  }
  let body=await res.text();
  if(!body.includes('/video-autohide-v14.17.5.css'))body=/<\/head>/i.test(body)?body.replace(/<\/head>/i,`${AUTO_CSS}</head>`):AUTO_CSS+body;
  if(!body.includes('/video-autohide-v14.17.5.js'))body=/<\/body>/i.test(body)?body.replace(/<\/body>/i,`${AUTO_JS}</body>`):body+AUTO_JS;
  const h=new Headers(res.headers);h.delete('content-length');h.set('x-ainfo-version',VERSION);h.set('x-ainfo-video-mode','production-autohide');
  return new Response(body,{status:res.status,statusText:res.statusText,headers:h});
}

export default{
  async fetch(req,env,ctx){return decorate(req,await previousWorker.fetch(req,env,ctx))},
  async scheduled(event,env,ctx){if(typeof previousWorker.scheduled==='function')return previousWorker.scheduled(event,env,ctx)}
};
