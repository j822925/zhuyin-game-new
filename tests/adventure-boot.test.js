import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync(new URL('../adventure-boot.js',import.meta.url),'utf8');
function fixture(cls='main'){
 const events={},timers=new Map(),root={pending:true,removeAttribute(){this.pending=false;}},shell={inert:true},link={},retry={hidden:true},p={},cover={hidden:false,querySelector:s=>s==='a'?link:s==='button'?retry:p};let seq=0,reloaded=false;
 const document={documentElement:root,getElementById:()=>cover,querySelector:()=>shell,querySelectorAll:()=>[],addEventListener:(name,fn)=>events[name]=fn};
 vm.runInNewContext(source,{URL,document,location:{href:'https://example.test/adventure-preview.html?class='+cls,reload:()=>reloaded=true},window:{addEventListener:(n,f)=>events[n]=f},setTimeout:f=>{timers.set(++seq,f);return seq;},clearTimeout:i=>timers.delete(i),requestAnimationFrame:f=>f()});
 return {events,timers,root,shell,link,retry,p,cover,get reloaded(){return reloaded;}};
}
test('HTML hides legacy shell before module startup, with no requests or save access',()=>{
 const html=fs.readFileSync(new URL('../adventure-preview.html',import.meta.url),'utf8');assert.match(html,/<html[^>]*data-adventure-boot/);assert.match(html,/\.app-shell\{visibility:hidden/);assert.match(html,/<main class="app-shell" inert>/);assert(!/fetch\(|localStorage|sessionStorage/.test(source));
});
test('only ready removes loading state and unlocks controls',async()=>{const f=fixture();assert(f.root.pending&&f.shell.inert&&!f.cover.hidden);await f.events['adventure-ui-ready']();assert(!f.root.pending&&!f.shell.inert&&f.cover.hidden);assert.equal(f.timers.size,0);});
test('slow load has retry and explicit-class return without exposing old shell',()=>{for(const cls of ['main','grade2']){const f=fixture(cls);[...f.timers.values()][0]();assert.equal(f.retry.hidden,false);assert(f.root.pending&&f.shell.inert);assert.equal(new URL(f.link.href).searchParams.get('class'),cls);f.retry.onclick();assert(f.reloaded);}});
test('blocked entry leaves gameplay hidden while normal login dialog takes over',()=>{const f=fixture();f.events['adventure-ui-blocked']();assert(f.root.pending&&f.shell.inert&&f.cover.hidden);assert.equal(f.timers.size,0);});
