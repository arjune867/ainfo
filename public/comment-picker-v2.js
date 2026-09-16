(function(){
  'use strict';

  const VERSION='2.0.0';
  const STYLE_ID='ainfo-comment-picker-v2-style';
  let selectedMedia=null;
  let stickerCache=null;
  let gifConfig=null;
  let gifTimer=0;

  const EMOJI_GROUPS={
    Favorit:['😀','😂','😍','🥰','😘','😎','🤩','😭','😢','😡','👍','🙏','👏','🔥','❤️','🎉','💯','✅'],
    Wajah:['🙂','😄','😁','😆','🤣','😊','😇','😉','😋','😜','🤪','🤓','🫠','🤔','🤨','😮','😱','🥺','😴','🤭','🫣','🤯','🥳','😤'],
    Gestur:['👍','👎','👌','✌️','🤞','🤟','🤘','🤙','👋','🫶','👏','🙌','🙏','💪','👀','🤝','☝️','✋','🫡','💅'],
    Hati:['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','💕','💞','💓','💗','💖','💘','💝'],
    Objek:['🔥','✨','⭐','🌟','💯','✅','❌','⚡','🚀','🎯','🏆','🎁','📢','💡','☕','📱','💻','📰','🎬','📸']
  };

  const FALLBACK_STICKERS=[
    {code:'like',name:'Suka',url:'/reactions/like.svg',token:'sticker:like'},
    {code:'love',name:'Love',url:'/reactions/love.svg',token:'sticker:love'},
    {code:'haha',name:'Haha',url:'/reactions/haha.svg',token:'sticker:haha'},
    {code:'wow',name:'Wow',url:'/reactions/wow.svg',token:'sticker:wow'},
    {code:'sad',name:'Sedih',url:'/reactions/sad.svg',token:'sticker:sad'},
    {code:'angry',name:'Marah',url:'/reactions/angry.svg',token:'sticker:angry'}
  ];

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function hasPending(){try{return Boolean(String(pendingCommentSticker||'').trim())}catch{return false}}
  function pendingToken(){try{return String(pendingCommentSticker||'').trim()}catch{return ''}}
  function setPending(v){try{pendingCommentSticker=String(v||'')}catch{}}
  function notify(msg){try{if(typeof toast==='function')toast(msg)}catch{}}

  function addStyles(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #comments .comment-compose-tools{position:relative;flex-wrap:wrap;gap:10px}
      #comments .comment-toolset{display:flex;gap:7px;flex-wrap:wrap;align-items:center}
      #comments .comment-mini-btn{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;min-height:36px!important;padding:7px 11px!important;border:1px solid #dfe5ee!important;border-radius:11px!important;background:#fff!important;color:#526174!important;font-size:12px!important;font-weight:750!important;white-space:nowrap!important}
      #comments .comment-mini-btn:hover,#comments .comment-mini-btn.active{border-color:#9cc1ff!important;background:#f2f7ff!important;color:#0b5ed7!important}
      #comments .comment-mini-btn i{font-size:15px!important}
      #comments .ainfo-comment-picker{display:none;position:absolute;left:0;right:0;top:calc(100% + 10px);z-index:1200;border:1px solid #dfe6ef;border-radius:18px;background:#fff;box-shadow:0 20px 55px rgba(16,35,65,.18);overflow:hidden}
      #comments .ainfo-comment-picker.open{display:block}
      #comments .ainfo-picker-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid #eef2f6;background:#fbfdff}
      #comments .ainfo-picker-head b{font-size:13px}
      #comments .ainfo-picker-close{width:32px;height:32px;border:0;border-radius:50%;background:#eef3f8;color:#42526a;font-size:18px;display:grid;place-items:center}
      #comments .ainfo-picker-tabs{display:flex;gap:6px;overflow:auto;padding:10px 12px;border-bottom:1px solid #eef2f6;scrollbar-width:none}
      #comments .ainfo-picker-tabs::-webkit-scrollbar{display:none}
      #comments .ainfo-picker-tab{border:1px solid #e1e7ef;background:#fff;border-radius:999px;padding:7px 11px;font-size:11px;font-weight:800;color:#5f6f83;white-space:nowrap}
      #comments .ainfo-picker-tab.active{background:#0b5ed7;border-color:#0b5ed7;color:#fff}
      #comments .ainfo-picker-body{max-height:330px;overflow:auto;padding:12px}
      #comments .ainfo-emoji-grid{display:grid;grid-template-columns:repeat(9,minmax(0,1fr));gap:6px}
      #comments .ainfo-emoji-btn{aspect-ratio:1;border:0;border-radius:10px;background:#f7f9fc;font-size:23px;display:grid;place-items:center;transition:.15s}
      #comments .ainfo-emoji-btn:active{transform:scale(.92);background:#eaf3ff}
      #comments .ainfo-sticker-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}
      #comments .ainfo-sticker-btn{border:1px solid #edf1f6;border-radius:14px;background:#fff;min-height:84px;padding:7px;display:flex;align-items:center;justify-content:center;overflow:hidden}
      #comments .ainfo-sticker-btn img{width:72px;height:72px;object-fit:contain;border-radius:10px}
      #comments .ainfo-gif-search{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin-bottom:10px}
      #comments .ainfo-gif-search input,#comments .ainfo-gif-url input{width:100%;border:1px solid #dce3ec;border-radius:11px;padding:10px 12px;font-size:12px;outline:0;background:#fff}
      #comments .ainfo-gif-search input:focus,#comments .ainfo-gif-url input:focus{border-color:#7fb0ff;box-shadow:0 0 0 3px rgba(11,94,215,.08)}
      #comments .ainfo-gif-search button,#comments .ainfo-gif-url button{border:0;border-radius:11px;background:#0b5ed7;color:#fff;padding:0 13px;font-size:12px;font-weight:850}
      #comments .ainfo-gif-grid{columns:2;column-gap:8px}
      #comments .ainfo-gif-card{width:100%;display:block;break-inside:avoid;margin:0 0 8px;border:0;border-radius:12px;overflow:hidden;background:#eef3f8;padding:0}
      #comments .ainfo-gif-card img{width:100%;height:auto;display:block}
      #comments .ainfo-picker-empty{padding:26px 12px;text-align:center;color:#77869a;font-size:12px;line-height:1.55}
      #comments .ainfo-picker-loader{padding:24px;text-align:center;color:#0b5ed7;font-size:12px;font-weight:800}
      #comments .ainfo-media-preview{width:100%;display:flex;align-items:center;gap:10px;border-top:1px solid #eef2f6;padding-top:9px;margin-top:2px}
      #comments .ainfo-media-preview img{width:64px;height:64px;object-fit:contain;border-radius:12px;background:#f7f9fc}
      #comments .ainfo-media-preview .copy{min-width:0;flex:1}
      #comments .ainfo-media-preview b{display:block;font-size:12px}
      #comments .ainfo-media-preview span{display:block;margin-top:3px;color:#7a8797;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #comments .ainfo-media-preview button{border:0;border-radius:10px;background:#f1f4f8;color:#66758a;padding:8px 10px;font-size:11px;font-weight:800}
      #comments .ainfo-gif-url{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid #eef2f6}
      #comments .ainfo-gif-credit{font-size:9px;color:#9aa5b4;margin-top:9px;text-align:right}
      @media(max-width:700px){
        #comments .comment-mini-btn{flex:1 1 0;min-width:0;padding:8px 7px!important;font-size:11px!important}
        #comments .comment-compose-tools>.btn.primary{min-width:112px;height:44px;border-radius:12px}
        #comments .ainfo-comment-picker{position:fixed;left:10px;right:10px;top:auto;bottom:calc(76px + env(safe-area-inset-bottom));z-index:2200;max-height:min(58vh,470px);border-radius:22px;box-shadow:0 24px 70px rgba(9,26,54,.30)}
        #comments .ainfo-picker-body{max-height:calc(min(58vh,470px) - 105px);padding:11px}
        #comments .ainfo-emoji-grid{grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}
        #comments .ainfo-emoji-btn{font-size:25px;border-radius:11px}
        #comments .ainfo-sticker-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
        #comments .ainfo-sticker-btn{min-height:92px}
        #comments .ainfo-sticker-btn img{width:80px;height:80px}
        #comments .ainfo-gif-grid{columns:2;column-gap:7px}
      }
      @media(max-width:390px){#comments .ainfo-emoji-grid{grid-template-columns:repeat(6,minmax(0,1fr))}#comments .comment-mini-btn span{display:none}}
    `;
    document.head.appendChild(style);
  }

  function previewMarkup(){
    const token=pendingToken();
    if(!token||!selectedMedia||selectedMedia.token!==token)return '';
    return `<div class="ainfo-media-preview"><img src="${esc(selectedMedia.src)}" alt="${esc(selectedMedia.label||'Media komentar')}"><div class="copy"><b>${esc(selectedMedia.label||'Media dipilih')}</b><span>Siap dikirim bersama komentar</span></div><button type="button" onclick="clearCommentMediaV2()">Hapus</button></div>`;
  }

  function buildComments(){
    let comments=[];
    try{comments=Array.isArray(state.comments)?state.comments:[]}catch{}
    const list=comments.map(c=>typeof commentItem==='function'?commentItem(c):'').join('');
    return `<section class="comments" id="comments"><div class="section-head"><h2>Komentar (${comments.length})</h2><button type="button">Terbaru <i class="bi bi-chevron-down"></i></button></div><div class="comment-composer"><div class="comment-form"><div class="avatar">AN</div><textarea id="commentText" placeholder="Tulis komentar, pendapat, atau tanggapan..."></textarea></div><div class="comment-compose-tools"><div class="comment-toolset"><button type="button" class="comment-mini-btn" data-media-tab="emoji" onclick="openCommentMediaV2('emoji')"><i class="bi bi-emoji-smile"></i><span>Emoticon</span></button><button type="button" class="comment-mini-btn" data-media-tab="sticker" onclick="openCommentMediaV2('sticker')"><i class="bi bi-sticky"></i><span>Stiker</span></button><button type="button" class="comment-mini-btn" data-media-tab="gif" onclick="openCommentMediaV2('gif')"><i class="bi bi-filetype-gif"></i><span>GIF</span></button></div><button type="button" class="btn primary" onclick="addComment()"><i class="bi bi-send"></i> Kirim</button><div class="ainfo-comment-picker" id="commentMediaPickerV2"><div class="ainfo-picker-head"><b id="commentPickerTitle">Emoticon</b><button type="button" class="ainfo-picker-close" onclick="closeCommentMediaV2()" aria-label="Tutup">×</button></div><div id="commentPickerContent"></div></div>${previewMarkup()}</div></div><div>${list}</div></section>`;
  }

  function replaceComposer(){
    if(typeof window.commentsBlock!=='function'&&typeof commentsBlock!=='function')return false;
    try{window.commentsBlock=buildComments}catch{return false}
    const old=document.getElementById('comments');
    if(old){
      const holder=document.createElement('div');
      holder.innerHTML=buildComments();
      const next=holder.firstElementChild;
      if(next)old.replaceWith(next);
    }
    return true;
  }

  function markActive(tab){
    document.querySelectorAll('#comments [data-media-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.mediaTab===tab));
  }

  function emojiContent(group='Favorit'){
    const names=Object.keys(EMOJI_GROUPS);
    const active=EMOJI_GROUPS[group]?group:'Favorit';
    return `<div class="ainfo-picker-tabs">${names.map(name=>`<button type="button" class="ainfo-picker-tab ${name===active?'active':''}" onclick="renderEmojiGroupV2('${name}')">${name}</button>`).join('')}</div><div class="ainfo-picker-body"><div class="ainfo-emoji-grid">${EMOJI_GROUPS[active].map(e=>`<button type="button" class="ainfo-emoji-btn" onclick="insertCommentEmojiV2('${e}')">${e}</button>`).join('')}</div></div>`;
  }

  async function loadStickers(){
    if(stickerCache)return stickerCache;
    let custom=[];
    try{
      const r=await fetch('/api/public/stickers',{cache:'no-store',credentials:'same-origin'});
      const d=await r.json();
      if(r.ok&&Array.isArray(d.stickers))custom=d.stickers.filter(x=>x&&x.code&&x.url).map(x=>({code:String(x.code),name:String(x.name||'Stiker'),url:String(x.url),token:`custom:${x.code}`}));
    }catch{}
    stickerCache=[...custom,...FALLBACK_STICKERS.filter(f=>!custom.some(x=>x.code===f.code))];
    return stickerCache;
  }

  async function stickerContent(){
    const target=document.getElementById('commentPickerContent');
    if(!target)return;
    target.innerHTML='<div class="ainfo-picker-loader"><i class="bi bi-arrow-repeat"></i> Memuat stiker...</div>';
    const items=await loadStickers();
    if(!document.getElementById('commentMediaPickerV2')?.classList.contains('open'))return;
    target.innerHTML=`<div class="ainfo-picker-body">${items.length?`<div class="ainfo-sticker-grid">${items.map(x=>`<button type="button" class="ainfo-sticker-btn" title="${esc(x.name)}" onclick="selectCommentStickerV2('${esc(x.token)}','${esc(x.url)}','${esc(x.name)}')"><img src="${esc(x.url)}" alt="${esc(x.name)}" loading="lazy"></button>`).join('')}</div>`:'<div class="ainfo-picker-empty">Belum ada paket stiker aktif.</div>'}</div>`;
  }

  async function getGifConfig(){
    if(gifConfig)return gifConfig;
    try{const r=await fetch('/api/public/giphy-config',{cache:'no-store',credentials:'same-origin'});const d=await r.json();gifConfig=d&&d.configured?d:{configured:false}}catch{gifConfig={configured:false}}
    return gifConfig;
  }

  function gifShell(){
    return `<div class="ainfo-picker-body"><div class="ainfo-gif-search"><input id="commentGifQuery" type="search" placeholder="Cari GIF lucu, reaksi, semangat..." oninput="queueGifSearchV2(this.value)"><button type="button" onclick="searchGifV2(document.getElementById('commentGifQuery')?.value||'')"><i class="bi bi-search"></i></button></div><div id="commentGifResults"><div class="ainfo-picker-loader">Memuat GIF...</div></div><div class="ainfo-gif-url"><input id="commentGifUrl" inputmode="url" placeholder="Atau tempel URL GIF..."><button type="button" onclick="selectGifUrlV2()">Pilih</button></div><div class="ainfo-gif-credit">GIF powered by GIPHY jika konfigurasi tersedia</div></div>`;
  }

  async function searchGif(query=''){
    const box=document.getElementById('commentGifResults');
    if(!box)return;
    const cfg=await getGifConfig();
    if(!cfg.configured||!cfg.apiKey){box.innerHTML='<div class="ainfo-picker-empty">Pencarian GIF belum diaktifkan di server. Anda tetap bisa menempel URL GIF pada kolom di bawah.</div>';return}
    box.innerHTML='<div class="ainfo-picker-loader">Mencari GIF...</div>';
    try{
      const q=String(query||'').trim();
      const endpoint=q?'search':'trending';
      const params=new URLSearchParams({api_key:cfg.apiKey,limit:'24',rating:cfg.rating||'pg',lang:cfg.language||'id'});
      if(q)params.set('q',q);
      const r=await fetch(`https://api.giphy.com/v1/gifs/${endpoint}?${params.toString()}`);
      const d=await r.json();
      const items=Array.isArray(d.data)?d.data:[];
      if(!items.length){box.innerHTML='<div class="ainfo-picker-empty">GIF tidak ditemukan. Coba kata kunci lain.</div>';return}
      box.innerHTML=`<div class="ainfo-gif-grid">${items.map(x=>{
        const preview=x.images?.fixed_width_small?.webp||x.images?.fixed_width?.webp||x.images?.downsized?.url||'';
        const full=x.images?.fixed_width?.url||x.images?.downsized_medium?.url||x.images?.original?.url||preview;
        const title=x.title||'GIF';
        return preview&&full?`<button type="button" class="ainfo-gif-card" title="${esc(title)}" onclick="selectCommentGifV2('${encodeURIComponent(full)}','${encodeURIComponent(preview)}','${encodeURIComponent(title)}')"><img src="${esc(preview)}" alt="${esc(title)}" loading="lazy"></button>`:'';
      }).join('')}</div>`;
    }catch(e){box.innerHTML='<div class="ainfo-picker-empty">GIF gagal dimuat. Periksa koneksi lalu coba lagi.</div>'}
  }

  window.openCommentMediaV2=function(tab){
    const picker=document.getElementById('commentMediaPickerV2');
    const content=document.getElementById('commentPickerContent');
    const title=document.getElementById('commentPickerTitle');
    if(!picker||!content)return;
    const already=picker.classList.contains('open')&&picker.dataset.tab===tab;
    if(already){window.closeCommentMediaV2();return}
    picker.dataset.tab=tab;
    picker.classList.add('open');
    markActive(tab);
    if(tab==='emoji'){if(title)title.textContent='Emoticon';content.innerHTML=emojiContent('Favorit')}
    else if(tab==='sticker'){if(title)title.textContent='Stiker';stickerContent()}
    else{if(title)title.textContent='GIF';content.innerHTML=gifShell();searchGif('')}
  };

  window.closeCommentMediaV2=function(){const picker=document.getElementById('commentMediaPickerV2');picker?.classList.remove('open');markActive('')};
  window.renderEmojiGroupV2=function(group){const content=document.getElementById('commentPickerContent');if(content)content.innerHTML=emojiContent(group)};
  window.insertCommentEmojiV2=function(e){
    const el=document.getElementById('commentText');if(!el)return;
    const start=el.selectionStart??el.value.length,end=el.selectionEnd??start;
    el.value=el.value.slice(0,start)+e+el.value.slice(end);el.focus();el.selectionStart=el.selectionEnd=start+e.length;
  };
  window.selectCommentStickerV2=function(token,src,label){setPending(token);selectedMedia={token,src,label:label||'Stiker'};replaceComposer();notify('Stiker dipilih — tekan Kirim untuk memposting')};
  window.selectCommentGifV2=function(fullEncoded,previewEncoded,titleEncoded){
    const full=decodeURIComponent(fullEncoded),preview=decodeURIComponent(previewEncoded),title=decodeURIComponent(titleEncoded||'GIF');
    const token=`gif:${encodeURIComponent(full)}`;setPending(token);selectedMedia={token,src:preview||full,label:title||'GIF'};replaceComposer();notify('GIF dipilih — tekan Kirim untuk memposting');
  };
  window.selectGifUrlV2=function(){
    const input=document.getElementById('commentGifUrl');const value=String(input?.value||'').trim();
    if(!/^https?:\/\//i.test(value))return notify('Masukkan URL GIF yang valid.');
    const token=`gif:${encodeURIComponent(value)}`;setPending(token);selectedMedia={token,src:value,label:'GIF'};replaceComposer();notify('GIF dipilih — tekan Kirim untuk memposting');
  };
  window.clearCommentMediaV2=function(){setPending('');selectedMedia=null;replaceComposer();notify('Media komentar dihapus')};
  window.queueGifSearchV2=function(q){clearTimeout(gifTimer);gifTimer=setTimeout(()=>searchGif(q),350)};
  window.searchGifV2=function(q){clearTimeout(gifTimer);return searchGif(q)};

  // Keep compatibility with old inline callbacks if any cached markup remains.
  window.insertCommentEmoji=window.insertCommentEmojiV2;
  window.chooseCommentSticker=function(token){
    const built=FALLBACK_STICKERS.find(x=>x.token===token||x.code===token);
    if(built)return window.selectCommentStickerV2(built.token,built.url,built.name);
    setPending(token);selectedMedia=null;replaceComposer();
  };
  window.toggleEmojiPanel=function(id){window.openCommentMediaV2(id==='stickerPanel'?'sticker':'emoji')};

  function boot(){
    addStyles();
    let attempts=0;
    const start=()=>{
      attempts+=1;
      if(replaceComposer())return;
      if(attempts<30)setTimeout(start,100);
    };
    start();
    const observer=new MutationObserver(()=>{
      const comments=document.getElementById('comments');
      if(comments&&!comments.querySelector('[data-media-tab="gif"]'))replaceComposer();
      if(!hasPending())selectedMedia=null;
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
    console.info('[AINFO] Comment Picker V2',VERSION);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
