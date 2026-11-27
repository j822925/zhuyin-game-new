import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

let chromium;
try{({chromium}=createRequire(import.meta.url)('playwright'));}
catch{try{({chromium}=createRequire(path.join(path.dirname(process.execPath),'../node_modules/playwright/package.json'))('playwright'));}catch{}}
const chromePath=process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined;
const root=fileURLToPath(new URL('../',import.meta.url));
const types={'.js':'text/javascript','.html':'text/html','.css':'text/css','.webp':'image/webp','.json':'application/json'};
test('classroom displays word order, textbook phonetics and the actual awarded items in landscape', {skip:!chromium || (chromePath&&!fs.existsSync(chromePath))},async t=>{
  const browser=await chromium.launch({headless:true,executablePath:chromePath});t.after(()=>browser.close());
  const page=await browser.newPage({viewport:{width:1024,height:768},hasTouch:true});
  const origin='http://127.0.0.1:32271/';
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let question,reward,completed=false;
  await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.origin+'/'!==origin)return route.abort();
    const file=url.pathname.slice(1);
    if(file.startsWith('hanzi/guided-')){
      if(file.endsWith('-list'))return route.fulfill({json:{plans:[{id:'classroom-test',title:'課堂練習',total:1,position:null}]}});
      return route.fulfill({json:{title:'課堂練習',total:1,position:completed?1:0,revision:0,score:100,completed,reward,question}});
    }
    return route.fulfill({path:path.join(root,file),contentType:types[path.extname(file)]});
  });
  await page.addInitScript(()=>sessionStorage.setItem('zhuyin.student-session.v1:/:live',JSON.stringify({seat:'000001',token:'fixture',expires:Date.now()+600000})));
  const reference=JSON.parse(fs.readFileSync(path.join(root,'data/hanzi-strokes/U5DE6.json'),'utf8'));
  question={mode:'write',character:'左',reading:'ㄗㄨㄛˇ',word:'左手',context:'□手',reference};
  async function open(){
    await page.goto(origin+'guided-practice.html');
    await page.locator('.plan').click();
  }
  const box=selector=>page.locator(selector).boundingBox();
  for(const [width,height] of [[1024,768],[844,390],[667,375]]){
    await page.setViewportSize({width,height});await open();
    const [mark,han,board]=await Promise.all([box('#context .syllable'),box('#context .word-character'),box('#ink canvas:first-child')]);
    assert.ok(mark.y+mark.height<=han.y+1);assert.ok(board.width>=Math.min(210,width*.3) && board.y+board.height<=height+1,JSON.stringify({width,height,board}));
    const glyphs=page.locator('#context .zhuyin-glyph');
    assert.deepEqual(await glyphs.allTextContents(),['ㄗ','ㄨ','ㄛ']);
    const rects=await glyphs.evaluateAll(nodes=>nodes.map(e=>({x:e.offsetLeft,y:e.offsetTop})));
    assert.ok(rects[0].x===rects[2].x && rects[0].y<rects[1].y && rects[1].y<rects[2].y);
    assert.ok((await box('#context .tone')).x>(await glyphs.first().boundingBox()).x);
    if(process.env.GUIDED_SCREENSHOTS)await page.screenshot({path:path.join(process.env.GUIDED_SCREENSHOTS,'question-'+width+'.png')});
  }
  await page.locator('#trace').click();
  const ink=page.locator('#ink canvas').first(),area=await ink.boundingBox();
  async function draw(line){
    const x=p=>area.x+area.width*p[0],y=p=>area.y+area.height*p[1];
    await page.mouse.move(x(line[0]),y(line[0]));await page.mouse.down();
    for(const point of line.slice(1))await page.mouse.move(x(point),y(point));
    await page.mouse.up();
  }
  const strokes=reference.strokes;
  await draw([...strokes[0]].reverse());
  assert.match(await page.locator('#notice').innerText(),/第 1 筆再描/);
  await draw(strokes[1]);
  assert.match(await page.locator('#notice').innerText(),/第 1 筆再描/);
  await draw(strokes[0]);
  assert.match(await page.locator('#notice').innerText(),/接著描第 2/);
  await draw([[.01,.01],[.08,.01]]);
  assert.match(await page.locator('#notice').innerText(),/第 2 筆再描/);
  assert.equal(await page.locator('#submit').isHidden(),true);
  if(process.env.GUIDED_SCREENSHOTS)await page.screenshot({path:path.join(process.env.GUIDED_SCREENSHOTS,'trace-retry.png')});
  for(const line of strokes.slice(1))await draw(line);
  assert.match(await page.locator('#notice').innerText(),/描好了/);
  assert.equal(await page.locator('#score').innerText(),'目前可得 100 分');
  await page.locator('#trace').click();await page.locator('#submit').click();
  assert.match(await page.locator('#notice').innerText(),/先自己寫/);
  question={...question,word:'向左',context:'向□'};await open();
  assert.ok((await box('#context .word-character')).y<(await box('#context .syllable')).y);
  const repeated=await page.evaluate(async()=>{
    const {writingPrompt}=await import('./guided-prompt.js');
    return [...writingPrompt({word:'人人',context:'人□',character:'人',reading:'ㄖㄣˊ'}).children].map(e=>e.className);
  });
  assert.equal(repeated[0],'word-character');assert.match(repeated[1],/syllable/);
  question={mode:'read',character:'手',reading:'ㄕㄡˇ'};await open();
  for(const value of ['ㄕ','ㄡ','˙'])await page.locator('.keys').getByRole('button',{name:value,exact:true}).click();
  assert.ok((await box('output .neutral')).y<(await box('output .zhuyin-glyph:first-child')).y);
  const meals={id:'classmeal-berry-crescent',kind:'meal',name:'藍莓月牙鬆餅',energy:70};
  const decor={id:'classdecor-pencil-stool',kind:'furniture',name:'鉛筆小木凳'};
  completed=true;
  for(const items of [[meals],[meals,decor]]){
    reward={items};await open();
    await page.waitForFunction(n=>document.querySelectorAll('#reward-pictures canvas').length===n,items.length);
    const boxes=await Promise.all(items.map(item=>box('canvas[aria-label="'+item.name+'"]')));
    const rect=boxes[0],last=boxes.at(-1);
    assert.ok(rect.width>115 && rect.height>115);
    assert.ok(Math.abs((rect.x+last.x+last.width)/2-667/2)<5);
    assert.ok(rect.y+rect.height<=375 && Math.abs(rect.y+rect.height/2-375/2)<55);
    if(process.env.GUIDED_SCREENSHOTS)await page.screenshot({path:path.join(process.env.GUIDED_SCREENSHOTS,'rewards-'+items.length+'.png')});
  }
  for(const item of [{id:'daisy-stool',name:'雛菊圓凳',kind:'furniture'},{id:'soup',name:'蔬菜暖湯',kind:'meal'}]){
    reward=item;await open();await page.locator('canvas[aria-label="'+item.name+'"]').waitFor();
  }
  reward=null;await open();assert.equal(await page.locator('#reward-pictures').isHidden(),true);
  assert.deepEqual(errors,[]);
});
