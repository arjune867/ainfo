(function(){
  'use strict';
  const VERSION='14.12.0';
  const REACTIONS={like:{label:'Suka',src:'/reactions/like.svg'},love:{label:'Love',src:'/reactions/love.svg'},haha:{label:'Haha',src:'/reactions/haha.svg'},wow:{label:'Wow',src:'/reactions/wow.svg'},sad:{label:'Sedih',src:'/reactions/sad.svg'},angry:{label:'Marah',src:'/reactions/angry.svg'}};
  let composeCtx=null,composeMedia='',composeRating=0,oldChoose=null,renamedText=null,demotedComposers=[];
  let shopTab='review',shopData=null,shopLoading=false,stickerMap=new Map();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const api=async(url,options={})=>{const r=await fetch(url,{credentials:'same-origin',...options});const d=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(d.message||d.error||`HTTP ${r.status}`);e.status=r.status;throw e}return d};
  const productId=()=>{const m=location.hash.match(/^#\/(?:product|shop)\/(\d+)/);return m?Number(m[1]):0};
  const articleId=()=>{const m=location.hash.match(/^#\/article\/(\d+)/);return m?Number(m[1]):0};
  const reactionImgs=()=>Object.entries(REACTIONS).map(([k,x])=>`<button type="button" title="${x.label}" data-rx="${k}"><img src="${x.src}" alt="${x.label}"></button>`).join('');

  async function loadStickerMap(){if(stickerMap.size)return;try{const d=await api('/api/public/stickers');(d.stickers||[]).forEach(x=>stickerMap.set(String(x.code),x))}catch{}}
  function mediaHtml(token){const t=String(token||'');let m=t.match(/^sticker:(like|love|haha|wow|sad|angry)$/i);if(m)return `<img src="${REACTIONS[m[1].toLowerCase()].src}" alt="Stiker">`;m=t.match(/^custom:([a-z0-9-]+)$/i);if(m){const x=stickerMap.get(m[1]);return x?`<img src="${esc(x.url)}" alt="${esc(x.name||'Stiker')}" loading="lazy">`:'🎨';}m=t.match(/^gif:(.+)$/i);if(m){let u='';try{u=decodeURIComponent(m[1])}catch{u=m[1]}return /^https:\/\//i.test(u)?`<img src="${esc(u)}" alt="GIF" loading="lazy">`:''}return t?`<span>${esc(t)}</span>`:''}

  function ensureComposer(){
    if(document.getElementById('ainfoComposeSheet'))return;
    const back=document.createElement('div');back.id='ainfoComposeBackdrop';back.className='ainfo-compose-backdrop';back.onclick=closeComposer;document.body.appendChild(back);
    const sheet=document.createElement('section');sheet.id='ainfoComposeSheet';sheet.className='ainfo-compose-sheet';sheet.innerHTML=`<div class="ainfo-compose-head"><div><b id="ainfoComposeTitle">Balas komentar</b><small id="ainfoComposeSub">AINFO</small></div><button type="button" class="ainfo-compose-close" onclick="closeAinfoComposer()">×</button></div><div class="ainfo-compose-body comment-composer"><div class="ainfo-compose-stars" id="ainfoComposeStars">${[1,2,3,4,5].map(n=>`<button type="button" data-star="${n}">★</button>`).join('')}</div><textarea id="ainfoReplyText" maxlength="2000" placeholder="Tulis komentar…"></textarea><div class="ainfo-compose-tools"><button type="button" data-picker="emoji">😊 Emoticon</button><button type="button" data-picker="sticker">🎨 Stiker</button><button type="button" data-picker="gif">GIF</button></div><div class="ainfo-compose-preview" id="ainfoComposePreview"></div><button type="button" class="ainfo-compose-submit" id="ainfoComposeSubmit">Kirim</button></div>`;document.body.appendChild(sheet);
    sheet.querySelectorAll('[data-star]').forEach(b=>b.addEventListener('click',()=>setComposeRating(Number(b.dataset.star))));
    sheet.querySelector('[data-picker="emoji"]').onclick=()=>window.toggleEmojiPanel?.('emojiPanel');
    sheet.querySelector('[data-picker="sticker"]').onclick=()=>window.toggleEmojiPanel?.('stickerPanel');
    sheet.querySelector('[data-picker="gif"]').onclick=()=>{window.toggleEmojiPanel?.('emojiPanel');setTimeout(()=>document.querySelector('.ainfo-wa-tab[data-tab="gif"]')?.click(),60)};
    document.getElementById('ainfoComposeSubmit').onclick=submitComposer;
  }
  function setComposeRating(n){composeRating=n;document.querySelectorAll('#ainfoComposeStars [data-star]').forEach(b=>b.classList.toggle('on',Number(b.dataset.star)<=n))}
  function showComposeMedia(){const p=document.getElementById('ainfoComposePreview');if(!p)return;if(!composeMedia){p.classList.remove('show');p.innerHTML='';return}p.innerHTML=`${mediaHtml(composeMedia)||'<span>Media dipilih</span>'}<button class="clear" type="button">×</button>`;p.classList.add('show');p.querySelector('.clear').onclick=()=>{composeMedia='';showComposeMedia()}}
  function openComposer(ctx){
    ensureComposer();composeCtx=ctx;composeMedia='';composeRating=Number(ctx.rating||0);setComposeRating(composeRating);showComposeMedia();
    document.getElementById('ainfoComposeTitle').textContent=ctx.title||'Tulis komentar';document.getElementById('ainfoComposeSub').textContent=ctx.subtitle||'AINFO';
    document.getElementById('ainfoComposeStars').classList.toggle('show',ctx.type==='shop-root'&&ctx.kind==='review');
    const ta=document.getElementById('ainfoReplyText');ta.value='';ta.placeholder=ctx.placeholder||'Tulis komentar…';
    renamedText=document.getElementById('commentText');if(renamedText)renamedText.id='commentTextMain';ta.id='commentText';
    demotedComposers=[...document.querySelectorAll('.comment-composer')].filter(x=>!x.closest('#ainfoComposeSheet'));demotedComposers.forEach((x,i)=>{x.dataset.ainfoComposerDemoted='1';x.classList.remove('comment-composer')});
    oldChoose=window.chooseCommentSticker;window.chooseCommentSticker=function(token){composeMedia=String(token||'');showComposeMedia()};
    document.getElementById('ainfoComposeBackdrop').classList.add('open');const s=document.getElementById('ainfoComposeSheet');s.classList.add('open');document.documentElement.style.overflow='hidden';setTimeout(()=>ta.focus(),80);
  }
  function closeComposer(){
    document.getElementById('ainfoComposeBackdrop')?.classList.remove('open');document.getElementById('ainfoComposeSheet')?.classList.remove('open');document.documentElement.style.overflow='';
    const ta=document.getElementById('commentText');if(ta&&ta.closest('#ainfoComposeSheet'))ta.id='ainfoReplyText';if(renamedText){renamedText.id='commentText';renamedText=null}
    demotedComposers.forEach(x=>{if(x.dataset.ainfoComposerDemoted==='1'){x.classList.add('comment-composer');delete x.dataset.ainfoComposerDemoted}});demotedComposers=[];
    if(oldChoose!==null){window.chooseCommentSticker=oldChoose;oldChoose=null}composeCtx=null;composeMedia='';composeRating=0;
  }
  window.closeAinfoComposer=closeComposer;

  async function submitComposer(){
    if(!composeCtx)return;const ta=document.getElementById('commentText');const body=String(ta?.value||'').trim();if(!body&&!composeMedia){window.toast?.('Tulis komentar atau pilih stiker/GIF');return}
    const btn=document.getElementById('ainfoComposeSubmit');btn.disabled=true;btn.textContent='Mengirim…';
    try{
      if(composeCtx.type==='article-reply'){
        await api('/api/engagement/comment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({article_id:composeCtx.articleId,parent_id:composeCtx.parentId,body,sticker:composeMedia})});
        closeComposer();window.toast?.('Balasan komentar tersimpan');window.dispatchEvent(new Event('hashchange'));
      }else if(composeCtx.type==='shop-root'||composeCtx.type==='shop-reply'){
        if(composeCtx.type==='shop-root'&&composeCtx.kind==='review'&&!composeRating){window.toast?.('Pilih rating 1–5 bintang');return}
        await api('/api/shop/comment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product_id:composeCtx.productId,parent_id:composeCtx.parentId||null,kind:composeCtx.kind,rating:composeCtx.type==='shop-root'&&composeCtx.kind==='review'?composeRating:null,body,media_token:composeMedia})});
        const pid=composeCtx.productId;closeComposer();window.toast?.(composeCtx.parentId?'Balasan terkirim':composeCtx.kind==='review'?'Ulasan tersimpan':'Diskusi terkirim');await loadShopEngagement(pid,true);
      }
    }catch(e){if(e.status===401){window.toast?.('Silakan login terlebih dahulu');window.go?.('login')}else window.toast?.(e.message||'Gagal mengirim')}
    finally{if(btn){btn.disabled=false;btn.textContent='Kirim'}}
  }

  function findArticleComment(id){try{return typeof window.findComment==='function'?window.findComment(window.state?.comments||state.comments,id):null}catch{return null}}
  const articleReply=function(id){const c=findArticleComment(id);const who=c?.user||c?.full_name||'Pembaca AINFO';openComposer({type:'article-reply',articleId:articleId(),parentId:Number(id),title:`Balas ${who}`,subtitle:'Balasan mendukung emoticon, sticker, GIF & reaction',placeholder:`Balas @${who}…`})};
  function lockArticleReply(){try{Object.defineProperty(window,'replyComment',{configurable:true,get:()=>articleReply,set:()=>{}})}catch{window.replyComment=articleReply}}

  function stars(n){const v=Math.max(0,Math.min(5,Number(n||0)));return '★'.repeat(Math.round(v))+'☆'.repeat(5-Math.round(v))}
  function buildTree(list){const map=new Map(),roots=[];(list||[]).forEach(c=>map.set(String(c.id),{...c,children:[]}));map.forEach(c=>{if(c.parent_id&&map.has(String(c.parent_id)))map.get(String(c.parent_id)).children.push(c);else roots.push(c)});return roots}
  function renderShopComment(c,depth=0){const picker=reactionImgs();const media=c.media_token?`<div class="ainfo-shop-media">${mediaHtml(c.media_token)}</div>`:'';const rating=c.rating?`<div class="ainfo-shop-stars">${stars(c.rating)}</div>`:'';const total=Number(c.reaction_total||0);return `<article class="ainfo-shop-comment depth-${Math.min(depth,3)}" data-shop-comment="${c.id}"><img class="ainfo-shop-avatar" src="${esc(c.avatar_url||'/icon-192.png')}" alt=""><div><div><span class="ainfo-shop-name">${esc(c.full_name||c.username||'Pembaca AINFO')}</span><span class="ainfo-shop-time">${esc(c.created_at||'')}</span></div>${rating}${c.body?`<div class="ainfo-shop-body">${esc(c.body)}</div>`:''}${media}<div class="ainfo-shop-comment-tools"><button type="button" onclick="toggleShopReaction(${c.id})">👍 Reaction ${total?`(${total})`:''}</button><button type="button" onclick="replyShopComment(${c.id},'${esc(c.kind)}','${esc(c.full_name||c.username||'Pembaca')}')">Balas</button></div><div class="ainfo-shop-reactions" id="shopReaction-${c.id}">${picker}</div>${(c.children||[]).map(x=>renderShopComment(x,depth+1)).join('')}</div></article>`}
  function ratingBars(summary){const total=Number(summary.rating_count||0);return [5,4,3,2,1].map(n=>{const count=Number(summary.breakdown?.[n]||0),pct=total?Math.round(count/total*100):0;return `<div class="ainfo-rating-row"><span>${n} ★</span><div class="ainfo-rating-track"><div class="ainfo-rating-fill" style="width:${pct}%"></div></div><span>${count}</span></div>`}).join('')}
  function renderShopSection(pid,d){
    const root=document.getElementById('ainfoShopEngagement');if(!root)return;shopData=d;const comments=(d.comments||[]).filter(c=>c.kind===shopTab);const tree=buildTree(comments);const s=d.summary||{};
    root.innerHTML=`<div class="ainfo-eng-head"><div><span class="badge orange">AINFO SHOP</span><h2>Rating, Ulasan & Diskusi</h2><p>Ulasan dan diskusi pembeli dengan balasan, reaction, emoticon, sticker dan GIF.</p></div><div class="ainfo-eng-actions"><button class="ainfo-eng-btn primary" onclick="openShopReview(${pid})">★ Tulis Ulasan</button><button class="ainfo-eng-btn" onclick="openShopDiscussion(${pid})">💬 Mulai Diskusi</button></div></div><div class="ainfo-rating-summary"><div class="ainfo-rating-big"><b>${Number(s.rating||0).toFixed(1)}</b><span>${stars(s.rating||0)}</span><small>${Number(s.rating_count||0).toLocaleString('id-ID')} ulasan</small></div><div class="ainfo-rating-bars">${ratingBars(s)}</div></div><div class="ainfo-eng-tabs"><button class="ainfo-eng-tab ${shopTab==='review'?'active':''}" onclick="setShopTab('review')">Ulasan (${Number(s.review_count||0)})</button><button class="ainfo-eng-tab ${shopTab==='discussion'?'active':''}" onclick="setShopTab('discussion')">Diskusi (${Number(s.discussion_count||0)})</button></div><div class="ainfo-eng-list">${tree.length?tree.map(x=>renderShopComment(x)).join(''):`<div class="ainfo-eng-empty">${shopTab==='review'?'Belum ada ulasan produk. Jadilah yang pertama memberi rating.':'Belum ada diskusi. Tanyakan sesuatu tentang produk ini.'}</div>`}</div>`;
    root.querySelectorAll('.ainfo-shop-reactions [data-rx]').forEach(b=>b.onclick=()=>reactShopComment(Number(b.closest('.ainfo-shop-comment').dataset.shopComment),b.dataset.rx));
    const info=document.querySelector('.pd-info');if(info&&!info.querySelector('.ainfo-product-rating-chip')){const chip=document.createElement('div');chip.className='ainfo-product-rating-chip';chip.innerHTML=`★ ${Number(s.rating||0).toFixed(1)} · ${Number(s.rating_count||0)} ulasan · ${Number(s.discussion_count||0)} diskusi`;const h1=info.querySelector('h1');h1?.insertAdjacentElement('afterend',chip)}else if(info?.querySelector('.ainfo-product-rating-chip'))info.querySelector('.ainfo-product-rating-chip').innerHTML=`★ ${Number(s.rating||0).toFixed(1)} · ${Number(s.rating_count||0)} ulasan · ${Number(s.discussion_count||0)} diskusi`;
  }
  async function loadShopEngagement(pid,force=false){if(!pid||shopLoading)return;const root=document.getElementById('ainfoShopEngagement');if(!root)return;shopLoading=true;if(force||!shopData)root.innerHTML='<div class="ainfo-eng-empty">Memuat rating, ulasan & diskusi…</div>';try{await loadStickerMap();const d=await api(`/api/shop/engagement?product_id=${encodeURIComponent(pid)}`);renderShopSection(pid,d)}catch(e){root.innerHTML='<div class="ainfo-eng-empty">Rating dan diskusi belum dapat dimuat.</div>'}finally{shopLoading=false}}
  function mountShop(){const pid=productId();if(!pid)return;const detail=document.querySelector('.product-detail');if(!detail)return;let root=document.getElementById('ainfoShopEngagement');if(root&&Number(root.dataset.productId)===pid)return;if(root)root.remove();root=document.createElement('section');root.id='ainfoShopEngagement';root.dataset.productId=String(pid);root.className='ainfo-engagement-section';detail.insertAdjacentElement('afterend',root);shopData=null;loadShopEngagement(pid,true)}
  window.setShopTab=function(tab){shopTab=tab==='discussion'?'discussion':'review';if(shopData)renderShopSection(productId(),shopData)};
  window.openShopReview=pid=>openComposer({type:'shop-root',kind:'review',productId:Number(pid),title:'Tulis Ulasan Produk',subtitle:'Berikan rating dan pengalaman Anda',placeholder:'Bagaimana pengalaman Anda dengan produk ini?'});
  window.openShopDiscussion=pid=>openComposer({type:'shop-root',kind:'discussion',productId:Number(pid),title:'Mulai Diskusi Produk',subtitle:'Tanyakan detail produk kepada komunitas',placeholder:'Tulis pertanyaan atau diskusi…'});
  window.replyShopComment=(id,kind,name)=>openComposer({type:'shop-reply',kind:kind==='review'?'review':'discussion',productId:productId(),parentId:Number(id),title:`Balas ${name}`,subtitle:'Balasan mendukung emoticon, sticker, GIF & reaction',placeholder:`Balas @${name}…`});
  window.toggleShopReaction=id=>document.getElementById(`shopReaction-${id}`)?.classList.toggle('open');
  window.reactShopComment=reactShopComment;
  async function reactShopComment(id,reaction){try{await api('/api/shop/comment/reaction',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({comment_id:Number(id),reaction})});document.getElementById(`shopReaction-${id}`)?.classList.remove('open');await loadShopEngagement(productId(),true);window.toast?.(`Reaction ${REACTIONS[reaction]?.label||''}`)}catch(e){if(e.status===401){window.toast?.('Silakan login untuk memberi reaction');window.go?.('login')}else window.toast?.('Reaction gagal disimpan')}}

  let scheduled=false;function enhance(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;lockArticleReply();mountShop()})}
  window.addEventListener('load',enhance);window.addEventListener('hashchange',()=>{shopData=null;shopTab='review';setTimeout(enhance,80)});new MutationObserver(enhance).observe(document.documentElement,{childList:true,subtree:true});
  setInterval(lockArticleReply,1200);
  ensureComposer();lockArticleReply();enhance();
  console.info('AINFO engagement',VERSION);
})();
