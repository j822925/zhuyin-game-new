import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {SOCIAL_OUTFITS} from '../data/social-motions.js';
import {SOCIAL_ACTIONS,cleanSocialEvent,createSocialSession,socialFrame,canPair,socialPlacement} from '../social-motion-model.js';
import {socialOutfit} from '../social-motion-art.js';
function party(){
 let time=1000,seq=0;const ids=['990001','990002','990003'],sessions=new Map(),poses=new Map(ids.map((id,i)=>[id,{room:'room',x:500+i*50,y:600,moving:false}])),prompts=new Map(),queue=[];
 for(const seat of ids)sessions.set(seat,createSocialSession({seat,getPose:()=>poses.get(seat),getPeers:()=>new Map([...poses].filter(([id])=>id!==seat)),send:event=>queue.push({from:seat,event}),onPrompt:p=>prompts.set(seat,p),now:()=>time,makeId:()=>String(++seq)}));
 const flush=()=>{let max=50;while(queue.length&&max--){const {from,event}=queue.shift();for(const [seat,s]of sessions)if(seat!==from)s.receive(from,event);}assert.ok(max>0);};
 return {sessions,poses,prompts,queue,flush,advance:n=>{time+=n;for(const s of sessions.values())s.tick();}};
}
test('all 12 current outfits have all four registered animations and lean transparent WebP files',()=>{
 assert.equal(SOCIAL_OUTFITS.length,12);for(const character of ['rabbit','fox','bear'])assert.equal(SOCIAL_OUTFITS.filter(o=>o.character===character).length,4);
 let total=0;for(const o of SOCIAL_OUTFITS){const b=fs.readFileSync(new URL('../'+o.image,import.meta.url));assert.equal(b.toString('ascii',8,12),'WEBP');assert.ok(b.length<300000);assert.ok(o.bodyHeight>=220);assert.equal(o.facing,'right');total+=b.length;for(const action of Object.keys(SOCIAL_ACTIONS)){const f=socialFrame(action,500);assert.ok(f.row<4&&f.column<3);}assert.equal(socialOutfit(o.character,o.id),o);}
 assert.ok(total<3e6);assert.equal(socialOutfit('fox','daisy'),null);
});
test('unknown, malformed and wrong solo/pair packets cannot animate players',()=>{
 for(const value of [null,[],{},'hi',{v:1,type:'solo',id:'1',action:'hug',room:'room'},{v:1,type:'start',id:'1',action:'kiss',room:'room'}])assert.equal(cleanSocialEvent(value),null);
 assert.deepEqual(cleanSocialEvent({v:1,type:'solo',id:'1',action:'wave',room:'room',secret:'ignored'}),{v:1,type:'solo',id:'1',action:'wave',room:'room',target:''});
});
test('wave is immediate, visible to peers, finite and rate limited',()=>{
 const p=party(),a=p.sessions.get('990001');assert.ok(a.perform('wave'));assert.equal(a.perform('kiss'),false);p.flush();for(const s of p.sessions.values())assert.equal(s.motions.get('990001').action,'wave');p.advance(3000);for(const s of p.sessions.values())assert.equal(s.motions.size,0);
});
test('wave and kiss retain their selected nearby target on every peer',()=>{
 for(const action of ['wave','kiss']){const p=party(),a=p.sessions.get('990001');assert.ok(a.perform(action,'990002'));p.flush();for(const s of p.sessions.values())assert.equal(s.motions.get('990001').target,'990002');assert.equal(p.sessions.get('990002').motions.has('990002'),false);}
 const p=party();p.sessions.get('990002').receive('990001',{v:1,type:'solo',id:'fake',action:'kiss',room:'room',target:'990099'});assert.equal(p.sessions.get('990002').motions.size,0);
});
test('hug faces spatially inward even when the right player invites, without changing positions',()=>{
 const p=party(),a=p.sessions.get('990002'),b=p.sessions.get('990001');a.perform('hug','990001');p.flush();b.answer(true);p.flush();const before=structuredClone([...p.poses]);
 for(const s of p.sessions.values()){const left=socialPlacement(p.poses.get('990001'),p.poses.get('990002'),s.motions.get('990001'),2300),right=socialPlacement(p.poses.get('990002'),p.poses.get('990001'),s.motions.get('990002'),2300);assert.equal(left.facing,1);assert.equal(right.facing,-1);assert.ok(left.x<right.x);}
 assert.deepEqual([...p.poses],before);
 const m={action:'hug',room:'room',started:1000,side:-1},point={x:500,y:600,room:'room'};assert.equal(socialPlacement(point,point,m,2000).facing,1);assert.equal(socialPlacement(point,point,{...m,side:1},2000).facing,-1);assert.equal(socialPlacement(point,{...point,x:580},m,2000,116,true).x,500);
});
test('hug requires acceptance then both actors and observer see the pair; movement ends it',()=>{
 const p=party(),a=p.sessions.get('990001'),b=p.sessions.get('990002');a.perform('hug','990002');p.flush();assert.equal(a.motions.size,0);assert.equal(b.motions.size,0);assert.equal(p.prompts.get('990002').action,'hug');
 b.answer(true);p.flush();for(const s of p.sessions.values()){assert.equal(s.motions.size,2);assert.equal(s.motions.get('990002').action,'hug');}
 p.poses.get('990002').moving=true;p.advance(400);p.flush();for(const s of p.sessions.values())assert.equal(s.motions.size,0);
});
test('declining, cancelling and timeout leave neither player locked',()=>{
 for(const mode of ['decline','cancel','timeout']){const p=party(),a=p.sessions.get('990001'),b=p.sessions.get('990002');a.perform('dance','990002');p.flush();if(mode==='decline')b.answer(false);if(mode==='cancel')a.cancel();if(mode==='timeout')p.advance(31000);p.flush();assert.equal(p.prompts.get('990001'),null);assert.equal(p.prompts.get('990002'),null);for(const s of p.sessions.values())assert.equal(s.motions.size,0);}
});
test('different rooms, moving and distant players cannot pair; unsolicited start never moves recipient',()=>{
 const p=party(),a=p.sessions.get('990001'),b=p.sessions.get('990002');p.poses.get('990002').room='bedroom';assert.equal(a.perform('hug','990002'),false);assert.equal(canPair(p.poses.get('990001'),{...p.poses.get('990001'),x:900}),false);
 b.receive('990001',{v:1,type:'start',action:'hug',id:'fake',room:'room',target:'990002'});assert.equal(b.motions.size,0);
});
test('leaving a room or losing the partner cancels pair and pending invitations',()=>{
 const p=party(),a=p.sessions.get('990001'),b=p.sessions.get('990002');a.perform('dance','990002');p.flush();b.answer(true);p.flush();p.poses.get('990001').room='forest';p.advance(100);p.flush();assert.equal(b.motions.size,0);p.advance(5000);p.poses.get('990001').room='room';a.perform('hug','990002');p.flush();b.depart('990001');assert.equal(p.prompts.get('990002'),null);
});
test('reduced motion uses stable key pose; every animation ends, including invalid clocks',()=>{
 for(const [id,a]of Object.entries(SOCIAL_ACTIONS)){assert.equal(socialFrame(id,-1),null);assert.equal(socialFrame(id,a.duration),null);assert.deepEqual(socialFrame(id,50,true).column,socialFrame(id,1800,true).column);}
});
