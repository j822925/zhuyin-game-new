import test from 'node:test';
import assert from 'node:assert/strict';
import {createHomeDecor} from '../adventure-home-decor.js';
import {FURNITURE,freshState,sanitizeState,ROOM_ENTRY,furniturePreviewLayout} from '../adventure-model.js';
import {floorPosition} from '../home-spatial-model.js';
import {furnitureSurfaces,surfaceAnchor,freeSurfacePosition,attachedPosition} from '../furniture-surfaces.js';
import {HOME_SPATIAL_ART} from '../data/home-spatial-art.js';

// Exercise the actual editor handlers without a browser, pictures or student data.
function fixture(t,{side='left',savedFacing,corner=false,itemId='collection-port-3'}={}){
 const nodes=new Map(),savedGlobals={document:globalThis.document,window:globalThis.window,ResizeObserver:globalThis.ResizeObserver,requestAnimationFrame:globalThis.requestAnimationFrame};
 const draw=new Proxy({},{get:()=>()=>{}});
 class Element extends EventTarget{
  constructor(tag='div'){super();this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.style={};this.attributes={};this.hidden=false;this.disabled=false;this.classList={add(){},remove(){},toggle(){}};}
  set id(value){this._id=value;nodes.set(value,this);}get id(){return this._id;}
  set textContent(value){this.text=String(value);this.children=[];}get textContent(){return this.text||this.children.map(c=>c.textContent).join('');}
  append(...items){for(const node of items){node.parent=this;this.children.push(node);}}
  before(node){const a=this.parent.children;node.parent=this.parent;a.splice(a.indexOf(this),0,node);}
  after(node){const a=this.parent.children;node.parent=this.parent;a.splice(a.indexOf(this)+1,0,node);}
  replaceChildren(...items){this.text='';this.children=[];this.append(...items);}
  setAttribute(name,value){this.attributes[name]=String(value);}
  getAttribute(name){return this.attributes[name];}
  contains(node){return this===node||this.children.some(child=>child.contains(node));}
  querySelectorAll(selector){const match=node=>selector==='button'?node.tagName==='BUTTON':selector==='header'?node.tagName==='HEADER':selector==='canvas'?node.tagName==='CANVAS':selector==='small'?node.tagName==='SMALL':selector==='.decor-actions'?node.className==='decor-actions':false;return this.children.flatMap(child=>[...(match(child)?[child]:[]),...child.querySelectorAll(selector)]);}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  getBoundingClientRect(){return {left:0,top:0,right:1024,bottom:768,width:1024,height:768};}
  focus(){}getContext(){return draw;}
  set innerHTML(html){this.replaceChildren();for(const m of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)){const b=new Element('button');for(const a of m[1].matchAll(/([\w-]+)="([^"]*)"/g)){b.setAttribute(a[1],a[2]);if(a[1].startsWith('data-'))b.dataset[a[1].slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=a[2];}for(const child of m[2].matchAll(/<(canvas|span|small)\b([^>]*)>([\s\S]*?)<\/\1>/g)){const el=new Element(child[1]);el.textContent=child[3];el.width=180;el.height=150;b.append(el);}this.append(b);}}
 }
 const document={createElement:tag=>new Element(tag),getElementById:id=>nodes.get(id),head:new Element(),body:new Element()},window=new EventTarget();
 Object.assign(globalThis,{document,window,ResizeObserver:class{observe(){}},requestAnimationFrame:()=>0});
 t.after(()=>{for(const [key,value]of Object.entries(savedGlobals))if(value===undefined)delete globalThis[key];else globalThis[key]=value;});
 const add=(id,parent=document.body,tag='div')=>{const el=new Element(tag);el.id=id;parent.append(el);return el;};
 const panel=add('decor-panel'),header=new Element('header');panel.append(header);header.append(new Element());add('decor-close',header,'button');
 for(const id of ['decor-hint','decor-styles','decor-categories','decor-wallet','decor-style-note','furniture-palette'])add(id,panel);
 const actions=new Element();actions.className='decor-actions';panel.append(actions);for(const id of ['decor-buy','decor-place','decor-store','decor-cancel'])add(id,actions,'button');
 add('decor-open',document.body,'button');const stage=add('map-stage');add('world',stage,'canvas');
 const f=id=>FURNITURE.find(f=>f.id===id),id=itemId,base=f(corner?'spatial-moon-corner-kitchen':'collection-moon-kitchen-base'),host={id:base.id,...floorPosition({x:side==='front'?600:side==='left'?200:1080,y:side==='front'?385:540},base,{area:'kitchen'})};
 const state={...freshState(),furnitureOwned:[base.id,id],layout:[],kitchenLayout:[host,...(savedFacing?[{id,x:650,y:600,facing:savedFacing}]:[])],bedroomLayout:[],bathroomLayout:[]},scene={area:'kitchen',player:{...ROOM_ENTRY},editing:true,placement:null};
 const art={spatial:Object.fromEntries(Object.keys(HOME_SPATIAL_ART).map(key=>[key,{image:{},cells:HOME_SPATIAL_ART[key].cells}]))};
 for(const item of [base,f(id)])art[item.atlas||'furniture']={image:{},cells:Array.from({length:100},()=>({x:0,y:0,w:100,h:100}))};
 let saves=0;const decor=createHomeDecor({state:()=>state,scene:()=>scene,art:()=>art,blocked:()=>false,stopMoving(){},save(){saves++;},changed(){},toast(){}});
 const chooseFacing=direction=>{const button=nodes.get('decor-position-tools').children.find(b=>b.textContent.includes({left:'向左',right:'向右',front:'正面'}[direction]));assert(button);button.onclick();};
 const attach=(surface=0)=>{const button=nodes.get('decor-supports').children.filter(b=>b.tagName==='BUTTON')[surface];assert(button&&!button.disabled);button.onclick();};
 return {state,scene,decor,host,id,chooseFacing,attach,nodes,saves:()=>saves,anchor:()=>surfaceAnchor(host,furnitureSurfaces(base)[0]),settle:()=>new Promise(resolve=>setImmediate(resolve))};
}

for(const facing of ['front','left','right'])test('explicit '+facing+' oven direction survives support selection, drag, save and reload',async t=>{
 const x=fixture(t,{side:facing==='left'?'right':'left'});x.decor.select(x.id);x.chooseFacing(facing);x.attach();
 assert.equal(x.scene.placement.facing,facing);assert.equal(x.scene.placement.on,x.host.id);
 x.decor.move(x.anchor());assert.equal(x.scene.placement.facing,facing);
 x.nodes.get('decor-place').onclick();await x.settle();assert.equal(x.saves(),1);
 const restored=sanitizeState(JSON.parse(JSON.stringify(x.state))),item=restored.kitchenLayout.find(p=>p.id===x.id);
 assert.equal(item.facing,facing);assert.equal(item.on,x.host.id);
 x.decor.select(x.id);assert.equal(x.scene.placement.facing,facing);x.attach();assert.equal(x.scene.placement.facing,facing);
});

for(const action of ['decor-cancel','decor-close','decor-choose'])test(action+' discards the entire tabletop reflow preview',async t=>{
 const x=fixture(t,{side:'front',itemId:'collection-port-4'});
 for(const [id,offsetX]of [['collection-port-3',-25],['collection-port-8',50]]){x.state.furnitureOwned.push(id);x.state.kitchenLayout.push({id,...attachedPosition({id,on:x.host.id,surface:0,offsetX,facing:'front'},x.state.kitchenLayout,FURNITURE)});}
 const before=structuredClone(x.state);x.decor.select(x.id);x.decor.move(x.anchor());
 assert(!x.nodes.get('decor-place').disabled);assert.match(x.nodes.get('decor-hint').textContent,/預覽整理/);
 assert.notDeepEqual(furniturePreviewLayout(x.state,x.scene.placement,'kitchen').find(p=>p.id==='collection-port-3'),x.state.kitchenLayout.find(p=>p.id==='collection-port-3'),'the neighbour visibly previews a new position');
 assert.deepEqual(x.state,before);x.nodes.get(action).onclick();await x.settle();assert.deepEqual(x.state,before);assert.equal(x.saves(),0);assert.equal(x.scene.placement,null);
});

test('confirm saves exactly the complete preview and physical capacity does not change with appliance direction',async t=>{
 const x=fixture(t,{side:'left',itemId:'collection-port-4'});
 for(const [id,offsetX]of [['collection-port-3',-10],['collection-port-8',25]]){x.state.furnitureOwned.push(id);x.state.kitchenLayout.push({id,...attachedPosition({id,on:x.host.id,surface:0,offsetX,facing:'left'},x.state.kitchenLayout,FURNITURE)});}
 x.decor.select(x.id);x.decor.move(x.anchor());assert(!x.nodes.get('decor-place').disabled);
 x.chooseFacing('front');assert(!x.nodes.get('decor-place').disabled);assert.match(x.nodes.get('decor-hint').textContent,/確認/);
 x.chooseFacing('left');const preview=furniturePreviewLayout(x.state,x.scene.placement,'kitchen');x.nodes.get('decor-place').onclick();await x.settle();assert.equal(x.saves(),1);
 for(const p of x.state.kitchenLayout){const rendered=preview.find(q=>q.id===p.id);delete rendered.valid;assert.deepEqual(p,rendered);}
 assert.equal(x.state.kitchenLayout.filter(p=>p.on===x.host.id).length,3);
});

test('a layout updated after preview must be reviewed again before confirmation',async t=>{
 const x=fixture(t,{side:'front',itemId:'collection-port-4'});x.decor.select(x.id);x.attach();
 x.state.furnitureOwned.push('collection-port-3');x.state.kitchenLayout.push({id:'collection-port-3',...attachedPosition({id:'collection-port-3',on:x.host.id,surface:0,offsetX:40,facing:'front'},x.state.kitchenLayout,FURNITURE)});
 const newer=structuredClone(x.state);x.nodes.get('decor-place').onclick();assert.equal(x.saves(),0);assert.deepEqual(x.state,newer);assert(x.scene.placement);
 const preview=furniturePreviewLayout(x.state,x.scene.placement,'kitchen');x.nodes.get('decor-place').onclick();await x.settle();assert.equal(x.saves(),1);
 for(const p of x.state.kitchenLayout){const expected=preview.find(q=>q.id===p.id);delete expected.valid;assert.deepEqual(p,expected);}
});

for(const side of ['left','right'])test('a new appliance follows the '+side+' counter via both attachment controls',t=>{
 const x=fixture(t,{side});x.decor.select(x.id);x.attach();assert.equal(x.scene.placement.facing,side);
 x.decor.move({x:650,y:620});assert(!x.scene.placement.on);assert.equal(x.scene.placement.facing,side);
 x.decor.move(x.anchor());assert.equal(x.scene.placement.on,x.host.id);assert.equal(x.scene.placement.facing,side);
 x.chooseFacing('front');x.decor.move(x.anchor());assert.equal(x.scene.placement.facing,'front');
 const automatic=x.nodes.get('decor-position-tools').children.find(b=>b.textContent.includes('自選方向'));assert(automatic);automatic.onclick();assert.equal(x.scene.placement.facing,side);
});

test('reselecting an existing direction does not silently replace it with the host direction',t=>{
 const x=fixture(t,{side:'left',savedFacing:'right'});x.decor.select(x.id);x.attach();assert.equal(x.scene.placement.facing,'right');
});

for(const side of ['left','right'])test(side+' L-shaped counter applies the direction of the selected arm',t=>{
 const x=fixture(t,{side,corner:true,itemId:'collection-port-8'});x.decor.select(x.id);x.attach(0);assert.equal(x.scene.placement.facing,'front');
 x.attach(1);assert.equal(x.scene.placement.facing,side);
 x.chooseFacing('front');x.attach(1);assert.equal(x.scene.placement.facing,'front','manual choice remains authoritative');
});

for(const side of ['left','right'])test(side+' calibrated counter retains physical appliance widths in every direction',t=>{
 const x=fixture(t,{side});
 for(const id of ['collection-port-4','collection-port-8']){
  const spot=freeSurfacePosition(id,x.host,0,x.state.kitchenLayout,FURNITURE,undefined,{facing:side});
  assert(spot);x.state.furnitureOwned.push(id);x.state.kitchenLayout.push({id,...spot,facing:side});
 }
 x.decor.select(x.id);x.attach();assert.equal(x.scene.placement.on,x.host.id);assert.equal(x.scene.placement.facing,side);
 x.decor.move(x.anchor());assert.equal(x.scene.placement.on,x.host.id,'pointer placement also uses the narrow side artwork');
 x.chooseFacing('front');assert.equal(x.nodes.get('decor-supports').children[0].disabled,false,'changing direction does not shrink or enlarge the physical item');
 x.chooseFacing(side);x.attach();assert.equal(x.scene.placement.on,x.host.id);assert.equal(x.scene.placement.facing,side);
});
