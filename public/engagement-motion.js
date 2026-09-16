(function(){
  'use strict';

  const REACTIONS={
    like:{label:'Suka',src:'/reactions/like.svg'},
    love:{label:'Love',src:'/reactions/love.svg'},
    haha:{label:'Haha',src:'/reactions/haha.svg'},
    wow:{label:'Wow',src:'/reactions/wow.svg'},
    sad:{label:'Sedih',src:'/reactions/sad.svg'},
    angry:{label:'Marah',src:'/reactions/angry.svg'}
  };
  const STATIC_STICKERS=['💯','✨','🎊','🤝','🙌','🚀','✅','💙','🌟','📢','🔥','👏','🙏','😍','😂','🥳'];

  function addStyles(){
    if(document.getElementById('ainfo-motion-engagement-style'))return;
    const style=document.createElement('style');
    style.id='ainfo-motion-engagement-style';
    style.textContent=`
      .reaction-picker{align-items:center!important;animation:ainfoReactionPop .16s ease-out}
      .reaction-choice{width:46px!important;height:46px!important;padding:2px!important;overflow:visible!important}
      .reaction-choice .ainfo-reaction-img,.comment-reaction-picker .ainfo-reaction-img{width:40px;height:40px;object-fit:contain;display:block;pointer-events:none;filter:drop-shadow(0 3px 5px rgba(15,23,42,.12))}
      .reaction-choice:hover .ainfo-reaction-img,.comment-reaction-picker button:hover .ainfo-reaction-img{transform:translateY(-3px) scale(1.13)}
      .reaction-choice.selected .ainfo-reaction-img{transform:scale(1.08)}
      .comment-reaction-picker button{width:42px!important;height:42px!important;padding:1px!important;display:grid!important;place-items:center!important}
      .comment-reaction-picker .ainfo-reaction-img{width:36px;height:36px}
      [data-reaction-main] .ainfo-main-reaction{width:22px;height:22px;object-fit:contain;display:block;filter:drop-shadow(0 2px 3px rgba(15,23,42,.12))}
      [data-reaction-main].active .ainfo-main-reaction{animation:ainfoMainPulse 1.25s ease-in-out infinite}
      .sticker-panel.ainfo-motion-stickers{grid-template-columns:repeat(4,56px)!important;gap:7px!important;width:min(284px,calc(100vw - 34px));max-height:330px;overflow:auto;padding:10px!important;border-radius:16px!important;box-shadow:0 18px 46px rgba(15,23,42,.18)!important}
      .sticker-panel.ainfo-motion-stickers .ainfo-sticker-title{grid-column:1/-1;font-size:10px;font-weight:900;color:#64748b;letter-spacing:.45px;text-transform:uppercase;padding:1px 2px 3px}
      .sticker-panel.ainfo-motion-stickers .ainfo-sticker-gif{width:56px!important;height:56px!important;padding:3px!important;border-radius:14px!important;background:#f8fafc!important;border:1px solid #edf1f6!important;display:grid!important;place-items:center!important}
      .sticker-panel.ainfo-motion-stickers .ainfo-sticker-gif:hover{background:#eef6ff!important;border-color:#bfd8ff!important;transform:translateY(-2px)}
      .sticker-panel.ainfo-motion-stickers .ainfo-sticker-gif img{width:48px;height:48px;object-fit:contain;pointer-events:none}
      .sticker-panel.ainfo-motion-stickers .ainfo-sticker-static{font-size:24px!important}
      .ainfo-sticker-preview{margin:10px 0 2px 47px;display:flex;align-items:center;gap:10px;padding:9px 11px;border:1px solid #dbeafe;background:#f8fbff;border-radius:14px;width:max-content;max-width:calc(100% - 47px)}
      .ainfo-sticker-preview img{width:68px;height:68px;object-fit:contain}
      .ainfo-sticker-preview button{width:28px;height:28px;border:0;border-radius:50%;background:#fff;color:#64748b;box-shadow:0 1px 5px rgba(15,23,42,.12);font-weight:900}
      .comment-sticker.ainfo-animated-sticker{font-size:0!important;line-height:0!important;margin:8px 0!important}
      .comment-sticker.ainfo-animated-sticker img{width:96px;height:96px;object-fit:contain;display:block;border-radius:18px}
      @keyframes ainfoReactionPop{from{opacity:0;transform:translateY(5px) scale(.96)}to{opacity:1;transform:none}}
      @keyframes ainfoMainPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.13)}}
      @media(max-width:480px){
        .reaction-picker{left:50%!important;transform:translateX(-18%)!important}
        .reaction-choice{width:43px!important;height:43px!important}
        .reaction-choice .ainfo-reaction-img{width:38px;height:38px}
        .sticker-panel.ainfo-motion-stickers{grid-template-columns:repeat(4,52px)!important;width:244px}
        .sticker-panel.ainfo-motion-stickers .ainfo-sticker-gif{width:52px!important;height:52px!important}
        .sticker-panel.ainfo-motion-stickers .ainfo-sticker-gif img{width:45px;height:45px}
      }
    `;
    document.head.appendChild(style);
  }

  function reactionKey(button){
    const own=button.dataset.ainfoReactionKey;
    if(own&&REACTIONS[own])return own;
    const raw=button.getAttribute('onclick')||'';
    const match=raw.match(/['\"](like|love|haha|wow|sad|angry|care)['\"]/i);
    if(match)return match[1].toLowerCase();
    const title=(button.getAttribute('title')||button.getAttribute('aria-label')||'').toLowerCase();
    if(/suka|like/.test(title))return 'like';
    if(/love|cinta/.test(title))return 'love';
    if(/haha|tertawa/.test(title))return 'haha';
    if(/wow|kaget/.test(title))return 'wow';
    if(/sedih|sad/.test(title))return 'sad';
    if(/marah|angry/.test(title))return 'angry';
    if(/peduli|care/.test(title))return 'care';
    return '';
  }

  function imageHtml(key,cls='ainfo-reaction-img'){
    const item=REACTIONS[key];
    return item?`<img class="${cls}" src="${item.src}" alt="${item.label}" draggable="false">`:'';
  }

  function enhanceReactionChoices(){
    document.querySelectorAll('.reaction-picker .reaction-choice,.comment-reaction-picker button').forEach(button=>{
      const key=reactionKey(button);
      if(key==='care'){
        button.remove();
        return;
      }
      if(!REACTIONS[key])return;
      button.dataset.ainfoReactionKey=key;
      if(button.dataset.ainfoAnimated==='1')return;
      button.dataset.ainfoAnimated='1';
      button.title=REACTIONS[key].label;
      button.setAttribute('aria-label',REACTIONS[key].label);
      button.innerHTML=imageHtml(key);
    });
  }

  function enhanceMainReactionButtons(){
    document.querySelectorAll('.reaction-wrap').forEach(wrap=>{
      const main=wrap.querySelector('[data-reaction-main]');
      if(!main)return;
      const selected=wrap.querySelector('.reaction-choice.selected');
      const key=selected?reactionKey(selected):'';
      const old=main.querySelector('.ainfo-main-reaction');
      const bootstrapIcon=main.querySelector('i.bi');
      if(key&&REACTIONS[key]){
        if(bootstrapIcon)bootstrapIcon.style.display='none';
        if(!old||old.dataset.key!==key){
          old?.remove();
          const img=document.createElement('img');
          img.className='ainfo-main-reaction';img.src=REACTIONS[key].src;img.alt=REACTIONS[key].label;img.dataset.key=key;
          main.insertBefore(img,main.firstChild);
        }
        const label=main.querySelector('.tool-label');if(label)label.textContent=REACTIONS[key].label;
      }else{
        old?.remove();
        if(bootstrapIcon)bootstrapIcon.style.display='';
        const label=main.querySelector('.tool-label');if(label)label.textContent='Reaction';
      }
    });
  }

  function showStickerPreview(key){
    const composer=document.querySelector('.comment-composer');
    if(!composer||!REACTIONS[key])return;
    let preview=composer.querySelector('.ainfo-sticker-preview');
    if(!preview){
      preview=document.createElement('div');preview.className='ainfo-sticker-preview';
      const tools=composer.querySelector('.comment-compose-tools');
      composer.insertBefore(preview,tools||null);
    }
    preview.innerHTML=`${imageHtml(key,'ainfo-sticker-preview-img')}<div style="font-size:11px;font-weight:900;color:#334155">Stiker ${REACTIONS[key].label}</div><button type="button" aria-label="Hapus stiker">×</button>`;
    preview.querySelector('button')?.addEventListener('click',()=>{
      try{if(typeof window.chooseCommentSticker==='function')window.chooseCommentSticker('')}catch{}
      preview.remove();
    });
  }

  function buildStickerPanel(){
    document.querySelectorAll('.sticker-panel').forEach(panel=>{
      if(panel.dataset.ainfoMotion==='1')return;
      panel.dataset.ainfoMotion='1';
      panel.classList.add('ainfo-motion-stickers');
      panel.innerHTML='';
      const title=document.createElement('div');title.className='ainfo-sticker-title';title.textContent='Stiker bergerak';panel.appendChild(title);
      Object.entries(REACTIONS).forEach(([key,item])=>{
        const button=document.createElement('button');button.type='button';button.className='ainfo-sticker-gif';button.title=`Stiker ${item.label}`;button.setAttribute('aria-label',`Stiker ${item.label}`);
        button.innerHTML=imageHtml(key);
        button.addEventListener('click',()=>{
          if(typeof window.chooseCommentSticker==='function')window.chooseCommentSticker(`sticker:${key}`);
          showStickerPreview(key);
          panel.classList.remove('open');
        });
        panel.appendChild(button);
      });
      const subtitle=document.createElement('div');subtitle.className='ainfo-sticker-title';subtitle.textContent='Stiker cepat';panel.appendChild(subtitle);
      STATIC_STICKERS.forEach(sticker=>{
        const button=document.createElement('button');button.type='button';button.className='ainfo-sticker-static';button.textContent=sticker;button.title='Kirim stiker';
        button.addEventListener('click',()=>{
          if(typeof window.chooseCommentSticker==='function')window.chooseCommentSticker(sticker);
          panel.classList.remove('open');
        });
        panel.appendChild(button);
      });
    });
  }

  function renderAnimatedCommentStickers(){
    document.querySelectorAll('.comment-sticker').forEach(box=>{
      const raw=(box.dataset.ainfoStickerToken||box.textContent||'').trim();
      const match=raw.match(/^sticker:(like|love|haha|wow|sad|angry)$/i);
      if(!match)return;
      const key=match[1].toLowerCase();
      box.dataset.ainfoStickerToken=raw;
      box.classList.add('ainfo-animated-sticker');
      if(box.querySelector('img[data-key="'+key+'"]'))return;
      box.innerHTML=`<img src="${REACTIONS[key].src}" alt="Stiker ${REACTIONS[key].label}" data-key="${key}" loading="lazy">`;
    });
  }

  function enhance(){
    addStyles();
    enhanceReactionChoices();
    enhanceMainReactionButtons();
    buildStickerPanel();
    renderAnimatedCommentStickers();
  }

  let scheduled=false;
  const requestEnhance=()=>{
    if(scheduled)return;scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;enhance()});
  };

  document.addEventListener('click',event=>{
    const target=event.target instanceof Element?event.target:null;
    if(target?.closest('.reaction-choice,.comment-reaction-picker button'))setTimeout(requestEnhance,0);
  },true);

  const observer=new MutationObserver(requestEnhance);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance,{once:true});else enhance();
})();
