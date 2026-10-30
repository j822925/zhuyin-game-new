import test from 'node:test';
import assert from 'node:assert/strict';
import {createKeyboardReadingInput} from '../reading-keyboard-input.js';
import {createReadingExamInput} from '../exam-reading-input.js';
import {READING_WORDS} from '../reading-core.js';
function element(){return {value:'',nodes:new Map(),children:[],classList:{add(){}},setAttribute(){},blur(){},focus(){},append(n){this.children.push(n);},replaceChildren(...nodes){this.children=nodes;},querySelector(s){if(!this.nodes.has(s))this.nodes.set(s,element());return this.nodes.get(s);}};}
function setup(onText){const root=element(),doc={hidden:false,createElement:element},texts=[];const ui=createKeyboardReadingInput(root,onText||((t)=>texts.push(t)),{doc});ui.setVisible(true);ui.setEnabled(true);return {root,doc,ui,texts,input:()=>root.querySelector('[data-keyboard-field]').children[0],send:root.querySelector('[data-keyboard-submit]')};}
test('five explicit inputs, blank and composition gates, no automatic answer or repeated submission',()=>{
 const h=setup();h.send.onclick();assert.deepEqual(h.texts,[]);
 for(const word of ['蘋果','香蕉','白雲','雨傘','小白兔']){
  const i=h.input();i.value=word;i.oncompositionstart();i.oninput();h.send.onclick();assert(h.send.disabled);
  i.oncompositionend();assert(!h.send.disabled);const previous=h.texts.length;assert.equal(h.texts.length,previous);
  h.send.onclick();h.send.onclick();assert.equal(h.texts.length,previous+1);assert.equal(h.input().value,'');assert(h.send.disabled);
 }
 assert.deepEqual(h.texts,['蘋果','香蕉','白雲','雨傘','小白兔']);
});
test('question reset and mode change detach prior input, including late dictation/composition events',()=>{
 const h=setup(),old=h.input();old.value='秘密';const late=old.oncompositionend;h.ui.reset();old.value='上一題';late();h.send.onclick();assert.deepEqual(h.texts,[]);assert.equal(h.input().value,'');assert.notEqual(old,h.input());
 h.input().value='梨子';h.ui.setVisible(false);h.send.onclick();assert.deepEqual(h.texts,[]);h.ui.setVisible(true);assert.equal(h.input().value,'');
 h.input().value='梨子';h.doc.hidden=true;h.send.onclick();assert.deepEqual(h.texts,[]);h.doc.hidden=false;h.ui.setEnabled(false);h.send.onclick();assert.deepEqual(h.texts,[]);
});
test('synchronous advance does not clear the new question and pending save stays disabled',()=>{
 let h;h=setup(()=>{h.ui.reset();h.input().value='新題';h.ui.setEnabled(false);});h.input().value='梨子';h.send.onclick();assert.equal(h.input().value,'新題');assert(h.send.disabled);
});
test('exam keyboard mode works without SpeechRecognition, grades existing verdicts only and preserves locks',()=>{
 const prevDoc=globalThis.document,prevStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),data=new Map();globalThis.document={createElement:element,hidden:false};Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)}});
 const root=element(),answers=[],q=READING_WORDS.find(w=>w.word==='梨子');let ui;
 try{
  ui=createReadingExamInput(root,a=>answers.push(a),{Recognition:null,apple:false});ui.show(q);ui.setEnabled(true);
  const choice=root.querySelector('[data-input-mode]');choice.value='keyboard';choice.onchange();assert.equal(choice.value,'keyboard');assert(root.querySelector('button').hidden);
  const kr=root.querySelector('[data-keyboard-root]'),input=()=>kr.querySelector('[data-keyboard-field]').children[0],send=kr.querySelector('[data-keyboard-submit]');
  for(const [text,expected] of [['Múma',null],['離子','yes'],['香蕉','no'],['梨子','yes'],['離子','yes'],['梨子','yes']]){
   ui.show(q);ui.setEnabled(true);input().value=text;input().oninput();const n=answers.length;send.onclick();send.onclick();assert.equal(answers.length,n+(expected?1:0));if(expected){assert.equal(answers.at(-1),expected);assert(send.disabled);}
  }
  ui.show(q);ui.setEnabled(true);input().value='梨子';ui.setEnabled(false);send.onclick();assert.equal(answers.length,5);
  ui.cancel();assert.equal(input().value,'');assert(send.disabled);
  const second=element(),other=createReadingExamInput(second,()=>{}, {Recognition:null,apple:false});other.show(q);other.setEnabled(true);assert.equal(second.querySelector('[data-input-mode]').value,'keyboard');other.cancel();
 }finally{ui?.cancel();globalThis.document=prevDoc;if(prevStorage)Object.defineProperty(globalThis,'localStorage',prevStorage);else delete globalThis.localStorage;}
});
test('switching active native capture to keyboard cancels it and ignores stale results',()=>{
 const prevDoc=globalThis.document;globalThis.document={createElement:element};const root=element(),instances=[],answers=[];let ui;
 class Recognition{constructor(){instances.push(this);}start(){this.onaudiostart();}abort(){this.aborted=true;}stop(){}}
 try{
  ui=createReadingExamInput(root,a=>answers.push(a),{Recognition,apple:false});const q=READING_WORDS.find(w=>w.word==='梨子');ui.show(q);ui.setEnabled(true);root.querySelector('button').onclick();const old=instances[0];
  const choice=root.querySelector('[data-input-mode]');choice.value='keyboard';choice.onchange();assert(old.aborted);assert.equal(choice.value,'keyboard');
  old.onresult({results:[Object.assign([{transcript:'梨子'}],{isFinal:true})]});old.onend();assert.deepEqual(answers,[]);
  const kr=root.querySelector('[data-keyboard-root]');kr.querySelector('[data-keyboard-field]').children[0].value='離子';kr.querySelector('[data-keyboard-submit]').onclick();assert.deepEqual(answers,['yes']);
 }finally{ui?.cancel();globalThis.document=prevDoc;}
});
