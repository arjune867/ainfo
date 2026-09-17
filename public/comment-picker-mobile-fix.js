(function(){
  'use strict';

  const VERSION='1.0.0';
  const STYLE_ID='ainfo-comment-picker-mobile-fix-style';
  let homeParent=null;
  let homeNext=null;

  function isMobile(){return window.matchMedia('(max-width:700px)').matches}

  function addStyles(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      body>.ainfo-comment-picker.ainfo-picker-portaled{display:none;position:fixed;left:10px;right:10px;top:auto;bottom:var(--ainfo-picker-bottom,76px);z-index:2147483000;border:1px solid #dfe6ef;border-radius:22px;background:#fff;box-shadow:0 24px 70px rgba(9,26,54,.30);overflow:hidden;max-height:min(58vh,470px)}
      body>.ainfo-comment-picker.ainfo-picker-portaled.open{display:block}
      body>.ainfo-comment-picker.ainfo-picker-portaled .ainfo-picker-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid #eef2f6;background:#fbfdff}
      body>.ainfo-comment-picker.ainfo-picker-portaled .ainfo-picker-head b{font-size:13px}
      body>.ainfo-comment-picker.ainfo-picker-portaled .ainfo-picker-close{width:32px;height:32px;border:0;border-radius:50%;background:#eef3f8;color:#42526a;font-size:18px;display:grid;place-items:center}
      body>.ainfo-comment-picker.ainfo-picker-portaled .ainfo-picker-tabs{display:flex;gap:6px;overflow:auto;padding:10px 12px;border-bottom:1px solid #eef2f6;scrollbar-width:none}
      body>.ainfo-comment-picker.ainfo-picker-portaled .ainfo-picker-tabs::-webkit-scrollbar{display:none}
      body>.ainfo-comment-picker.ainfo-picker-portaled .ainfo-picker-tab{border:1px solid #e1e7ef;background:#fff;border-radius:999px;padding:7px 11px;font-size:11px;font-weight:800;color:#5f6f83;white-space:nowrap}
      body>.ainfo-comment-picker.ainfo-picker-portaled .ainfo-picker-tab.active{background:#0b5ed7;border-color:#0b5ed7;color:#fff}
      body>.ainfo-comment-picker.ainfo-picker-portaled .ainfo-picker-body{max-height:calc(min(58vh,470px) - 105px);overflow:auto;padding:11px;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
      body>.ainfo-comment-picker.ainfo-picker-portaled .ainfo-emoji-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}
      body>.ainfo-comment-picker.ainfo-picker-portaled .ainfo-emoji-btn{aspect-ratio:1;border:0;border-radius:11px;background:#f7f9fc;font-size:25px;display:grid;place-items:center;transition:.15s}
      body>.ainfo-comment-picker.ainfo-picker-portaled .ainfo-emoji-btn:active{transform:scale(.92);background:#eaf3ff}
      body>.ainfo-comment-picker.ainfo-picker-portaled .ainfo-sticker-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      body>.ainfo-comment-picker.ainfo-picker-portaled .ainfo-sticker-btn{border:1px solid #edf1f6;border-radius:14px;background:#fff;min-height:92px;padding:7px;display:flex;align-items:center;justify-content:center;overflow:hidden}
      body>.ainfo-comment-picker.ainfo-picker-portaled .ainfo-sticker-btn img{width:80px;height:80px;object-fit:contain;border-radius:10px;display:block}
      body>.ainfo-comment-picker.ainfo-picker-portaled .ainfo-gif-search{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin-bottom:10px}
      body>.ainfo-comment-picker.ainfo-picker-portaled .ainfo-gif-search input,body>.ainfo-comment-picker.ainfo-picker-portaled .ainfo-gif-url input{width:100%;border:1px solid #dce3ec;border-radius:11px;padding:10px 12px;font-size:12px;outline:0;background:#fff}
      body>.ainfo-comment-picker.ainfo-picker-portaled .ainfo-gif-search button,body>.ainfo-comment-picker.ainfo-picker-portaled .ainfo-gif-url button{border:0;border-radius:11px;background:#0b5ed7;color:#fff;padding:0 13px;font-size:12px;font-weight:850}
      body>.ainfo-comment-picker.ainfo-picker-portaled .ainfo-gif-grid{columns:2;column-gap:7px}
      body>.ainfo-comment-picker.ainfo-picker-portaled .ainfo-gif-card{width:100%;display:block;break-inside:avoid;margin:0 0 8px;border:0;border-radius:12px;overflow:hidden;background:#eef3f8;padding:0}
      body>.ainfo-comment-picker.ainfo-picker-portaled .ainfo-gif-card img{width:100%;height:auto;display:block}
      body>.ainfo-comment-picker.ainfo-picker-portaled .ainfo-picker-empty{padding:26px 12px;text-align:center;color:#77869a;font-size:12px;line-height:1.55}
      body>.ainfo-comment-picker.ainfo-picker-portaled .ainfo-picker-loader{padding:24px;text-align:center;color:#0b5ed7;font-size:12px;font-weight:800}
      body>.ainfo-comment-picker.ainfo-picker-portaled .ainfo-gif-url{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid #eef2f6}
      body>.ainfo-comment-picker.ainfo-picker-portaled .ainfo-gif-credit{font-size:9px;color:#9aa5b4;margin-top:9px;text-align:right}
      @media(max-width:390px){body>.ainfo-comment-picker.ainfo-picker-portaled .ainfo-emoji-grid{grid-template-columns:repeat(6,minmax(0,1fr))}}
    `;
    document.head.appendChild(style);
  }

  function isVisible(el){
    if(!el)return false;
    const s=getComputedStyle(el);
    if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0)return false;
    const r=el.getBoundingClientRect();
    return r.width>0&&r.height>0&&r.bottom>0&&r.top<window.innerHeight;
  }

  function bottomClearance(){
    const vh=window.innerHeight||document.documentElement.clientHeight||700;
    let clearance=76;
    ['#bottomNav','.bottom-nav','#anchorAdRoot','.anchor-ad-root'].forEach(sel=>{
      document.querySelectorAll(sel).forEach(el=>{
        if(!isVisible(el))return;
        const r=el.getBoundingClientRect();
        if(r.top>vh*.5&&r.bottom>vh*.65){
          clearance=Math.max(clearance,Math.ceil(vh-r.top+10));
        }
      });
    });
    return Math.min(clearance,Math.floor(vh*.48));
  }

  function rememberHome(picker){
    if(homeParent&&homeParent.isConnected)return;
    homeParent=picker.parentNode;
    homeNext=picker.nextSibling;
  }

  function positionPicker(){
    const picker=document.getElementById('commentMediaPickerV2');
    if(!picker||!picker.classList.contains('open'))return;
    if(!isMobile())return restorePicker();
    rememberHome(picker);
    if(picker.parentNode!==document.body)document.body.appendChild(picker);
    picker.classList.add('ainfo-picker-portaled');
    picker.style.setProperty('--ainfo-picker-bottom',`${bottomClearance()}px`);
    const available=Math.max(220,(window.innerHeight||700)-bottomClearance()-14);
    picker.style.maxHeight=`${Math.min(Math.round((window.innerHeight||700)*.58),470,available)}px`;
  }

  function restorePicker(){
    const picker=document.getElementById('commentMediaPickerV2');
    if(!picker)return;
    picker.classList.remove('ainfo-picker-portaled');
    picker.style.removeProperty('--ainfo-picker-bottom');
    picker.style.removeProperty('max-height');
    let parent=homeParent&&homeParent.isConnected?homeParent:document.querySelector('#comments .comment-compose-tools');
    if(parent&&picker.parentNode!==parent){
      if(homeNext&&homeNext.parentNode===parent)parent.insertBefore(picker,homeNext);else parent.appendChild(picker);
    }
    homeParent=null;homeNext=null;
  }

  function wrap(name,before,after){
    const original=window[name];
    if(typeof original!=='function'||original.__ainfoMobileWrapped)return;
    const wrapped=function(...args){
      if(before)before(...args);
      const out=original.apply(this,args);
      if(after)after(...args);
      return out;
    };
    wrapped.__ainfoMobileWrapped=true;
    window[name]=wrapped;
  }

  function install(){
    addStyles();
    wrap('openCommentMediaV2',null,()=>requestAnimationFrame(positionPicker));
    wrap('closeCommentMediaV2',null,restorePicker);
    wrap('selectCommentStickerV2',restorePicker,null);
    wrap('selectCommentGifV2',restorePicker,null);
    wrap('selectGifUrlV2',restorePicker,null);
    wrap('clearCommentMediaV2',restorePicker,null);

    const reposition=()=>{if(isMobile())requestAnimationFrame(positionPicker);else restorePicker()};
    window.addEventListener('resize',reposition,{passive:true});
    window.addEventListener('orientationchange',reposition,{passive:true});
    window.visualViewport?.addEventListener('resize',reposition,{passive:true});

    const observer=new MutationObserver(()=>{
      const picker=document.getElementById('commentMediaPickerV2');
      if(picker?.classList.contains('open')&&isMobile())positionPicker();
    });
    observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
    console.info('[AINFO] Comment Picker mobile position fix',VERSION);
  }

  function boot(){
    let tries=0;
    const timer=setInterval(()=>{
      tries+=1;
      if(typeof window.openCommentMediaV2==='function'){
        clearInterval(timer);install();
      }else if(tries>80){clearInterval(timer)}
    },50);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
