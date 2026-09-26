import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
test('class is explicit in URLs and storage; original links retain original sessions, no last-class fallback',async()=>{
 const before=globalThis.location;
 try{
  globalThis.location={href:'https://example.test/game/?class=grade2'};
  const second=await import('../class-context.js?v=20260926-classes1');
  assert.equal(second.classStorageKey('session'),'session:class:grade2');assert.equal(new URL(second.classUrl('exam.html?id=paper')).searchParams.get('class'),'grade2');
  const {createApiClient}=await import('../api-client.js');let actual;await createApiClient('https://api.example.test/api',{fetchImpl:async u=>{actual=u;return new Response('{}');}}).post({kind:'login',seat:'01',pin:'0123'});
  assert.equal(new URL(actual).searchParams.get('class'),'grade2');assert(!actual.includes('0123'));
  globalThis.location={href:'https://example.test/game/'};const original=await import('../class-context.js?test-main');assert.equal(original.currentClass,'main');assert.equal(original.classStorageKey('session'),'session');assert.equal(new URL(original.classUrl('./')).searchParams.has('class'),false);
 }finally{if(before===undefined)delete globalThis.location;else globalThis.location=before;}
 const manifest=JSON.parse(readFileSync(new URL('../manifest-grade2.webmanifest',import.meta.url)));assert.match(manifest.start_url,/class=grade2/);assert.match(manifest.id,/class=grade2/);
});
