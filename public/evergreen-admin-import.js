(()=>{'use strict';
const PACK='/content/evergreen-home-garden-drafts.json';
const cookie=(name)=>{const hit=document.cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='));return hit?decodeURIComponent(hit.slice(name.length+1)):''};
const esc=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function mount(){
 if(!location.pathname.startsWith('/admin'))return;
 if(document.getElementById('ainfo-evergreen-import'))return;
 const root=document.createElement('section');root.id='ainfo-evergreen-import';root.style.cssText='margin:18px auto;padding:18px;border:1px solid #cbd5e1;border-radius:14px;background:#f0fdf4;color:#163b2a;max-width:1100px;font:14px/1.5 system-ui';
 root.innerHTML='<div style="display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap"><div><strong style="font-size:17px">Evergreen Content Import</strong><div>Import six original English Home & Garden articles as drafts. Existing published content will not be deleted.</div></div><button id="ainfo-load-drafts" type="button" style="border:0;border-radius:9px;background:#276749;color:white;padding:11px 16px;font-weight:700;cursor:pointer">Load 6 article drafts</button></div><div id="ainfo-import-status" role="status" style="margin-top:12px"></div>';
 const target=document.querySelector('main')||document.querySelector('#app')||document.body;target.prepend(root);
 root.querySelector('button').addEventListener('click',async()=>{
  const btn=root.querySelector('button'),status=root.querySelector('#ainfo-import-status');
  btn.disabled=true;btn.textContent='Importing…';status.textContent='Checking admin session and loading the draft pack…';
  try{
   const packRes=await fetch(PACK,{cache:'no-store'});if(!packRes.ok)throw new Error('Draft pack could not be loaded ('+packRes.status+').');
   const pack=await packRes.json();if(!Array.isArray(pack.articles)||!pack.articles.length)throw new Error('The draft pack is empty.');
   const token=cookie('ainfo_csrf');if(!token)throw new Error('CSRF token is missing. Sign out and sign in again, then retry.');
   if(!confirm('Import '+pack.articles.length+' English articles as DRAFTS? They will not be published automatically.'))return;
   const results=[];
   for(const a of pack.articles){
    const payload={...a,content:a.content||[],status:'draft',publishedISO:null,canonicalUrl:'https://www.ainfo.web.id/read/'+a.slug+'/'};
    const res=await fetch('/api/admin/articles',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json','x-csrf-token':token},body:JSON.stringify(payload)});
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data.ok)throw new Error('Failed on "'+a.title+'": '+(data.message||data.error||res.status));
    results.push(data.article?.title||a.title);status.innerHTML='<b>'+results.length+'/'+pack.articles.length+' saved</b><br>'+results.map(esc).join('<br>');
   }
   status.innerHTML='<b>Success: '+results.length+' drafts saved.</b><br>'+results.map(esc).join('<br>')+'<br><span>Review each draft, add a licensed thumbnail, and publish it manually when ready.</span>';
  }catch(e){status.textContent='Import stopped: '+e.message}
  finally{btn.disabled=false;btn.textContent='Load 6 article drafts'}
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();