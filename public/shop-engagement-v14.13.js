(function(){
  'use strict';
  const VERSION='14.13.0';
  const PRODUCT_ROUTE=/^#\/product\/(\d+)/;

  function onProduct(){return PRODUCT_ROUTE.test(location.hash||'')}
  function loadCss(){
    if(document.querySelector('link[data-ainfo-engagement-1413],link[href*="engagement-v14.12.css"]'))return;
    const l=document.createElement('link');l.rel='stylesheet';l.href='/engagement-v14.12.css?v=20260917c';l.dataset.ainfoEngagement1413='1';document.head.appendChild(l);
  }
  function loadCore(){
    if(document.querySelector('script[src*="engagement-v14.12.js"]'))return;
    const s=document.createElement('script');s.src='/engagement-v14.12.js?v=20260917c';s.async=false;s.dataset.ainfoEngagement1413='1';s.onload=()=>setTimeout(fixProduct,80);document.body.appendChild(s);
  }
  function text(el){return String(el?.textContent||'').replace(/\s+/g,' ').trim()}
  function fixProduct(){
    if(!onProduct())return;
    loadCss();loadCore();
    const panels=[...document.querySelectorAll('.panel')];
    const legacy=panels.find(p=>/^Penilaian Produk$/i.test(text(p.querySelector('h3'))));
    if(legacy){legacy.style.display='none';legacy.setAttribute('aria-hidden','true');legacy.dataset.ainfoLegacyReview='hidden'}
    const desc=panels.find(p=>/^Deskripsi Produk$/i.test(text(p.querySelector('h3'))));
    const root=document.getElementById('ainfoShopEngagement');
    if(root&&desc&&root.previousElementSibling!==desc){desc.insertAdjacentElement('afterend',root)}
    if(!root&&desc&&!document.getElementById('ainfoShopEngagementLoading')){
      const holder=document.createElement('section');holder.id='ainfoShopEngagementLoading';holder.className='ainfo-engagement-section';holder.innerHTML='<div class="ainfo-eng-empty"><b>Rating, Ulasan & Diskusi</b><br>Memuat ulasan produk…</div>';desc.insertAdjacentElement('afterend',holder);
      setTimeout(()=>holder.remove(),1800);
    }
    const similar=[...document.querySelectorAll('.section-head h2')].find(h=>/^Produk Serupa$/i.test(text(h)));
    if(root&&similar){const section=similar.closest('.section-head');if(section&&root.nextElementSibling!==section)section.insertAdjacentElement('beforebegin',root)}
  }
  function schedule(){clearTimeout(window.__ainfoShopFixTimer);window.__ainfoShopFixTimer=setTimeout(fixProduct,80)}
  window.addEventListener('load',schedule);window.addEventListener('hashchange',schedule);
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  schedule();
  console.info('AINFO shop engagement loader',VERSION);
})();
