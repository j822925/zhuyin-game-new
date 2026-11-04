import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createBrowserPreview} from '../annual-challenge-browser-preview.js';
const bank=JSON.parse(await readFile(new URL('../tone-questions.json',import.meta.url),'utf8'));
const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};};
let sequence=0;const uuid=()=>`browser-test-${++sequence}`,award={score:17,stamp:'read-cat',signature:[[[.1,.2],[.5,.6]]],note:'預演'};
test('browser-only preview starts without HTTP and persists the child across reload, excluding teacher grants',async()=>{
 const storage=memory(),tabStorage=memory(),options={bank,storage,tabStorage,uuid,year:2026};let adapter=createBrowserPreview(options);
 const child=await adapter.request('login',null,{role:'student',classId:'main',seat:'990001'});let card=await adapter.request('card?year=2026&seat=990001',child.token);assert.equal(card.mode,'rehearsal');
 const grant=await adapter.request('unlock',child.token,{year:2026,mode:'rehearsal',station:'read'});
 await adapter.request('command',grant.token,{year:2026,mode:'rehearsal',seat:'990001',station:'read',type:'start',revision:0,requestId:uuid()});
 adapter=createBrowserPreview(options);card=await adapter.request('card?year=2026&seat=990001',child.token);assert.equal(card.attempts.read.revision,1);
 await assert.rejects(adapter.request('card?year=2026&seat=990001',grant.token),/重新登入/);
 await adapter.request('command',child.token,{year:2026,mode:'rehearsal',seat:'990001',station:'read',type:'draw',revision:1,requestId:uuid()});
 const renewed=await adapter.request('unlock',child.token,{year:2026,mode:'rehearsal',station:'read'});await adapter.request('command',renewed.token,{year:2026,mode:'rehearsal',seat:'990001',station:'read',type:'award',revision:2,requestId:uuid(),award});
 await adapter.request('lock',renewed.token,{});assert.equal((await adapter.request('card?year=2026&seat=990001',child.token)).attempts.read.award.score,17);
 const org=await adapter.request('login',null,{role:'organizer',classId:'main'});card=await adapter.request('card?year=2026&seat=990001',org.token);
 await adapter.request('configure',org.token,{year:2026,revision:card.event.revision,mode:'official',enabled:true});assert.deepEqual((await adapter.request('card?year=2026&seat=990001',child.token)).attempts,{});
});
test('blocked browser storage does not leave startup pending or lose in-page writes',async()=>{
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}},adapter=createBrowserPreview({bank,storage:blocked,tabStorage:blocked,uuid,year:2026});
 const child=await adapter.request('login',null,{role:'student',classId:'main',seat:'990002'});const card=await adapter.request('card?year=2026&seat=990002',child.token);assert.equal(card.event.enabled,true);assert.equal(adapter.persistent,false);
 const grant=await adapter.request('unlock',child.token,{year:2026,mode:card.mode,station:'read'});await adapter.request('command',grant.token,{year:2026,mode:card.mode,seat:'990002',station:'read',type:'start',revision:0,requestId:uuid()});
 assert.equal((await adapter.request('card?year=2026&seat=990002',child.token)).attempts.read.revision,1);
});
const bootstrap=await readFile(new URL('../annual-challenge-bootstrap.js',import.meta.url),'utf8');
function bootFixture(standalone){
 const handlers=new Map(),app={children:[],textContent:'正在準備闖關卡…',append(...items){this.children.push(...items);}},document={documentElement:{dataset:{annualStandalone:standalone?'1':''}},getElementById:()=>app,createElement:()=>({children:[],append(...items){this.children.push(...items);}})};let timer;
 vm.runInNewContext(bootstrap,{URL,location:{protocol:'file:',href:'file:///C:/project/.local/annual/annual-challenge.html'},document,window:{addEventListener:(name,fn)=>handlers.set(name,fn)},setTimeout:fn=>{timer=fn;return 1;},clearTimeout(){}});
 return {app,handlers,timeout:()=>timer()};
}
test('opening the old HTML directly gives a working single-file link instead of a permanent spinner',()=>{const {app}=bootFixture(false);assert.equal(app.textContent,'');const section=app.children[0];assert.equal(section.children[0].textContent,'請開啟新版單檔試玩');assert.match(decodeURI(section.children.at(-1).href),/注音闖關單檔試玩.html$/);});
test('startup timeout shows recovery, and a ready page is never replaced by the timeout',()=>{const first=bootFixture(true);first.timeout();assert.equal(first.app.children.length,1);const ready=bootFixture(true);ready.handlers.get('annual-ready')();ready.timeout();assert.equal(ready.app.children.length,0);});
test('built review contains inline scripts and stamps with no external script/module/style requirement',async()=>{const html=await readFile(new URL('../../../output/annual-challenge-20261103/注音闖關單檔試玩.html',import.meta.url),'utf8');assert.doesNotMatch(html,/<script[^>]+src=/);assert.doesNotMatch(html,/<link[^>]+stylesheet/);const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,2);for(const [,source]of scripts)new vm.Script(source);assert.equal((html.match(/data:image\/webp;base64,/g)||[]).length,5);});
