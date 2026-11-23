import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {validateCatalog,renderCatalog} from '../tools/sync-characters.mjs';
import {optimizedImage} from '../data/portrait-thumbnails.js';
import {CHARACTERS,STARTERS,portrait} from '../characters.js';
test('角色清單是前端與後台的共同來源，保留舊收藏編號',()=>{
 const source=JSON.parse(readFileSync(new URL('../data/characters.json',import.meta.url),'utf8'));
 assert.deepEqual(validateCatalog(source),CHARACTERS);
 assert.deepEqual(STARTERS,['rabbit','fox']);
 assert.deepEqual(CHARACTERS.slice(0,20).map(c=>c.id),['rabbit','fox','panda','cat','bear','koala','frog','penguin','lion','owl','rose','moon','sea','forest','sun','snow','rainbow','berry','star','lavender']);
 for(const c of CHARACTERS)assert.ok(portrait(c).includes(optimizedImage(c.image)));
});
test('所有角色使用透明圖片，而非假棋盤背景',()=>{
 for(const c of CHARACTERS){const png=readFileSync(new URL('../'+c.image,import.meta.url));if(c.image.endsWith('.webp')){assert.equal(png.toString('ascii',8,12),'WEBP');assert.ok(png.includes(Buffer.from('ALPH')));continue;}assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(png[25],6,c.id+' 必須 RGBA');}
});
test('增加第 21 個動物時，分類角色池不受陣列位置限制',()=>{
 const rows=[...CHARACTERS,{...CHARACTERS[0],id:'test-animal',starter:false}];
 const ctx=vm.createContext({});vm.runInContext(renderCatalog(validateCatalog(rows)).backend,ctx);
 assert.equal(vm.runInContext("characterPool_('animal').length",ctx),21);
 assert.equal(vm.runInContext("characterPool_('fairy').length",ctx),20);
 assert.equal(vm.runInContext("characterPool_('animal').includes('test-animal')",ctx),true);
});
test('重複編號、錯誤圖片路徑與遺失素材會在同步前擋下',()=>{
 assert.throws(()=>validateCatalog([...CHARACTERS,CHARACTERS[0]]),/重複/);
 assert.throws(()=>validateCatalog([{...CHARACTERS[0],image:'../secret.png'},...CHARACTERS.slice(1)]),/圖片路徑/);
 assert.throws(()=>validateCatalog([{...CHARACTERS[0],image:'assets/characters/missing.png'},...CHARACTERS.slice(1)]),/缺少圖片/);
});
