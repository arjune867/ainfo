(function(){
  'use strict';

  let syncing=false;
  let currentSyncedId=0;
  let customStickerMap=new Map();
  let stickerLoaded=false;

  function articleId(){
    try{
      if(typeof current==='function'&&current()!=='article')return 0;
      const raw=location.hash.split('/')[2]||'';
      return Number(raw||0);
    }catch{return 0}
  }
  function currentArticle(){const id=articleId();try{return articles.find(x=>Number(x.id)===id)||null}catch{return null}}
  function notify(msg){try{if(typeof toast==='function')toast(msg);else console.log('[AINFO engagement]',msg)}catch{}}
  function loggedIn(){try{return Boolean(authUser&&authUser.id)}catch{return false}}
  function fmt(n){return Number(n||0).toLocaleString('id-ID')}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function isHttpUrl(v){return /^https?:\/\//i.test(String(v||'').trim())}

  function ensureCommentStyles(){
    if(document.getElementById('ainfo-comment-fix-style'))return;
    const style=document.createElement('style');
    style.id='ainfo-comment-fix-style';
    style.textContent=`
      #comments .comment>.avatar{overflow:hidden!important;position:relative;flex:0 0 38px!important;min-width:38px!important;max-width:38px!important}
      #comments .comment>.avatar img{display:block!important;width:100%!important;height:100%!important;object-fit:cover!important;border-radius:50%!important}
      #comments .ainfo-animated-sticker{display:inline-block!important;width:max-content!important;max-width:160px!important;overflow:visible!important}
      #comments .ainfo-animated-sticker img.ainfo-comment-media{width:118px!important;height:118px!important;object-fit:contain!important;display:block!important;border-radius:18px!important;animation:ainfoStickerFloat 2.2s ease-in-out infinite!important;transform-origin:center center}
      #comments .ainfo-animated-sticker.ainfo-gif-media img.ainfo-comment-media{width:min(220px,70vw)!important;height:auto!important;max-height:220px!important;object-fit:contain!important;background:transparent!important}
      @keyframes ainfoStickerFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-4px) scale(1.025)}}
      @media(max-width:600px){#comments .ainfo-animated-sticker img.ainfo-comment-media{width:104px!important;height:104px!important}#comments .ainfo-animated-sticker.ainfo-gif-media img.ainfo-comment-media{width:min(210px,72vw)!important;height:auto!important}}
      @media(prefers-reduced-motion:reduce){#comments .ainfo-animated-sticker img.ainfo-comment-media{animation:none!important}}
    `;
    document.head.appendChild(style);
  }

  async function loadStickerMap(){
    if(stickerLoaded)return;stickerLoaded=true;
    try{const r=await fetch('/api/public/stickers',{cache:'no-store',credentials:'same-origin'});const d=await r.json();customStickerMap=new Map((d.stickers||[]).map(x=>[String(x.code),x]))}catch{}
  }

  function fixCommentAvatars(){
    document.querySelectorAll('#comments .comment>.avatar').forEach(box=>{
      if(box.dataset.ainfoAvatarFixed==='1')return;
      const raw=(box.textContent||'').trim();
      if(!isHttpUrl(raw))return;
      box.dataset.ainfoAvatarFixed='1';
      box.textContent='';
      const img=document.createElement('img');
      img.src=raw;
      img.alt='Foto profil';
      img.loading='lazy';
      img.referrerPolicy='no-referrer';
      img.onerror=()=>{box.dataset.ainfoAvatarFixed='';box.textContent='AN'};
      box.appendChild(img);
    });
  }

  async function animateCommentMedia(){
    ensureCommentStyles();
    fixCommentAvatars();
    await loadStickerMap();
    document.querySelectorAll('.comment-sticker').forEach(box=>{
      const raw=(box.dataset.ainfoToken||box.textContent||'').trim();
      if(!raw)return;
      box.dataset.ainfoToken=raw;
      let src='',alt='Stiker',isGif=false;
      const reaction=raw.match(/^sticker:(like|love|haha|wow|sad|angry)$/i);
      const custom=raw.match(/^custom:([a-z0-9-]+)$/i);
      const gif=raw.match(/^gif:(.+)$/i);
      if(reaction){src=`/reactions/${reaction[1].toLowerCase()}.svg`;alt=`Stiker ${reaction[1]}`}
      else if(custom&&customStickerMap.has(custom[1])){
        const x=customStickerMap.get(custom[1]);src=x.url;alt=x.name||'Stiker';isGif=/image\/(gif|webp)/i.test(String(x.mimeType||''));
      }
      else if(gif){try{src=decodeURIComponent(gif[1])}catch{src=gif[1]}alt='GIF';isGif=true}
      else if(isHttpUrl(raw)){src=raw;alt='GIF';isGif=/\.(gif|webp)(?:$|\?)/i.test(raw)||/giphy|tenor|media\d?\.giphy/i.test(raw)}
      if(!src)return;
      if(!isHttpUrl(src)&&!src.startsWith('/'))return;
      box.classList.add('ainfo-animated-sticker');
      box.classList.toggle('ainfo-gif-media',isGif);
      box.style.fontSize='0';box.style.lineHeight='0';
      box.innerHTML=`<img class="ainfo-comment-media" src="${esc(src)}" alt="${esc(alt)}" loading="eager" referrerpolicy="no-referrer">`;
    });
    fixCommentAvatars();
  }

  function renderMetrics(data){
    const a=data.article||{};
    const main=document.querySelector('.article-main');
    if(!main)return;
    let box=main.querySelector('.ainfo-live-metrics');
    if(!box){box=document.createElement('div');box.className='ainfo-live-metrics';box.style.cssText='display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin:7px 0 14px;font-size:10px;color:#64748b';const anchor=main.querySelector('.author-row');anchor?.insertAdjacentElement('afterend',box)}
    if(box)box.innerHTML=`<span><i class="bi bi-eye"></i> <b>${fmt(a.views)}</b> pembaca</span><span><i class="bi bi-chat-dots"></i> <b>${fmt(a.commentCount)}</b> komentar</span><span><i class="bi bi-star-fill" style="color:#f5b400"></i> <b>${Number(a.rating||0).toFixed(1)}</b>/5 (${fmt(a.ratingCount)})</span>`;
    document.querySelectorAll('.article-toolbar .article-tool').forEach(btn=>{const label=btn.querySelector('.tool-label');if(label&&label.textContent.trim().startsWith('Komentar'))label.textContent=`Komentar ${fmt(a.commentCount)}`});
  }

  function renderRating(data){
    const a=data.article||{};const mine=Number(a.myRating||0);const avg=Number(a.rating||0);const count=Number(a.ratingCount||0);
    try{state.rating=mine}catch{}
    document.querySelectorAll('.stars').forEach(s=>{
      s.querySelectorAll('button').forEach((b,i)=>b.classList.toggle('on',i<mine));
      const small=s.querySelector('small');if(small)small.textContent=`${avg.toFixed(1)} / 5 · ${fmt(count)} rating`;
    });
  }

  function renderComments(data){
    try{state.comments=Array.isArray(data.comments)?data.comments:[]}catch{}
    const old=document.getElementById('comments');
    if(old&&typeof commentsBlock==='function'){
      const holder=document.createElement('div');holder.innerHTML=commentsBlock();const next=holder.firstElementChild;if(next)old.replaceWith(next);
    }
    const heading=document.querySelector('#comments h2');if(heading)heading.textContent=`Komentar (${fmt(data.article?.commentCount||0)})`;
    animateCommentMedia();
  }

  async function fetchEngagement(id){
    const r=await fetch(`/api/engagement/article?article_id=${encodeURIComponent(id)}`,{cache:'no-store',credentials:'same-origin'});
    const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||d.error||'engagement_failed');return d;
  }

  async function syncEngagement(force=false){
    const id=articleId();if(!id||syncing)return;if(!force&&currentSyncedId===id&&document.querySelector('.ainfo-live-metrics'))return;
    syncing=true;
    try{
      try{await fetch('/api/engagement/view',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({article_id:id}),credentials:'same-origin'})}catch{}
      const d=await fetchEngagement(id);currentSyncedId=id;
      const a=currentArticle();if(a){a.views=Number(d.article?.views||0);a.ratingAvg=Number(d.article?.rating||0);a.rating=Number(d.article?.rating||0);a.rating_count=Number(d.article?.ratingCount||0)}
      renderMetrics(d);renderRating(d);renderComments(d);
    }catch(e){console.warn('AINFO engagement sync failed',e)}finally{syncing=false}
  }

  async function postComment(parentId=null,forcedText=null){
    const id=articleId();if(!id)return;
    if(!loggedIn()){notify('Silakan login untuk mengirim komentar.');try{go('login')}catch{}return}
    const el=document.getElementById('commentText');
    const text=forcedText!==null?String(forcedText).trim():String(el?.value||'').trim();
    let sticker='';try{sticker=String(pendingCommentSticker||'').trim()}catch{}
    if(!text&&!sticker)return notify('Tulis komentar atau pilih stiker terlebih dahulu.');
    try{
      const r=await fetch('/api/engagement/comment',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({article_id:id,parent_id:parentId,body:text,sticker})});
      const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||d.error||'Komentar gagal disimpan');
      if(el)el.value='';try{pendingCommentSticker=''}catch{}
      document.querySelector('.ainfo-sticker-preview')?.remove();notify(parentId?'Balasan tersimpan':'Komentar tersimpan');await syncEngagement(true);
    }catch(e){notify(e.message||'Komentar gagal disimpan')}
  }

  async function reactCommentLive(id,key){
    if(!loggedIn()){notify('Silakan login untuk memberi reaction.');return}
    try{const r=await fetch('/api/reactions',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({target_type:'comment',target_id:String(id),reaction:key})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||d.error||'Reaction gagal');await syncEngagement(true)}catch(e){notify(e.message||'Reaction gagal disimpan')}
  }

  async function rateLive(n){
    const id=articleId();if(!id)return;if(!loggedIn()){notify('Silakan login untuk memberi rating.');try{go('login')}catch{}return}
    try{const r=await fetch('/api/ratings',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({article_id:id,rating:Number(n)})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||d.error||'Rating gagal');notify(`Rating ${n} bintang tersimpan`);await syncEngagement(true)}catch(e){notify(e.message||'Rating gagal disimpan')}
  }

  async function articleReactionLive(key){
    const id=articleId();if(!id)return;if(key==='care')key='love';if(!loggedIn()){notify('Silakan login untuk memberi reaction.');return}
    try{const r=await fetch('/api/reactions',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({target_type:'article',target_id:String(id),reaction:key})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||d.error||'Reaction gagal');try{state.reaction=key;save()}catch{}notify('Reaction tersimpan')}catch(e){notify(e.message||'Reaction gagal disimpan')}
  }

  function installOverrides(){
    try{window.addComment=function(){return postComment(null,null)}}catch{}
    try{window.replyComment=function(id){const c=typeof findComment==='function'?findComment(state.comments,id):null;const who=c?.user||'Pengguna';const text=prompt(`Balas @${who}:`);if(!text)return;return postComment(id,`@${who} ${text}`)}}catch{}
    try{window.reactComment=function(id,k){return reactCommentLive(id,k)}}catch{}
    try{window.likeComment=function(id){return reactCommentLive(id,'like')}}catch{}
    try{window.rate=function(n){return rateLive(n)}}catch{}
    try{window.selectArticleReaction=function(k){return articleReactionLive(k)}}catch{}
  }

  let timer=0;
  function schedule(force=false){clearTimeout(timer);timer=setTimeout(()=>{installOverrides();syncEngagement(force);animateCommentMedia();fixCommentAvatars()},120)}
  window.addEventListener('hashchange',()=>{currentSyncedId=0;schedule(true)});
  window.addEventListener('load',()=>schedule(true));
  const observer=new MutationObserver(()=>schedule(false));observer.observe(document.documentElement,{childList:true,subtree:true});
  ensureCommentStyles();
  installOverrides();
})();
