import assert from 'node:assert/strict';import {createRequire} from 'node:module';import fs from 'node:fs';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/j8229/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.argv[2],out=process.argv[3];const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{const rows=[];for(const entrance of ['', 'grade2.html'])for(const mode of ['single','spelling']){
 const p=await browser.newPage({viewport:{width:1024,height:768}});await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await p.addInitScript(()=>{HTMLMediaElement.prototype.play=function(){return Promise.resolve();};HTMLMediaElement.prototype.pause=function(){};});
 await p.goto(base+entrance+'?demo=1');await p.locator('#seat option[value="01"]').waitFor({state:'attached'});await p.selectOption('#seat','01');await p.locator('#pin-dialog').waitFor({state:'visible'});for(const n of '1234')await p.locator(`[data-pin="${n}"]`).click();await p.locator('#pin-dialog').waitFor({state:'hidden'});await p.locator(`[data-mode="${mode}"]`).click();await p.waitForSelector('#player-turn canvas[data-ready]');
 for(const [width,height] of [[1000,750],[1024,768],[1180,820],[1200,800],[1366,900],[820,1180],[768,1024],[390,844]]){await p.setViewportSize({width,height});await p.waitForTimeout(100);
  const data=await p.evaluate(()=>{const selectors=['#game','#game .question-card','#game #player-turn','#game .playing-character','#game .turn-banner','#game .animal-face','#game .character-motion','#game .motion-canvas','#game .practice-opponent','#game .opponent-art','#spelling','#spelling .tiles','#spelling .slots'];return Object.fromEntries(selectors.map(s=>{const el=document.querySelector(s);if(!el||!el.getClientRects().length)return[s,null];const r=el.getBoundingClientRect(),css=getComputedStyle(el);return[s,{x:r.x,y:r.y,width:r.width,height:r.height,display:css.display,columns:css.gridTemplateColumns,overflow:css.overflow}];}).concat([['scrollWidth',document.documentElement.scrollWidth],['innerWidth',innerWidth]]));});rows.push({entrance,mode,width,height,...data});
  assert(data.scrollWidth<=width,'Horizontal overflow');
  const question=data['#game .question-card'],hero=data['#game .playing-character'];
  assert(question.x+question.width<=width+1,'Answer panel exceeds viewport');
  if(width>=1000&&width<=1200)assert(hero.width>=220,'Tablet hero squeezed below 220 px');
  if(width>=700&&width<=999)assert(hero.height>=240,'Portrait tablet hero too short');
  if(mode==='spelling'){
   const targets=await p.locator('#spelling .tile,#spelling .slot').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));
   for(const t of targets){assert(t.width>=44&&t.height>=44,'Touch target too small');assert(t.x>=question.x-1&&t.x+t.width<=question.x+question.width+1,'Tile overlaps character');}
  }

  if(width===1024&&out&&!entrance)await p.screenshot({path:out+'-'+mode+'.png',fullPage:true});
 }await p.close();}
 if(out)fs.writeFileSync(out+'.json',JSON.stringify(rows,null,2));console.log(JSON.stringify({entrances:2,layouts:rows.length,noOverflow:true,tabletHeroMinimumWidth:220,touchTargetsMinimum:44,physicalIPadTested:false}));
}finally{await browser.close();}
