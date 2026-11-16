import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {canSeeHanziEntry,hanziEntrySessionKey} from '../hanzi-entry.js';

test('pilot entry requires the active, unexpired session for every student in either class',()=>{
  const options=seat=>({classId:'main',selectedSeat:seat,now:1000,session:{seat,token:'fixture-token',expires:2000}});
  for(const seat of ['115015','115016'])assert.equal(canSeeHanziEntry(options(seat)),true);
  assert.equal(canSeeHanziEntry(options('115001')),true);
  assert.equal(canSeeHanziEntry({...options('115015'),classId:'grade2'}),true);
  assert.equal(canSeeHanziEntry({...options('115015'),selectedSeat:'115016'}),false);
  assert.equal(canSeeHanziEntry({...options('115015'),selectedSeat:''}),false);
  assert.equal(canSeeHanziEntry({...options('115015'),session:null}),false);
  for(const patch of [{token:''},{token:123},{expires:1000},{expires:'2000'}])
    assert.equal(canSeeHanziEntry({...options('115015'),session:{...options('115015').session,...patch}}),false);
  assert.equal(canSeeHanziEntry({demo:true,classId:'grade2'}),true);
  assert.equal(hanziEntrySessionKey('https://example.test/game/index.html?demo=1'),'zhuyin.student-session.v1:/game/:live');
  assert.equal(hanziEntrySessionKey('https://example.test/game/index.html','grade2'),'zhuyin.student-session.v1:/game/:live:class:grade2');
});

let chromium;
for(const base of [import.meta.url,path.join(path.dirname(process.execPath),'../node_modules/playwright/package.json')]){
  try{({chromium}=createRequire(base)('playwright'));break;}catch{}
}
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const chromePath=process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined;
const browserAvailable=chromium&&(!chromePath||fs.existsSync(chromePath));
const origin='https://hanzi-entry-gate.test';
const base=origin+'/game/';
const harness=`<!doctype html><meta charset="utf-8"><div id="app">
<select id="seat"><option value=""></option><option>115015</option><option>115016</option><option>115001</option></select>
<button id="change-student">Change student</button><div id="home"><div class="worlds"></div><p id="home-message"></p></div>
<div id="teacher-testing-hub"><div class="teacher-test-grid"></div></div><div id="status"></div></div>
<script type="module">
import {createStudentAuth} from './student-auth.js';
import './hanzi-entry.js';
window.loginCalls=0;
window.auth=createStudentAuth({demo:false,getConfig:()=>({authRequired:true}),post:async payload=>{
  window.loginCalls++;return payload.pin==='1234'?{ok:true,token:'fixture-'+payload.seat+'-'+window.loginCalls,expires:Date.now()+60000}:{ok:false,error:'invalid_pin'};
}});
const seat=document.getElementById('seat');seat.value=auth.currentSeat();
seat.onchange=async()=>{auth.forgetAll();const chosen=seat.value;if(chosen&&!await auth.ensure(chosen))seat.value='';else auth.setPrimary(chosen);};
document.getElementById('change-student').onclick=()=>{auth.forgetAll();seat.value='';};
document.getElementById('status').textContent='ready';window.ready=true;
</script>`;

async function setup(page,{combinedBoot=false}={}){
  const requests=[];page.on('request',request=>requests.push(request.url()));
  await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(combinedBoot&&url.pathname==='/arithmetic/access'){
      const payload=route.request().postDataJSON(),token=route.request().headers().authorization||'';
      await route.fulfill({json:{available:payload.classId==='main'&&token.includes('115015')}});return;
    }
    if(url.pathname==='/class-info'){await route.fulfill({json:{class:{name:'Fixture class'}}});return;}
    if(url.origin!==origin){await route.abort();return;}
    if(url.pathname==='/game/index.html'){await route.fulfill({contentType:'text/html',body:combinedBoot?harness.replace("import './hanzi-entry.js';","import './game-boot.js';"):harness});return;}
    if(combinedBoot&&url.pathname==='/game/preparation.js'){await route.fulfill({contentType:'text/javascript',body:'export async function bootPreparation(){}'});return;}
    if(combinedBoot&&['app.js','forest-home-entry.js','child-navigation.js','reading-entry.js','tone-entry.js','teacher-hub.js','annual-challenge-entry.js','helper-entry.js','island-names.js'].includes(url.pathname.split('/').at(-1))){await route.fulfill({contentType:'text/javascript',body:'export {};'});return;}
    const file=path.resolve(root,url.pathname.replace(/^\/game\//,''));
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){await route.fulfill({status:404});return;}
    await route.fulfill({contentType:'text/javascript',body:fs.readFileSync(file)});
  });
  return requests;
}
async function pin(page){for(const n of ['1','2','3','4'])await page.locator('[data-pin="'+n+'"]').click();await page.locator('#pin-dialog').waitFor({state:'hidden'});}
async function absent(page){await page.waitForFunction(()=>!document.getElementById('hanzi-island-entry'));}
async function present(page){await page.locator('#hanzi-island-entry').waitFor({state:'visible'});assert.equal(await page.locator('#hanzi-island-entry').count(),1);}

test('real auth dialog drives entry login, account switching, logout and stale-session protection without added requests', {skip:!browserAvailable,timeout:30000},async()=>{
  const browser=await chromium.launch({headless:true,...(chromePath?{executablePath:chromePath}:{})});
  try{
    const page=await browser.newPage();page.setDefaultTimeout(5000);const errors=[];page.on('pageerror',error=>errors.push(error.message));
    const requests=await setup(page);await page.goto(base+'index.html');await page.waitForFunction(()=>window.ready);await absent(page);
    await page.selectOption('#seat','115015');await page.locator('#pin-dialog').waitFor({state:'visible'});await absent(page);
    await pin(page);await present(page);
    const oldToken=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('zhuyin.student-session.v1:/game/:live')).token);
    await page.selectOption('#seat','115001');await page.locator('#pin-dialog').waitFor({state:'visible'});await absent(page);await pin(page);await present(page);
    await page.selectOption('#seat','115016');await pin(page);await present(page);
    await page.locator('#change-student').click();await absent(page);
    await page.selectOption('#seat','115015');await absent(page);await pin(page);await present(page);
    assert.notEqual(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('zhuyin.student-session.v1:/game/:live')).token),oldToken);
    assert.equal(await page.evaluate(()=>{
      const key='zhuyin.student-session.v1:/game/:live',session=JSON.parse(sessionStorage.getItem(key));
      session.expires=Date.now()-1;sessionStorage.setItem(key,JSON.stringify(session));
      const event=new MouseEvent('click',{bubbles:true,cancelable:true});document.getElementById('hanzi-island-entry').dispatchEvent(event);return event.defaultPrevented;
    }),true);await absent(page);
    // A verified same-tab restore is allowed; its one-shot expiry timer removes it.
    await page.evaluate(()=>{sessionStorage.setItem('zhuyin.student-session.v1:/game/:live',JSON.stringify({seat:'115016',token:'fixture-restored',expires:Date.now()+1000}));document.getElementById('seat').value='115016';window.dispatchEvent(new Event('focus'));});
    await present(page);await absent(page);
    assert.equal(await page.locator('[data-hanzi-trial]').count(),0);
    assert.equal(requests.some(url=>new URL(url).pathname.startsWith('/hanzi/')||new URL(url).pathname.includes('/login')),false);
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
});

test('other classes are open while teacher demo remains independent and carries only class/demo URL state',{skip:!browserAvailable,timeout:30000},async()=>{
  const browser=await chromium.launch({headless:true,...(chromePath?{executablePath:chromePath}:{})});
  try{
    const page=await browser.newPage();await setup(page);
    await page.addInitScript(()=>{sessionStorage.setItem('zhuyin.student-session.v1:/game/:live:class:grade2',JSON.stringify({seat:'115015',token:'fixture-other-class',expires:Date.now()+60000}));});
    await page.goto(base+'index.html?class=grade2');await page.waitForFunction(()=>window.ready);assert.equal(await page.locator('#seat').inputValue(),'115015');await present(page);
    await page.goto(base+'index.html?class=grade2&demo=1&token=do-not-propagate&seat=115015');await page.waitForFunction(()=>window.ready);await present(page);
    assert.equal(await page.locator('[data-hanzi-trial]').count(),1);
    const target=new URL(await page.locator('#hanzi-island-entry').getAttribute('href'));
    assert.equal(target.pathname,'/game/hanzi.html');assert.deepEqual([...target.searchParams],[['class','grade2'],['demo','1']]);
  }finally{await browser.close();}
});

test('merged production boot keeps both open entries and independent teacher trials without losing logout behavior',{skip:!browserAvailable,timeout:30000},async()=>{
  const browser=await chromium.launch({headless:true,...(chromePath?{executablePath:chromePath}:{})});
  try{
    const page=await browser.newPage();page.setDefaultTimeout(5000);const errors=[];page.on('pageerror',error=>errors.push(error.message));
    const requests=await setup(page,{combinedBoot:true});
    await page.goto(base+'index.html?demo=1');await present(page);await page.locator('#arithmetic-island-entry').waitFor({state:'visible'});
    assert.equal(await page.locator('[data-hanzi-trial]').count(),1);assert.equal(await page.locator('[data-math-trial]').count(),1);
    assert.equal(requests.filter(url=>new URL(url).pathname==='/arithmetic/access').length,0);
    await page.goto(base+'index.html');await page.waitForFunction(()=>window.ready);await absent(page);
    await page.selectOption('#seat','115015');await pin(page);await present(page);await page.locator('#arithmetic-island-entry').waitFor({state:'visible'});
    assert.equal(await page.locator('#arithmetic-island-entry').count(),1);
    assert.equal(requests.filter(url=>new URL(url).pathname==='/arithmetic/access').length,1);
    await page.locator('#change-student').click();await absent(page);await page.locator('#arithmetic-island-entry').waitFor({state:'detached'});
    assert.equal(requests.some(url=>new URL(url).pathname.startsWith('/hanzi/')),false);
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
});
