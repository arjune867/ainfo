import previousWorker from './v14_13.js';

const VERSION='14.14.0';
const FIX_CSS='<link rel="stylesheet" href="/engagement-v14.14-fix.css?v=20260917a">';
const FIX_JS='<script src="/engagement-v14.14-fix.js?v=20260917a"></script>';

function json(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-ainfo-version':VERSION,...headers}})}

async function ensureProduct(env,id){
  id=Number(id||0);if(!id||!env.DB)return false;
  const existing=await env.DB.prepare('SELECT id FROM products WHERE id=? LIMIT 1').bind(id).first();
  if(existing)return true;
  const slug=`catalog-product-${id}`;
  await env.DB.prepare(`INSERT OR IGNORE INTO products(
    id,name,slug,category,description,image_url,gallery_json,price,compare_at_price,stock,sku,weight_grams,seller_city,flash_sale,rating,sold_count,status
  ) VALUES(?,?,?,'Umum','','','[]',0,0,999,'',0,'',0,0,0,'active')`).bind(id,`Produk AINFO #${id}`,slug).run();
  return true;
}

function emptyShop(productId,extra={}){
  return json({ok:true,version:VERSION,product_id:Number(productId),summary:{rating:0,rating_count:0,review_count:0,discussion_count:0,breakdown:{1:0,2:0,3:0,4:0,5:0}},comments:[],...extra});
}

async function handleShopGet(req,env,ctx){
  const u=new URL(req.url),productId=Number(u.searchParams.get('product_id')||0);if(!productId)return json({error:'invalid_product'},400);
  try{await ensureProduct(env,productId)}catch(error){console.warn('AINFO V14.14 product bootstrap failed',error)}
  try{
    const res=await previousWorker.fetch(req,env,ctx);
    if(res.ok)return res;
    const clone=res.clone();const data=await clone.json().catch(()=>({}));
    if(res.status===404&&['product_not_found','not_found'].includes(String(data.error||'')))return emptyShop(productId,{bootstrapped:true});
    return res;
  }catch(error){
    console.error('AINFO V14.14 shop get fallback',error);
    return emptyShop(productId,{degraded:true});
  }
}

async function handleShopPost(req,env,ctx){
  let productId=0;
  try{const d=await req.clone().json();productId=Number(d.product_id||0)}catch{}
  if(productId){try{await ensureProduct(env,productId)}catch(error){console.error('AINFO V14.14 product ensure post failed',error)}}
  return previousWorker.fetch(req,env,ctx);
}

function isHtml(req,res){return req.method==='GET'&&String(res.headers.get('content-type')||'').toLowerCase().includes('text/html')}
async function inject(req,res){
  if(!isHtml(req,res))return res;
  let body=await res.text();
  if(!body.includes('/engagement-v14.14-fix.css'))body=/<\/head>/i.test(body)?body.replace(/<\/head>/i,`${FIX_CSS}</head>`):FIX_CSS+body;
  if(!body.includes('/engagement-v14.14-fix.js'))body=/<\/body>/i.test(body)?body.replace(/<\/body>/i,`${FIX_JS}</body>`):body+FIX_JS;
  const headers=new Headers(res.headers);headers.delete('content-length');headers.set('x-ainfo-version',VERSION);headers.set('x-ainfo-engagement-fix','reply-shop-reaction');
  return new Response(body,{status:res.status,statusText:res.statusText,headers});
}

async function route(req,env,ctx){
  const u=new URL(req.url),p=u.pathname;
  if(p==='/api/shop/engagement'&&req.method==='GET')return handleShopGet(req,env,ctx);
  if(p==='/api/shop/comment'&&req.method==='POST')return handleShopPost(req,env,ctx);
  const res=await previousWorker.fetch(req,env,ctx);return inject(req,res);
}

export default{
  async fetch(req,env,ctx){try{return await route(req,env,ctx)}catch(error){console.error('AINFO V14.14 wrapper error',error);return previousWorker.fetch(req,env,ctx)}},
  async scheduled(event,env,ctx){if(typeof previousWorker.scheduled==='function')return previousWorker.scheduled(event,env,ctx)}
};
