import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareArticle,insertQuery,sameArticle,mergePublishedArticles} from './newsroom-publish.mjs';
const sample=()=>({schemaVersion:1,publish:true,requestId:'test-request',slug:'test-article',title:"Test ' quotation",thumbnail:'/newsroom-images/test.jpg',imageCaption:'Ilustrasi',category:'Nasional',metaDescription:'A description',blocks:[{type:'p',text:'Safe test content that is deliberately longer than eighty characters to validate the minimum article length.'}],sources:[],tags:['Test']});
test('requires explicit publication authorization',()=>{assert.throws(()=>prepareArticle({...sample(),publish:false}));});
test('escapes text and restricts active content and image paths',()=>{const s=sample();s.blocks[0].text+='<script>alert(1)</script>';assert(!prepareArticle(s).content_html.includes('<script>'));assert.throws(()=>prepareArticle({...sample(),thumbnail:'/newsroom-images/../private.jpg'}));assert.throws(()=>prepareArticle({...sample(),sources:[{title:'Bad',url:'javascript:alert(1)'}]}));});
test('article SQL uses parameters, not string interpolation',()=>{const a=prepareArticle(sample());const q=insertQuery(a);assert(!q.sql.includes(a.title));assert(q.params.includes(a.title));assert.equal((q.sql.match(/\?/g)||[]).length,q.params.length);});
test('retries preserve identity and detect modified publication requests',()=>{const a=prepareArticle(sample(),'2026-10-26T00:00:00Z');const b=prepareArticle(sample(),'2026-10-27T00:00:00Z');assert.equal(a.id,b.id);assert(sameArticle(a,b));assert(!sameArticle(a,{...b,title:'Changed'}));assert(!sameArticle(a,{...b,image_url:'/newsroom-images/other.jpg'}));});

test('published D1 articles are merged into the homepage/admin collection without deleting drafts',()=>{
  const existing=[{id:1,slug:'draft-story',title:'Draft',status:'draft'},{id:2,slug:'old-story',title:'Old title',status:'published'}];
  const rows=[{id:2,slug:'old-story',title:'Updated title',category:'Teknologi',status:'published',content_json:'[]',tags_json:'[]',image_url:'/newsroom-images/old.webp',published_at:'2026-10-26T10:00:00.000Z',read_minutes:4},{id:3,slug:'new-story',title:'New story',category:'Nasional',status:'published',content_json:'[]',tags_json:'[]',image_url:'/newsroom-images/new.webp',published_at:'2026-10-26T11:00:00.000Z',read_minutes:5}];
  const merged=mergePublishedArticles(existing,rows);
  assert.equal(merged.length,3);
  assert.equal(merged.find(a=>a.slug==='draft-story').status,'draft');
  assert.equal(merged.find(a=>a.slug==='old-story').title,'Updated title');
  assert.equal(merged.find(a=>a.slug==='new-story').image,'/newsroom-images/new.webp');
});
