import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {freshState} from '../adventure-model.js';
import {commitLifeChange} from '../adventure-life-transaction.js';
import {availableFood,beginDining,diningSpot} from '../adventure-dining.js';
import {RECIPES} from '../adventure-food-model.js';
import {CROPS} from '../adventure-life-model.js';
const source=readFileSync(new URL('../adventure-kitchen.js',import.meta.url),'utf8');
const table=source.slice(source.indexOf(' async function atTable('),source.indexOf(' async function eatAtHome('));
const eat=source.slice(source.indexOf(' async function eat('),source.indexOf(' function render('));
const close=source.slice(source.indexOf(' function closeFood('),source.indexOf(" $('food-close').onclick"));
function fixture(){
 const s=freshState();s.life.harvest.corn=2;s.life.nutrition.energy=20;
 const scene={area:'room',player:{},reduced:{matches:true},dining:null};
 let release;const image=new Promise(r=>release=r);let saves=0,permitted=true;
 const dialog={open:true,close(){this.open=false;}},world={dataset:{}};
 const c={foodChoiceRun:0,preparingFood:false,travelling:false,diningRun:0,tableId:null,performance,RECIPES,CROPS,availableFood,beginDining,diningSpot,
  api:{state:()=>s,scene:()=>scene,art:()=>({}),stopMoving(){},renderState(){},toast(){},save(){saves++;return permitted;},switchArea:async()=>true},
  dialog,document:{body:{classList:{add(){},remove(){}}}},$:()=>world,ensureHomeArt:()=>image,tableNotice(){},open(){dialog.open=true;}};
 vm.createContext(c);vm.runInContext(source.match(/^ const commit=.+;$/m)[0]+'\n'+table+'\n'+eat+'\n'+close,Object.assign(c,{commitLifeChange}));
 return {s,scene,c,release,deny:()=>permitted=false,allow:()=>permitted=true,get saves(){return saves;}};
}
test('double tapping food during loading consumes one serving and keeps its animation',async()=>{
 const f=fixture(),first=f.c.eat('corn',false),second=f.c.eat('corn',false);
 f.release();await Promise.all([first,second]);
 assert.equal(f.s.life.harvest.corn,1);assert.equal(f.saves,1);assert(f.scene.dining);assert.equal(f.s.life.nutrition.energy,28);
});
test('closing the tray cancels a slow food request without moving or consuming food',async()=>{
 const f=fixture(),before=JSON.stringify(f.scene.player),work=f.c.eat('corn',false);
 f.c.closeFood();f.release();await work;
 assert.equal(f.s.life.harvest.corn,2);assert.equal(f.saves,0);assert.equal(f.scene.dining,null);assert.equal(JSON.stringify(f.scene.player),before);
});
test('failed dining clears only its animation, reopens the tray and can be retried',async()=>{
 const f=fixture();f.deny();const work=f.c.eat('corn',false);f.release();await work;
 assert.equal(f.s.life.harvest.corn,2);assert.equal(f.s.life.nutrition.energy,20);assert.equal(f.scene.dining,null);assert.equal(f.c.dialog.open,true);
 f.allow();await f.c.eat('corn',false);assert.equal(f.s.life.harvest.corn,1);assert(f.scene.dining);assert.equal(f.saves,2);
});
