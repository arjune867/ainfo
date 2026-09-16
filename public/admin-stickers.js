(function(){
  'use strict';

  const API='/api/admin/stickers';
  const ACCEPTED=new Set(['image/gif','image/png','image/webp','image/jpeg','image/avif']);
  const CATEGORIES=['Karakter','Lucu','Emosi','Ucapan','Perayaan','Islami','Lainnya'];
  const MAX_SIZE=5*1024*1024;
  const MAX_BATCH=100;
  let loading=false;
  let queue=[];

  const KNOWN={
    '14 (1)':{name:'Senyum Lebar',category:'Lucu'},
    '14':{name:'Tertawa Ceria',category:'Lucu'},
    '26':{name:'Penguin Cinta',category:'Lucu'},
    'berdukas':{name:'Berduka',category:'Emosi'},
    'bintang5':{name:'Bintang Ceria',category:'Karakter'},
    'boleh juga':{name:'Boleh Juga',category:'Ucapan'},
    'damai':{name:'Damai',category:'Ucapan'},
    'hallo':{name:'Halo',category:'Ucapan'},
    'hot tread':{name:'Hot Thread',category:'Ucapan'},
    'lebaran03':{name:'Lebaran',category:'Islami'},
    'ngakak':{name:'Ngakak',category:'Lucu'},
    'ok':{name:'Oke',category:'Ucapan'},
    'recsel':{name:'Karakter Oranye',category:'Karakter'},
    'repost':{name:'Repost Biru',category:'Ucapan'},
    's_sm_repost2':{name:'Repost Ungu',category:'Ucapan'},
    'salah_kamar':{name:'Salah Kamar',category:'Lucu'},
    'senang':{name:'Senang',category:'Emosi'},
    'smiley_beer':{name:'Cheers',category:'Perayaan'},
    'smilies_fb5ly1i58kbq':{name:'Selamat Ulang Tahun',category:'Perayaan'},
    'smilies_fb5ly1iothbu':{name:'Karakter Biru',category:'Karakter'}
  };

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]))}
  function notify(msg){if(typeof window.toast==='function')window.toast(msg);else console.log('[AINFO Stickers]',msg)}
  function sizeText(n){const v=Number(n||0);if(v<1024)return v+' B';if(v<1024*1024)return (v/1024).toFixed(1)+' KB';return (v/1024/1024).toFixed(1)+' MB'}
  function stem(filename){return String(filename||'').replace(/\.[^.]+$/,'').trim()}
  function normalizeKey(filename){return stem(filename).toLowerCase().trim()}
  function titleCase(value){return String(value||'').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase())}
  function cleanName(filename){
    let value=stem(filename).replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();
    value=value.replace(/\b(copy|final|new|baru|small|sm|sticker|stiker)\b/gi,'').replace(/\s+/g,' ').trim();
    if(!value)value='Stiker';
    if(/^\d+$/.test(value))value='Stiker '+value;
    return titleCase(value).slice(0,80);
  }
  function inferCategory(filename,name=''){
    const t=(String(filename)+' '+String(name)).toLowerCase().replace(/[_-]+/g,' ');
    if(/lebaran|ramadan|ramadhan|idul|fitri|adha|islami|islam|ketupat|takbir|maaf lahir/.test(t))return 'Islami';
    if(/ulang tahun|birthday|cake|kue|party|pesta|cheers|beer|bir|rayakan|perayaan|selamat/.test(t))return 'Perayaan';
    if(/ngakak|haha|laugh|lol|ketawa|tertawa|lucu|salah kamar|wkwk|rofl/.test(t))return 'Lucu';
    if(/duka|sedih|sad|marah|angry|senang|happy|love|cinta|cry|nangis|emosi|kaget|wow/.test(t))return 'Emosi';
    if(/hallo|halo|hello|ok\b|oke|boleh|damai|repost|thanks|makasih|terima kasih|good|mantap|sip|hot tread|hot thread/.test(t))return 'Ucapan';
    if(/character|karakter|biru|orange|oranye|ungu|pink|robot|penguin|bintang/.test(t))return 'Karakter';
    return 'Karakter';
  }
  function autoMeta(file){
    const key=normalizeKey(file.name);
    const exact=KNOWN[key];
    if(exact)return {...exact};
    const name=cleanName(file.name);
    return {name,category:inferCategory(file.name,name)};
  }
  function fileId(file){return [file.name,file.size,file.lastModified].join('::')}
  function options(selected){return CATEGORIES.map(c=>`<option${c===selected?' selected':''}>${c}</option>`).join('')}

  function addStyle(){
    if(document.getElementById('ainfo-sticker-admin-style'))return;
    const s=document.createElement('style');s.id='ainfo-sticker-admin-style';s.textContent=`
      .sticker-admin-card{margin-top:14px}.sticker-upload-grid{display:grid;grid-template-columns:minmax(180px,1.3fr) minmax(140px,.8fr) minmax(140px,.8fr) auto;gap:9px;align-items:end}.sticker-upload-grid .field{margin:0}
      .sticker-admin-note{margin:8px 0 0;font-size:9px;color:#6f7f93;line-height:1.5}.sticker-admin-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:9px;margin-top:13px}.sticker-admin-item{border:1px solid #e5eaf1;background:#fff;border-radius:13px;padding:8px;min-width:0}.sticker-admin-preview{height:88px;border-radius:10px;background:linear-gradient(45deg,#f6f8fb 25%,#edf1f5 25%,#edf1f5 50%,#f6f8fb 50%,#f6f8fb 75%,#edf1f5 75%);background-size:18px 18px;display:grid;place-items:center;overflow:hidden;border:1px solid #edf1f5}.sticker-admin-preview img{width:78px;height:78px;object-fit:contain}.sticker-admin-name{font-size:9px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:7px}.sticker-admin-meta{font-size:8px;color:#7a899a;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sticker-admin-actions{display:flex;gap:5px;margin-top:7px}.sticker-admin-actions button{flex:1;border:1px solid #dce5ef;background:#fff;border-radius:8px;padding:6px 4px;font-size:8px;font-weight:900}.sticker-admin-actions button.on{background:#e8f9f1;color:#08795a;border-color:#bdebd7}.sticker-admin-actions button.off{background:#fff6e5;color:#946000;border-color:#f5dcaa}.sticker-admin-actions button.delete{flex:0 0 32px;color:#b21d2a;background:#fff7f8;border-color:#f0c9ce}.sticker-admin-empty{grid-column:1/-1;border:1px dashed #ccd7e3;border-radius:12px;padding:24px;text-align:center;color:#7a899a;font-size:10px;background:#fbfdff}.sticker-upload-progress{display:none;margin-top:9px;padding:9px 11px;border-radius:10px;background:#eef6ff;color:#25517c;font-size:9px;font-weight:800}.sticker-upload-progress.show{display:block}
      .sticker-dropzone{margin-top:10px;border:1.5px dashed #9fb9d8;border-radius:13px;padding:18px;text-align:center;background:#f8fbff;color:#516b89;transition:.18s}.sticker-dropzone.drag{border-color:#0b5ed7;background:#eef6ff}.sticker-dropzone i{font-size:25px;color:#0b5ed7;display:block;margin-bottom:5px}.sticker-dropzone b{display:block;font-size:11px}.sticker-dropzone span{font-size:9px;color:#7a899a}.sticker-batch-tools{display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin-top:10px}.sticker-batch-tools .count{font-size:9px;color:#60758e;margin-left:auto}.sticker-batch-list{display:grid;gap:8px;margin-top:10px}.sticker-batch-row{display:grid;grid-template-columns:58px minmax(160px,1.2fr) minmax(130px,.7fr) 80px 34px;gap:8px;align-items:center;border:1px solid #e4eaf1;border-radius:12px;padding:8px;background:#fff}.sticker-batch-thumb{width:58px;height:58px;border-radius:10px;object-fit:contain;background:#f4f7fb;border:1px solid #edf1f5}.sticker-batch-row input,.sticker-batch-row select{width:100%;border:1px solid #dce5ef;border-radius:8px;padding:8px;font-size:9px;background:#fff}.sticker-batch-file{font-size:8px;color:#75869a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sticker-batch-status{font-size:8px;font-weight:900;text-align:center;color:#64748b}.sticker-batch-status.ok{color:#08795a}.sticker-batch-status.err{color:#b21d2a}.sticker-remove-file{width:30px;height:30px;border:1px solid #f0c9ce;background:#fff7f8;color:#b21d2a;border-radius:8px}.sticker-progressbar{height:7px;background:#dce9f8;border-radius:999px;overflow:hidden;margin-top:7px}.sticker-progressbar>span{display:block;height:100%;width:0;background:#0b5ed7;transition:width .2s}.sticker-batch-summary{margin-top:8px;font-size:9px;color:#52647a}
      @media(max-width:1180px){.sticker-admin-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.sticker-upload-grid{grid-template-columns:1fr 1fr}}
      @media(max-width:760px){.sticker-batch-row{grid-template-columns:52px 1fr 34px}.sticker-batch-row .batch-category,.sticker-batch-row .sticker-batch-status{grid-column:2/3}.sticker-batch-thumb{width:52px;height:52px;grid-row:1/3}.sticker-remove-file{grid-column:3;grid-row:1}}
      @media(max-width:620px){.sticker-admin-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.sticker-upload-grid{grid-template-columns:1fr}.sticker-admin-preview{height:76px}.sticker-admin-preview img{width:68px;height:68px}}
    `;document.head.appendChild(s);
  }

  function panelHtml(){return `
    <div class="card sticker-admin-card" id="prodStickerManager">
      <h3><i class="bi bi-emoji-smile"></i> Sticker Manager</h3>
      <p class="card-sub">Upload satu atau banyak GIF/PNG/WebP. Nama dan kategori dibuat otomatis dari nama file, lalu tetap bisa diedit sebelum upload.</p>
      <div class="sticker-dropzone" id="stickerDropzone"><i class="bi bi-cloud-arrow-up"></i><b>Drop banyak stiker di sini</b><span>atau klik untuk memilih file · maks. ${MAX_BATCH} file · 5 MB per file</span><input id="stickerAdminFile" type="file" multiple accept="image/gif,image/png,image/webp,image/jpeg,image/avif" hidden></div>
      <div class="sticker-batch-tools"><button class="btn" id="stickerPickFiles"><i class="bi bi-images"></i> Pilih Banyak File</button><button class="btn" id="stickerRegenerate" disabled><i class="bi bi-stars"></i> Generate Ulang Nama & Kategori</button><button class="btn primary" id="stickerAdminUpload" disabled><i class="bi bi-cloud-arrow-up"></i> Upload Semua</button><button class="btn" id="stickerClearQueue" disabled><i class="bi bi-x-circle"></i> Bersihkan</button><span class="count" id="stickerQueueCount">0 file dipilih</span></div>
      <div class="sticker-admin-note">Auto-kategori: Lucu, Emosi, Ucapan, Perayaan, Islami, atau Karakter. Anda dapat mengoreksi nama/kategori sebelum menekan Upload Semua.</div>
      <div class="sticker-batch-list" id="stickerBatchList"></div>
      <div class="sticker-upload-progress" id="stickerAdminProgress"><span id="stickerProgressText">Menyiapkan upload…</span><div class="sticker-progressbar"><span id="stickerProgressBar"></span></div><div class="sticker-batch-summary" id="stickerBatchSummary"></div></div>
      <div class="sticker-admin-grid" id="stickerAdminGrid"><div class="sticker-admin-empty">Memuat koleksi stiker…</div></div>
    </div>`}

  async function load(){
    const grid=document.getElementById('stickerAdminGrid');if(!grid||loading)return;loading=true;
    try{const r=await window.fetch(API,{cache:'no-store',credentials:'include'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||d.error||'Gagal memuat stiker');const list=Array.isArray(d.stickers)?d.stickers:[];if(!list.length){grid.innerHTML='<div class="sticker-admin-empty"><i class="bi bi-images" style="font-size:24px;display:block;margin-bottom:7px"></i>Belum ada stiker custom. Pilih beberapa GIF/PNG di atas.</div>';return}grid.innerHTML=list.map(x=>`<div class="sticker-admin-item" data-sticker-id="${Number(x.id)}"><div class="sticker-admin-preview"><img src="${esc(x.url)}" alt="${esc(x.name)}" loading="lazy"></div><div class="sticker-admin-name" title="${esc(x.name)}">${esc(x.name)}</div><div class="sticker-admin-meta">${esc(x.category)} · ${sizeText(x.sizeBytes)}</div><div class="sticker-admin-actions"><button class="${x.active?'on':'off'}" data-act="toggle" data-active="${x.active?'1':'0'}">${x.active?'Aktif':'Nonaktif'}</button><button class="delete" data-act="delete" title="Hapus"><i class="bi bi-trash"></i></button></div></div>`).join('')}catch(e){grid.innerHTML=`<div class="sticker-admin-empty">${esc(e.message||'Gagal memuat stiker')}</div>`}finally{loading=false}
  }

  function syncQueueFromDom(){
    document.querySelectorAll('.sticker-batch-row').forEach(row=>{const item=queue.find(x=>x.id===row.dataset.fileId);if(!item)return;item.name=row.querySelector('.batch-name')?.value.trim()||item.name;item.category=row.querySelector('.batch-category')?.value||item.category});
  }

  function renderQueue(){
    const box=document.getElementById('stickerBatchList');if(!box)return;
    const count=document.getElementById('stickerQueueCount');if(count)count.textContent=`${queue.length} file dipilih`;
    ['stickerAdminUpload','stickerRegenerate','stickerClearQueue'].forEach(id=>{const el=document.getElementById(id);if(el)el.disabled=!queue.length});
    if(!queue.length){box.innerHTML='';return}
    box.innerHTML=queue.map(item=>`<div class="sticker-batch-row" data-file-id="${esc(item.id)}"><img class="sticker-batch-thumb" src="${esc(item.preview)}" alt=""><div><input class="batch-name" maxlength="80" value="${esc(item.name)}"><div class="sticker-batch-file" title="${esc(item.file.name)}">${esc(item.file.name)} · ${sizeText(item.file.size)}</div></div><select class="batch-category">${options(item.category)}</select><div class="sticker-batch-status ${item.status==='done'?'ok':item.status==='error'?'err':''}">${item.status==='done'?'Selesai':item.status==='error'?'Gagal':item.status==='uploading'?'Upload…':'Siap'}</div><button class="sticker-remove-file" data-remove-file="${esc(item.id)}" title="Hapus dari antrean"><i class="bi bi-x"></i></button></div>`).join('');
  }

  function addFiles(fileList){
    syncQueueFromDom();
    const incoming=Array.from(fileList||[]).slice(0,MAX_BATCH);
    const existing=new Set(queue.map(x=>x.id));
    let rejected=0;
    for(const file of incoming){
      if(!ACCEPTED.has(String(file.type||'').toLowerCase())||file.size>MAX_SIZE){rejected++;continue}
      const id=fileId(file);if(existing.has(id))continue;existing.add(id);
      const meta=autoMeta(file);queue.push({id,file,name:meta.name,category:meta.category,preview:URL.createObjectURL(file),status:'ready',error:''});
    }
    if(queue.length>MAX_BATCH){queue=queue.slice(0,MAX_BATCH)}
    renderQueue();
    if(rejected)notify(`${rejected} file dilewati karena format tidak didukung atau ukuran > 5 MB.`);
  }

  function clearQueue(){for(const x of queue){try{URL.revokeObjectURL(x.preview)}catch{}}queue=[];const input=document.getElementById('stickerAdminFile');if(input)input.value='';renderQueue()}
  function regenerate(){syncQueueFromDom();queue.forEach(item=>{const meta=autoMeta(item.file);item.name=meta.name;item.category=meta.category;item.status='ready';item.error=''});renderQueue();notify('Nama dan kategori digenerate ulang.')}

  async function uploadOne(item){
    item.status='uploading';renderQueue();
    const fd=new FormData();fd.append('file',item.file);fd.append('name',item.name||cleanName(item.file.name));fd.append('category',item.category||inferCategory(item.file.name,item.name));
    const r=await window.fetch(API,{method:'POST',body:fd});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||d.error||'Upload gagal');item.status='done';return d;
  }

  async function uploadAll(){
    if(!queue.length)return notify('Pilih file stiker terlebih dahulu.');syncQueueFromDom();
    const invalid=queue.filter(x=>!x.name.trim());if(invalid.length)return notify('Ada nama stiker yang kosong.');
    const btn=document.getElementById('stickerAdminUpload');if(btn)btn.disabled=true;
    const progress=document.getElementById('stickerAdminProgress');progress?.classList.add('show');
    const bar=document.getElementById('stickerProgressBar');const text=document.getElementById('stickerProgressText');const summary=document.getElementById('stickerBatchSummary');
    let cursor=0,done=0,failed=0;const total=queue.length;
    const update=()=>{if(bar)bar.style.width=`${Math.round((done+failed)/Math.max(1,total)*100)}%`;if(text)text.textContent=`Upload ${done+failed}/${total} stiker…`;if(summary)summary.textContent=`Berhasil ${done} · Gagal ${failed}`};update();
    const worker=async()=>{while(true){const index=cursor++;if(index>=total)return;const item=queue[index];try{await uploadOne(item);done++}catch(e){item.status='error';item.error=e.message||'Upload gagal';failed++}update();renderQueue()}};
    await Promise.all(Array.from({length:Math.min(3,total)},()=>worker()));
    if(text)text.textContent=failed?`Bulk upload selesai dengan ${failed} kegagalan.`:'Semua stiker berhasil diupload.';
    if(summary)summary.textContent=`Berhasil ${done} dari ${total}${failed?` · gagal ${failed}`:''}`;
    notify(failed?`${done} stiker berhasil, ${failed} gagal.`:`${done} stiker berhasil diupload.`);
    await load();
    if(!failed)setTimeout(()=>{clearQueue();progress?.classList.remove('show')},900);
    if(btn)btn.disabled=false;
  }

  async function toggle(id,current){try{const r=await window.fetch(`${API}/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({active:!current})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||d.error||'Gagal mengubah status');notify(!current?'Stiker diaktifkan.':'Stiker dinonaktifkan.');await load()}catch(e){notify(e.message||'Gagal mengubah status stiker.')}}
  async function remove(id){if(!confirm('Hapus stiker ini dari AINFO dan R2?'))return;try{const r=await window.fetch(`${API}/${id}`,{method:'DELETE'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||d.error||'Gagal menghapus');notify('Stiker dihapus.');await load()}catch(e){notify(e.message||'Gagal menghapus stiker.')}}

  function bind(panel){
    const input=panel.querySelector('#stickerAdminFile');const drop=panel.querySelector('#stickerDropzone');
    panel.querySelector('#stickerPickFiles')?.addEventListener('click',()=>input?.click());drop?.addEventListener('click',e=>{if(e.target.closest('button,input'))return;input?.click()});input?.addEventListener('change',()=>addFiles(input.files));
    ['dragenter','dragover'].forEach(type=>drop?.addEventListener(type,e=>{e.preventDefault();drop.classList.add('drag')}));['dragleave','drop'].forEach(type=>drop?.addEventListener(type,e=>{e.preventDefault();drop.classList.remove('drag')}));drop?.addEventListener('drop',e=>addFiles(e.dataTransfer?.files));
    panel.querySelector('#stickerAdminUpload')?.addEventListener('click',uploadAll);panel.querySelector('#stickerRegenerate')?.addEventListener('click',regenerate);panel.querySelector('#stickerClearQueue')?.addEventListener('click',clearQueue);
    panel.querySelector('#stickerBatchList')?.addEventListener('click',e=>{const b=e.target.closest('[data-remove-file]');if(!b)return;syncQueueFromDom();const id=b.dataset.removeFile;const item=queue.find(x=>x.id===id);if(item){try{URL.revokeObjectURL(item.preview)}catch{}}queue=queue.filter(x=>x.id!==id);renderQueue()});
    panel.querySelector('#stickerAdminGrid')?.addEventListener('click',e=>{const b=e.target.closest('button[data-act]');if(!b)return;const item=b.closest('[data-sticker-id]');const id=Number(item?.dataset.stickerId||0);if(!id)return;if(b.dataset.act==='toggle')toggle(id,b.dataset.active==='1');if(b.dataset.act==='delete')remove(id)});
    load();
  }

  function mount(){if(!location.pathname.startsWith('/admin'))return;addStyle();const sec=document.getElementById('sec-settings');if(!sec||document.getElementById('prodStickerManager'))return;const holder=document.createElement('div');holder.innerHTML=panelHtml();const panel=holder.firstElementChild;sec.appendChild(panel);bind(panel)}
  let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;mount()})};new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
