import test from 'node:test';
import assert from 'node:assert/strict';
import {readingLaunchPlan} from '../reading-launch.js';

const ipad={userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/26.6 Mobile/15E148 Safari/604.1',platform:'MacIntel',maxTouchPoints:5,standalone:true};
const base='https://j822925.github.io/zhuyin-game-new/';
test('iPad desktop-style UA launches the same reading page through Safari from Home Screen',()=>{
 const p=readingLaunchPlan(base+'?source=homescreen',ipad);
 assert.equal(p.standalone,true);assert.equal(p.major,26);assert.equal(p.safariUrl,'x-safari-https://j822925.github.io/zhuyin-game-new/reading.html?v=20261008-safari1&speech=native&source=homescreen-reading');
 assert.equal(p.homeUrl,base);
});
test('both classroom routes are explicit and no credentials, seat, hash or redirect cross the handoff',()=>{
 for(const cls of ['main','grade2']){
  const p=readingLaunchPlan(base+'?class='+cls+'&seat=01&pin=1234&token=secret&demo=1&next=https://bad.example/#secret',ipad);
  for(const value of [p.browserUrl,p.safariUrl,p.homeUrl,p.shortcutUrl]){
   const u=new URL(value);assert.equal(u.searchParams.get('class'),cls);assert.equal(u.hash,'');
   for(const key of ['seat','pin','token','demo','next'])assert.equal(u.searchParams.has(key),false);
   assert.equal(u.hostname,'j822925.github.io');
  }
 }
});
test('Safari tabs, desktop browsers and Android keep ordinary HTTPS navigation',()=>{
 for(const env of [{...ipad,standalone:false},{userAgent:'Chrome/140.0',platform:'Win32',standalone:true},{userAgent:'Android Chrome/140.0',standalone:true}]){
  const p=readingLaunchPlan(base,env);assert.equal(p.standalone,false);assert.equal(p.safariUrl,null);assert.match(p.browserUrl,/^https:/);
 }
});
test('old/unknown iPads get a shortcut fallback; modern mobile UA and display-mode also work',()=>{
 for(const userAgent of ['iPad CPU OS 16_7 Version/16.7 Safari/605.1','iPad']){
  const p=readingLaunchPlan(base,{userAgent,standalone:true});assert.equal(p.standalone,true);assert.equal(p.safariUrl,null);assert.equal(p.shortcutUrl,base+'reading-shortcut.html?v=20261008-safari1');
 }
 const modern=readingLaunchPlan(base,{userAgent:'iPad CPU OS 17_0 Version/17.0 Safari/605.1',displayStandalone:true});assert.match(modern.safariUrl,/^x-safari-https:/);
});
test('local demos remain local and never produce an unsupported Safari scheme',()=>{
 const p=readingLaunchPlan('http://127.0.0.1:8774/?class=grade2&demo=1',ipad);assert.equal(p.safariUrl,null);assert.equal(new URL(p.browserUrl).searchParams.get('demo'),'1');
});
test('plain, old cloud and shortcut URLs always lead to native recognition',()=>{
 for(const page of ['reading.html','reading.html?speech=cloud','reading-shortcut.html','?speech=cloud']){
  const p=readingLaunchPlan(base+page,ipad);
  assert.equal(new URL(p.browserUrl).searchParams.get('speech'),'native');
  assert.equal(new URL(p.safariUrl).searchParams.get('speech'),'native');
 }
});
test('fixed grade2 home icon keeps its class even without a query',()=>{
 const p=readingLaunchPlan(base+'grade2.html',ipad);
 for(const link of [p.browserUrl,p.safariUrl,p.shortcutUrl,p.homeUrl])assert.equal(new URL(link).searchParams.get('class'),'grade2');
});
