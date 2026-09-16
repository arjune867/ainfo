(function(){
  'use strict';

  const API='/api/admin/stickers';
  let loading=false;

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function notify(msg){if(typeof window.toast==='function')window.toast(msg);else console.log('[AINFO Stickers]',msg)}
  function sizeText(n){const v=Number(n||0);if(v<1024)return v+' B';if(v<1024*1024)return (v/1024).toFixed(1)+' KB';return (v/1024/1024).toFixed(1)+' MB'}

  function addStyle(){
    if(document.getElementById('ainfo-sticker-admin-style'))return;
    const s=document.createElement('style');s.id='ainfo-sticker-admin-style';s.textContent=`
      .sticker-admin-card{margin-top:14px}
      .sticker-upload-grid{display:grid;grid-template-columns:minmax(180px,1.3fr) minmax(140px,.8fr) minmax(140px,.8fr) auto;gap:9px;align-items:end}
      .sticker-upload-grid .field{margin:0}
      .sticker-admin-note{margin:8px 0 0;font-size:9px;color:#6f7f93;line-height:1.5}
      .sticker-admin-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:9px;margin-top:13px}
      .sticker-admin-item{border:1px solid #e5eaf1;background:#fff;border-radius:13px;padding:8px;min-width:0}
      .sticker-admin-preview{height:88px;border-radius:10px;background:linear-gradient(45deg,#f6f8fb 25%,#edf1f5 25%,#edf1f5 50%,#f6f8fb 50%,#f6f8fb 75%,#edf1f5 75%);background-size:18px 18px;display:grid;place-items:center;overflow:hidden;border:1px solid #edf1f5}
      .sticker-admin-preview img{width:78px;height:78px;object-fit:contain}
      .sticker-admin-name{font-size:9px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:7px}
      .sticker-admin-meta{font-size:8px;color:#7a899a;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .sticker-admin-actions{display:flex;gap:5px;margin-top:7px}
      .sticker-admin-actions button{flex:1;border:1px solid #dce5ef;background:#fff;border-radius:8px;padding:6px 4px;font-size:8px;font-weight:900}
      .sticker-admin-actions button.on{background:#e8f9f1;color:#08795a;border-color:#bdebd7}.sticker-admin-actions button.off{background:#fff6e5;color:#946000;border-color:#f5dcaa}.sticker-admin-actions button.delete{flex:0 0 32px;color:#b21d2a;background:#fff7f8;border-color:#f0c9ce}
      .sticker-admin-empty{grid-column:1/-1;border:1px dashed #ccd7e3;border-radius:12px;padding:24px;text-align:center;color:#7a899a;font-size:10px;background:#fbfdff}
      .sticker-upload-progress{display:none;margin-top:9px;padding:9px 11px;border-radius:10px;background:#eef6ff;color:#25517c;font-size:9px;font-weight:800}.sticker-upload-progress.show{display:block}
      @media(max-width:1180px){.sticker-admin-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.sticker-upload-grid{grid-template-columns:1fr 1fr}}
      @media(max-width:620px){.sticker-admin-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.sticker-upload-grid{grid-template-columns:1fr}.sticker-admin-preview{height:76px}.sticker-admin-preview img{width:68px;height:68px}}
    `;document.head.appendChild(s);
  }

  function panelHtml(){return `
    <div class="card sticker-admin-card" id="prodStickerManager">
      <h3><i class="bi bi-emoji-smile"></i> Sticker Manager</h3>
      <p class="card-sub">Upload GIF/PNG/WebP dari dashboard. Stiker aktif otomatis tampil pada menu Stiker di komentar AINFO.</p>
      <div class="sticker-upload-grid">
        <div class="field"><label>File stiker</label><input id="stickerAdminFile" type="file" accept="image/gif,image/png,image/webp,image/jpeg,image/avif"></div>
        <div class="field"><label>Nama stiker</label><input id="stickerAdminName" maxlength="80" placeholder="Contoh: Ngakak Biru"></div>
        <div class="field"><label>Kategori</label><select id="stickerAdminCategory"><option>Karakter</option><option>Lucu</option><option>Emosi</option><option>Ucapan</option><option>Perayaan</option><option>Islami</option><option>Lainnya</option></select></div>
        <button class="btn primary" id="stickerAdminUpload"><i class="bi bi-cloud-arrow-up"></i> Upload Stiker</button>
      </div>
      <div class="sticker-admin-note">Maksimal 5 MB per file. GIF tetap bergerak dan file disimpan di Cloudflare R2, bukan di source GitHub.</div>
      <div class="sticker-upload-progress" id="stickerAdminProgress">Mengunggah stiker…</div>
      <div class="sticker-admin-grid" id="stickerAdminGrid"><div class="sticker-admin-empty">Memuat koleksi stiker…</div></div>
    </div>`}

  async function load(){
    const grid=document.getElementById('stickerAdminGrid');if(!grid||loading)return;loading=true;
    try{
      const r=await window.fetch(API,{cache:'no-store',credentials:'include'});const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.message||d.error||'Gagal memuat stiker');
      const list=Array.isArray(d.stickers)?d.stickers:[];
      if(!list.length){grid.innerHTML='<div class="sticker-admin-empty"><i class="bi bi-images" style="font-size:24px;display:block;margin-bottom:7px"></i>Belum ada stiker custom. Upload GIF atau PNG pertama Anda.</div>';return}
      grid.innerHTML=list.map(x=>`<div class="sticker-admin-item" data-sticker-id="${Number(x.id)}"><div class="sticker-admin-preview"><img src="${esc(x.url)}" alt="${esc(x.name)}" loading="lazy"></div><div class="sticker-admin-name" title="${esc(x.name)}">${esc(x.name)}</div><div class="sticker-admin-meta">${esc(x.category)} · ${sizeText(x.sizeBytes)}</div><div class="sticker-admin-actions"><button class="${x.active?'on':'off'}" data-act="toggle" data-active="${x.active?'1':'0'}">${x.active?'Aktif':'Nonaktif'}</button><button class="delete" data-act="delete" title="Hapus"><i class="bi bi-trash"></i></button></div></div>`).join('');
    }catch(e){grid.innerHTML=`<div class="sticker-admin-empty">${esc(e.message||'Gagal memuat stiker')}</div>`}
    finally{loading=false}
  }

  async function upload(){
    const input=document.getElementById('stickerAdminFile');const file=input?.files?.[0];if(!file)return notify('Pilih file stiker terlebih dahulu.');
    if(file.size>5*1024*1024)return notify('Ukuran stiker maksimal 5 MB.');
    const progress=document.getElementById('stickerAdminProgress');progress?.classList.add('show');
    const btn=document.getElementById('stickerAdminUpload');if(btn)btn.disabled=true;
    try{
      const fd=new FormData();fd.append('file',file);fd.append('name',document.getElementById('stickerAdminName')?.value.trim()||file.name.replace(/\.[^.]+$/,''));fd.append('category',document.getElementById('stickerAdminCategory')?.value||'Karakter');
      const r=await window.fetch(API,{method:'POST',body:fd});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||d.error||'Upload gagal');
      input.value='';const name=document.getElementById('stickerAdminName');if(name)name.value='';notify('Stiker berhasil diupload.');await load();
    }catch(e){notify(e.message||'Upload stiker gagal.')}finally{progress?.classList.remove('show');if(btn)btn.disabled=false}
  }

  async function toggle(id,current){
    try{const r=await window.fetch(`${API}/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({active:!current})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||d.error||'Gagal mengubah status');notify(!current?'Stiker diaktifkan.':'Stiker dinonaktifkan.');await load()}catch(e){notify(e.message||'Gagal mengubah status stiker.')}
  }

  async function remove(id){
    if(!confirm('Hapus stiker ini dari AINFO dan R2?'))return;
    try{const r=await window.fetch(`${API}/${id}`,{method:'DELETE'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||d.error||'Gagal menghapus');notify('Stiker dihapus.');await load()}catch(e){notify(e.message||'Gagal menghapus stiker.')}
  }

  function bind(panel){
    panel.querySelector('#stickerAdminUpload')?.addEventListener('click',upload);
    panel.querySelector('#stickerAdminGrid')?.addEventListener('click',e=>{const b=e.target.closest('button[data-act]');if(!b)return;const item=b.closest('[data-sticker-id]');const id=Number(item?.dataset.stickerId||0);if(!id)return;if(b.dataset.act==='toggle')toggle(id,b.dataset.active==='1');if(b.dataset.act==='delete')remove(id)});
    load();
  }

  function mount(){
    if(!location.pathname.startsWith('/admin'))return;
    addStyle();
    const sec=document.getElementById('sec-settings');if(!sec||document.getElementById('prodStickerManager'))return;
    const holder=document.createElement('div');holder.innerHTML=panelHtml();const panel=holder.firstElementChild;sec.appendChild(panel);bind(panel);
  }

  let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;mount()})};
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
