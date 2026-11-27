import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {questionPool} from '../hanzi-bank.js';

const root = path.resolve(import.meta.dirname, '..');
const online = process.env.HANZI_TRACE_LIVE === '1';
const origin = online ? 'https://j822925.github.io/zhuyin-game-new/' : 'http://127.0.0.1:32369/';
let browsers;
try { browsers = createRequire(import.meta.url)('playwright'); }
catch { try { browsers = createRequire(path.join(path.dirname(process.execPath),'../node_modules/playwright/package.json'))('playwright'); } catch {} }
const mime = {'.js':'text/javascript','.css':'text/css','.html':'text/html; charset=utf-8','.json':'application/json','.webp':'image/webp'};
const catalog = JSON.parse(fs.readFileSync(path.join(root,'data/hanzi-curriculum.json'),'utf8'));
const scope = {lessonIds:['1'],termId:catalog.semesterId};
const question = {...questionPool(catalog,scope.lessonIds,'writing',scope)[0],mode:'writing'};
const exam = {id:'trace-exam',title:'試寫',mode:'writing',...scope};
const fixtureReplies = {
  '/hanzi-fixture/session':{seat:'000001',token:'local-test',expires:Date.now()+3600000},
  '/api':{avatar:'rabbit'}, '/hanzi/bootstrap':{catalog,scope},
  '/hanzi/assignments':{assignments:[]}, '/hanzi/exams':{exams:[exam]},
  '/hanzi/notebook':{items:[{mode:'writing',questionId:question.id,question}]},
  '/hanzi/exam-start':{roundId:'test-exam',mode:'writing',questions:[question]},
  '/hanzi/practice-start':{roundId:'test-practice',mode:'writing',questions:[question]}
};

async function routeAssets(route) {
  const request=route.request(), url=new URL(request.url());
  if(!url.href.startsWith(origin))return route.abort();
  if(online)return request.method()==='GET'?route.continue():route.abort();
  if(Object.hasOwn(fixtureReplies,url.pathname))return route.fulfill({json:fixtureReplies[url.pathname]});
  if(request.method()!=='GET')return route.fulfill({status:404,json:{}});
  const file=path.join(root,decodeURIComponent(url.pathname.slice(1)));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({path:file,contentType:mime[path.extname(file)]});
}

const cases = [
  {title:'生字模仿',url:'hanzi-copy.html?demo=1&mode=copy',char:'手'},
  {title:'姓名模仿',url:'hanzi-copy.html?demo=1&mode=name-copy',char:'李'},
  {title:'看注音寫姓名',url:'hanzi-copy.html?demo=1&mode=name-writing',char:'李'},
  {title:'錯題本姓名重練',url:'hanzi-copy.html?demo=1&mode=name-writing&review=子',char:'子'},
  ...['imitate','write'].map(mode=>({title:'上課選字 '+mode,url:'hanzi-classroom.html?demo=1',mode})),
  {title:'看注音寫國字',url:'hanzi.html?demo=1',start:'[data-mode=writing]'},
  ...['name','writing'].map(island=>({title:'島上 '+island,url:'hanzi.html?demo=1',island,char:'手'})),
  ...(online?[]:[
    {title:'國字小考',url:'hanzi.html?fixture=1&from=exams&task=trace-exam',char:question.character},
    {title:'每日任務',url:'hanzi.html?fixture=1&from=daily&mode=writing',char:question.character},
    {title:'錯題本國字重練',url:'hanzi.html?fixture=1&from=notebook&mode=writing&review='+encodeURIComponent(question.id),char:question.character},
  ])
];

async function openIsland(page,mode){
  await page.locator('[data-mode=writing]').first().waitFor();
  await page.evaluate(async mode=>{
    const {createIslandStudy}=await import('./adventure-island-study.js');
    const noOp=()=>{}, state={life:{nutrition:{energy:100,updatedAt:Date.now()}},expedition:{level:1}};
    const study=createIslandStudy({state:()=>state,save:noOp,changed:noOp,stop:noOp,paintHero:noOp,onWon:noOp,
      access:()=>({current:()=>true,load:()=>[{character:'手',prompt:'ㄕㄡˇ'},{character:'上',prompt:'ㄕㄤˋ'}]})});
    const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='adventure-island-study.css';document.head.append(sheet);
    await study.open({id:mode==='name'?'name-bird':'writing-beast',mode,name:'試寫',label:'試寫'});
    const dialog=document.querySelector('.island-study');
    if(!dialog.querySelector('.study-actions'))throw Error(dialog.innerText);
  },mode);
}

async function draw(pad,line) {
  return pad.evaluate((canvas,points)=>{
    const r=canvas.getBoundingClientRect();
    function pointer(type,[x,y]){canvas.dispatchEvent(new PointerEvent(type,{clientX:r.x+x*r.width,clientY:r.y+y*r.height,
      bubbles:true,cancelable:true,isPrimary:true,pointerType:'pen',pointerId:3,button:0,buttons:type==='pointerup'?0:1}));}
    pointer('pointerdown',points[0]);
    for(const point of points.slice(1))pointer('pointermove',point);
    pointer('pointerup',points.at(-1));
  },line);
}

test('每個手寫入口逐筆描寫、保留正確筆畫，回到空白格才可作答', {skip:!browsers},async t=>{
  const safari=process.env.HANZI_TRACE_ENGINE==='webkit';
  const engine=safari?browsers.webkit:browsers.chromium;
  const executablePath=!safari&&process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined;
  const browser=await engine.launch({headless:true,executablePath});t.after(()=>browser.close());
  for(const item of cases)await t.test(item.title,async t=>{
    const context=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:844,height:390}});
    t.after(()=>context.close());
    await context.route('**/*',routeAssets);
    const page=await context.newPage(), errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);
    await page.goto(origin+item.url,{waitUntil:'domcontentloaded'});
    let character=item.char;
    if(item.island)await openIsland(page,item.island);
    else if(item.mode){
      await page.locator('#mode').selectOption(item.mode);
      character=(await page.locator('#character option:checked').innerText()).trim()[0];
      await page.locator('#start').click();
    }else if(item.start)await page.locator(item.start).first().click();
    const toggle=page.getByRole('button',{name:'開啟淡色底字',exact:true});
    await toggle.click();
    const pad=page.locator('.hanzi-handwriting canvas').first();
    if(!character)character=await page.evaluate(()=>{
      const key=Object.keys(sessionStorage).find(k=>k.startsWith('zhuyin.hanzi.round.v1'));
      const round=JSON.parse(sessionStorage.getItem(key));return round.round.questions[round.index].character;
    });
    const folder=item.url.startsWith('hanzi-copy')?'hanzi-copy':'hanzi-strokes';
    const strokes=JSON.parse(fs.readFileSync(path.join(root,'data',folder,'U'+character.codePointAt(0).toString(16).toUpperCase()+'.json'),'utf8')).strokes;
    const note=page.locator(item.island?'.study-note':item.mode||folder==='hanzi-copy'?'#trace-note':'#feedback');
    const submit= item.island?page.getByRole('button',{name:'出招'}):page.locator(item.mode?'#finish':'#submit');
    const blocked=async()=>await submit.isHidden()||await submit.isDisabled();
    assert.ok(await blocked());
    const area=await pad.boundingBox();assert.ok(area.width>=145);
    assert.ok(area.y>=-1&&area.y+area.height<=392,'手寫格應在橫放畫面內 '+JSON.stringify(area));
    const guard=await pad.evaluate(canvas=>{
      const r=canvas.getBoundingClientRect(), before=[scrollX,scrollY,visualViewport.scale];
      const pen={bubbles:true,cancelable:true,isPrimary:true,pointerType:'pen',pointerId:7,clientX:r.x+r.width/2,clientY:r.y+r.height/3};
      canvas.dispatchEvent(new PointerEvent('pointerdown',pen));
      const consumed=['gesturestart','touchmove','contextmenu'].every(type=>!document.body.dispatchEvent(new Event(type,{bubbles:true,cancelable:true})));
      document.body.dispatchEvent(new PointerEvent('pointerup',{...pen,clientX:r.right+15}));
      return {before,after:[scrollX,scrollY,visualViewport.scale],consumed};
    });
    assert.ok(guard.consumed);assert.deepEqual(guard.before,guard.after);
    await draw(pad,[...strokes[0]].reverse());
    assert.match(await note.innerText(),/第 1 筆再描/);
    await draw(pad,strokes[0]);
    if(strokes.length>1){
      await draw(pad,[...strokes[1]].reverse());
      assert.match(await note.innerText(),/第 2 筆再描/);
      for(const stroke of strokes.slice(1))await draw(pad,stroke);
    }
    assert.match(await note.innerText(),/描好了/);
    assert.ok(await blocked());
    await page.getByRole('button',{name:/關閉底字/}).click();
    if(!item.island&&!item.mode)assert.ok(await submit.isDisabled());
    if(item.island||item.mode){await submit.click();assert.ok(await pad.isVisible());}
    for(const stroke of strokes)await draw(pad,stroke);
    assert.ok(!await blocked());
    await submit.click();
    if(item.island)await page.waitForFunction(()=>document.querySelector('.island-study header span')?.textContent.startsWith('2 /'));
    else if(item.mode)await page.locator('#result').waitFor();
    else if(folder==='hanzi-copy')await page.locator('#next').waitFor();
    else assert.match(await note.innerText(),/答對/);
    assert.deepEqual(errors,[]);
  });
});
