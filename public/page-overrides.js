(function(){
  function apply(p){
    try{
      if(!p)return;
      var main=document.querySelector('main.page, main.wrap.page');if(!main)return;
      var h1=main.querySelector('h1');if(h1&&p.title)h1.textContent=p.title;
      var lead=main.querySelector('.lead');if(lead&&p.lead)lead.textContent=p.lead;
      main.querySelectorAll('[data-ainfo-dynamic="1"]').forEach(function(x){x.remove()});
      Array.from(main.children).forEach(function(x){if(x.classList.contains('kicker')||x===h1||x===lead)return;x.style.display='none'});
      var wrap=document.createElement('div');wrap.dataset.ainfoDynamic='1';wrap.className='content-override';
      String(p.content||'').split(/\n\s*\n/).filter(Boolean).forEach(function(t){var el=document.createElement('p');el.textContent=t;wrap.appendChild(el)});
      main.appendChild(wrap);document.title=(p.title||document.title)+' - AINFO';
    }catch(e){}
  }
  async function boot(){
    var slug=(location.pathname.split('/').filter(Boolean).pop()||'').toLowerCase();
    try{
      if(/^https?:$/.test(location.protocol)){
        var r=await fetch('/api/public/bootstrap',{cache:'no-store'});if(r.ok){var d=await r.json();var pages=d.state&&d.state['ainfo-footer-pages'];if(pages){localStorage.setItem('ainfo-footer-pages',JSON.stringify(pages));apply(pages[slug]);return}}
      }
    }catch(e){}
    try{var pages=JSON.parse(localStorage.getItem('ainfo-footer-pages')||'{}');apply(pages[slug])}catch(e){}
  }
  boot();
})();
