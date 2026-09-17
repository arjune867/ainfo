(function(){
'use strict';
const VERSION='14.17.4';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function externalPlayer(v){
  let src='';
  if(v?.provider==='youtube'&&v?.externalId){
    src=`https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.externalId)}?autoplay=1&mute=1&playsinline=1&rel=0&controls=1&modestbranding=1`;
  }else{
    src=String(v?.embedUrl||'');
  }
  if(!/^https:\/\//i.test(src)){
    return `<div class="vprod-unavailable"><i class="fa-solid fa-video-slash"></i><span>Video belum tersedia</span></div>`;
  }
  return `<iframe class="feed-video vprod-player" src="${esc(src)}" title="Video" loading="eager" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
}

function externalSlide(v){
  return `<section class="video-viewer-shell vprod-shell" data-video-id="${esc(v.id)}">${externalPlayer(v)}<button class="vprod-close" type="button" onclick="go('video')" aria-label="Tutup video"><i class="bi bi-x-lg"></i></button></section>`;
}

function install(){
  if(window.__ainfoV14174Installed)return;
  window.__ainfoV14174Installed=true;
  const previous=typeof window.videoSlide==='function'?window.videoSlide:null;
  window.videoSlide=function(v){
    if(v?.provider&&v.provider!=='ainfo')return externalSlide(v);
    return previous?previous(v):'';
  };
  try{if(String(location.hash).startsWith('#/video/'))render()}catch{}
  console.info('AINFO External Video Production Viewer',VERSION);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0));else setTimeout(install,0);
window.addEventListener('hashchange',()=>setTimeout(install,20));
})();
