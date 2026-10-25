import test from 'node:test';
import assert from 'node:assert/strict';
import {installHomeInputGuard} from '../home-input-guard.js';

class Surface{
 constructor(){this.handlers=new Map();}
 addEventListener(type,fn){const list=this.handlers.get(type)||[];list.push(fn);this.handlers.set(type,list);}
 removeEventListener(type,fn){this.handlers.set(type,(this.handlers.get(type)||[]).filter(x=>x!==fn));}
 contains(target){return target===this;}
 emit(type,fields={}){const event={target:this,type,cancelable:true,timeStamp:1000,...fields,preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){this.stopped=true;}};for(const fn of this.handlers.get(type)||[])fn(event);return event;}
}
function setup(){const stage=new Surface(),panel=new Surface(),view=new Surface();let editing=true;const guard=installHomeInputGuard({stage,panel,view,enabled:()=>editing});return {stage,panel,view,guard,enable(value){editing=value;}};}

test('a normal drag and menu scrolling remain available in home editing',()=>{
 const {stage,panel}=setup();
 assert(!stage.emit('pointerdown',{pointerId:1,pointerType:'touch'}).defaultPrevented);
 assert(!stage.emit('pointermove',{pointerId:1,pointerType:'touch'}).defaultPrevented);
 assert(!stage.emit('pointerup',{pointerId:1,pointerType:'touch'}).defaultPrevented);
 assert(!panel.emit('touchmove',{touches:[{}]}).defaultPrevented);
 assert(!panel.emit('click',{timeStamp:1200}).defaultPrevented);
});

test('second touch cannot hijack a drag, and releasing one finger cannot resume it',()=>{
 const {stage}=setup();
 stage.emit('pointerdown',{pointerId:1,pointerType:'touch'});
 assert(stage.emit('pointerdown',{pointerId:2,pointerType:'touch'}).defaultPrevented);
 assert(stage.emit('pointermove',{pointerId:1,pointerType:'touch'}).stopped);
 assert(stage.emit('pointerup',{pointerId:2,pointerType:'touch'}).stopped);
 assert(stage.emit('pointermove',{pointerId:1,pointerType:'touch'}).stopped);
 stage.emit('pointerup',{pointerId:1,pointerType:'touch'});
 assert(stage.emit('click',{timeStamp:1100}).defaultPrevented);
 assert(!stage.emit('pointerdown',{pointerId:3,pointerType:'touch',timeStamp:1600}).defaultPrevented);
 assert(!stage.emit('pointermove',{pointerId:3,pointerType:'touch',timeStamp:1601}).defaultPrevented);
});

test('Safari pinch and rapid second tap are prevented only inside the editor',()=>{
 const {stage,panel,enable}=setup();
 for(const type of ['gesturestart','gesturechange','gestureend','dblclick'])assert(stage.emit(type).defaultPrevented,type);
 assert(panel.emit('touchstart',{touches:[{},{}]}).defaultPrevented);
 assert(panel.emit('wheel',{ctrlKey:true}).defaultPrevented);
 assert(!panel.emit('wheel',{ctrlKey:false}).defaultPrevented);
 const touch={clientX:50,clientY:50};
 assert(!panel.emit('touchend',{touches:[],changedTouches:[touch],timeStamp:2000}).defaultPrevented);
 assert(panel.emit('touchend',{touches:[],changedTouches:[touch],timeStamp:2200}).defaultPrevented);
 enable(false);
 for(const type of ['gesturestart','gesturechange','dblclick'])assert(!stage.emit(type).defaultPrevented,type+' remains available on island');
 assert(!panel.emit('touchstart',{touches:[{},{}]}).defaultPrevented);
});

test('closing, losing focus and cleanup release gesture state',()=>{
 const {stage,view,guard}=setup();
 for(const reset of [guard.reset,()=>view.emit('blur')]){
  stage.emit('pointerdown',{pointerId:1,pointerType:'touch'});stage.emit('pointerdown',{pointerId:2,pointerType:'touch'});reset();
  assert(!stage.emit('pointerdown',{pointerId:3,pointerType:'touch'}).defaultPrevented);guard.reset();
 }
 guard.destroy();assert(!stage.emit('gesturestart').defaultPrevented);assert(!stage.emit('dblclick').defaultPrevented);
});
