(()=>{'use strict';
const hideSection=(el)=>{if(el)el.style.display='none'};
const retired=/video berita|semua video|ainfo shopping|pilihan ainfo shopping|lowongan terbaru|cari lowongan|shopping \(|jobs \(/i;
const replacements=new Map([
 ['Berita Terkini','Latest Articles'],['Berita Pilihan Pembaca','Reader Favorites'],['Rekomendasi Untuk Anda','Recommended Reads'],['Kategori Berita','Explore Topics'],['Beranda','Home'],['Berita','Home'],['Tentang Kami','About'],['Kontak Redaksi','Contact'],['Privasi','Privacy'],['Terpopuler','Most Read'],['Pilihan Editor','Editor’s Picks'],['Ilustrasi berita AINFO.','Home and garden guide illustration.'],['Komentar','Comments'],['Bagikan','Share'],['Simpan','Save'],['PENCARIAN','SEARCH'],['Beranda','Home'],['Tentang AINFO','About AINFO'],['Redaksi & Penulis','Editorial Team & Authors'],['Kontak Redaksi','Contact'],['Kebijakan Privasi','Privacy Policy'],['Syarat & Ketentuan','Terms & Conditions'],['Disclaimer','Disclaimer'],['RSS Feed','RSS Feed'],['Layanan AINFO','AINFO Services'],['Berita Terkini','Latest Articles'],['Lihat Semua','View All'],['Terpopuler','Most Read'],['Baca Selengkapnya','Read More']
]);
function apply(){
 document.documentElement.lang='en';
 document.querySelectorAll('a,button,h1,h2,h3,h4,p,span,strong,small').forEach(el=>{
  if(el.children.length===0){const t=(el.textContent||'').trim();if(replacements.has(t))el.textContent=replacements.get(t)}
 });
 document.querySelectorAll('.home-rich-section,.section-head').forEach(el=>{const t=(el.innerText||'').trim();if(retired.test(t))hideSection(el.closest('.home-rich-section')||el)});
 document.querySelectorAll('.drawer-section').forEach(el=>{const t=(el.innerText||'').toLowerCase();if(t.includes('kategori berita')){const h=el.querySelector('h4');if(h)h.textContent='Explore Topics'}});
 document.querySelectorAll('a[href*="#/video"],a[href*="#/shop"],a[href*="#/jobs"],button[onclick*="drawerGo(\'video\')"],button[onclick*="drawerGo(\'shop\')"],button[onclick*="drawerGo(\'jobs\')"]').forEach(hideSection);
 document.querySelectorAll('.breadcrumb').forEach(el=>{el.textContent=el.textContent.replace(/^Home \/ /,'Home / ')});document.querySelectorAll('.article-main .meta').forEach(el=>{el.textContent=el.textContent.replace(/dibaca/g,'reads').replace(/pembaca/g,'readers')});const title=document.querySelector('title');if(title&&location.hash.startsWith('#/article/')){const h=document.querySelector('.article-main h1');if(h)title.textContent=h.textContent+' | Home & Garden Guide - AINFO'}else if(title)title.textContent='AINFO | Home & Garden Ideas, DIY Projects and Practical Guides';
}
const start=()=>{apply();new MutationObserver(()=>apply()).observe(document.body,{childList:true,subtree:true,characterData:true});};

function filterEvergreenArticles(){
 if(typeof articles==='undefined'||!Array.isArray(articles))return;
 const allowed=new Set(['home & garden','home and garden','gardening','diy','home improvement','indoor plants','outdoor living','landscaping','sustainable living','kitchen garden','houseplants']);
 articles=articles.filter(a=>allowed.has(String(a.cat||a.category||'').trim().toLowerCase()));
}
function rebuildHome(){
 if(typeof articles==='undefined'||!Array.isArray(articles))return;
 filterEvergreenArticles();
 if(!articles.length){const app=document.getElementById('app');if(app)app.innerHTML='<main class="page"><div class="container" style="padding:56px 18px;text-align:center"><h1>Fresh ideas for your home and garden are coming soon</h1><p>We are preparing practical, carefully reviewed guides on gardening, DIY projects, indoor plants, and home improvement.</p></div></main>';return;}
 const feed=articles.slice(1,9).map((a,i)=>newsCard(a)+(i===3?adSlot('nativeFeed','ad-native-grid'):'')).join('');
 const recs=articles.slice(2,7).map(a=>homeRecommendationItem(a)).join('');
 const popular=articles.slice(0,5).map((a,i)=>'<div class="popular-item"><span class="num">'+(i+1)+'</span><div><b>'+escapeHtml(a.title)+'</b><div class="meta">'+Number(a.views||0).toLocaleString('en-US')+' reads</div></div></div>').join('');
 const cats=(state.settings.categories||[]).map((x,i)=>'<button class="feature-mini" onclick="location.hash=\''+categoryHash(x)+'\'"><b>'+escapeHtml(x)+'</b><span>Tips, ideas and step-by-step guides</span></button>').join('');
 document.getElementById('app').innerHTML='<div class="page"><div class="container">'+adSlot('topBillboard')+'<div class="home-grid"><section><div class="lead-grid">'+heroArticle(articles[0])+'<div class="mini-stack">'+articles.slice(1,5).map(miniArticle).join('')+'</div></div>'+adSlot('homeLeaderboard')+'<div class="section-head"><div><h2>Latest Home & Garden Guides</h2><p class="home-subtitle">Practical ideas, expert tips and simple projects for a more comfortable, beautiful home.</p></div></div><div class="news-grid">'+feed+'</div></section><aside class="popular-side"><div class="panel"><h3>Most Read</h3>'+popular+'</div></aside></div><section class="home-rich-section"><div class="section-head"><div><h2>Recommended for You</h2><p class="home-subtitle">Useful ideas for your next home project.</p></div></div><div class="recommend-list">'+recs+'</div></section><section class="home-rich-section"><div class="section-head"><div><h2>Explore Home & Garden Topics</h2></div></div><div class="feature-mini-grid">'+cats+'</div></section></div></div>';
}
const originalRender=window.render;
if(typeof originalRender==='function'){window.render=function(){filterEvergreenArticles();originalRender();if(current()==='home')rebuildHome();};}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
