import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,findPath,sanitizeState} from '../adventure-model.js';
import {ISLAND_ENTRY,ISLAND_WORLD,islandWalkable} from '../adventure-exploration-model.js';
import {STUDY_BEASTS,beastPosition,hitStudyBeast} from '../adventure-island-actors.js';
import {questionsFor,studyReward,settleStudy} from '../adventure-island-study.js';
import {battleRewardLimit} from '../adventure-economy.js';
import {answer} from '../arithmetic-core.js';
const item={id:'one',lessonId:'open',enabled:true,character:'一',examples:[{word:'一一',targetIndex:0,readings:['ㄧ','ㄧ']}]};
const catalog={lessons:[{id:'open',termId:'t'},{id:'closed',termId:'t'}],items:[item,{...item,id:'two',lessonId:'closed'}]};
test('four original-island encounters have reachable routes and distinct hit targets',()=>{
 assert.equal(new Set(STUDY_BEASTS.map(b=>b.mode)).size,4);
 for(const b of STUDY_BEASTS){for(const t of [0,1,3,20]){const p=beastPosition(b,t);
 assert.ok(islandWalkable(p.x,p.y));assert.ok(findPath(ISLAND_ENTRY,{x:p.x,y:p.y+24},islandWalkable,ISLAND_WORLD));
 assert.equal(hitStudyBeast({x:p.x,y:p.y-36},t)?.id,b.id);
 assert.equal(hitStudyBeast({x:p.x,y:p.y-36},t,new Set([b.id])),undefined);}}
});
test('uses opened lessons, term and existing handwriting references',()=>{
 const data={catalog,scope:{lessonIds:['open'],termId:'t'},writingReadyItemIds:['one']};
 assert.deepEqual(questionsFor('reading',data).map(q=>q.itemId),['one','one','one']);
 assert.equal(questionsFor('writing',data)[0].prompt,'ㄧ　□□');
 assert.deepEqual(questionsFor('writing',{...data,writingReadyItemIds:[]}),[]);
 assert.deepEqual(questionsFor('reading',{...data,scope:{}}),[]);
});
test('name questions select only personal writable entries in order',()=>{
 const row={id:'name:0',character:'一',reading:'ㄧ',canWrite:true},next={...row,id:'name:1',character:'二',reading:'ㄦˋ'};
 const wrap=items=>({groups:[{items}]});
 assert.deepEqual(questionsFor('name',wrap([{...row,id:'lesson:one'},row,next])).map(q=>q.character),['一','二']);
 assert.deepEqual(questionsFor('name',wrap([row,{...next,canWrite:false}])),[]);
 assert.deepEqual(questionsFor('name',wrap([])),[]);
});
test('math respects teacher scope, stays within ten and permits zero',()=>{
 const scope={enabled:true,levels:[10],operations:['sub'],skills:['basic']};let zero=false;
 for(let i=0;i<100;i++)for(const {q} of questionsFor('math',{scope})){assert.equal(q.op,'sub');assert.ok(answer(q)>=0&&q.a<=10&&q.b<=10);if(q.b===0||answer(q)===0)zero=true;}assert.ok(zero);
 for(const s of [{...scope,enabled:false},{...scope,levels:[18]},{...scope,skills:[]}])assert.deepEqual(questionsFor('math',{scope:s}),[]);
});
test('one additional coin, transactional retry and persistent duplicate protection',()=>{
 for(const level of [1,10,24]){const s=freshState(),stars=s.stars,energy=s.life.nutrition.energy;s.expedition.level=level;
 const expected=battleRewardLimit({mode:'spelling',level})+1;
 assert.equal(studyReward(level),expected);assert.equal(settleStudy(s,'island-test',()=>false),false);
 assert.deepEqual([s.stars,s.wins,s.life.nutrition.energy,s.settled.length],[stars,0,energy,0]);
 assert.ok(settleStudy(s,'island-test',()=>true));const loaded=sanitizeState(s);
 assert.ok(settleStudy(loaded,'island-test',()=>assert.fail('second grant')));
 assert.deepEqual([loaded.stars,loaded.wins],[stars+expected,1]);}
});