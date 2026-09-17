import previousWorker from './v14_15.js';

const VERSION='14.16.0';
const CSS='<link rel="stylesheet" href="/shop-mobile-v14.16.css?v=20260917a">';
const JS='<script src="/shop-mobile-v14.16.js?v=20260917a"></script>';

function isHtml(req,res){return req.method==='GET'&&String(res.headers.get('content-type')||'').toLowerCase().includes('text/html')}
async function inject(req,res){
  if(!isHtml(req,res))return res;
  let body=await res.text();
  if(!body.includes('/shop-mobile-v14.16.css'))body=/<\/head>/i.test(body)?body.replace(/<\/head>/i,`${CSS}</head>`):CSS+body;
  if(!body.includes('/shop-mobile-v14.16.js'))body=/<\/body>/i.test(body)?body.replace(/<\/body>/i,`${JS}</body>`):body+JS;
  const headers=new Headers(res.headers);headers.delete('content-length');headers.set('x-ainfo-version',VERSION);headers.set('x-ainfo-shop-mobile','v14.16');
  return new Response(body,{status:res.status,statusText:res.statusText,headers});
}

export default{
  async fetch(req,env,ctx){try{return await inject(req,await previousWorker.fetch(req,env,ctx))}catch(error){console.error('AINFO V14.16 mobile shop wrapper error',error);return previousWorker.fetch(req,env,ctx)}},
  async scheduled(event,env,ctx){if(typeof previousWorker.scheduled==='function')return previousWorker.scheduled(event,env,ctx)}
};
