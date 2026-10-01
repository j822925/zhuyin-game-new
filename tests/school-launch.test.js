import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
function launch(path,{ios=false,standalone=false}={}){
 let moved=null,replaced=null;
 const location={href:new URL(path,'https://example.test/game/').href,replace:u=>moved=u};
 vm.runInNewContext(read('school-launch.js'),{URL,location,navigator:{standalone:ios},matchMedia:()=>({matches:standalone}),history:{replaceState:(_s,_t,u)=>replaced=u}});
 return {moved,replaced};
}
test('old grade2 links become fixed grade2 pages before app startup; preserve all query and hash',()=>{
 const result=launch('./?class=grade2&demo=1#home');
 assert.equal(result.moved,'https://example.test/game/grade2.html?class=grade2&demo=1#home');
 assert.equal(launch('index.html?class=grade2').moved,'https://example.test/game/grade2.html?class=grade2');
 assert.equal(launch('grade2.html?source=homescreen').replaced,'https://example.test/game/grade2.html?source=homescreen&class=grade2');
 assert.equal(launch('grade2.html?class=main').moved,'https://example.test/game/?class=main');
 assert.equal(launch('grade2.html?class=grade2').moved,null);
});
test('ambiguous old home icons choose class; ordinary browser and explicit classes keep behavior',()=>{
 for(const result of [launch('./?source=homescreen'),launch('./',{ios:true}),launch('./',{standalone:true})])assert.match(result.moved,/choose-class.html/);
 for(const path of ['./','./?class=main','./?class=other','./?demo=1','exam.html?class=grade2'])assert.equal(launch(path).moved,null);
 assert.equal(launch('./?class=main',{ios:true}).moved,null);
 assert.equal(launch('./?demo=1',{ios:true}).moved,null);
});
test('each manifest has a class-specific launch URL and keeps its installed identity',()=>{
 for(const [file,cls,id] of [['manifest.webmanifest','main','./'],['manifest-grade2.webmanifest','grade2','./?class=grade2']]){
  const m=JSON.parse(read(file)),url=new URL(m.start_url,'https://example.test/game/');
  assert.equal(url.searchParams.get('class'),cls);assert.equal(m.id,id);
  if(cls==='grade2')assert.equal(url.pathname,'/game/grade2.html');
 }
 const html=read('grade2.html');assert.match(html,/<link rel="manifest" href="manifest-grade2.webmanifest/);
 assert.match(html,/apple-mobile-web-app-title" content="二年級注音"/);
 assert(html.indexOf('school-launch.js')<html.indexOf('game-boot.js'));
 // Both entry pages share exactly the same game boot and stylesheet versions.
 const resources=html=>html.match(/<(?:link rel="stylesheet"|script type="module")[^>]+>/g);
 assert.deepEqual(resources(html),resources(read('index.html')));
});
test('explicit main class survives return-home navigation without changing original session keys',async()=>{
 const before=globalThis.location;try{
  globalThis.location={href:'https://example.test/game/exam.html?class=main'};
  const ctx=await import('../class-context.js?test-explicit-main');
  assert.equal(new URL(ctx.classUrl('./')).searchParams.get('class'),'main');
  assert.equal(ctx.classStorageKey('session'),'session');
 }finally{if(before===undefined)delete globalThis.location;else globalThis.location=before;}
});
