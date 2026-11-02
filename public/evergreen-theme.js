(()=>{'use strict';
const hideSection=(el)=>{if(el)el.style.display='none'};
const retired=/video berita|semua video|ainfo shopping|pilihan ainfo shopping|lowongan terbaru|cari lowongan|shopping \(|jobs \(/i;
const replacements=new Map([
 ['Berita Terkini','Latest Articles'],['Berita Pilihan Pembaca','Reader Favorites'],['Rekomendasi Untuk Anda','Recommended Reads'],['Kategori Berita','Explore Topics'],['Beranda','Home'],['Berita','Home'],['Tentang Kami','About'],['Kontak Redaksi','Contact'],['Privasi','Privacy']
]);
function apply(){
 document.documentElement.lang='en';
 document.querySelectorAll('a,button,h1,h2,h3,h4,p,span,strong,small').forEach(el=>{
  if(el.children.length===0){const t=(el.textContent||'').trim();if(replacements.has(t))el.textContent=replacements.get(t)}
 });
 document.querySelectorAll('.home-rich-section,.section-head').forEach(el=>{const t=(el.innerText||'').trim();if(retired.test(t))hideSection(el.closest('.home-rich-section')||el)});
 document.querySelectorAll('.drawer-section').forEach(el=>{const t=(el.innerText||'').toLowerCase();if(t.includes('kategori berita')){const h=el.querySelector('h4');if(h)h.textContent='Explore Topics'}});
 document.querySelectorAll('a[href*="#/video"],a[href*="#/shop"],a[href*="#/jobs"],button[onclick*="drawerGo(\'video\')"],button[onclick*="drawerGo(\'shop\')"],button[onclick*="drawerGo(\'jobs\')"]').forEach(hideSection);
 const title=document.querySelector('title');if(title)title.textContent='AINFO | Home & Garden Ideas, DIY Projects and Practical Guides';
}
const start=()=>{apply();new MutationObserver(()=>apply()).observe(document.body,{childList:true,subtree:true,characterData:true});};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
