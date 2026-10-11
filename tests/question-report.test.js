import test from 'node:test';import assert from 'node:assert/strict';import {createQuestionReport} from '../question-report.js';
class Element{constructor(){this.children=[];}append(...items){this.children.push(...items);}setAttribute(){}}
test('report keeps question/answer state, deduplicates, allows retry and never posts demo',async()=>{
 const previous=globalThis.document;globalThis.document={createElement:()=>new Element()};
 try{let q={seat:'115001',mode:'single',questionId:'ㄅ'},calls=[],fail=true;const round={index:0,answers:['ㄆ'],mistakes:1},parent=new Element();
 const helper=createQuestionReport({parent,getQuestion:()=>q,request:async p=>{calls.push(p);if(fail)throw Error('offline');return {reported:true};}}),[button,status]=parent.children[0].children;
 helper.refresh();await button.onclick();assert.equal(button.disabled,false);assert.match(status.textContent,/失敗/);fail=false;await button.onclick();assert.equal(button.disabled,true);await button.onclick();assert.equal(calls.length,2);assert.equal(calls[1].bankVersion,'listening-v1');assert.deepEqual(round,{index:0,answers:['ㄆ'],mistakes:1});
 q={seat:'115001',mode:'spelling',questionId:'s01'};helper.refresh();await button.onclick();assert.equal(calls.at(-1).bankVersion,'spelling-v1');
 q={seat:'115001',mode:'reading',questionId:'apple'};helper.refresh();await button.onclick();assert.equal(calls.at(-1).bankVersion,'reading-v1');
 const demoParent=new Element();const demo=createQuestionReport({parent:demoParent,demo:true,getQuestion:()=>q,request:()=>{throw Error('demo must not send');}});demo.refresh();await demoParent.children[0].children[0].onclick();assert.match(demoParent.children[0].children[1].textContent,/試玩/);
 }finally{globalThis.document=previous;}
});
test('pending report never locks another question, return to pending question settles correctly',async()=>{
 const previous=globalThis.document;globalThis.document={createElement:()=>new Element()};
 try{let q={seat:'115001',mode:'single',questionId:'ㄅ'},resolve;const parent=new Element(),helper=createQuestionReport({parent,getQuestion:()=>q,request:()=>new Promise(r=>resolve=r)}),button=parent.children[0].children[0];helper.refresh();const pending=button.onclick();assert.equal(button.disabled,true);q={...q,questionId:'ㄆ'};helper.refresh();assert.equal(button.disabled,false);q={...q,questionId:'ㄅ'};helper.refresh();assert.equal(button.disabled,true);resolve({reported:true});await pending;assert.equal(button.textContent,'✓ 已回報');
 }finally{globalThis.document=previous;}
});
