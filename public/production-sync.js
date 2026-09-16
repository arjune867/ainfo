(function(){
  'use strict';
  const STATE_KEYS=['ainfo-v9-state','ainfo-admin-articles','ainfo-admin-products','ainfo-admin-videos','ainfo-admin-jobs','ainfo-footer-pages','ainfo-push-campaigns','ainfo-shop-categories','ainfo-job-settings'];
  const isHttp=/^https?:$/.test(location.protocol);
  const originalFetch=window.fetch.bind(window);
  const nativeSet=Storage.prototype.setItem;
  const nativeRemove=Storage.prototype.removeItem;
  let syncing=false, saveTimers=new Map();

  function getCookie(name){return document.cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.split('=').slice(1).join('=')||''}
  async function csrf(){
    let t=decodeURIComponent(getCookie('ainfo_csrf')||'');
    if(t)return t;
    try{const r=await originalFetch('/api/auth/csrf',{credentials:'include',cache:'no-store'});const d=await r.json();return d.csrf||''}catch{return''}
  }

  window.fetch=async function(input,init){
    init=Object.assign({},init||{});
    const raw=typeof input==='string'?input:(input&&input.url)||'';
    let same=false;
    try{same=new URL(raw||location.href,location.href).origin===location.origin}catch{}
    const method=String(init.method||(input instanceof Request?input.method:'GET')||'GET').toUpperCase();
    if(isHttp&&same&&raw.includes('/api/')&&!['GET','HEAD','OPTIONS'].includes(method)&&!raw.includes('/api/doku/webhook')){
      const headers=new Headers(init.headers||(input instanceof Request?input.headers:undefined));
      if(!headers.has('X-CSRF-Token'))headers.set('X-CSRF-Token',await csrf());
      init.headers=headers;
      init.credentials='include';
    }
    return originalFetch(input,init);
  };

  async function persistState(key,value){
    if(!isHttp||!location.pathname.startsWith('/admin'))return;
    try{
      const parsed=JSON.parse(value);
      const r=await window.fetch('/api/admin/state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,value:parsed})});
      if(!r.ok&&r.status!==401&&r.status!==403)console.warn('AINFO state sync failed',key,r.status);
    }catch(e){console.warn('AINFO state sync error',key,e)}
  }

  Storage.prototype.setItem=function(key,value){
    nativeSet.call(this,key,value);
    if(this===localStorage&&!syncing&&STATE_KEYS.includes(String(key))){
      clearTimeout(saveTimers.get(key));
      saveTimers.set(key,setTimeout(()=>persistState(String(key),String(value)),350));
    }
  };
  Storage.prototype.removeItem=function(key){nativeRemove.call(this,key)};

  async function bootstrap(){
    if(!isHttp)return;
    try{
      const r=await originalFetch('/api/public/bootstrap',{credentials:'include',cache:'no-store'});
      if(!r.ok)return;
      const d=await r.json();
      const server=d.state||{};
      let changed=false;
      syncing=true;
      for(const key of STATE_KEYS){
        if(Object.prototype.hasOwnProperty.call(server,key)){
          const next=JSON.stringify(server[key]);
          if(localStorage.getItem(key)!==next){nativeSet.call(localStorage,key,next);changed=true}
        }
      }
      syncing=false;
      const reloadKey='ainfo-v14-boot-'+String(d.version||0);
      if(changed&&!sessionStorage.getItem(reloadKey)){
        sessionStorage.setItem(reloadKey,'1');
        location.reload();
        return;
      }
      if(d.empty&&location.pathname.startsWith('/admin')){
        setTimeout(()=>STATE_KEYS.forEach(key=>{const v=localStorage.getItem(key);if(v)persistState(key,v)}),900);
      }
    }catch(e){console.warn('AINFO bootstrap fallback to local defaults',e)}
  }

  async function setupTurnstile(){
    if(!isHttp)return;
    try{
      const cfg=await originalFetch('/api/auth/config',{cache:'no-store'}).then(r=>r.json());
      if(!cfg.turnstile_enabled||!cfg.turnstile_site_key)return;
      if(!document.querySelector('script[data-ainfo-turnstile]')){
        const sc=document.createElement('script');sc.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';sc.async=true;sc.defer=true;sc.dataset.ainfoTurnstile='1';document.head.appendChild(sc);
      }
      const mount=()=>{
        const form=document.querySelector('.auth-card .auth-form');
        if(!form||form.querySelector('.ainfo-turnstile'))return;
        const div=document.createElement('div');div.className='ainfo-turnstile';div.style.margin='10px 0';
        const btn=form.querySelector('button[type="submit"],button:not([type])');form.insertBefore(div,btn||null);
        const wait=()=>{if(window.turnstile){try{window.turnstile.render(div,{sitekey:cfg.turnstile_site_key,theme:'light'})}catch{}}else setTimeout(wait,120)};wait();
      };
      mount();new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});
      const old=window.authApi;
      if(typeof old==='function'&&!old.__ainfoTurnstile){
        const wrapped=async function(path,payload){
          if((path==='/api/auth/login'||path==='/api/auth/register')){
            const token=document.querySelector('input[name="cf-turnstile-response"]')?.value||'';
            payload=Object.assign({},payload||{},token?{turnstileToken:token}:{});
          }
          return old(path,payload);
        };wrapped.__ainfoTurnstile=true;window.authApi=wrapped;
      }
    }catch(e){console.warn('Turnstile setup skipped',e)}
  }

  async function uploadImage(input,previewId){
    const file=input&&input.files&&input.files[0];
    if(!file)return'';
    if(file.size>8*1024*1024){window.toast?.('Maksimal 8 MB');input.value='';return''}
    if(!isHttp||!location.pathname.startsWith('/admin')){
      if(typeof window.compressImage==='function')return window.compressImage(file,1500,.82);
      return new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=reject;fr.readAsDataURL(file)});
    }
    const fd=new FormData();fd.append('file',file);fd.append('alt',file.name.replace(/\.[^.]+$/,''));
    const r=await window.fetch('/api/admin/media',{method:'POST',body:fd});
    const d=await r.json().catch(()=>({}));
    if(!r.ok){window.toast?.(d.message||'Upload gagal');return''}
    const pv=document.getElementById(previewId);if(pv)pv.src=d.url;
    return d.url||'';
  }

  async function enhanceAdminProduction(){
    if(!location.pathname.startsWith('/admin'))return;
    const wrapOnce=(name,after)=>{
      const old=window[name];if(typeof old!=='function'||old.__ainfoWrapped)return;
      const fn=function(){const out=old.apply(this,arguments);setTimeout(()=>after(),0);return out};fn.__ainfoWrapped=true;window[name]=fn;
    };
    wrapOnce('renderDashboard',async()=>{
      const sec=document.getElementById('sec-dashboard');if(!sec||document.getElementById('prodCommandCenter'))return;
      try{const d=await window.fetch('/api/admin/metrics').then(r=>r.json());const box=document.createElement('div');box.id='prodCommandCenter';box.className='card';box.style.marginTop='14px';box.innerHTML=`<h3><i class="bi bi-speedometer2"></i> AINFO Command Center</h3><div class="stats"><div class="stat"><b>${Number(d.articles||0).toLocaleString('id-ID')}</b><span>Artikel Publish</span></div><div class="stat"><b>${Number(d.users||0).toLocaleString('id-ID')}</b><span>Pengguna</span></div><div class="stat"><b>${Number(d.comments||0).toLocaleString('id-ID')}</b><span>Komentar</span></div><div class="stat"><b>${Number(d.pending_orders||0).toLocaleString('id-ID')}</b><span>Order Pending</span></div><div class="stat"><b>${new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(d.shop_revenue||0)}</b><span>Shop Revenue</span></div><div class="stat"><b>${new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(d.gift_revenue||0)}</b><span>Gift Paid</span></div></div>${d.reported_comments?`<div class="notice" style="margin-top:10px">⚠ ${d.reported_comments} komentar menunggu moderasi.</div>`:''}`;sec.appendChild(box)}catch(e){}
    });
    wrapOnce('renderShop',async()=>{
      const sec=document.getElementById('sec-shop');if(!sec||document.getElementById('prodOrders'))return;
      try{const d=await window.fetch('/api/admin/orders').then(r=>r.json());const rows=d.orders||[];const box=document.createElement('div');box.id='prodOrders';box.className='card';box.style.marginTop='14px';box.innerHTML=`<h3><i class="bi bi-receipt"></i> Pesanan DOKU Terbaru</h3><div class="table-wrap"><table class="table"><thead><tr><th>Invoice</th><th>Status</th><th>Total</th><th>Tanggal</th></tr></thead><tbody>${rows.slice(0,30).map(o=>`<tr><td><b>${o.invoice}</b></td><td><span class="status ${o.status==='paid'||o.status==='completed'?'published':'draft'}">${o.status}</span></td><td>${new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(o.total||0)}</td><td>${o.created_at||''}</td></tr>`).join('')||'<tr><td colspan="4">Belum ada pesanan.</td></tr>'}</tbody></table></div>`;sec.appendChild(box)}catch(e){}
    });
    wrapOnce('renderSecurity',async()=>{
      const sec=document.getElementById('sec-security');if(!sec||document.getElementById('prodAudit'))return;
      try{const d=await window.fetch('/api/admin/audit').then(r=>r.json());const box=document.createElement('div');box.id='prodAudit';box.className='card';box.style.marginTop='14px';box.innerHTML=`<h3><i class="bi bi-clock-history"></i> Audit Log</h3><div class="table-wrap"><table class="table"><thead><tr><th>Waktu</th><th>Aktor</th><th>Aksi</th><th>Entitas</th></tr></thead><tbody>${(d.audit||[]).slice(0,40).map(a=>`<tr><td>${a.created_at||''}</td><td>${a.actor_email||'system'}</td><td>${a.action}</td><td>${a.entity_type||''} ${a.entity_id||''}</td></tr>`).join('')||'<tr><td colspan="4">Belum ada aktivitas.</td></tr>'}</tbody></table></div>`;sec.appendChild(box)}catch(e){}
    });
    if(typeof window.renderDashboard==='function')window.renderDashboard();
  }

  function loadEngagementMotion(){
    if(location.pathname.startsWith('/admin')||document.querySelector('script[data-ainfo-engagement-motion]'))return;
    const sc=document.createElement('script');
    sc.src='/engagement-motion.js?v=20260917b';
    sc.async=true;
    sc.dataset.ainfoEngagementMotion='1';
    document.head.appendChild(sc);
  }

  function loadAdminStickerManager(){
    if(!location.pathname.startsWith('/admin')||document.querySelector('script[data-ainfo-admin-stickers]'))return;
    const sc=document.createElement('script');
    sc.src='/admin-stickers.js?v=20260917';
    sc.async=true;
    sc.dataset.ainfoAdminStickers='1';
    document.head.appendChild(sc);
  }

  window.addEventListener('load',()=>{
    bootstrap();
    setupTurnstile();
    loadEngagementMotion();
    loadAdminStickerManager();
    if(location.pathname.startsWith('/admin')){
      setTimeout(()=>{window.fileToDataUrl=uploadImage;enhanceAdminProduction()},0);
    }
  });
})();
