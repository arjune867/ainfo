import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

// Isolate the SSR route from the legacy Worker's TypeScript entry point.
const source = (await readFile(new URL('../worker/src/v14_2.js', import.meta.url), 'utf8'))
  .replace("import legacyWorker from './main';", 'const legacyWorker = { fetch() { throw new Error("Unexpected legacy fallback"); } };');
const { default: worker } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
for (const [input, expected] of [
  ['/media/media/2026-10-26/test.png', 'https://www.ainfo.web.id/media/media/2026-10-26/test.png'],
  ['https://cdn.example.org/photo.jpg', 'https://cdn.example.org/photo.jpg'],
  ['', 'https://www.ainfo.web.id/AINFO.png'],
  ['javascript:alert(1)', 'https://www.ainfo.web.id/AINFO.png'],
  ['http://[invalid', 'https://www.ainfo.web.id/AINFO.png'],
]) {
  test(`SSR social preview image: ${input || 'missing'}`, async () => {
    const row = {slug:'test',title:'Judul & berita',image_url:input,content_json:'[]',published_at:'2026-10-26T00:00:00Z'};
    const env = {DOMAIN:'https://www.ainfo.web.id',DB:{prepare(){return {bind(){return {async first(){return row;}};}};}}};
    const response = await worker.fetch(new Request('https://www.ainfo.web.id/read/test/'),env,{});
    assert.equal(response.status,200);
    const html=await response.text();
    assert.ok(html.includes(`<meta property="og:image" content="${expected}">`));
    assert.ok(html.includes(`<meta name="twitter:image" content="${expected}">`));
    assert.ok(html.includes('<meta property="og:image:alt" content="Judul &amp; berita">'));
    assert.ok(html.includes(`"image":["${expected}"]`));
  });
}
