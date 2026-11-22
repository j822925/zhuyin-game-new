import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {freshState,SAVE_KEY} from '../adventure-model.js';
import {forestSaveKey} from '../adventure-sync.js';
import {LESSON_CROPS} from '../data/lesson-harvest-foods.js';
import {CROP_LESSONS} from '../data/farm-lessons.js';
import {questionPool,splitBopomofo,gradeReading} from '../hanzi-bank.js';
import {gradeStrokes} from '../hanzi-stroke-core.js';
import {gradeCopy} from '../hanzi-copy-core.js';
import {PRACTICE_RULE} from '../hanzi-practice.js';
import {createArithmeticService,createMemoryStore} from '../arithmetic-service.js';
import {answer} from '../arithmetic-core.js';

// Local-only synthetic API receipts use the production shapes and grading cores.
// No roster, student names, production service or real account is read or written.
const root=fileURLToPath(new URL('../',import.meta.url));
const {chromium}=createRequire(path.join(path.dirname(process.execPath),'../node_modules/playwright/package.json'))('playwright');
const origin='http://127.0.0.1:32136',seat='990001';
const bank=JSON.parse(fs.readFileSync(path.join(root,'data/hanzi-curriculum.json'),'utf8'));
const reference=(character,copy=false)=>JSON.parse(fs.readFileSync(path.join(root,'data',copy?'hanzi-copy':'hanzi-strokes','U'+character.codePointAt(0).toString(16).toUpperCase()+'.json'),'utf8'));
const family=mode=>mode==='arithmetic'?'arithmetic':['hanzi-reading','hanzi-writing'].includes(mode)?'hanzi':'copy';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.mp3':'audio/mpeg'};

async function fixture(browser,lesson,{demo=false,classId='main'}={}){
 const context=await browser.newContext({viewport:{width:1024,height:768}}),page=await context.newPage();page.setDefaultTimeout(12000);
 const errors=[],outside=[],calls=[],runs=new Map(),who={role:'student',seat,classId},math=createArithmeticService({store:createMemoryStore(),students:async()=>[{seat}]}),f=family(lesson);
 const state=freshState();state.life.farmUnlocked=true;state.life.plots=Object.keys(LESSON_CROPS).map(crop=>({crop,plantId:'fixture-'+crop,watered:true,ready:false}));state.stars=51;
 const key=demo?SAVE_KEY:forestSaveKey(classId,seat),back=origin+'/adventure-preview.html?class='+classId+'&returnFarm=1'+(demo?'&demo=1':''),session={seat,token:'a'.repeat(64),expires:Date.now()+3600000};
 let rejectSave=false;
 await page.addInitScript(({key,state,back,session,lesson,demo,classId})=>{
  if(!sessionStorage.getItem('fixture-seeded')){
   localStorage.setItem(key,JSON.stringify(demo?state:{state,revision:1,dirty:false}));
   sessionStorage.setItem('zhuyin.farm-learning-trip.v1',JSON.stringify({classId,demo,mode:lesson,returnUrl:back}));
   if(!demo)sessionStorage.setItem('zhuyin.student-session.v1:/:live'+(classId==='main'?'':':class:'+classId),JSON.stringify(session));
   sessionStorage.setItem('fixture-seeded','1');
  }
  const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(this===localStorage&&sessionStorage.getItem('fixture-reject-farm')==='1'&&k===key)throw Error('test storage full');return set.call(this,k,v);};
 },{key,state,back,session,lesson,demo,classId});
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url()),body=req.postData()?JSON.parse(req.postData()):{};
  // Legacy profile badge still requests its configured API; fulfill locally, never contact it.
  if(url.origin==='https://zhuyin-api.j822925.workers.dev'&&url.pathname==='/api'){calls.push('local-profile-stub');await route.fulfill({json:{avatar:'rabbit',seat,nickname:'本機測試夥伴'}});return;}
  if(url.origin!==origin){outside.push(url.href);await route.abort();return;}
  if(url.pathname.endsWith('-fixture/session')){await route.fulfill({json:session});return;}
  if(url.pathname==='/api'){await route.fulfill({json:{avatar:'rabbit',nickname:'本機測試夥伴'}});return;}
  if(url.pathname==='/class-info'){await route.fulfill({json:{class:{name:'本機測試班'}}});return;}
  if(url.pathname.startsWith('/hanzi/')||url.pathname.startsWith('/arithmetic/')){
   calls.push(url.pathname);
   if(rejectSave&&['/hanzi/practice-submit','/hanzi/copy/submit','/arithmetic/submit'].includes(url.pathname)){await route.fulfill({status:503,json:{code:'fixture_unavailable',error:'測試暫停儲存'}});return;}
   try{
    let out;
    if(url.pathname.startsWith('/arithmetic/')){const action=url.pathname.split('/').at(-1).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());out=await math[action](who,body);}
    else if(url.pathname==='/hanzi/copy/bootstrap')out={nameReady:true,copyReady:true};
    else if(url.pathname==='/hanzi/bootstrap')out={catalog:bank,scope:{revision:0,termId:bank.semesterId,lessonIds:['0']},assignments:[],exams:[]};
    else if(url.pathname==='/hanzi/practice-start'){
     const questions=[...new Map(questionPool(bank,['0'],body.mode,{termId:bank.semesterId}).map(q=>[q.itemId,q])).values()].slice(0,5).map(q=>({...q,mode:body.mode,questionId:q.id}));
     const run={id:crypto.randomUUID(),seat,kind:'practice',mode:body.mode,status:'started',snapshot:{questions,baseQuestions:structuredClone(questions),practiceRule:PRACTICE_RULE,bonusPool:[]}};runs.set(run.id,run);out={roundId:run.id,mode:run.mode,questions,snapshot:run.snapshot,run};
    }else if(url.pathname==='/hanzi/practice-submit'){
     const run=runs.get(body.roundId);if(run.status!=='submitted'){
      run.answers=run.snapshot.questions.map(q=>{const a=body.answers.find(a=>a.questionId===q.id),grade=run.mode==='reading'?gradeReading(q,a.answer):gradeStrokes(a.answer.strokes,reference(q.character),{gradingPolicy:'automatic-v1'});return{questionId:q.id,answer:a.answer,grade:{...grade,status:grade.status||(grade.correct?'correct':'incorrect')}};});
      run.result={correct:run.answers.filter(a=>a.grade.correct).length,total:run.answers.length,pending:0,stars:2};run.status='submitted';
     }out={run};
    }else if(url.pathname==='/hanzi/copy/start'){
     const chars=body.mode==='copy'?[...'手上下左右']:[...'李子'],readings=body.mode==='copy'?['ㄕㄡˇ','ㄕㄤˋ','ㄒㄧㄚˋ','ㄗㄨㄛˇ','ㄧㄡˋ']:['ㄌㄧˇ','ㄗˇ'];
     const questions=chars.map((character,i)=>({id:crypto.randomUUID(),character,bopomofo:readings[i],reference:reference(character,true),nameIndex:i,nameLength:chars.length}));
     const run={id:crypto.randomUUID(),seat,mode:body.mode,status:'started',snapshot:{questions}};runs.set(run.id,run);out={run};
    }else if(url.pathname==='/hanzi/copy/submit'){
     const run=runs.get(body.runId);if(run.status!=='submitted'){
      run.answers=run.snapshot.questions.map(q=>{const a=body.answers.find(a=>a.questionId===q.id),grade=(answer)=>run.mode==='name-writing'?gradeStrokes(answer.strokes,q.reference,{gradingPolicy:'automatic-v1'}):gradeCopy(answer.strokes,q.reference);return{questionId:q.id,firstGrade:grade(a.first),finalGrade:grade(a.final)};});
      run.status='submitted';run.result={total:run.answers.length,correct:run.answers.filter(a=>a.firstGrade.correct).length,stars:run.mode==='name-writing'?3:run.answers.length*2,quota:{remaining:0}};
     }out={run};
    }else if(url.pathname.endsWith('/assignments'))out={assignments:[]};else if(url.pathname.endsWith('/exams'))out={exams:[]};else out={};
    await route.fulfill({json:out});
   }catch(e){errors.push(url.pathname+': '+e.message);await route.fulfill({status:500,json:{code:'fixture_error'}});}return;
  }
  const file=path.resolve(root,decodeURIComponent(url.pathname).replace(/^\//,''));
  if(!file.startsWith(root)||!fs.existsSync(file)||!fs.statSync(file).isFile()){await route.fulfill({status:404});return;}
  await route.fulfill({body:fs.readFileSync(file),contentType:mime[path.extname(file)]||'application/octet-stream'});
 });
 const url=new URL(CROP_LESSONS[lesson].page,origin);url.searchParams.set('farmLesson',lesson);url.searchParams.set('class',classId);if(demo)url.searchParams.set('demo','1');else if(f!=='copy')url.searchParams.set('fixture','1');
 const read=()=>page.evaluate(({key,demo})=>{const raw=JSON.parse(localStorage.getItem(key));return demo?raw:raw.state;},{key,demo});
 const draft=()=>page.evaluate(f=>{const key=Object.keys(sessionStorage).find(k=>k.includes(f==='hanzi'?'hanzi.round.':f==='copy'?'copy-name.':'arithmetic.round.'));const raw=JSON.parse(sessionStorage.getItem(key)||'null');return f==='arithmetic'?raw?.value:raw;},f);
 return{context,page,errors,outside,calls,read,draft,url:url.href,setReject:v=>{rejectSave=v;},key,lesson,demo,classId,f};
}

async function write(page,selector,ref){
 const canvas=page.locator(selector).first();await canvas.scrollIntoViewIfNeeded();await page.waitForFunction(selector=>document.querySelector(selector)?.getAttribute('aria-disabled')==='false',selector);const rect=await canvas.boundingBox();
 // Real pointer input goes through the handwriting controller and grading.
 for(const stroke of ref.strokes){
  await page.mouse.move(rect.x+stroke[0][0]*rect.width,rect.y+stroke[0][1]*rect.height);await page.mouse.down();
  for(const [x,y]of stroke.slice(1))await page.mouse.move(rect.x+x*rect.width,rect.y+y*rect.height);
  await page.mouse.up();
 }
}
async function chooseReading(page,q){const answer=splitBopomofo(q.bopomofo);for(const [i,part]of ['initial','rime','tone'].entries()){await page.locator('#answer-slots button').nth(i).click();const label=part==='tone'?({1:'一聲',2:'ˊ',3:'ˇ',4:'ˋ',5:'˙'})[answer[part]]:answer[part]||(part==='initial'?'不用聲符':'不用韻符');await page.locator('#symbol-palette').getByRole('button',{name:label,exact:true}).click();}}
async function typeMath(page,value){await page.locator('[data-key=clear]').click();for(const c of String(value))await page.locator('[data-key="'+c+'"]').click();await page.locator('#submit').click();}
async function nextAnswer(f,{wrong=false}={}){
 const s=await f.draft(),q=f.f==='hanzi'?s.round.questions[s.index]:f.f==='copy'?s.run.snapshot.questions[s.index]:s.run.questions[s.index];
 if(f.f==='arithmetic'){if(wrong)await typeMath(f.page,answer(q)+1);await typeMath(f.page,answer(q));}
 else if(f.lesson==='hanzi-reading'){await chooseReading(f.page,q);await f.page.locator('#submit').click();}
 else{await write(f.page,f.f==='copy'?'#writing canvas':'#handwriting canvas',f.f==='copy'?q.reference:reference(q.character));await f.page.locator('#submit').click();}
 await f.page.locator('#next').waitFor({state:'visible'});await f.page.locator('#next').click();
 await f.page.waitForFunction(({family,index})=>{
  if(document.getElementById('result')?.hidden===false)return true;
  const key=Object.keys(sessionStorage).find(k=>k.includes(family==='hanzi'?'hanzi.round.':family==='copy'?'copy-name.':'arithmetic.round.'));
  const raw=JSON.parse(sessionStorage.getItem(key)||'null'),saved=family==='arithmetic'?raw?.value:raw;
  return saved?.index>index;
 },{family:f.f,index:s.index});
}
async function enter(f){await f.page.goto(f.url);if(f.f==='arithmetic'){await f.page.locator('#entry').waitFor({state:'visible'});await f.page.locator('#count').selectOption('5');await f.page.locator('#start').click();}await f.page.locator(f.f==='copy'?'#practice':'#play').waitFor({state:'visible'});}
function grown(s){return s.life.plots.filter(p=>p.ready).map(p=>p.crop);}
async function finishRound(f,{start=0,wrongAt=-1}={}){const s=await f.draft(),total=f.f==='hanzi'?s.round.questions.length:f.f==='copy'?s.run.snapshot.questions.length:s.run.questions.length;for(let i=start;i<total;i++)await nextAnswer(f,{wrong:i===wrongAt});}

test('six real pages grow only their own crop after saved complete receipts; first answers, iPad layout and resume are preserved',{timeout:180000},async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{for(const lesson of Object.values(LESSON_CROPS).map(c=>c.lesson)){
  const f=await fixture(browser,lesson,{classId:lesson==='name-copy'?'grade2':'main'});
  try{
   await enter(f);assert.deepEqual(grown(await f.read()),[]);assert(await f.page.locator('#farm-learning-return').isHidden(),'farm banner must not cover the writing area');
   await nextAnswer(f,{wrong:lesson==='arithmetic'});
   // Resume does not create another start ticket or erase the first-answer result.
   const starts=f.calls.filter(c=>c.endsWith('/start')||c.endsWith('practice-start')).length;
   await f.page.reload();if(f.f!=='copy')await f.page.locator('#resume').click();await f.page.locator(f.f==='copy'?'#practice':'#play').waitFor({state:'visible'});assert.equal((await f.draft()).index,1);
   assert.equal(f.calls.filter(c=>c.endsWith('/start')||c.endsWith('practice-start')).length,starts);
   f.setReject(true);
   await finishRound(f,{start:1});
   const retry=f.f==='copy'?'#retry':'#retry-save';await f.page.locator(retry).waitFor({state:'visible'});assert.deepEqual(grown(await f.read()),[]);f.setReject(false);await f.page.locator(retry).click();
   await f.page.locator('#farm-result-return').waitFor({state:'visible'});
   const expected=Object.keys(LESSON_CROPS).find(id=>LESSON_CROPS[id].lesson===lesson);assert.deepEqual(grown(await f.read()),[expected]);assert.equal((await f.read()).stars,51);
   const back=new URL(await f.page.locator('#farm-result-return').getAttribute('href'));assert.equal(back.searchParams.get('class'),f.classId);assert.equal(back.searchParams.get('returnFarm'),'1');
   assert(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(f.errors,[]);assert.deepEqual(f.outside,[]);
   if(lesson==='arithmetic')assert.match(await f.page.locator('#result-score').textContent(),/4 \/ 5/);
  }catch(e){console.error('FARM QA',lesson,await f.page.locator('body').innerText(),f.errors,JSON.stringify((await f.draft())?.feedbacks));throw e;}finally{await f.context.close();}
 }}finally{await browser.close();}
});

test('farm save failure survives refresh and retries without another learning submit; explicit teacher demo stays isolated',{timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{for(const demo of [false,true]){
  const f=await fixture(browser,'arithmetic',{demo});
  try{
   await enter(f);await f.page.evaluate(()=>sessionStorage.setItem('fixture-reject-farm','1'));await finishRound(f);
   await f.page.locator('#farm-result-retry').waitFor({state:'visible'});assert.deepEqual(grown(await f.read()),[]);
   const submits=f.calls.filter(c=>c==='/arithmetic/submit').length;
   await f.page.reload();await f.page.locator('#entry').waitFor({state:'visible'});await f.page.locator('#farm-result-retry').waitFor({state:'visible'});assert.deepEqual(grown(await f.read()),[]);
   await f.page.evaluate(()=>sessionStorage.removeItem('fixture-reject-farm'));await f.page.locator('#farm-result-retry').click();
   assert.deepEqual(grown(await f.read()),['pineapple']);assert.equal(f.calls.filter(c=>c==='/arithmetic/submit').length,submits);
   await f.page.reload();await f.page.locator('#entry').waitFor({state:'visible'});assert.deepEqual(grown(await f.read()),['pineapple']);
   assert.equal(await f.page.evaluate(()=>JSON.parse(sessionStorage.getItem('zhuyin.farm-pending-receipts.v1')||'[]').length),0);
   if(demo){assert.equal(f.calls.filter(c=>c.startsWith('/arithmetic/')).length,0);assert.equal(await f.page.evaluate(()=>Object.keys(sessionStorage).some(k=>k.startsWith('zhuyin.student-session.'))),false);assert.equal(await f.page.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('zhuyin.forest.student.'))),false);}
   assert.deepEqual(f.errors,[]);assert.deepEqual(f.outside,[]);
  }catch(e){console.error('FARM RETRY QA',demo,await f.page.locator('body').innerText(),f.errors);throw e;}finally{await f.context.close();}
 }}finally{await browser.close();}
});
