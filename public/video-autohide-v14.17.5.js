(function(){
'use strict';
const VERSION='14.17.5';
const HIDE_MS=4200;
const RX={like:['Suka','/reactions/like.svg'],love:['Love','/reactions/love.svg'],haha:['Haha','/reactions/haha.svg'],wow:['Wow','/reactions/wow.svg'],sad:['Sedih','/reactions/sad.svg'],angry:['Marah','/reactions/angry.svg']};
const timers=new WeakMap();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function words(value,max=5){const arr=String(value||'').replace(/\s+/g,' ').trim().split(' ').filter(Boolean);return arr.slice(0,max).join(' ')+(arr.length>max?'…':'')}
function cleanAuthor(v){return String(v||'AINFO').replace(/^@/,'').replace(/\s+/g,'').toLowerCase()}
function call(name,...args){try{const fn=window[name];if(typeof fn==='function')return fn(...args)}catch(e){console.warn('AINFO video action',name,e)}}
window.ainfoVideoAction=call;
function externalPlayer(v){
  let src='';
  if(v?.provider==='youtube'&&v?.externalId){
    src=`https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.externalId)}?autoplay=1&mute=1&playsinline=1&rel=0&controls=1&modestbranding=1`;
  }else src=String(v?.embedUrl||'');
  if(!/^https:\/\//i.test(src))return `<div class="vauto-unavailable"><i class="fa-solid fa-video-slash"></i><span>Video belum tersedia</span></div>`;
  return `<iframe class="feed-video vauto-player" src="${esc(src)}" title="${esc(words(v.title,5)||'Video AINFO')}" loading="eager" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
}
function sourceBadge(v){const n=v.provider==='youtube'?'YouTube':v.provider==='tiktok'?'TikTok':v.provider==='dailymotion'?'Dailymotion':'AINFO';return `<span class="vsource-provider ${esc(v.provider)}">${n}${v.kind==='short'?' · Short':''}</span>`}
function reactions(v){return Object.entries(RX).map(([k,x])=>`<button type="button" title="${x[0]}" onclick="event.stopPropagation();ainfoVideoAction('selectVideoReaction','${esc(v.id)}','${k}',this)"><img src="${x[1]}" alt="${x[0]}"></button>`).join('')}
function externalSlide(v){
  const title=words(v.title,5)||'Video AINFO';
  const desc=words(v.caption,5);
  return `<section class="video-viewer-shell vauto-shell controls-visible" data-video-id="${esc(v.id)}">
    ${externalPlayer(v)}
    <div class="vauto-shade vauto-ui"></div>
    <div class="video-viewer-head vauto-ui">
      <button class="video-viewer-close" type="button" onclick="event.stopPropagation();go('video')" aria-label="Tutup video"><i class="bi bi-x-lg"></i></button>
      <button class="video-viewer-search" type="button" onclick="event.stopPropagation();ainfoVideoShowControls(this.closest('.vauto-shell'))" aria-label="Tampilkan kontrol"><i class="bi bi-broadcast"></i></button>
    </div>
    <div class="video-viewer-copy vauto-copy vauto-ui">
      ${sourceBadge(v)}
      <div class="author-name">@${esc(cleanAuthor(v.author))}</div>
      <h2 title="${esc(v.title||'')}">${esc(title)}</h2>
      ${desc?`<p title="${esc(v.caption||'')}">${esc(desc)}</p>`:''}
      <div class="video-sound"><i class="fa-solid fa-link"></i><span>${esc(String(v.provider||'').toUpperCase())} · sumber resmi/embed</span></div>
    </div>
    <div class="video-viewer-actions vauto-ui">
      <button class="video-detail-profile-btn" onclick="event.stopPropagation();ainfoVideoAction('openVideoProfile','${esc(v.id)}')"><img src="${esc(v.avatar||'/AINFO.png')}" alt="Profil AINFO"><span>Profil</span></button>
      <button onclick="event.stopPropagation();ainfoVideoAction('videoQuickLike','${esc(v.id)}',this)"><i class="fa-regular fa-heart"></i><span class="video-action-count" data-ainfo-like-count="${esc(v.id)}">0</span></button>
      <div class="video-action-bubble"><button onclick="event.stopPropagation();ainfoVideoAction('toggleVideoReactionPicker','${esc(v.id)}')"><i class="fa-regular fa-thumbs-up"></i><span class="video-action-count" data-video-reaction-count="${esc(v.id)}">Reaction</span></button><div class="video-reaction-pop" id="videoReactionPop-${esc(v.id)}">${reactions(v)}</div></div>
      <button onclick="event.stopPropagation();ainfoVideoAction('openVideoComments','${esc(v.id)}')"><i class="fa-solid fa-comment-dots"></i><span class="video-action-count" data-video-comment-count="${esc(v.id)}">0</span></button>
      <button onclick="event.stopPropagation();ainfoVideoAction('saveVideo','${esc(v.id)}',this)"><i class="fa-regular fa-bookmark"></i><span>Simpan</span></button>
      <button onclick="event.stopPropagation();ainfoVideoAction('shareVideoDetail','${esc(v.id)}')"><i class="fa-solid fa-share-nodes"></i><span>Bagikan</span></button>
    </div>
    <div class="video-progress vauto-ui" aria-hidden="true"><span></span></div>
    <button class="vauto-catcher" type="button" aria-label="Tampilkan kontrol AINFO"></button>
  </section>`;
}
function schedule(shell){
  if(!shell)return;
  const old=timers.get(shell);if(old)clearTimeout(old);
  const t=setTimeout(()=>{if(document.body.contains(shell))shell.classList.remove('controls-visible')},HIDE_MS);
  timers.set(shell,t);
}
function show(shell){if(!shell)return;shell.classList.add('controls-visible');schedule(shell)}
window.ainfoVideoShowControls=show;
function bindShells(){
  document.querySelectorAll('.vauto-shell').forEach(shell=>{
    if(shell.dataset.autoHideBound)return;
    shell.dataset.autoHideBound='1';
    const catcher=shell.querySelector('.vauto-catcher');
    catcher?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();show(shell)});
    shell.addEventListener('mousemove',()=>show(shell),{passive:true});
    shell.addEventListener('touchstart',()=>{if(shell.classList.contains('controls-visible'))schedule(shell)},{passive:true});
    shell.querySelectorAll('.vauto-ui button').forEach(btn=>btn.addEventListener('click',()=>schedule(shell)));
    show(shell);
  });
}
function install(){
  if(!window.__ainfoV14175Installed){
    window.__ainfoV14175Installed=true;
    const previous=typeof window.videoSlide==='function'?window.videoSlide:null;
    window.videoSlide=function(v){if(v?.provider&&v.provider!=='ainfo')return externalSlide(v);return previous?previous(v):''};
  }
  try{if(String(location.hash).startsWith('#/video/'))render()}catch{}
  setTimeout(bindShells,80);
  console.info('AINFO Video Auto-hide UI',VERSION);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0));else setTimeout(install,0);
window.addEventListener('hashchange',()=>setTimeout(install,40));
const mo=new MutationObserver(()=>{if(document.querySelector('.vauto-shell:not([data-auto-hide-bound])'))bindShells()});
if(document.documentElement)mo.observe(document.documentElement,{subtree:true,childList:true});
})();
