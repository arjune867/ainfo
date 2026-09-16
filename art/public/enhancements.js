(() => {
  const $all = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const text = (node) => String(node?.textContent || '').trim();
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  async function getCurrentArticleByTitle(title) {
    const response = await fetch('/api/articles', { credentials: 'same-origin' });
    if (!response.ok) throw new Error(`Daftar artikel gagal dimuat (${response.status})`);
    const data = await response.json();
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.find(item => String(item.title || '').trim() === String(title || '').trim()) || null;
  }

  function message(box, value, ok = true) {
    const el = box.querySelector('[data-ref-message]');
    if (!el) return;
    el.textContent = value;
    el.style.color = ok ? '#047857' : '#b91c1c';
  }

  async function uploadReference(box) {
    const input = box.querySelector('input[type=file]');
    const button = box.querySelector('[data-ref-upload]');
    const file = input?.files?.[0];
    if (!file) return message(box, 'Pilih gambar terlebih dahulu.', false);
    if (file.size > 10 * 1024 * 1024) return message(box, 'Ukuran gambar maksimal 10 MB.', false);

    const mediaRoot = box.closest('.space-y-6') || document;
    const articleTitle = text(mediaRoot.querySelector('.rounded-2xl.border.bg-white.p-6 h2'));
    if (!articleTitle) return message(box, 'Buka artikel terlebih dahulu.', false);

    button.disabled = true;
    button.textContent = 'Mengunggah...';
    message(box, 'Mencari artikel aktif...');

    try {
      const article = await getCurrentArticleByTitle(articleTitle);
      if (!article?.id) throw new Error('Artikel aktif tidak ditemukan.');

      const form = new FormData();
      form.append('articleId', String(article.id));
      form.append('file', file);
      const response = await fetch('/api/upload-thumbnail-reference', {
        method: 'POST',
        body: form,
        credentials: 'same-origin',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || data?.error || `Upload gagal (${response.status})`);

      message(box, 'Gambar referensi tersimpan dan sekarang menjadi thumbnail/featured image.');
      const previewCard = $all('.rounded-2xl.border.bg-white.p-4', mediaRoot).find(card => card.querySelector('img') || /aspect-video/.test(card.innerHTML));
      if (previewCard) {
        let image = previewCard.querySelector('img');
        if (!image) {
          previewCard.innerHTML = '';
          image = document.createElement('img');
          image.className = 'aspect-video w-full rounded-xl object-cover';
          previewCard.appendChild(image);
        }
        image.src = `${data.url}?v=${Date.now()}`;
        image.alt = articleTitle;
      }
    } catch (error) {
      message(box, error?.message || 'Upload gambar gagal.', false);
    } finally {
      button.disabled = false;
      button.textContent = 'Upload & Pakai Gambar';
    }
  }

  function enhanceMedia() {
    const heading = $all('h1,h2,h3').find(el => text(el) === 'AI Thumbnail Generator');
    if (!heading) return;
    const root = heading.closest('.space-y-6') || heading.parentElement?.parentElement;
    if (!root || root.querySelector('#ainfo-reference-upload')) return;

    const articleCard = $all('.rounded-2xl.border.bg-white.p-6', root)[0];
    if (!articleCard) return;

    const box = document.createElement('div');
    box.id = 'ainfo-reference-upload';
    box.style.marginTop = '18px';
    box.style.padding = '16px';
    box.style.border = '1px dashed #93c5fd';
    box.style.borderRadius = '14px';
    box.style.background = '#eff6ff';
    box.innerHTML = `
      <div style="font-weight:900;color:#0f172a;margin-bottom:5px">Upload gambar referensi</div>
      <div style="font-size:12px;line-height:1.5;color:#64748b;margin-bottom:12px">JPG, PNG, WebP atau AVIF, maksimal 10 MB. Gambar dipakai sebagai thumbnail dan featured image artikel.</div>
      <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" style="display:block;width:100%;font-size:13px;margin-bottom:10px" />
      <button data-ref-upload type="button" style="border:0;border-radius:10px;background:#0f172a;color:white;padding:10px 14px;font-weight:800;cursor:pointer">Upload & Pakai Gambar</button>
      <div data-ref-message style="margin-top:9px;font-size:12px;font-weight:700;color:#475569"></div>
    `;
    box.querySelector('[data-ref-upload]').addEventListener('click', () => void uploadReference(box));
    articleCard.appendChild(box);
  }

  async function runPublishHealth(button, output) {
    button.disabled = true;
    button.textContent = 'Mengecek...';
    output.textContent = '';
    try {
      const response = await fetch('/api/publish-health', { credentials: 'same-origin' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) throw new Error(data?.message || data?.error || `HTTP ${response.status}`);
      output.textContent = `✓ ${data.message}`;
      output.style.color = '#047857';
    } catch (error) {
      output.textContent = `✕ ${error?.message || 'Koneksi publish gagal.'}`;
      output.style.color = '#b91c1c';
    } finally {
      button.disabled = false;
      button.textContent = 'Tes Koneksi AINFO';
    }
  }

  function enhanceCms() {
    const heading = $all('h1,h2,h3').find(el => text(el) === 'Integrasi CMS');
    if (!heading) return;
    const root = heading.closest('.space-y-6') || heading.parentElement?.parentElement;
    if (!root || root.querySelector('#ainfo-publish-health')) return;

    const cards = $all('.rounded-2xl.border.bg-white.p-5', root);
    const ainfoCard = cards.find(card => /ainfo\.web\.id/i.test(text(card)));
    if (!ainfoCard) return;

    const area = document.createElement('div');
    area.id = 'ainfo-publish-health';
    area.style.marginTop = '14px';
    area.innerHTML = `
      <button type="button" style="border:1px solid #cbd5e1;border-radius:10px;background:white;padding:9px 12px;font-size:12px;font-weight:800;cursor:pointer">Tes Koneksi AINFO</button>
      <div style="margin-top:8px;font-size:11px;font-weight:700;color:#64748b"></div>
    `;
    const button = area.querySelector('button');
    const output = area.querySelector('div');
    button.addEventListener('click', () => void runPublishHealth(button, output));
    ainfoCard.appendChild(area);
  }

  function improvePublishHint() {
    const heading = $all('h1,h2,h3').find(el => text(el) === 'Publish Center');
    if (!heading) return;
    const root = heading.closest('.space-y-6') || heading.parentElement?.parentElement;
    if (!root || root.querySelector('#ainfo-direct-publish-note')) return;
    const note = document.createElement('div');
    note.id = 'ainfo-direct-publish-note';
    note.style.cssText = 'border:1px solid #bae6fd;background:#f0f9ff;border-radius:14px;padding:12px 14px;font-size:12px;font-weight:700;color:#075985';
    note.textContent = 'Admin: Publish Sekarang akan otomatis melakukan approval lalu mengirim artikel ke AINFO.';
    const card = root.querySelector('.rounded-2xl.border.bg-white.p-6');
    if (card) root.insertBefore(note, card);
  }

  function enhance() {
    try { enhanceMedia(); } catch (error) { console.warn('AINFO media enhancement', error); }
    try { enhanceCms(); } catch (error) { console.warn('AINFO CMS enhancement', error); }
    try { improvePublishHint(); } catch (error) { console.warn('AINFO publish enhancement', error); }
  }

  const observer = new MutationObserver(() => enhance());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', async () => { await sleep(100); enhance(); });
  enhance();
})();
