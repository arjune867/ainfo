(function(){
'use strict';
const VERSION='14.17.3';
const RX={like:['Suka','/reactions/like.svg'],love:['Love','/reactions/love.svg'],haha:['Haha','/reactions/haha.svg'],wow:['Wow','/reactions/wow.svg'],sad:['Sedih','/reactions/sad.svg'],angry:['Marah','/reactions/angry.svg']};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function words(value,max=5){const arr=String(value||'').replace(/\s+/g,' ').trim().split(' ').filter(Boolean);if(!arr.length)return'';return arr.slice(0,max).join(' ')+(arr.length>max?'…':'')}
function cleanAuthor(v){return String(v||'AINFO').replace(/^@/,'').replace(/\s+/g,'').toLowerCase()}
function player(v){
  let src='';
  if(v.provider==='youtube'&&v.externalId){src=`https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.externalId)}?autoplay=1&mute=1&playsinline=1&rel=0&controls=1&modestbranding=1`}
  else src=String(v.embedUrl||'');
  if(!/^https:\/\//i.test(src))return `<div class="vsource-unavailable"><i class="fa-solid fa-video-slash"></i><span>Preview video belum tersedia</span></div>`;
  return `<iframe class="feed-video vsource-iframe vsource-player-fix" src="${esc(src)}" title="${esc(words(v.title,5)||'Video AINFO')}" loading="eager" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
}
function sourceBadge(v){const n=v.provider==='youtube'?'YouTube':v.provider==='tiktok'?'TikTok':v.provider==='dailymotion'?'Dailymotion':'AINFO';return `<span class="vsource-provider ${esc(v.provider)}">${n}${v.kind==='short'?' · Short':''}</span>`}
function reactions(v){return Object.entries(RX).map(([k,x])=>`<button type="button" title="${x[0]}" onclick="event.stopPropagation();selectVideoReaction('${v.id}','${k}',this)"><img src="${x[1]}" alt="${x[0]}"></button>`).join('')}
function slide(v){
  if(!v?.provider||v.provider==='ainfo')return window.__ainfoVideoOriginalSlide?window.__ainfoVideoOriginalSlide(v):'';
  const title=words(v.title,5)||'Video AINFO';
  const desc=words(v.caption,5);
  return `<section class="video-viewer-shell vsource-shell vsource-shell-compact" data-video-id="${v.id}">${player(v)}<div class="vsource-shade"></div><div class="video-viewer-head"><button class="video-viewer-close" onclick="go('video')" aria-label="Tutup video"><i class="bi bi-x-lg"></i></button><div class="video-viewer-tabs"><span>Multi Source</span><span class="active">Untuk Anda</span></div><button class="video-viewer-search" onclick="toast('Feed video AINFO diperbarui otomatis')" aria-label="Info"><i class="bi bi-broadcast"></i></button></div><div class="video-viewer-copy vsource-copy-compact">${sourceBadge(v)}<div class="author-name">@${esc(cleanAuthor(v.author))}</div><h2 title="${esc(v.title||'')}">${esc(title)}</h2>${desc?`<p title="${esc(v.caption||'')}">${esc(desc)}</p>`:''}<div class="video-sound"><i class="fa-solid fa-link"></i><span>${esc(String(v.provider||'').toUpperCase())} · sumber resmi/embed</span></div></div><div class="video-viewer-actions"><button class="video-detail-profile-btn" onclick="event.stopPropagation();openVideoProfile('${v.id}')"><img src="${esc(v.avatar||'/AINFO.png')}" alt="${esc(v.author||'AINFO')}"><span>Profil</span></button><button onclick="event.stopPropagation();videoQuickLike('${v.id}',this)"><i class="fa-regular fa-heart"></i><span class="video-action-count">${esc(v.likes||'0')}</span></button><div class="video-action-bubble"><button onclick="event.stopPropagation();toggleVideoReactionPicker('${v.id}')"><i class="fa-regular fa-thumbs-up"></i><span class="video-action-count" data-video-reaction-count="${v.id}">Reaction</span></button><div class="video-reaction-pop" id="videoReactionPop-${v.id}">${reactions(v)}</div></div><button onclick="event.stopPropagation();openVideoComments('${v.id}')"><i class="fa-solid fa-comment-dots"></i><span class="video-action-count" data-video-comment-count="${v.id}">${esc(v.comments||'0')}</span></button><button onclick="event.stopPropagation();saveVideo('${v.id}',this)"><i class="fa-regular fa-bookmark"></i><span>Simpan</span></button><button onclick="event.stopPropagation();shareVideoDetail('${v.id}')"><i class="fa-solid fa-share-nodes"></i><span>Bagikan</span></button></div><div class="video-progress"><span></span></div></section>`;
}
function install(){
  if(window.__ainfoV14173Installed)return;
  window.__ainfoV14173Installed=true;
  window.__ainfoVideoOriginalSlide=typeof window.videoSlide==='function'?window.videoSlide:null;
  window.videoSlide=slide;
  try{if(String(location.hash).startsWith('#/video/'))render()}catch{}
  console.info('AINFO Video Display Fix',VERSION);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0));else setTimeout(install,0);
window.addEventListener('hashchange',()=>setTimeout(install,20));
})();
