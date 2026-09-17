import previousWorker from './v14_14.js';

const VERSION='14.15.0';
const SHOP_ACTIONS='<script src="/shop-actions-v14.15.js?v=20260917a"></script>';

function isHtml(req,res){return req.method==='GET'&&String(res.headers.get('content-type')||'').toLowerCase().includes('text/html')}
async function inject(req,res){
  if(!isHtml(req,res))return res;
  let body=await res.text();
  if(!body.includes('/shop-actions-v14.15.js'))body=/<\/body>/i.test(body)?body.replace(/<\/body>/i,`${SHOP_ACTIONS}</body>`):body+SHOP_ACTIONS;
  const headers=new Headers(res.headers);headers.delete('content-length');headers.set('x-ainfo-version',VERSION);headers.set('x-ainfo-shop-actions','v14.15');
  return new Response(body,{status:res.status,statusText:res.statusText,headers});
}

export default{
  async fetch(req,env,ctx){try{return await inject(req,await previousWorker.fetch(req,env,ctx))}catch(error){console.error('AINFO V14.15 shop actions wrapper error',error);return previousWorker.fetch(req,env,ctx)}},
  async scheduled(event,env,ctx){if(typeof previousWorker.scheduled==='function')return previousWorker.scheduled(event,env,ctx)}
};
