(function(){
'use strict';
function patch(){
  const p=document.getElementById('avsProvider');
  const label=document.getElementById('avsExternalLabel');
  const input=document.getElementById('avsExternal');
  if(!p||p.value!=='youtube'||!label||!input)return;
  label.textContent='Channel ID / @handle / URL YouTube';
  input.placeholder='UC... / @tvOneNews / https://www.youtube.com/@tvOneNews/featured';
}
new MutationObserver(patch).observe(document.documentElement,{subtree:true,childList:true});
document.addEventListener('change',e=>{if(e.target?.id==='avsProvider')setTimeout(patch,0)});
window.addEventListener('load',patch);setTimeout(patch,200);
console.info('AINFO YouTube source helper 14.17.2');
})();
