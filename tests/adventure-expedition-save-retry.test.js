import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {freshState} from '../adventure-model.js';
import {ZONES} from '../data/adventure-zones.js';
import {enterExpedition,startExpeditionBattle,answerExpedition,expeditionSupplyHint} from '../adventure-expedition-model.js';

// Exercise the real question handlers and transaction rollback. Layout and audio
// are irrelevant here; no browser storage, network or real student is involved.
const source=readFileSync(new URL('../adventure-expedition-ui.js',import.meta.url),'utf8');
const transaction=source.match(/^ const transaction=.+;$/m)[0];
const question=source.slice(source.indexOf(' function showQuestion('),source.indexOf(' async function open('));
function fixture(mode='single'){
 const s=freshState();enterExpedition(s,'bud',()=>0);startExpeditionBattle(s,0);
 const q={mode,audio:'unused.mp3',answer:'ㄅ',choices:[{label:'ㄅ',value:'ㄅ'},{label:'ㄆ',value:'ㄆ'}]};
 if(mode==='spelling')Object.assign(q,{part:'initial',initial:'ㄅ',finalAnswer:'ㄚ',finalChoices:[{label:'ㄚ',value:'ㄚ'}]});
 s.expedition.runs.bud.battle.question=q;
 let permitted=false,saves=0,renders=0,panel;
 const element=()=>({children:[],append(...children){this.children.push(...children);}});
 const c={structuredClone,Math,Number,performance,saveFailed:false,message:'',resolving:false,motion:null,local:false,generation:0,view:'battle',z:ZONES[0],FURNITURE:[],
  state:()=>s,exp:()=>s.expedition,run:()=>s.expedition.runs.bud,answerExpedition,
  api:{save:()=>{saves++;return permitted;},changed:()=>{}},
  document:{createElement:element,createTextNode:text=>({textContent:text})},
  button:(label,onclick)=>({textContent:label,onclick}),
  render:()=>{renders++;panel=element();const b=c.run().battle;if(b?.question)c.showQuestion(panel,b);},
  completeAction:()=>{},dialog:{open:true},appendToneTarget:()=>{}};
 vm.createContext(c);vm.runInContext(transaction+'\n'+question,c);c.render();
 return {s,c,allow:()=>permitted=true,get saves(){return saves;},get renders(){return renders;},button(label){return panel.children.find(n=>n.className==='exp-answers').children.find(n=>n.textContent===label);}};
}
test('failed answer can be retried without leaving; old buttons cannot answer the restored round',async()=>{
 const f=fixture(),before=JSON.stringify(f.s),old=f.button('ㄅ');
 await old.onclick();assert.equal(JSON.stringify(f.s),before);assert.equal(f.saves,1);assert.equal(f.renders,2);assert.match(f.c.message,/儲存/);
 f.allow();await old.onclick();assert.equal(f.saves,1);
 await f.button('ㄅ').onclick();assert.equal(f.saves,2);assert.equal(f.c.run().battle.phase,'defend');assert.equal(f.c.run().battle.turn,1);
});
test('failed first spelling part restores its choices and permits a complete retry',async()=>{
 const f=fixture('spelling');await f.button('ㄅ').onclick();assert.equal(f.c.run().battle.question.part,'initial');assert.equal(f.c.run().battle.turn,0);
 f.allow();await f.button('ㄅ').onclick();assert.equal(f.c.run().battle.question.part,'final');assert.equal(f.c.run().battle.turn,0);
 await f.button('ㄚ').onclick();assert.equal(f.c.run().battle.phase,'defend');assert.equal(f.c.run().battle.turn,1);assert.equal(f.c.run().battle.correctAnswers,1);
});
test('failed winning blow preserves the monster, XP and stars; retry rewards exactly once',async()=>{
 const f=fixture();f.c.run().battle.hp=1;const before=JSON.stringify(f.s),stars=f.s.stars,xp=f.s.expedition.xp;
 await f.button('ㄅ').onclick();assert.equal(JSON.stringify(f.s),before);assert.equal(f.c.run().monsters[0].done,false);
 f.allow();const answer=f.button('ㄅ');await answer.onclick();assert.equal(f.c.run().monsters[0].done,true);assert.equal(f.c.run().battle,null);assert(f.s.stars>stars);assert(f.s.expedition.xp>xp);
 const earned=f.s.stars;await answer.onclick();assert.equal(f.s.stars,earned);assert.equal(f.saves,2);
});
test('supply hints explain late guardian preparation and respect the current food turn',()=>{
 const s=freshState();assert.equal(expeditionSupplyHint(s,ZONES[0],{boss:true}),'');assert.match(expeditionSupplyHint(s,ZONES[6],{boss:true}),/長途切磋/);
 enterExpedition(s,'bud',()=>0);startExpeditionBattle(s,0);s.expedition.hp=20;
 let before=JSON.stringify(s);assert.match(expeditionSupplyHint(s,ZONES[0]),/可以打開/);assert.equal(JSON.stringify(s),before);
 s.expedition.runs.bud.battle.phase='defend';before=JSON.stringify(s);assert.match(expeditionSupplyHint(s,ZONES[0]),/防禦後/);assert.equal(JSON.stringify(s),before);
});
