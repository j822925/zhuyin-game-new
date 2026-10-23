import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {toneComplete,toneNames,createToneInput} from '../exam-tone-input.js';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('tone answer requires exactly one tone per character; neutral tone allowed',()=>{assert(toneComplete('快樂','44'));assert(toneComplete('寶寶','35'));assert(!toneComplete('快樂','4?'));assert(!toneComplete('快樂','4'));assert(!toneComplete('快樂','440'));assert.equal(toneNames[5],'輕聲');});
test('student requests declare capability, tone uses own selector and preserves pending receipts',()=>{const source=read('exam.js');assert.match(source,/toneExamVersion:1/);assert.match(source,/toneInput\.complete\(\)/);assert.match(source,/readPending\(\)/);assert.match(source,/savePending\(payload\)/);assert.match(source,/mode==='tone'/);assert.match(read('exam.html'),/exam-tone-input.css/);});
test('new title on both manifests and student exam; routes and storage keys unchanged',()=>{for(const f of ['manifest.webmanifest','manifest-grade2.webmanifest'])assert.match(read(f),/池東注音探險島/);assert.match(read('island-names.js'),/池東注音探險島/);assert.match(read('exam.html'),/池東注音探險島/);assert.match(read('exam-tone-input.css'),/#cf3838/);});

test('six-character selector advances, supports changing a chosen tone, disables and resets',()=>{
 const old=globalThis.document;
 const element=()=>({children:[],dataset:{},attributes:{},classList:{add(){}},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},setAttribute(k,v){this.attributes[k]=v;}});
 globalThis.document={createElement:element};
 try{const root=element(),changes=[],input=createToneInput(root,v=>changes.push(v));input.show('我喜歡吃蘋果');const [chars,tones]=root.children;assert.equal(chars.children.length,6);assert(chars.children.every(b=>b.disabled));input.setEnabled(true);
 for(const n of [3,3,1,1,2,3])tones.children[n-1].onclick();assert(input.complete());assert.equal(input.value(),'331123');
 chars.children[1].onclick();assert.equal(chars.children[1].dataset.active,'true');tones.children[3].onclick();assert.equal(input.value(),'341123');assert.equal(changes.at(-1),'341123');
 input.setEnabled(false);assert(tones.children.every(b=>b.disabled));input.show('快樂');assert.equal(input.value(),'??');assert(!input.complete());assert.equal(chars.children.length,2);
 }finally{if(old===undefined)delete globalThis.document;else globalThis.document=old;}
});
