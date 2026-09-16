(function(){
  'use strict';
  if(window.__ainfoCommentDisplayFix)return;window.__ainfoCommentDisplayFix=true;

  const STYLE_ID='ainfo-comment-display-fix-style';
  function addStyle(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
      #comments .comment>.avatar{overflow:hidden!important;position:relative!important;flex:0 0 38px!important;min-width:38px!important;max-width:38px!important;width:38px!important;height:38px!important;border-radius:50%!important}
      #comments .comment>.avatar img{width:100%!important;height:100%!important;display:block!important;object-fit:cover!important;border-radius:50%!important}
      #comments .comment-sticker{overflow:visible!important;max-width:min(240px,76vw)!important;width:max-content!important}
      #comments .comment-sticker img{display:block!important;object-fit:contain!important;border-radius:16px!important;transform-origin:center center;animation:ainfoCommentStickerMotion 2.15s ease-in-out infinite!important;will-change:transform}
      #comments .comment-sticker.ainfo-gif-media img,#comments .comment-sticker img[src*="giphy"],#comments .comment-sticker img[src*="tenor"]{width:min(220px,72vw)!important;height:auto!important;max-height:230px!important}
      @keyframes ainfoCommentStickerMotion{0%,100%{transform:translateY(0) rotate(0deg) scale(1)}35%{transform:translateY(-5px) rotate(-1.5deg) scale(1.025)}70%{transform:translateY(-2px) rotate(1.2deg) scale(1.015)}}
      @media(max-width:600px){#comments .comment-sticker img{max-width:72vw!important}}
      @media(prefers-reduced-motion:reduce){#comments .comment-sticker img{animation:none!important}}
    `;document.head.appendChild(s);
  }
  function isUrl(v){return /^https?:\/\//i.test(String(v||'').trim())}
  function fixAvatars(){
    document.querySelectorAll('#comments .comment>.avatar').forEach(box=>{
      if(box.querySelector('img'))return;
      const raw=(box.textContent||'').trim();
      if(!isUrl(raw))return;
      box.textContent='';
      const img=document.createElement('img');img.src=raw;img.alt='Foto profil';img.loading='lazy';img.referrerPolicy='no-referrer';img.onerror=()=>{box.textContent='AN'};box.appendChild(img);
    });
  }
  function fixDirectMedia(){
    document.querySelectorAll('#comments .comment-sticker').forEach(box=>{
      if(box.querySelector('img'))return;
      const raw=(box.textContent||'').trim();if(!raw)return;
      let src='';
      if(/^gif:/i.test(raw)){try{src=decodeURIComponent(raw.slice(4))}catch{src=raw.slice(4)}}
      else if(isUrl(raw))src=raw;
      if(!isUrl(src))return;
      box.dataset.ainfoToken=raw;box.textContent='';box.classList.add('ainfo-animated-sticker','ainfo-gif-media');
      const img=document.createElement('img');img.src=src;img.alt='GIF';img.loading='eager';img.referrerPolicy='no-referrer';box.appendChild(img);
    });
  }
  function enforceMotion(){document.querySelectorAll('#comments .comment-sticker img').forEach(img=>img.classList.add('ainfo-comment-media'))}
  function run(){addStyle();fixAvatars();fixDirectMedia();enforceMotion()}
  let t=0;const schedule=()=>{clearTimeout(t);t=setTimeout(run,60)};
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  window.addEventListener('hashchange',()=>setTimeout(run,120));
})();
