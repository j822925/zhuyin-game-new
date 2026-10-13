import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {actionCopy} from '../data/adventure-action-copy.js';
import {FURNITURE} from '../data/home-furniture.js';
test('decorative sparkle has no unrelated drawing message; useful feedback stays',()=>{assert.equal(actionCopy('sparkles'),null);for(const kind of ['sleep','eat','bath','toilet','music','bubbles'])assert(actionCopy(kind)?.text);});
test('plush and lamps keep tappable effects without covering badges; functional badges stay',()=>{
 const source=fs.readFileSync(new URL('../adventure-rest-ui.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export function createHomeRest','function createHomeRest');
 const ids=['plush-0','deep-lamp','ocean-play','bed','table'];const state={furnitureOwned:ids},layout=ids.map((id,i)=>({id,x:200+i*70,y:450}));
 const scene={area:'room',camera:{scale:1},toScreen:(x,y)=>({x,y})},box={children:[],replaceChildren(){this.children=[];},append(b){this.children.push(b);}};
 const document={getElementById:()=>box,createElement:()=>({dataset:{},style:{},innerHTML:'',setAttribute(k,v){this[k]=v;}})};
 const context={document,performance:{now:()=>0},FURNITURE,layoutFor:()=>layout,isInterior:()=>true,restFurniture:id=>FURNITURE.find(f=>f.id===id),restKind:f=>f.rest||null,hasEnergy:()=>true,completeAction:()=>{},api:{state:()=>state,scene:()=>scene,blocked:()=>false,stop:()=>{}}};
 vm.createContext(context);vm.runInContext(source+'\nthis.rest=createHomeRest(api);',context);context.rest.update();
 for(const id of ids.slice(0,3)){const b=box.children.find(b=>b.dataset.item===id);assert.equal(b.innerHTML,'');assert.match(b['aria-label'],/點一下互動/);b.onclick();assert.equal(scene.homePlay.item.id,id);assert.equal(scene.homePlay.duration,2200);}
 assert.match(box.children.find(b=>b.dataset.item==='bed').innerHTML,/💤/);assert.match(box.children.find(b=>b.dataset.item==='table').innerHTML,/🍽️/);
});
