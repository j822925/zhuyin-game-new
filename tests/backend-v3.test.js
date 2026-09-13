import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
function backend(){
 let now=Date.parse('2026-09-13T10:00:00+08:00');class Clock extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
 const tables={'班級名冊':[['座號','姓名','在籍'],[1,'學生甲',true],[2,'學生乙',true]],'過關紀錄':[['時間','座號']],'今日任務':[['ㄅ'],['ㄆ']]};
 function sheet(name){if(!tables[name])return null;return {getName:()=>name,getLastRow:()=>tables[name].length,appendRow:r=>tables[name].push(r),setFrozenRows(){},getRange:(row,col,count=1,width=1)=>({getValues:()=>typeof row==='string'?tables[name].slice(1):tables[name].slice(row-1,row-1+count).map(r=>Array.from({length:width},(_,i)=>r[col-1+i]??'')),createTextFinder:id=>({matchEntireCell:()=>({findNext:()=>tables[name].some(r=>r[5]===id)?{}:null})})})};}
 let locked=false;const ctx=vm.createContext({Date:Clock,Math:Object.assign(Object.create(Math),{random:()=>0}),SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:sheet,insertSheet:n=>{tables[n]=[];return sheet(n);}}),flush(){}},ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({text,setMimeType(){return this;}})},Utilities:{getUuid:()=>crypto.randomUUID()},LockService:{getScriptLock:()=>({waitLock(){assert.equal(locked,false);locked=true;},hasLock:()=>locked,releaseLock(){locked=false;}})}});
 vm.runInContext(readFileSync(new URL('../backend/game-api.gs',import.meta.url),'utf8'),ctx);
 ctx.requireRequestAuth_=()=>{}; // Business-rule tests; real auth is tested in auth.test.js.
 return {tables,advance:ms=>now+=ms,get:p=>p.api==='wallet'?ctx.wallet_(String(p.seat).padStart(2,'0')):p.api==='status'?{saved:ctx.findRound_(sheet('過關紀錄'),p.id)||ctx.findRound_(sheet('測試紀錄'),p.id)}:p.api==='draw-status'?{character:tables['角色交易'].find(r=>r[5]===p.id)?.[3]}:JSON.parse(ctx.doGet({parameter:p}).text),post:d=>JSON.parse(ctx.doPost({postData:{contents:JSON.stringify(d)}}).text)};
}
const practice=(seat='01')=>({roundId:crypto.randomUUID(),seat,total:10,mistakes:0,mode:'single',results:Array.from({length:10},()=>({target:'ㄅ',firstCorrect:true,errors:0,seconds:1}))});
test('冒險小隊可抽取、重複得糖果、重送不重扣；可用糖果指定兌換',()=>{
 const b=backend();b.tables['角色交易']=[['時間','座號'],[new Date(),1,'fixture','rabbit',15,'fixture',50,true,'']];
 const draw={kind:'gacha',roundId:crypto.randomUUID(),seat:'01',category:'hero'};
 assert.equal(b.post(draw).character,'swordsman');assert.equal(b.post(draw).duplicateRequest,true);
 assert.equal(b.post({...draw,roundId:crypto.randomUUID()}).duplicate,true);
 let w=b.get({api:'wallet',seat:'01'});assert.equal(w.stars,5);assert.equal(w.candies,51);assert.equal(w.owned.filter(id=>id==='swordsman').length,1);
 const redeem={kind:'redeem',roundId:crypto.randomUUID(),seat:'01',character:'astronaut'};
 assert.equal(b.post(redeem).saved,true);assert.equal(b.post(redeem).duplicateRequest,true);
 w=b.get({api:'wallet',seat:'01'});assert.equal(w.candies,1);assert.ok(w.owned.includes('astronaut'));assert.deepEqual([...w.owned].slice(0,2),['rabbit','fox']);
 assert.equal(b.get({api:'config'}).heroWrites,true);
});
test('小老師延長回合全對仍有三顆星，第二回合毅力一顆，重送不重領',()=>{const b=backend();for(let n=0;n<2;n++){const p=practice();p.mode='spelling';p.total=11;p.results.push({...p.results[0]});p.results[0].tutorUsed=true;p.results[2].tutorReviewOf=1;const out=b.post(p);assert.equal(out.saved,true);assert.equal(out.awards[0].perfectStars,3);assert.equal(out.awards[0].perseveranceStars,n);assert.equal(b.post(p).duplicate,true);}assert.equal(b.get({api:'wallet',seat:'01'}).stars,7);assert.ok(JSON.stringify(b.tables['過關紀錄'][1]).includes('tutorUsed'));});
test('末題求助十二題正常記錄，未完成複習不能領取星星',()=>{const b=backend(),p=practice();p.mode='spelling';p.total=12;p.results.push({...p.results[0],tutorSpacer:true},{...p.results[0],tutorReviewOf:10});p.results[9].tutorUsed=true;assert.equal(b.post(p).awards[0].stars,3);const bad=structuredClone(p);bad.roundId=crypto.randomUUID();bad.results[11].target='ㄆ';assert.equal(b.post(bad).saved,false);});
test('輪流加題不會靠更多正確題數取得比賽優勢',()=>{const b=backend(),a=practice('01'),z=practice('15');a.mode=z.mode='spelling';a.total=11;a.results.push({...a.results[0]});a.results[0].tutorUsed=true;a.results[2].tutorReviewOf=1;const c={kind:'turn',seats:['01','15'],rounds:[a,z].map(({total,mistakes,results})=>({total,mistakes,results}))};a.competition=z.competition=c;assert.equal(b.post(a).awards[0].stars,1);assert.equal(b.post(z).awards[0].stars,1);});
test('拼音明細可保存聲調，仍依十題全對給三顆星',()=>{const b=backend(),p=practice();p.mode='spelling';p.results=p.results.map(r=>({...r,target:'ㄈㄛˊ'}));assert.equal(b.post(p).saved,true);assert.ok(JSON.stringify(b.tables['過關紀錄'][1]).includes('ㄈㄛˊ'));assert.equal(b.get({api:'wallet',seat:'01'}).stars,3);});
test('15 號成績隔離、去重；學生及老師星星各自計算',()=>{const b=backend(),p=practice('15');assert.equal(b.post(p).saved,true);assert.equal(b.post(p).duplicate,true);assert.equal(b.tables['過關紀錄'].length,1);assert.equal(b.tables['測試紀錄'].length,2);assert.equal(b.get({api:'wallet',seat:'15'}).stars,2);assert.equal(b.get({api:'wallet',seat:'01'}).stars,0);assert.equal(b.get({api:'status',id:p.roundId}).saved,true);});
test('搶答分数及獎勵獨立，未搶到不算答錯，不污染練習表',()=>{const b=backend(),p={kind:'race',roundId:crypto.randomUUID(),seats:['01','15'],mode:'single',total:10,results:Array.from({length:10},()=>({target:'ㄅ',winner:0,attempts:[{value:'ㄅ',correct:true},null]}))};assert.equal(b.post(p).saved,true);assert.equal(b.post(p).duplicate,true);assert.equal(b.tables['過關紀錄'].length,1);assert.equal(b.get({api:'wallet',seat:'01'}).stars,2);assert.equal(b.get({api:'wallet',seat:'15'}).stars,1);assert.equal(b.post({...p,roundId:crypto.randomUUID(),results:[{...p.results[0],winner:1}]}).saved,false);});
test('轉蛋重送不重扣，重複加一糖果；不能透支',()=>{const b=backend();for(let i=0;i<2;i++){const p=practice();p.mode='spelling';b.post(p);}const p={kind:'gacha',roundId:crypto.randomUUID(),seat:'01',category:'animal'};assert.equal(b.post(p).duplicate,true);assert.equal(b.post(p).duplicateRequest,true);const w=b.get({api:'wallet',seat:'01'});assert.equal(w.stars,2);assert.equal(w.candies,1);assert.equal(b.get({api:'draw-status',id:p.roundId}).character,'rabbit');assert.equal(b.post({...p,roundId:crypto.randomUUID()}).saved,false);assert.equal(b.tables['角色交易'].length,2);});
test('50 糖果兌換指定角色，49 不可換；重送同一交易不重扣',()=>{const b=backend();b.tables['角色交易']=[['時間','座號'],[new Date(),1,'fixture','rabbit',0,'fixture',49,true,'']];const p={kind:'redeem',roundId:crypto.randomUUID(),seat:'01',character:'moon'};assert.equal(b.post(p).saved,false);b.tables['角色交易'][1][6]=50;assert.equal(b.post(p).saved,true);assert.equal(b.post(p).duplicateRequest,true);const w=b.get({api:'wallet',seat:'01'});assert.equal(w.candies,0);assert.ok(w.owned.includes('moon'));});
const imperfect=(mode='single',seat='01')=>{const p=practice(seat);p.mode=mode;p.mistakes=1;p.results[0]={...p.results[0],firstCorrect:false,errors:1};return p;};
test('提高為 4／4 後保留舊版當日用量；兩次全對、十二回合領滿',()=>{
 const b=backend(),first=practice();b.post(first);
 assert.equal(b.get({api:'wallet',seat:'01'}).dailyRewards.modes.single.perfectStars,2);
 assert.equal(b.post(first).duplicate,true);
 assert.equal(b.post(practice()).awards[0].perfectStars,2);
 for(let i=2;i<12;i++)b.post(imperfect());
 let w=b.get({api:'wallet',seat:'01'});assert.equal(w.stars,8);assert.equal(w.dailyRewards.modes.single.perfectStars,4);assert.equal(w.dailyRewards.modes.single.perseveranceStars,4);
 for(let i=0;i<3;i++)b.post(practice());assert.equal(b.get({api:'wallet',seat:'01'}).stars,8);
 const limits=b.get({api:'config'}).rewardLimits;assert.equal(limits.single.perfectStars,4);assert.equal(limits.single.perseveranceStars,4);assert.equal(limits.spelling.perfectStars,12);assert.equal(limits.spelling.perseveranceStars,5);
});
test('答錯回合 0 星，第三回合 1 星；重送不增加毅力次數',()=>{
 const b=backend();for(let i=0;i<3;i++){const p=imperfect();assert.equal(b.post(p).saved,true);assert.equal(b.post(p).duplicate,true);}
 const w=b.get({api:'wallet',seat:'01'});assert.equal(w.stars,1);assert.equal(w.practiceRounds,3);
});
test('拼音全對 3 星；拼音兩回合 1 毅力星，與其他關卡分開',()=>{
 const b=backend();b.post(imperfect());b.post(imperfect('spelling'));assert.equal(b.get({api:'wallet',seat:'01'}).stars,0);
 b.post(imperfect('spelling'));assert.equal(b.get({api:'wallet',seat:'01'}).stars,1);
 const p=practice();p.mode='spelling';b.post(p);const w=b.get({api:'wallet',seat:'01'});assert.equal(w.stars,4);assert.equal(w.practiceRounds,1);assert.equal(w.spellingRounds,3);
});
test('轮流比賽勝方 2 星、負方 1 星，平手各 1，不疊單人全對',()=>{
 for(const tie of [false,true]){
 const b=backend(),a=practice('01'),z=tie?practice('15'):imperfect('single','15');
 const c={kind:'turn',seats:['01','15'],rounds:[a,z].map(({total,mistakes,results})=>({total,mistakes,results}))};
 a.competition=c;z.competition=c;assert.equal(b.post(a).saved,true);assert.equal(b.post(z).saved,true);
 assert.equal(b.get({api:'wallet',seat:'01'}).stars,tie?1:2);assert.equal(b.get({api:'wallet',seat:'15'}).stars,1);
 assert.equal(b.post({...a,roundId:crypto.randomUUID(),mistakes:2}).saved,false);
 }
});
test('舊版短回合仍能補存但不領新獎勵；新設定固定 10 題',()=>{
 const b=backend(),p=practice();p.total=5;p.results=p.results.slice(0,5);assert.equal(b.post(p).saved,true);
 assert.equal(b.get({api:'wallet',seat:'01'}).stars,0);assert.equal(b.get({api:'wallet',seat:'01'}).practiceRounds,0);assert.equal(b.get({api:'config'}).questions,10);
});
test('一般關卡每日全對 4、毅力 4，超限仍存成績且不因花星重領',()=>{
 const b=backend();for(let i=0;i<18;i++)assert.equal(b.post(practice()).saved,true);
 let w=b.get({api:'wallet',seat:'01'});assert.equal(w.stars,8);assert.equal(w.practiceRounds,18);assert.equal(b.tables['過關紀錄'].length,19);
 assert.equal(w.dailyRewards.modes.single.perfectStars,4);assert.equal(w.dailyRewards.modes.single.perseveranceStars,4);
 b.tables['角色交易']=[['時間','座號'],[new Date(),'01','fixture','rabbit',-8,'fixture',0,false,'']];b.post(practice());assert.equal(b.get({api:'wallet',seat:'01'}).stars,0);
});
test('拼音每日全對 12、毅力 5；學生和各關卡額度互不影響',()=>{
 const b=backend();for(let i=0;i<20;i++){const p=practice();p.mode='spelling';b.post(p);}assert.equal(b.get({api:'wallet',seat:'01'}).stars,17);
 b.post(practice());const c=practice();c.mode='compound';b.post(c);b.post(practice('15'));
 const w=b.get({api:'wallet',seat:'01'});assert.equal(w.dailyRewards.modes.single.perfectStars,2);assert.equal(w.dailyRewards.modes.compound.perfectStars,2);assert.equal(b.get({api:'wallet',seat:'15'}).stars,2);
});
test('台灣午夜重置額度，毅力回合進度保留；跨日重送不再領',()=>{
 const b=backend(),p=practice();const first=b.post(p);b.advance(14*3600000-1);assert.equal(b.post(practice()).awards[0].perfectStars,2);
 b.advance(1);assert.equal(b.post(p).duplicate,true);const out=b.post(practice());assert.equal(out.awards[0].day,'2026-09-14');assert.equal(out.awards[0].perfectStars,2);assert.equal(out.awards[0].perseveranceStars,1);assert.equal(b.get({api:'wallet',seat:'01'}).stars,7);assert.equal(b.post(p).awards[0].day,first.awards[0].day);
});
test('上線前同日舊星星計入額度而不追扣',()=>{
 const b=backend();b.tables['過關紀錄'].push([new Date('2026-09-13T09:00:00+08:00'),'01 學生甲',1,10,0,'old-reward-round-001','single',1,10,'[]',3,'ten-rounds-v1','']);
 for(let i=0;i<6;i++)b.post(practice());assert.equal(b.get({api:'wallet',seat:'01'}).stars,7);
});
test('搶答勝負獎勵不變，但每日毅力封頂且雙方重送不重領',()=>{
 const b=backend();let p;
 for(let i=0;i<12;i++){p={kind:'race',roundId:crypto.randomUUID(),seats:['01','15'],mode:'single',total:10,results:Array.from({length:10},()=>({target:'ㄅ',winner:0,attempts:[{value:'ㄅ',correct:true},null]}))};assert.equal(b.post(p).saved,true);assert.equal(b.post(p).duplicate,true);}
 assert.equal(b.get({api:'wallet',seat:'01'}).stars,28);assert.equal(b.get({api:'wallet',seat:'15'}).stars,16);assert.equal(b.post(p).awards.length,2);assert.equal(b.get({api:'wallet',seat:'01'}).dailyRewards.modes.single.perseveranceStars,4);
});
