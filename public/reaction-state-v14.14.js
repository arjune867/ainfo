(function(){
'use strict';
const RX={like:['Suka','/reactions/like.svg'],love:['Love','/reactions/love.svg'],haha:['Haha','/reactions/haha.svg'],wow:['Wow','/reactions/wow.svg'],sad:['Sedih','/reactions/sad.svg'],angry:['Marah','/reactions/angry.svg']};
function walk(list,out=[]){for(const c of list||[]){out.push(c);walk(c.replies||[],out)}return out}
function apply(){
  let list=[];try{if(typeof state!=='undefined'&&Array.isArray(state.comments))list=walk(state.comments)}catch{}
  for(const c of list){
    const key=String(c.myReaction||'');if(!RX[key])continue;
    const picker=document.getElementById(`commentReact-${c.id}`);if(!picker)continue;
    const main=picker.closest('.comment-reaction-wrap')?.querySelector(':scope > button');if(!main)continue;
    const total=Object.values(c.reactions||{}).reduce((n,v)=>n+Number(v||0),0)+Number(c.likes||0);
    main.classList.add('ainfo-comment-reacted');main.dataset.reaction=key;
    main.innerHTML=`<img class="ainfo-comment-main-reaction" src="${RX[key][1]}" alt="${RX[key][0]}"><span>${RX[key][0]}${total?` ${total}`:''}</span>`;
    picker.querySelectorAll('button').forEach(b=>b.classList.toggle('selected',String(b.getAttribute('onclick')||'').includes(`'${key}'`)));
  }
}
let t=0;const schedule=()=>{clearTimeout(t);t=setTimeout(apply,90)};
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('load',schedule);window.addEventListener('hashchange',schedule);schedule();
})();
