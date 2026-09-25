import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {createCatalog,normalizeConfig,poolFor,Round} from '../core.js';
import {showSpellingTone} from '../spelling-layout.js';
const rows=JSON.parse(readFileSync(new URL('../data/syllables.json',import.meta.url))),catalog=createCatalog(rows.slice(0,359));
test('舊題庫預設第一聲，二三四聲顯示調號，答案仍只拼聲韻',()=>{
 for(const [tone,mark] of [[1,''],[2,'ˊ'],[3,'ˇ'],[4,'ˋ']]){const q=createCatalog([['ㄈ','ㄛ','佛',tone]])[0];assert.equal(q.toneMark,mark);assert.equal(q.displayLabel,'ㄈㄛ'+mark);const round=new Round([q]);assert.equal(round.answer('ㄈㄛ').correct,true);assert.equal(round.rows[0].target,'ㄈㄛ'+mark);}
 assert.throws(()=>createCatalog([['ㄈ','ㄛ','佛',9]]));
});
test('已確認錄音開放後，359 舊題中 358 題可出題',()=>{
 assert.equal(catalog.length,359);assert.equal(catalog.filter(q=>q.enabled).length,358);
 const pool=poolFor('spelling',normalizeConfig({symbols:['ㄈ','ㄌ','ㄧ','ㄨ']}),catalog);assert.deepEqual(pool.map(q=>q.label).sort(),['ㄈㄨ','ㄌㄧ','ㄌㄨ'].sort());
 const fo=poolFor('spelling',normalizeConfig({symbols:['ㄈ','ㄛ']}),catalog);assert.equal(fo[0].tone,2);assert.equal(fo[0].word,'佛');
 assert.equal(poolFor('spelling',normalizeConfig({symbols:['ㄉ','ㄟ']}),catalog).length,1);
 assert.equal(catalog.find(q=>q.label==='ㄈㄚ').word,'發');assert.equal(catalog.find(q=>q.label==='ㄙㄜ').word,'色');assert.equal(catalog.find(q=>q.label==='ㄑㄧㄚ').tone,1);
});
test('新增音檔都有非靜音 PCM、合理長度及聲調來源',()=>{
 for(let index=44;index<catalog.length;index++){
  const q=catalog[index],b=readFileSync(new URL('../'+q.audio,import.meta.url));assert.equal(b.toString('ascii',0,4),'RIFF');let rate=0,data;
  for(let i=12;i+8<=b.length;){const kind=b.toString('ascii',i,i+4),size=b.readUInt32LE(i+4);if(kind==='fmt ')rate=b.readUInt32LE(i+16);if(kind==='data')data=b.subarray(i+8,i+8+size);i+=8+size+(size%2);}
  assert.ok(rate&&data,q.id);assert.ok(data.length/rate>0.9&&data.length/rate<8,q.id);assert.ok(data.some(byte=>byte!==0),q.id);assert.ok(rows[index][4].sourcePage>=13);
 }
});
test('版面使用直式上下格及獨立調號，不把調號當成可拖積木',()=>{
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8'),css=readFileSync(new URL('../spelling-layout.css',import.meta.url),'utf8');
 assert.ok(app.includes('class="spelling-tone"'));assert.ok(app.includes("showSpellingTone(document.querySelector('#spelling .slots'),q)"));assert.ok(css.includes('flex-direction:column'));assert.ok(css.includes('.spelling-tone{position:absolute'));assert.ok(app.includes("for(const kind of ['initial','final'])"));
});
test('换成第一聲時清除上一題調號，結合韻長度也重新計算',()=>{
 const tone={setAttribute(name,value){this[name]=value;}},container={dataset:{},querySelector:()=>tone};
 showSpellingTone(container,{tone:4,toneMark:'ˋ',final:'ㄩㄝ'});assert.equal(tone.textContent,'ˋ');assert.equal(tone.hidden,false);assert.equal(container.dataset.finalLength,'2');
 showSpellingTone(container,{tone:1,toneMark:'',final:'ㄨ'});assert.equal(tone.textContent,'');assert.equal(tone.hidden,true);assert.equal(container.dataset.finalLength,'1');
});
