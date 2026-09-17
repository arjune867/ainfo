(function(){
  'use strict';
  const VERSION='14.16.0';
  const EMOJIS=['😀','😂','😍','🥰','😎','😭','😢','😡','👍','🙏','👏','🔥','❤️','🎉','💯','✅','🤔','😮','🥳','💪','✨','🚀','🎁','☕'];
  const FALLBACK=[
    {code:'like',name:'Suka',url:'/reactions/like.svg',token:'sticker:like'},
    {code:'love',name:'Love',url:'/reactions/love.svg',token:'sticker:love'},
    {code:'haha',name:'Haha',url:'/reactions/haha.svg',token:'sticker:haha'},
    {code:'wow',name:'Wow',url:'/reactions/wow.svg',token:'sticker:wow'},
    {code:'sad',name:'Sedih',url:'/reactions/sad.svg',token:'sticker:sad'},
    {code:'angry',name:'Marah',url:'/reactions/angry.svg',token:'sticker:angry'}
  ];
  let ctx=null,media='',rating=0,tab='emoji',stickers=null,gifs=[],gifQuery='';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const productId=()=>{const m=(location.hash||'').match(/^#\/product\/(\d+)/);return m?Number(m[1]):0};

  function ensure(){
    if(document.getElementById('ainfoShopMobileComposer'))return;
    const back=document.createElement('div');back.id='ainfoShopMobileBackdrop';back.className='ainfo-shop-mobile-backdrop';back.addEventListener('click',close);document.body.appendChild(back);
    const sheet=document.createElement('section');sheet.id='ainfoShopMobileComposer';sheet.className='ainfo-shop-mobile-composer';sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.innerHTML=`
      <header class="asm-head"><div><b id="asmTitle">Tulis Ulasan</b><small id="asmSub">Bagikan pengalaman Anda</small></div><button type="button" id="asmClose" aria-label="Tutup">×</button></header>
      <div class="asm-body">
        <div class="asm-stars" id="asmStars">${[1,2,3,4,5].map(n=>`<button type="button" data-star="${n}">★</button>`).join('')}</div>
        <textarea id="asmText" maxlength="2000" placeholder="Tulis pesan…"></textarea>
        <div class="asm-tools"><button type="button" data-tab="emoji">😊 Emoticon</button><button type="button" data-tab="sticker">🎨 Stiker</button><button type="button" data-tab="gif">GIF</button></div>
        <div class="asm-picker" id="asmPicker"></div>
        <div class="asm-preview" id="asmPreview"></div>
        <button type="button" class="asm-send" id="asmSend">Kirim</button>
      </div>`;
    document.body.appendChild(sheet);
    sheet.querySelector('#asmClose').addEventListener('click',close);
    sheet.querySelector('#asmSend').addEventListener('click',submit);
    sheet.querySelectorAll('[data-star]').forEach(b=>b.addEventListener('click',()=>{rating=Number(b.dataset.star);paintStars()}));
    sheet.querySelectorAll('.asm-tools [data-tab]').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.tab;renderPicker()}));
  }

  function paintStars(){document.querySelectorAll('#asmStars [data-star]').forEach(b=>b.classList.toggle('on',Number(b.dataset.star)<=rating))}
  function renderPreview(){const box=document.getElementById('asmPreview');if(!box)return;if(!media){box.classList.remove('show');box.innerHTML='';return}let html='';if(media.type==='emoji')html=`<span class="asm-preview-emoji">${esc(media.value)}</span>`;else html=`<img src="${esc(media.url)}" alt="${esc(media.label||'Media')}">`;box.innerHTML=`${html}<div><b>${esc(media.label||'Media dipilih')}</b><small>Siap dikirim</small></div><button type="button" aria-label="Hapus">×</button>`;box.classList.add('show');box.querySelector('button').onclick=()=>{media='';renderPreview()}}

  async function loadStickers(){if(stickers)return stickers;let custom=[];try{const r=await fetch('/api/public/stickers',{credentials:'same-origin',cache:'no-store'});const d=await r.json();if(r.ok&&Array.isArray(d.stickers))custom=d.stickers.filter(x=>x&&x.code&&x.url).map(x=>({code:String(x.code),name:String(x.name||'Stiker'),url:String(x.url),token:`custom:${x.code}`}))}catch{}stickers=[...custom,...FALLBACK.filter(f=>!custom.some(x=>x.code===f.code))];return stickers}

  async function loadGifs(q=''){gifQuery=q;const box=document.getElementById('asmPicker');if(box)box.innerHTML='<div class="asm-loading">Memuat GIF…</div>';try{const mode=q.trim()?'search':'trending';const r=await fetch(`/api/giphy?mode=${mode}&q=${encodeURIComponent(q.trim())}&limit=18`,{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.message||'GIF gagal dimuat');gifs=(d.data||[]).map(x=>({id:x.id,url:x.images?.fixed_width_small?.url||x.images?.fixed_width?.url||x.images?.original?.url||'',label:x.title||'GIF'})).filter(x=>x.url);renderPicker()}catch(e){if(box)box.innerHTML=`<div class="asm-empty">${esc(e.message||'GIF belum tersedia')}</div>`}}

  async function renderPicker(){const box=document.getElementById('asmPicker');if(!box)return;document.querySelectorAll('.asm-tools [data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));if(tab==='emoji'){box.innerHTML=`<div class="asm-emoji-grid">${EMOJIS.map(e=>`<button type="button" data-emoji="${e}">${e}</button>`).join('')}</div>`;box.querySelectorAll('[data-emoji]').forEach(b=>b.onclick=()=>{const ta=document.getElementById('asmText');const e=b.dataset.emoji||'';const s=ta.selectionStart??ta.value.length;const en=ta.selectionEnd??s;ta.value=ta.value.slice(0,s)+e+ta.value.slice(en);ta.focus();try{ta.setSelectionRange(s+e.length,s+e.length)}catch{}});return}
    if(tab==='sticker'){box.innerHTML='<div class="asm-loading">Memuat stiker…</div>';const list=await loadStickers();box.innerHTML=`<div class="asm-sticker-grid">${list.map(x=>`<button type="button" data-token="${esc(x.token)}" data-url="${esc(x.url)}" data-label="${esc(x.name)}"><img src="${esc(x.url)}" alt="${esc(x.name)}"></button>`).join('')}</div>`;box.querySelectorAll('[data-token]').forEach(b=>b.onclick=()=>{media={type:'sticker',token:b.dataset.token,url:b.dataset.url,label:b.dataset.label};renderPreview()});return}
    box.innerHTML=`<div class="asm-gif-search"><input id="asmGifQ" value="${esc(gifQuery)}" placeholder="Cari GIF…"><button type="button" id="asmGifSearch">Cari</button></div>${gifs.length?`<div class="asm-gif-grid">${gifs.map(x=>`<button type="button" data-gif="${esc(x.url)}" data-label="${esc(x.label)}"><img src="${esc(x.url)}" alt="${esc(x.label)}"></button>`).join('')}</div>`:'<div class="asm-loading">Memuat GIF…</div>'}`;box.querySelector('#asmGifSearch')?.addEventListener('click',()=>loadGifs(document.getElementById('asmGifQ')?.value||''));box.querySelector('#asmGifQ')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();loadGifs(e.currentTarget.value||'')}});box.querySelectorAll('[data-gif]').forEach(b=>b.onclick=()=>{media={type:'gif',token:`gif:${encodeURIComponent(b.dataset.gif||'')}`,url:b.dataset.gif||'',label:b.dataset.label||'GIF'};renderPreview()});if(!gifs.length)loadGifs(gifQuery)
  }

  function open(kind,parentId=null,name=''){ensure();ctx={kind:kind==='review'?'review':'discussion',parentId:parentId?Number(parentId):null,productId:productId(),name};if(!ctx.productId)return;media='';rating=0;tab='emoji';gifQuery='';gifs=[];const isReview=ctx.kind==='review'&&!ctx.parentId;document.getElementById('asmTitle').textContent=ctx.parentId?`Balas ${name||'komentar'}`:(isReview?'Tulis Ulasan Produk':'Mulai Diskusi Produk');document.getElementById('asmSub').textContent=ctx.parentId?'Balasan mendukung emoticon, stiker dan GIF':(isReview?'Berikan rating dan pengalaman Anda':'Tanyakan detail produk kepada komunitas');document.getElementById('asmStars').classList.toggle('show',isReview);paintStars();const ta=document.getElementById('asmText');ta.value='';ta.placeholder=ctx.parentId?`Balas @${name||'Pembaca'}…`:(isReview?'Ceritakan pengalaman Anda dengan produk ini…':'Tulis pertanyaan atau diskusi…');renderPreview();renderPicker();document.getElementById('ainfoShopMobileBackdrop').classList.add('open');document.getElementById('ainfoShopMobileComposer').classList.add('open');document.documentElement.classList.add('ainfo-shop-composer-open');setTimeout(()=>ta.focus(),120)}
  function close(){document.getElementById('ainfoShopMobileBackdrop')?.classList.remove('open');document.getElementById('ainfoShopMobileComposer')?.classList.remove('open');document.documentElement.classList.remove('ainfo-shop-composer-open');ctx=null;media='';rating=0}

  async function post(payload){let r=await fetch('/api/shop/comment',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(payload)});let d=await r.json().catch(()=>({}));if(r.status===403&&String(d.error||'')==='csrf_failed'){try{await fetch('/api/auth/csrf',{credentials:'same-origin',cache:'no-store'})}catch{}r=await fetch('/api/shop/comment',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(payload)});d=await r.json().catch(()=>({}))}if(!r.ok){const e=new Error(d.message||d.error||'Gagal mengirim');e.status=r.status;throw e}return d}

  async function submit(){if(!ctx)return;const body=String(document.getElementById('asmText')?.value||'').trim();const isReview=ctx.kind==='review'&&!ctx.parentId;if(isReview&&!rating){window.toast?.('Pilih rating 1–5 bintang');return}if(!body&&!media){window.toast?.('Tulis komentar atau pilih stiker/GIF');return}const btn=document.getElementById('asmSend');btn.disabled=true;btn.textContent='Mengirim…';try{await post({product_id:ctx.productId,parent_id:ctx.parentId||null,kind:ctx.kind,rating:isReview?rating:null,body,media_token:media?.token||''});window.toast?.(ctx.parentId?'Balasan terkirim':isReview?'Ulasan berhasil dikirim':'Diskusi berhasil dikirim');close();const old=document.getElementById('ainfoShopEngagement');if(old)old.remove();setTimeout(()=>window.dispatchEvent(new Event('hashchange')),20)}catch(e){if(e.status===401){window.toast?.('Silakan login terlebih dahulu');setTimeout(()=>window.go?.('login'),400)}else window.toast?.(e.message||'Gagal mengirim')}finally{btn.disabled=false;btn.textContent='Kirim'}}

  function clickHandler(e){if(!productId())return;const btn=e.target instanceof Element?e.target.closest('button'):null;if(!btn)return;const root=btn.closest('#ainfoShopEngagement');if(!root)return;const t=String(btn.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();if(btn.closest('.ainfo-eng-actions')&&t.includes('tulis ulasan')){e.preventDefault();e.stopImmediatePropagation();open('review');return}if(btn.closest('.ainfo-eng-actions')&&t.includes('mulai diskusi')){e.preventDefault();e.stopImmediatePropagation();open('discussion');return}if(btn.closest('.ainfo-shop-comment-tools')&&t.includes('balas')){const c=btn.closest('.ainfo-shop-comment');const id=Number(c?.dataset.shopComment||0);if(!id)return;const kind=c?.querySelector('.ainfo-shop-stars')?'review':(document.querySelector('.ainfo-eng-tab.active')?.textContent?.toLowerCase().includes('ulasan')?'review':'discussion');const name=c?.querySelector('.ainfo-shop-name')?.textContent?.trim()||'Pembaca';e.preventDefault();e.stopImmediatePropagation();open(kind,id,name)}}

  document.addEventListener('click',clickHandler,true);
  window.openShopReview=id=>{if(Number(id)===productId())open('review')};
  window.openShopDiscussion=id=>{if(Number(id)===productId())open('discussion')};
  window.replyShopComment=(id,kind,name)=>open(kind,id,name);
  window.addEventListener('hashchange',()=>{if(!productId())close()});
  console.info('AINFO mobile shop composer',VERSION);
})();
