(function(){
  'use strict';
  const VERSION='14.14.0';
  const RX={
    like:{label:'Suka',src:'/reactions/like.svg'},
    love:{label:'Love',src:'/reactions/love.svg'},
    haha:{label:'Haha',src:'/reactions/haha.svg'},
    wow:{label:'Wow',src:'/reactions/wow.svg'},
    sad:{label:'Sedih',src:'/reactions/sad.svg'},
    angry:{label:'Marah',src:'/reactions/angry.svg'}
  };
  const reactionCache=new Map();
  let activeReply=null;
  let replyMedia='';
  let oldChoose=null;
  let renamedMain=null;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const articleId=()=>{const m=location.hash.match(/^#\/article\/(\d+)/);return m?Number(m[1]):0};
  const csrfFetch=(url,options={})=>fetch(url,{credentials:'same-origin',...options});

  function commentNode(id){return document.getElementById(`commentReact-${id}`)?.closest('.comment')||null}
  function pickerNode(id){return document.getElementById(`commentReact-${id}`)||null}
  function commentName(node){
    if(!node)return'Pembaca AINFO';
    const selectors=['.comment-user','.comment-name','.name','b','strong'];
    for(const s of selectors){const el=node.querySelector(s);const t=String(el?.textContent||'').replace(/\s+/g,' ').trim();if(t)return t.split('•')[0].trim()}
    return'Pembaca AINFO';
  }

  function restoreInputBridge(){
    const ta=document.getElementById('commentText');
    if(ta&&ta.closest('.ainfo-inline-reply'))ta.id='ainfoInlineReplyText';
    if(renamedMain){renamedMain.id='commentText';renamedMain=null}
    if(oldChoose!==null){window.chooseCommentSticker=oldChoose;oldChoose=null}
  }
  function closeReply(){
    restoreInputBridge();
    document.querySelectorAll('.ainfo-inline-reply').forEach(x=>x.remove());
    activeReply=null;replyMedia='';
  }
  window.closeAinfoInlineReply=closeReply;

  function mediaPreview(){
    const box=document.querySelector('.ainfo-inline-reply .ainfo-inline-preview');if(!box)return;
    if(!replyMedia){box.classList.remove('show');box.innerHTML='';return}
    let html='';
    let m=replyMedia.match(/^sticker:(like|love|haha|wow|sad|angry)$/i);
    if(m){const x=RX[m[1].toLowerCase()];html=`<img src="${x.src}" alt="${x.label}">`}
    else if(/^gif:/i.test(replyMedia)){
      let u=replyMedia.slice(4);try{u=decodeURIComponent(u)}catch{}
      if(/^https:\/\//i.test(u))html=`<img src="${esc(u)}" alt="GIF">`;
    } else if(/^custom:/i.test(replyMedia)) html='<span>🎨 Stiker dipilih</span>';
    else html=`<span>${esc(replyMedia)}</span>`;
    box.innerHTML=`${html}<button type="button" aria-label="Hapus media">×</button>`;
    box.classList.add('show');
    box.querySelector('button').onclick=()=>{replyMedia='';mediaPreview()};
  }

  function bridgePicker(){
    if(!activeReply)return;
    const main=document.getElementById('commentText');
    if(main&&!main.closest('.ainfo-inline-reply')){renamedMain=main;main.id='commentTextMain1414'}
    const ta=document.getElementById('ainfoInlineReplyText');if(ta)ta.id='commentText';
    if(oldChoose===null)oldChoose=window.chooseCommentSticker;
    window.chooseCommentSticker=function(token){
      if(!activeReply&&typeof oldChoose==='function')return oldChoose(token);
      replyMedia=String(token||'');mediaPreview();
    };
  }

  function openPicker(tab){
    bridgePicker();
    if(tab==='emoji')window.toggleEmojiPanel?.('emojiPanel');
    else if(tab==='sticker')window.toggleEmojiPanel?.('stickerPanel');
    else{window.toggleEmojiPanel?.('emojiPanel');setTimeout(()=>document.querySelector('.ainfo-wa-tab[data-tab="gif"]')?.click(),60)}
  }

  function openInlineReply(id){
    const aid=articleId();if(!aid)return;
    const node=commentNode(id);if(!node)return;
    closeReply();
    const name=commentName(node);
    const actions=node.querySelector('.comment-actions');
    const host=actions?.parentElement||node;
    const box=document.createElement('div');box.className='ainfo-inline-reply';box.dataset.parentId=String(id);
    box.innerHTML=`<div class="ainfo-inline-reply-head"><div><b>Balas ${esc(name)}</b><small>Balasan tampil tepat di bawah komentar ini</small></div><button type="button" class="ainfo-inline-close" aria-label="Tutup">×</button></div><textarea id="ainfoInlineReplyText" maxlength="3000" placeholder="Balas @${esc(name)}…"></textarea><div class="ainfo-inline-tools"><button type="button" data-tool="emoji">😊 Emoticon</button><button type="button" data-tool="sticker">🎨 Stiker</button><button type="button" data-tool="gif">GIF</button></div><div class="ainfo-inline-preview"></div><div class="ainfo-inline-submit-row"><button type="button" class="cancel">Batal</button><button type="button" class="send"><i class="bi bi-send-fill"></i> Kirim Balasan</button></div>`;
    host.insertAdjacentElement('afterend',box);
    activeReply={parentId:Number(id),articleId:aid,name};replyMedia='';
    box.querySelector('.ainfo-inline-close').onclick=closeReply;
    box.querySelector('.cancel').onclick=closeReply;
    box.querySelector('.send').onclick=submitReply;
    box.querySelector('[data-tool="emoji"]').onclick=()=>openPicker('emoji');
    box.querySelector('[data-tool="sticker"]').onclick=()=>openPicker('sticker');
    box.querySelector('[data-tool="gif"]').onclick=()=>openPicker('gif');
    bridgePicker();
    setTimeout(()=>document.getElementById('commentText')?.focus(),60);
  }

  async function submitReply(){
    if(!activeReply)return;
    const ta=document.getElementById('commentText');
    const body=String(ta?.value||'').trim();
    if(!body&&!replyMedia){window.toast?.('Tulis balasan atau pilih stiker/GIF');return}
    const btn=document.querySelector('.ainfo-inline-reply .send');if(btn){btn.disabled=true;btn.textContent='Mengirim…'}
    try{
      const r=await csrfFetch('/api/engagement/comment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({article_id:activeReply.articleId,parent_id:activeReply.parentId,body,sticker:replyMedia})});
      const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||d.error||'Balasan gagal dikirim');
      closeReply();window.toast?.('Balasan tersimpan');
      window.dispatchEvent(new Event('hashchange'));
    }catch(e){window.toast?.(e.message||'Balasan gagal dikirim');if(btn){btn.disabled=false;btn.innerHTML='<i class="bi bi-send-fill"></i> Kirim Balasan'}}
  }

  function totalCounts(counts){return (counts||[]).reduce((n,x)=>n+Number(x.count||0),0)}
  function setMainReaction(id,key,total){
    reactionCache.set(String(id),key);
    const picker=pickerNode(id);if(!picker)return;
    const wrap=picker.closest('.comment-reaction-wrap');
    const main=wrap?.querySelector(':scope > button');
    const x=RX[key];if(!main||!x)return;
    main.classList.add('ainfo-comment-reacted');
    main.dataset.reaction=key;
    main.innerHTML=`<img class="ainfo-comment-main-reaction" src="${x.src}" alt="${x.label}"><span>${x.label}${total?` ${total}`:''}</span>`;
    picker.querySelectorAll('button').forEach(b=>b.classList.toggle('selected',String(b.getAttribute('onclick')||'').includes(`'${key}'`)));
  }

  async function postReaction(id,key){
    const picker=pickerNode(id);picker?.classList.remove('open');
    try{
      const r=await csrfFetch('/api/reactions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({target_type:'comment',target_id:String(id),reaction:key})});
      const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||d.error||'Reaction gagal');
      setMainReaction(id,key,totalCounts(d.counts));
      window.toast?.(`Reaction ${RX[key]?.label||''}`);
    }catch(e){if(rStatus(e)===401)window.toast?.('Silakan login untuk memberi reaction');else window.toast?.(e.message||'Reaction gagal')}
  }
  function rStatus(e){return Number(e?.status||0)}

  function reapplyReactionIcons(){
    reactionCache.forEach((key,id)=>{
      const picker=pickerNode(id);if(!picker)return;
      const main=picker.closest('.comment-reaction-wrap')?.querySelector(':scope > button');
      const current=String(main?.textContent||'');const m=current.match(/(\d+)\s*$/);setMainReaction(id,key,m?Number(m[1]):0);
    });
  }

  document.addEventListener('click',e=>{
    const target=e.target instanceof Element?e.target.closest('button'):null;if(!target)return;
    const attr=String(target.getAttribute('onclick')||'');
    let m=attr.match(/^replyComment\((\d+)\)/);
    if(m){e.preventDefault();e.stopImmediatePropagation();openInlineReply(Number(m[1]));return}
    m=attr.match(/^reactComment\((\d+),\s*['"](like|love|haha|wow|sad|angry)['"]\)/);
    if(m){e.preventDefault();e.stopImmediatePropagation();postReaction(Number(m[1]),m[2]);return}
  },true);

  let timer=0;const schedule=()=>{clearTimeout(timer);timer=setTimeout(reapplyReactionIcons,80)};
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>{if(!location.hash.startsWith('#/article/'))closeReply();schedule()});
  window.addEventListener('load',schedule);
  console.info('AINFO article reply/reaction fix',VERSION);
})();
