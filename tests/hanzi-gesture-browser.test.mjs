import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const root=fileURLToPath(new URL('../',import.meta.url));
let chromium;
try { ({chromium}=createRequire(import.meta.url)('playwright')); }
catch { try { ({chromium}=createRequire(path.join(path.dirname(process.execPath),'../node_modules/playwright/package.json'))('playwright')); } catch {} }
const chromePath=process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined;
const available=chromium && (!chromePath||fs.existsSync(chromePath));

test('writing owns the contact, rejects other touches and releases the page after lifting or interruption',{skip:!available},async t=>{
  const browser=await chromium.launch({headless:true,executablePath:chromePath});t.after(()=>browser.close());
  const page=await browser.newPage({viewport:{width:900,height:620},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://ink.test/**',async route=>{
    const file=new URL(route.request().url()).pathname.slice(1);
    if(file)return route.fulfill({path:path.join(root,file),contentType:file.endsWith('.js')?'text/javascript':'application/json'});
    await route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
      <style>body{margin:0;min-height:250vh}#board{margin:220px 140px 0;width:320px}button{position:fixed;left:65%;top:30%;width:110px;height:55px}</style>
      <div id="board"></div><button>下一頁</button><script type="module">
      import {createHandwriting} from './hanzi-handwriting.js';
      window.hits=0;document.querySelector('button').onclick=()=>window.hits++;
      window.pad=createHandwriting(document.querySelector('#board'));await pad.load('三');window.ready=true;
      </script>`});
  });
  await page.goto('https://ink.test/');
  await page.waitForFunction(()=>window.ready,null,{timeout:5000}).catch(e=>{throw Error([e.message,...errors].join('; '));});
  await page.evaluate(()=>scrollTo(0,100));
  const cdp=await page.context().newCDPSession(page);
  const touch=(type,touchPoints)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
  const point=(id,x,y)=>({id,x,y,radiusX:3,radiusY:3,force:.6});
  const initial=await page.evaluate(()=>({y:scrollY,scale:visualViewport.scale}));
  const board=await page.locator('#board canvas').first().boundingBox();
  const button=await page.locator('button').boundingBox(),bx=button.x+30,by=button.y+20;
  let finger=point(1,board.x+30,board.y+40);
  await touch('touchStart',[finger]);
  await page.waitForFunction(()=>getComputedStyle(document.documentElement).overscrollBehavior==='none');
  const palm=point(2,bx,by);
  await touch('touchStart',[finger,palm]);
  for(let n=1;n<=6;n++){
    finger=point(1,board.x+30+n*66,board.y+40+n*15);
    await touch('touchMove',[finger,{...palm,y:by+n*4}]);
  }
  await touch('touchEnd',[]);
  await page.waitForFunction(()=>getComputedStyle(document.documentElement).overscrollBehavior!=='none');
  const after=await page.evaluate(()=>({y:scrollY,scale:visualViewport.scale,ink:pad.getStrokes(),hits}));
  assert.equal(after.y,initial.y);assert.equal(after.scale,initial.scale);assert.equal(after.hits,0);
  assert.equal(after.ink.length,1);assert.equal(after.ink[0].at(-1).x,1,'stroke outside the grid stays captured');
  await page.touchscreen.tap(bx,by);assert.equal(await page.evaluate(()=>hits),1);
  await touch('touchStart',[point(3,800,490)]);
  for(let n=1;n<=5;n++)await touch('touchMove',[point(3,800,490-n*40)]);
  await touch('touchEnd',[]);await page.waitForFunction(y=>scrollY>y+10,initial.y);
  // A separate pencil and a second finger can each be primary for their pointer type.
  const result=await page.evaluate(()=>{
    pad.clear();
    const canvas=document.querySelector('canvas'),button=document.querySelector('button'),box=canvas.getBoundingClientRect();
    canvas.setPointerCapture=()=>{throw Error('unavailable');};
    const pen=(target,name,id,type='pen')=>target.dispatchEvent(new PointerEvent(name,{bubbles:true,cancelable:true,isPrimary:true,
      pointerId:id,pointerType:type,clientX:box.x+120,clientY:box.y+130}));
    pen(canvas,'pointerdown',81);
    const secondary=pen(button,'pointerdown',30,'touch');
    pen(button,'pointermove',81);pen(button,'pointerup',81);
    const locked=getComputedStyle(document.documentElement).overscrollBehavior==='none';
    pen(button,'pointerup',30,'touch');
    pen(button,'click',30,'touch');
    return {secondary,locked,hits,count:pad.getStrokes().length};
  });
  assert.deepEqual(result,{secondary:false,locked:true,hits:1,count:1});
  await page.waitForFunction(()=>getComputedStyle(document.documentElement).overscrollBehavior!=='none');
  for(const cancel of ['pointercancel','blur','pagehide','destroy']){
    await page.evaluate(cancel=>{
      const canvas=document.querySelector('canvas');
      canvas.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerId:42,pointerType:'pen',isPrimary:true,clientX:180,clientY:120}));
      if(cancel==='destroy')pad.destroy();
      else if(cancel==='pointercancel')canvas.dispatchEvent(new PointerEvent(cancel,{bubbles:true,pointerId:42}));
      else window.dispatchEvent(new Event(cancel));
    },cancel);
    await page.waitForFunction(()=>getComputedStyle(document.documentElement).overscrollBehavior!=='none');
    if(cancel!=='destroy')assert.equal(await page.evaluate(()=>pad.grade().correct),null);
  }
  assert.deepEqual(errors,[]);
});
