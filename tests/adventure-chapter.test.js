import test from 'node:test';
import assert from 'node:assert/strict';
import {ZONES} from '../data/adventure-zones.js';
import {openForestSync} from '../adventure-sync.js';
import {freshState,sanitizeState} from '../adventure-model.js';
import {islandWalkable,ISLAND_ROUTES} from '../adventure-exploration-model.js';
import {BRIDGE_END,BRIDGE_RETURN,QUESTS,allFriends,bridgeEntered,openRoads,questOffer,beginChallenge,chapterEvent,answerChallenge,freshChapter,cleanChapter,mailbox,prepareSkill} from '../adventure-chapter-model.js';

const fixture=()=>{const s=freshState();s.expedition.level=30;return s;};
const question={prompt:'選星光',choices:['✦','☀'],answer:'✦',audio:''};
function finish(s,c){let n=0;while(c.battle&&n++<65){c.battle.question={...question};assert.notEqual(answerChallenge(s,c,true),'lost');}assert(!c.battle);return n;}

test('ten distinct friends, bridge end and optional promise',()=>{
 const s=fixture(),c=freshChapter(),base=structuredClone(s);
 assert(!allFriends(s));for(const z of ZONES.slice(0,9))s.expedition.cards[z.id]={wins:12};
 assert(!beginChallenge(s,c,'empress'));s.expedition.cards[ZONES.at(-1).id]={wins:1};
 assert(allFriends(s));assert(!chapterEvent(c,'cross'));assert(beginChallenge(s,c,'empress'));
 finish(s,c);assert.equal(c.phase,'promise');assert(!chapterEvent(c,'cross'));assert(chapterEvent(c,'accept'));
 assert(chapterEvent(c,'cross'));assert(!chapterEvent(c,'cross'));assert.deepEqual(s.expedition.runs,base.expedition.runs);assert.equal(s.stars,base.stars);
 assert(islandWalkable(BRIDGE_RETURN.x,BRIDGE_RETURN.y));assert(islandWalkable(BRIDGE_END.x,BRIDGE_END.y));assert(bridgeEntered(ISLAND_ROUTES[0].at(-2),BRIDGE_END));assert(!bridgeEntered(BRIDGE_END,BRIDGE_RETURN));
});
test('fog, saved question, two independent errands and all nine roads',()=>{
 const s=fixture(),c={...freshChapter(),phase:'star'};chapterEvent(c,'cross');assert.deepEqual(openRoads(c),[]);
 assert(!chapterEvent(c,'light',3));for(const i of [1,2,3])assert(chapterEvent(c,'light',i));assert(beginChallenge(s,c,'fog'));c.battle.question={...question};
 const reload=sanitizeState({...s,chapter:c}).chapter;assert.deepEqual(reload,c);assert.equal(cleanChapter(c).battle.roundId,c.battle.roundId);
 finish(s,c);assert.deepEqual(openRoads(c),['bud','sand']);assert(!beginChallenge(s,c,'fog'));
 assert(!chapterEvent(c,'quest','bud'));assert(chapterEvent(c,'return'));
 for(const id of ['bud','sand'])assert(chapterEvent(c,'quest',id));
 assert(chapterEvent(c,'cross'));
 for(const id of ['sand','bud',...QUESTS.slice(2).map(q=>q.id)]){
   if(!c.quests[id]){assert(chapterEvent(c,'return'));assert(questOffer(c,id));assert(chapterEvent(c,'quest',id));assert(chapterEvent(c,'cross'));}
   assert(beginChallenge(s,c,id));finish(s,c);assert.equal(c.quests[id],'item');
   assert(chapterEvent(c,'deliver',id));assert(!chapterEvent(c,'deliver',id));
 }
 assert.equal(openRoads(c).length,9);assert(chapterEvent(c,'return'));assert(chapterEvent(c,'cross'));assert.equal(cleanChapter(c).quests.deep,'done');
});
test('two devices finishing different errands retain both and the latest wallet',async()=>{
 const base=fixture();base.chapter={...freshChapter(),phase:'clear',island:'baisha',quests:{bud:'item',sand:'item'}};
 const data=new Map(),storage={setItem:(k,v)=>data.set(k,v),getItem:k=>data.get(k),removeItem:k=>data.delete(k)};
 let live={state:structuredClone(base),revision:4,stars:12,enabled:true},rebased=false;
 const send=async req=>{
   if(req.kind==='forest-load')return structuredClone(live);
   if(req.revision!==live.revision)return {error:'forest_conflict'};
   assert.equal(req.delta,0);live={...live,state:structuredClone(req.state),revision:live.revision+1};return structuredClone(live);
 };
 const sync=await openForestSync({send,storage,key:'fixture',fresh:freshState,onRebased:()=>{rebased=true;}});
 const local=sync.state;local.chapter.quests.bud='done';assert(sync.save(local));
 live.state.chapter.quests.sand='done';live.stars=25;live.revision++;
 assert(await sync.flush());assert(rebased);assert.equal(live.state.stars,25);assert.deepEqual(live.state.chapter.quests,{bud:'done',sand:'done'});
});
test('mail collection in either order and fixed skill damage',()=>{
 for(const order of [['leaf','mud'],['mud','leaf']]){const c=freshChapter();assert(mailbox(c,'accept'));for(const id of order){assert(mailbox(c,id));assert(!mailbox(c,id));}
 assert(mailbox(c,'post'));assert(mailbox(c,'recruit'));assert(cleanChapter(c).mail.partner);assert(mailbox(c,'toggle'));assert(!c.mail.partner);}
 for(const [level,partner,skill,count] of [[1,false,false,11],[6,false,true,9],[6,true,true,7],[15,false,false,9],[15,false,true,7],[15,true,true,5]]){
   const s=fixture();s.companions.active='fox';s.expedition.level=level;const c=freshChapter();Object.assign(c,{phase:'clear',island:'baisha',quests:{sand:'active'}});
   if(partner)Object.assign(c.mail,{stage:'friend',partner:true,letters:3});assert(beginChallenge(s,c,'sand'));let n=0;
   while(c.battle&&n++<20){if(skill)prepareSkill(s,c.battle);c.battle.question={...question};answerChallenge(s,c,true);}
   assert.equal(n,count);assert.equal(c.quests.sand,'item');
 }
});
