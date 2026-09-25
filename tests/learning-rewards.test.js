import test from 'node:test';import assert from 'node:assert/strict';
import {roundAward,rewardParticipants,competitionStars,cappedRoundAward,taipeiDay} from '../learning-rewards.js';
import {normalizeConfig} from '../core.js';
const round=(mode,mistakes)=>({mode,total:10,mistakes,seat:'15',results:Array.from({length:10},(_,i)=>({firstCorrect:i>=mistakes}))});
test('拼音 4/5/9/10 題門檻、其他關卡與未完成回合不變',()=>{
 for(const [correct,stars] of [[4,0],[5,1],[9,1],[10,3]])assert.equal(rewardParticipants(round('spelling',10-correct))[0].baseStars,stars);
 for(const mode of ['single','compound'])assert.equal(rewardParticipants(round(mode,5))[0].baseStars,0);
 const incomplete=round('spelling',0);incomplete.total=5;incomplete.results=incomplete.results.slice(0,5);assert.deepEqual(rewardParticipants(incomplete),[]);
 assert.equal(cappedRoundAward(0,1,'spelling',{perfectStars:12}).stars,0);
 assert.equal(cappedRoundAward(1,1,'spelling').stars,2);
});
test('不論舊設定是 5 或 20，進關卡一律 10 題',()=>{for(const questions of [5,20,undefined])assert.equal(normalizeConfig({questions}).questions,10);});
test('單音與結合韻全對 2，拼音全對 3、答對至少五題 1',()=>{for(const mode of ['single','compound','spelling']){assert.equal(rewardParticipants(round(mode,0))[0].baseStars,mode==='spelling'?3:2);assert.equal(rewardParticipants(round(mode,1))[0].baseStars,mode==='spelling'?1:0);}});
test('一般三回合給 1，拼音兩回合給 1；不重複套用門檻',()=>{assert.equal(roundAward(0,0).stars,0);assert.equal(roundAward(2,0).stars,1);assert.equal(roundAward(1,0,'spelling').stars,1);assert.equal(roundAward(2,0,'spelling').stars,0);assert.equal(roundAward(1,3,'spelling').stars,4);});
test('比賽勝 2 負 1 平手各 1，未完成不領取',()=>{assert.equal(competitionStars([8,3],0),2);assert.equal(competitionStars([8,3],1),1);assert.equal(competitionStars([5,5],0),1);assert.deepEqual(rewardParticipants({...round('single',0),total:9}),[]);});
test('搶答 10 題的贏家與輸家都有回合獎勵，不按答題數發星',()=>{const r={kind:'race',total:10,seats:['01','15'],results:Array.from({length:10},()=>({winner:0,attempts:[{correct:true},null]}))};assert.deepEqual(rewardParticipants(r),[{seat:'01',baseStars:2},{seat:'15',baseStars:1}]);});
test('前端預覽與每日上限一致，剩餘額度不足時只發剩餘數量',()=>{assert.equal(cappedRoundAward(2,2,'single',{perfectStars:4,perseveranceStars:4}).stars,0);const a=cappedRoundAward(1,3,'spelling',{perfectStars:11,perseveranceStars:4});assert.equal(a.perfectStars,1);assert.equal(a.perseveranceStars,1);assert.equal(a.stars,2);assert.equal(cappedRoundAward(2,2,'single',{perfectStars:4,perseveranceStars:4},true).stars,2);});
test('每日日期固定用台灣時間，不受瀏覽器所在時區影響',()=>{assert.equal(taipeiDay('2026-09-13T15:59:59Z'),'2026-09-13');assert.equal(taipeiDay('2026-09-13T16:00:00Z'),'2026-09-14');});
