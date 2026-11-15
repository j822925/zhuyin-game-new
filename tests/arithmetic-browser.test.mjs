import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';import {createFixture} from './arithmetic-fixture.mjs';import {answer} from '../arithmetic-core.js';
const root=fileURLToPath(new URL('../',import.meta.url)),{chromium}=createRequire(path.join(path.dirname(process.execPath),'../node_modules/playwright/package.json'))('playwright');
const origin='http://127.0.0.1:32128';
test('desktop and tablet UI: hint, first error, correction, reload, save retry, teacher settings and exam',async()=>{
 const f=createFixture(),browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),page=await browser.newPage({viewport:{width:1024,height:768}}),errors=[],outside=[];let rejectSave=false;
 page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',async route=>{const request=route.request(),url=new URL(request.url());if(url.origin!==origin){outside.push(url.href);await route.abort();return;}
  if(url.pathname==='/arithmetic-fixture/session'){await route.fulfill({contentType:'application/json',body:JSON.stringify({seat:'990001',token:'a'.repeat(64),expires:Date.now()+3600000})});return;}
  if(url.pathname==='/class-info'){await route.fulfill({contentType:'application/json',body:JSON.stringify({class:{name:'測試班'}})});return;}
  if(url.pathname.startsWith('/arithmetic/')||url.pathname.startsWith('/admin/api/arithmetic/')){if(rejectSave&&url.pathname==='/arithmetic/submit'){await route.abort();return;}const response=await f.api.fetch(new Request(url,{method:request.method(),headers:request.headers(),body:request.postData()}),f.env);await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});return;}
  const file=path.resolve(root,decodeURIComponent(url.pathname).replace(/^\//,''));if(!file.startsWith(root)||!fs.existsSync(file)||!fs.statSync(file).isFile()){await route.fulfill({status:404});return;}
  await route.fulfill({body:fs.readFileSync(file),contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream'});
 });
 const state=()=>page.evaluate(()=>{const key=Object.keys(sessionStorage).find(k=>k.startsWith('arithmetic.round.'));return key?JSON.parse(sessionStorage.getItem(key)).value:null;});
 async function type(n){await page.locator('[data-key=clear]').click();for(const c of String(n))await page.locator('[data-key="'+c+'"]').click();await page.locator('#submit').click();}
 try{
  await page.goto(origin+'/arithmetic.html?fixture=1');await page.locator('#entry').waitFor({state:'visible'});assert.equal(await page.locator('[data-level]').count(),3);
  fs.mkdirSync(path.join(root,'docs/arithmetic-qa'),{recursive:true});await page.screenshot({path:path.join(root,'docs/arithmetic-qa/home-1024.png'),fullPage:true});
  for(const size of [{width:1024,height:768},{width:768,height:1024},{width:390,height:844}]){await page.setViewportSize(size);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  await page.setViewportSize({width:1024,height:768});await page.locator('#count').selectOption('5');await page.locator('#start').click();await page.locator('#play').waitFor({state:'visible'});
  let s=await state(),first=s.run.questions[0];await type(answer(first)+1);await page.locator('#hint-panel').waitFor({state:'visible'});assert.equal((await state()).first,answer(first)+1);await type(answer(first));assert.equal((await state()).first,answer(first)+1);await page.locator('#next').click();
  await page.reload();await page.locator('#resume').click();await page.locator('#play').waitFor({state:'visible'});assert.equal((await state()).index,1);
  await page.screenshot({path:path.join(root,'docs/arithmetic-qa/play-1024.png'),fullPage:true});
  assert(await page.locator('#submit').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight),'tablet submit should fit without scrolling');
  for(const size of [{width:768,height:1024},{width:390,height:844}]){await page.setViewportSize(size);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(root,'docs/arithmetic-qa/play-'+size.width+'.png'),fullPage:true});}
  for(let i=1;i<5;i++){s=await state();await type(answer(s.run.questions[s.index]));if(i===4)rejectSave=true;await page.locator('#next').click();}
  await page.getByText('還沒有儲存成功，答案已保留，請重試。',{exact:true}).waitFor();assert(await page.locator('#finish').isDisabled());rejectSave=false;await page.locator('#retry-save').click();await page.getByText('學習紀錄已儲存。',{exact:true}).waitFor();assert.match(await page.locator('#result-score').textContent(),/4 \/ 5/);assert.equal((await f.store.listRuns()).length,1);
  await page.locator('#finish').click();await page.locator('#notebook-button').click();await page.locator('#notebook-list .list-card').first().waitFor();assert.equal(await page.locator('#notebook-list .list-card').count(),1);
  const exam=(await f.call('exam-save',{title:'平板小考',config:{max:18,operation:'sub',skill:'mixed',count:5},studentSeats:['990001'],startsAt:Date.now()-1000,endsAt:Date.now()+600000,enabled:true,revision:0},'teacher')).data.task;assert(exam);
  await page.locator('#back').click();await page.locator('#tasks-button').click();await page.locator('#task-list').getByRole('button',{name:'開始 →'}).click();await page.locator('#play').waitFor({state:'visible'});assert(await page.locator('#hint-button').isHidden());
  for(let i=0;i<5;i++){s=await state();await type(answer(s.run.questions[s.index]));await page.locator('#next').click();}await page.getByText('學習紀錄已儲存。',{exact:true}).waitFor();assert.equal((await f.store.getExam('990001',exam.id)).result.score,100);
  await page.goto(origin+'/arithmetic.html?demo=1');await page.locator('#demo-teacher').click();await page.locator('.math-admin').waitFor({state:'visible'});await page.getByText('＋ 建立作業或小考',{exact:true}).click();await page.getByRole('button',{name:'建立任務',exact:true}).click();await page.getByText('任務已建立。',{exact:true}).waitFor();await page.screenshot({path:path.join(root,'docs/arithmetic-qa/admin.png'),fullPage:true});
  await page.locator('#back').click();await page.locator('#tasks-button').click();await page.locator('#task-list .list-card').first().waitFor();assert.equal(await page.locator('#task-list .list-card').count(),1);
  assert.deepEqual(errors,[]);assert.deepEqual(outside,[]);
 }finally{await browser.close();f.close();}
});
