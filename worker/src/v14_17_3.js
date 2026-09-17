import previousWorker from './v14_17_2.js';

const VERSION='14.17.3';
const FIX_CSS='<link rel="stylesheet" href="/video-display-v14.17.3.css?v=20260917b">';
const FIX_JS='<script src="/video-display-v14.17.3.js?v=20260917b"></script>';
const FRAME_SOURCES='https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com https://youtube-nocookie.com https://www.tiktok.com https://player.tiktok.com https://www.dailymotion.com https://geo.dailymotion.com';

function isHtml(req,res){return req.method==='GET'&&String(res.headers.get('content-type')||'').toLowerCase().includes('text/html')}
function patchCsp(headers){
  const csp=headers.get('content-security-policy')||'';
  if(!csp)return;
  if(/frame-src\s+[^;]+/i.test(csp)){
    headers.set('content-security-policy',csp.replace(/frame-src\s+([^;]+)/i,(m,current)=>`frame-src ${current} ${FRAME_SOURCES}`));
  }else{
    headers.set('content-security-policy',`${csp.replace(/;?\s*$/,'')}; frame-src ${FRAME_SOURCES};`);
  }
}
async function decorate(req,res){
  const headers=new Headers(res.headers);
  patchCsp(headers);
  headers.set('x-ainfo-version',VERSION);
  headers.set('x-ainfo-video-player','external-embed-enabled');
  if(!isHtml(req,res))return new Response(res.body,{status:res.status,statusText:res.statusText,headers});
  let body=await res.text();
  if(!body.includes('/video-display-v14.17.3.css'))body=/<\/head>/i.test(body)?body.replace(/<\/head>/i,`${FIX_CSS}</head>`):FIX_CSS+body;
  if(!body.includes('/video-display-v14.17.3.js'))body=/<\/body>/i.test(body)?body.replace(/<\/body>/i,`${FIX_JS}</body>`):body+FIX_JS;
  headers.delete('content-length');
  return new Response(body,{status:res.status,statusText:res.statusText,headers});
}

export default{
  async fetch(req,env,ctx){
    const res=await previousWorker.fetch(req,env,ctx);
    return decorate(req,res);
  },
  async scheduled(event,env,ctx){
    if(typeof previousWorker.scheduled==='function')return previousWorker.scheduled(event,env,ctx);
  }
};
