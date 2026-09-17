(function(){
  'use strict';
  const VERSION='14.15.0';

  function productId(){const m=(location.hash||'').match(/^#\/product\/(\d+)/);return m?Number(m[1]):0}
  function isShop(){return Boolean(productId())}
  function text(el){return String(el?.textContent||'').replace(/\s+/g,' ').trim().toLowerCase()}
  function call(name,args=[]){const fn=window[name];if(typeof fn!=='function'){console.warn('[AINFO shop actions] missing',name);window.toast?.('Fitur sedang dimuat, coba sekali lagi.');return false}try{fn(...args);return true}catch(e){console.error('[AINFO shop actions]',name,e);window.toast?.('Fitur gagal dibuka. Silakan muat ulang halaman.');return false}}

  function actionFor(target){
    const btn=target.closest('button');if(!btn)return null;
    const root=btn.closest('#ainfoShopEngagement');if(!root)return null;
    const pid=productId();if(!pid)return null;
    const t=text(btn);

    if(btn.closest('.ainfo-eng-actions')){
      if(t.includes('tulis ulasan'))return()=>call('openShopReview',[pid]);
      if(t.includes('mulai diskusi'))return()=>call('openShopDiscussion',[pid]);
    }
    if(btn.classList.contains('ainfo-eng-tab')){
      if(t.startsWith('ulasan'))return()=>call('setShopTab',['review']);
      if(t.startsWith('diskusi'))return()=>call('setShopTab',['discussion']);
    }
    const comment=btn.closest('.ainfo-shop-comment');
    if(comment){
      const id=Number(comment.dataset.shopComment||0);
      if(btn.closest('.ainfo-shop-reactions')){
        const rx=btn.dataset.rx||'';if(rx)return()=>call('reactShopComment',[id,rx]);
      }
      if(btn.closest('.ainfo-shop-comment-tools')){
        if(t.includes('reaction'))return()=>call('toggleShopReaction',[id]);
        if(t.includes('balas')){
          const kind=(comment.querySelector('.ainfo-shop-stars')?'review':(window.__ainfoShopTab||'discussion'));
          const name=comment.querySelector('.ainfo-shop-name')?.textContent?.trim()||'Pembaca';
          return()=>call('replyShopComment',[id,kind,name]);
        }
      }
    }
    return null;
  }

  document.addEventListener('click',function(e){
    if(!isShop())return;
    const action=actionFor(e.target);if(!action)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    action();
  },true);

  function repair(){
    if(!isShop())return;
    const root=document.getElementById('ainfoShopEngagement');if(!root)return;
    root.style.pointerEvents='auto';root.querySelectorAll('button').forEach(b=>{b.style.pointerEvents='auto';b.disabled=false;b.setAttribute('type','button')});
    const sheet=document.getElementById('ainfoComposeSheet');if(sheet){sheet.style.zIndex='2147483646';sheet.style.pointerEvents='auto'}
    const back=document.getElementById('ainfoComposeBackdrop');if(back){back.style.zIndex='2147483645'}
  }
  let timer=0;function schedule(){clearTimeout(timer);timer=setTimeout(repair,60)}
  window.addEventListener('load',schedule);window.addEventListener('hashchange',schedule);
  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true});
  schedule();
  console.info('AINFO shop actions',VERSION);
})();
