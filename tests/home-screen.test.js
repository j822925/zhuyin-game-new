import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../',import.meta.url),html=fs.readFileSync(new URL('index.html',root),'utf8'),manifest=JSON.parse(fs.readFileSync(new URL('manifest.webmanifest',root),'utf8'));
test('iPad 主畫面獨立啟動 metadata、名稱與入口一致',()=>{
 assert.match(html,/name="apple-mobile-web-app-capable" content="yes"/);assert.match(html,/name="apple-mobile-web-app-title" content="注音探險島"/);assert.match(html,/rel="manifest"/);assert.match(html,/rel="apple-touch-icon"/);assert.equal(manifest.display,'standalone');assert.equal(manifest.name,'注音探險島');assert.equal(manifest.orientation,'landscape');
 const base=new URL('https://j822925.github.io/zhuyin-game/'),start=new URL(manifest.start_url,base),scope=new URL(manifest.scope,base);assert.equal(start.origin,base.origin);assert.ok(start.pathname.startsWith(scope.pathname));assert.ok(!start.searchParams.has('demo'));assert.ok(!start.searchParams.has('seat'));assert.ok(!start.searchParams.has('pin'));assert.equal(manifest.id,'./');
});
test('主畫面圖示 PNG 尺寸真實正確且不透明',()=>{
 for(const [path,size] of [...manifest.icons.map(i=>[i.src,Number(i.sizes.split('x')[0])]),['assets/icons/apple-touch-icon-v1.png',180]]){
  const buffer=fs.readFileSync(new URL(path,root));assert.equal(buffer.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(buffer.readUInt32BE(16),size);assert.equal(buffer.readUInt32BE(20),size);assert.equal(buffer[25],2); // RGB, no alpha
 }
});
test('指南導向正式首頁，保留登入與需要網路的提醒',()=>{
 const guide=fs.readFileSync(new URL('install.html',root),'utf8');assert.match(guide,/href="\.\/\?class=main&amp;v=20261001-class1"/);assert.match(guide,/grade2.html\?class=grade2/);assert.match(guide,/打開為網頁 App/);assert.match(guide,/四位數密碼/);assert.match(guide,/需要網路/);assert.match(guide,/尚未用實體 iPad/);assert.match(guide,/不是這一頁教學/);
 assert.ok(!html.includes('user-scalable=no'));assert.match(html,/viewport-fit=cover/);
});
