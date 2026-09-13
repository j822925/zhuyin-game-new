import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {samplePage,PAGE_SIZE} from '../teacher-audio.js';
import {startGachaAnimation} from '../gacha-animation.js';
test('teacher catalogue pagination covers every sample without duplicates',()=>{
 const rows=Array.from({length:359},(_,i)=>({id:i,initial:i%2?'ㄅ':'ㄆ'})),seen=[];
 for(let page=0;page<20;page++){const s=samplePage(rows,'',page);assert.ok(s.items.length<=PAGE_SIZE);seen.push(...s.items.map(x=>x.id));}
 assert.equal(new Set(seen).size,359);assert.equal(seen.length,359);
 assert.ok(samplePage(rows,'ㄅ',0).items.every(s=>s.initial==='ㄅ'));
 assert.equal(samplePage(rows,'ㄅ',999).page,9);assert.equal(samplePage([], '',0).pages,1);
});
function element(){const classes=new Set(['reveal-pop']),attrs=new Map();return {classes,attrs,classList:{add:(...v)=>v.forEach(x=>classes.add(x)),remove:(...v)=>v.forEach(x=>classes.delete(x))},setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k),innerHTML:''};}
test('gacha has shake then opening, cleans up and honors reduced motion',async()=>{
 const el=element(),waits=[];const a=startGachaAnimation(el,{reducedMotion:false,now:()=>0,sleep:async ms=>waits.push(ms)});
 assert.ok(el.classes.has('gacha-shaking'));assert.equal(el.attrs.get('aria-busy'),'true');
 await a.open();assert.deepEqual(waits,[1000,380]);assert.ok(el.classes.has('gacha-opening'));a.finish();assert.equal(el.attrs.size,0);assert.equal(el.classes.size,0);
 const b=startGachaAnimation(el,{reducedMotion:true,sleep:()=>assert.fail('reduced motion must not wait')});await b.open();b.finish();
});
test('teacher creates only one player and students cannot select option count',()=>{
 const teacher=readFileSync(new URL('../teacher-audio.js',import.meta.url),'utf8');assert.equal((teacher.match(/createElement\('audio'\)/g)||[]).length,1);
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');assert.match(app,/const choices=4;/);assert.doesNotMatch(app,/id="difficulty"|\$\('difficulty'\)/);
});
