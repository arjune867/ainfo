import previousWorker from './v14_12.js';

const VERSION='14.13.0';
const SHOP_LOADER='<script src="/shop-engagement-v14.13.js?v=20260917a"></script>';

function shouldInject(req,res){return req.method==='GET'&&String(res.headers.get('content-type')||'').toLowerCase().includes('text/html')}
async function inject(req,res){
  if(!shouldInject(req,res))return res;
  let body=await res.text();
  if(!body.includes('/shop-engagement-v14.13.js'))body=/<\/body>/i.test(body)?body.replace(/<\/body>/i,`${SHOP_LOADER}</body>`):body+SHOP_LOADER;
  const headers=new Headers(res.headers);headers.delete('content-length');headers.set('x-ainfo-version',VERSION);headers.set('x-ainfo-shop-engagement','v14.13');
  return new Response(body,{status:res.status,statusText:res.statusText,headers});
}

export default{
  async fetch(req,env,ctx){try{return await inject(req,await previousWorker.fetch(req,env,ctx))}catch(error){console.error('AINFO V14.13 shop visibility wrapper error',error);return previousWorker.fetch(req,env,ctx)}},
  async scheduled(event,env,ctx){if(typeof previousWorker.scheduled==='function')return previousWorker.scheduled(event,env,ctx)}
};
