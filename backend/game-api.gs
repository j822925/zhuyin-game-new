// 保留其他總覽函式，以此檔替換原 doGet / doPost。無公開姓名。
function jsonResponse_(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
function getRoster_(){const s=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('班級名冊');const roster=s?s.getRange('A2:C101').getValues().filter(r=>r[0]!==''&&r[1]!==''&&r[2]===true).map(r=>({id:String(r[0]).padStart(2,'0'),name:String(r[1])})):[];return roster.filter(r=>r.id!=='15').concat([{id:'15',name:'老師測試',test:true}]);}
function readTasks_(){const s=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('今日任務');return s.getRange(1,1,Math.max(1,s.getLastRow()),1).getValues().flat().map(String).map(s=>s.trim().replace(/一/g,'ㄧ')).filter(Boolean);}
function findRound_(s,id){return !!(s&&id&&s.getLastRow()>1&&s.getRange(2,6,s.getLastRow()-1,1).createTextFinder(id).matchEntireCell(true).findNext());}
function doGet(e){
 const p=e&&e.parameter||{},ss=SpreadsheetApp.getActiveSpreadsheet();
 if(p.api==='config'){const s=ss.getSheetByName('遊戲設定'),v=s?s.getRange('B2:B3').getValues().flat():[10,false],c=ss.getSheetByName('已教結合韻');return jsonResponse_({version:4,tutorWrites:true,heroWrites:true,dailyCaps:true,rewardLimits:{single:dailyRewardLimits_('single'),compound:dailyRewardLimits_('compound'),spelling:dailyRewardLimits_('spelling')},authRequired:true,raceWrites:true,rewardsWrites:true,symbols:readTasks_(),compounds:c?c.getRange('A2:A100').getValues().flat().filter(String):[],seats:getRoster_().map(r=>r.id),questions:10,spellingApproved:v[1]===true});}
 if(p.api)return jsonResponse_({error:'authentication_required'});
 return jsonResponse_(readTasks_());
}
function doPost(e){
 let lock;
 try{
  if(!e||!e.postData||e.postData.contents.length>40000)throw new Error('invalid_payload');
  const d=JSON.parse(e.postData.contents);
  if(d.kind==='login')return jsonResponse_(loginStudent_(d));
  if(d.kind==='query')return jsonResponse_(authenticatedQuery_(d));
  requireRequestAuth_(d);
  if(d.kind==='race')return saveRace_(d);
  if(d.kind==='gacha'||d.kind==='redeem')return transactCharacter_(d);
  const m=String(d.seat||'').match(/^(\d{1,3})(?:\s|$)/),student=m&&getRoster_().find(r=>r.id===m[1].padStart(2,'0'));
  if(!student)throw new Error('unknown_student');
  if(!Number.isInteger(d.total)||d.total<1||d.total>(d.mode==='spelling'?80:40)||!Number.isInteger(d.mistakes)||d.mistakes<0||d.mistakes>d.total)throw new Error('invalid_score');
  const id=d.roundId||'legacy-'+Utilities.getUuid(),mode=d.mode||'single';
  if(!/^[a-zA-Z0-9-]{16,80}$/.test(id)||!['single','compound','spelling'].includes(mode))throw new Error('invalid_id_or_mode');
  if(d.roundId&&(!Array.isArray(d.results)||d.results.length!==d.total||d.results.some(r=>typeof r.firstCorrect!=='boolean')||d.results.filter(r=>!r.firstCorrect).length!==d.mistakes))throw new Error('incomplete_round');
  const eligible=validLearningRound_(d);
  if(d.results?.some(r=>r.tutorUsed||r.tutorReviewOf||r.tutorSpacer)&&!eligible)throw new Error('invalid_tutor_round');
  const contestStars=d.competition?turnCompetitionStars_(d,student.id):null;
  lock=LockService.getScriptLock();lock.waitLock(15000);
  const s=student.test?ensureSheet_('測試紀錄',['時間','座號','挑戰次數','總題數','答錯題數','回合編號','關卡','耗時秒','首次答對題數','答題明細','學習星星','獎勵規則','輪流比賽明細','每日獎勵明細']):SpreadsheetApp.getActiveSpreadsheet().getSheetByName('過關紀錄');
  if(findRound_(s,id))return jsonResponse_({saved:true,id:id,duplicate:true,awards:savedAwards_(s,id,false)});
  const at=new Date(),award=d.roundId&&eligible?dailyLearningAward_(student.id,contestStars===null?(mode==='spelling'?(d.mistakes===0?3:0):(d.mistakes===0?2:0)):contestStars,mode,contestStars!==null,at):null;
  const detail=(d.results||[]).map(r=>({target:String(r.target||'').slice(0,8),firstCorrect:r.firstCorrect,errors:Math.max(0,Math.min(999,Number(r.errors)||0)),seconds:Math.max(0,Math.min(3600,Number(r.seconds)||0)),...(r.tutorUsed?{tutorUsed:true}:{}),...(r.tutorReviewOf?{tutorReviewOf:r.tutorReviewOf}:{}),...(r.tutorSpacer?{tutorSpacer:true}:{})}));
  s.appendRow([at,student.id+' '+student.name,Number.isInteger(d.attempt)?Math.max(1,d.attempt):1,d.total,d.mistakes,id,mode,Math.max(0,Math.min(86400,Number(d.seconds)||0)),d.total-d.mistakes,JSON.stringify(detail),award?award.stars:0,d.roundId&&eligible?REWARD_RULE_:'',d.competition?JSON.stringify(d.competition):'',award?JSON.stringify(award):'' ]);
  SpreadsheetApp.flush();return jsonResponse_({saved:true,id:id,awards:award?[award]:[]});
 }catch(error){return jsonResponse_({saved:false,error:String(error.message||'save_failed')});}
 finally{if(lock&&lock.hasLock())lock.releaseLock();}
}
// Shared by demo rewards and the server (the server copy is parity-tested).
function validLearningRound_(d){
 if(!Array.isArray(d.results)||d.results.length!==d.total)return false;
 const rows=d.results,hasTutor=rows.some(r=>r.tutorUsed||r.tutorReviewOf||r.tutorSpacer);
 if(!hasTutor)return d.total===10;
 if(d.mode!=='spelling'||d.kind==='race'||d.total<11||d.total>80)return false;
 let uses=0,reviews=0,spacers=0;
 for(let i=0;i<rows.length;i++){
  const r=rows[i];
  if(r.tutorUsed!==undefined&&r.tutorUsed!==true)return false;
  if(r.tutorSpacer!==undefined&&r.tutorSpacer!==true)return false;
  if(r.tutorUsed){uses++;if(rows.filter(x=>x.tutorReviewOf===i+1).length!==1)return false;}
  if(r.tutorReviewOf!==undefined){
   reviews++;const source=r.tutorReviewOf-1;
   if(!Number.isInteger(source)||source<0||![2,3].includes(i-source)||!rows[source]?.tutorUsed||rows[source].target!==r.target||r.tutorSpacer)return false;
  }
  if(r.tutorSpacer){spacers++;if(!rows[i-1]?.tutorUsed||rows[i+1]?.tutorReviewOf!==i)return false;}
 }
 return uses===reviews&&d.total===10+reviews+spacers;
}
function validId_(id){return typeof id==='string'&&/^[a-zA-Z0-9-]{16,80}$/.test(id);}
function ensureSheet_(name,headers){const ss=SpreadsheetApp.getActiveSpreadsheet();let s=ss.getSheetByName(name);if(!s){s=ss.insertSheet(name);s.appendRow(headers);s.setFrozenRows(1);}return s;}
function dataRows_(name,columns){const s=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);return s&&s.getLastRow()>1?s.getRange(2,1,s.getLastRow()-1,columns).getValues():[];}
// BEGIN GENERATED CHARACTER CATALOG
const CHARACTER_CATALOG_ = [{"id":"rabbit","category":"animal","starter":true,"enabled":true},{"id":"fox","category":"animal","starter":true,"enabled":true},{"id":"panda","category":"animal","starter":false,"enabled":true},{"id":"cat","category":"animal","starter":false,"enabled":true},{"id":"bear","category":"animal","starter":false,"enabled":true},{"id":"koala","category":"animal","starter":false,"enabled":true},{"id":"frog","category":"animal","starter":false,"enabled":true},{"id":"penguin","category":"animal","starter":false,"enabled":true},{"id":"lion","category":"animal","starter":false,"enabled":true},{"id":"owl","category":"animal","starter":false,"enabled":true},{"id":"rose","category":"fairy","starter":false,"enabled":true},{"id":"moon","category":"fairy","starter":false,"enabled":true},{"id":"sea","category":"fairy","starter":false,"enabled":true},{"id":"forest","category":"fairy","starter":false,"enabled":true},{"id":"sun","category":"fairy","starter":false,"enabled":true},{"id":"snow","category":"fairy","starter":false,"enabled":true},{"id":"rainbow","category":"fairy","starter":false,"enabled":true},{"id":"berry","category":"fairy","starter":false,"enabled":true},{"id":"star","category":"fairy","starter":false,"enabled":true},{"id":"lavender","category":"fairy","starter":false,"enabled":true},{"id":"swordsman","category":"hero","starter":false,"enabled":true},{"id":"astronaut","category":"hero","starter":false,"enabled":true},{"id":"footballer","category":"hero","starter":false,"enabled":true},{"id":"ninja","category":"hero","starter":false,"enabled":true},{"id":"mecha","category":"hero","starter":false,"enabled":true},{"id":"racer","category":"hero","starter":false,"enabled":true},{"id":"dragon-knight","category":"hero","starter":false,"enabled":true},{"id":"ocean-explorer","category":"hero","starter":false,"enabled":true},{"id":"firefighter","category":"hero","starter":false,"enabled":true},{"id":"lightning-pilot","category":"hero","starter":false,"enabled":true}];
function allCharacters_(){return CHARACTER_CATALOG_.map(c=>c.id);}
function starterCharacters_(){return CHARACTER_CATALOG_.filter(c=>c.starter).map(c=>c.id);}
function characterPool_(category){return CHARACTER_CATALOG_.filter(c=>c.category===category&&c.enabled).map(c=>c.id);}
// END GENERATED CHARACTER CATALOG
const REWARD_RULE_='daily-caps-v2';
function isLearningRule_(value){return value===REWARD_RULE_||value==='ten-rounds-v1';}
function rewardDay_(date){const time=new Date(date).getTime();return Number.isFinite(time)?new Date(time+8*3600000).toISOString().slice(0,10):'';}
function dailyRewardLimits_(mode){return {perfectStars:mode==='spelling'?12:4,perseveranceStars:mode==='spelling'?5:4};}
function dailyRewardUsage_(seat,mode,at){
 const day=rewardDay_(at),usage={perfectStars:0,perseveranceStars:0};
 function add(raw,total,base,competition){let award;try{award=JSON.parse(raw);}catch{}if(award&&award.day===day){usage.perfectStars+=Number(award.perfectStars)||0;usage.perseveranceStars+=Number(award.perseveranceStars)||0;}else{if(!competition)usage.perfectStars+=Math.min(total,base);usage.perseveranceStars+=Math.max(0,total-base);}}
 for(const name of ['過關紀錄','測試紀錄'])for(const r of dataRows_(name,14)){
  if(!isLearningRule_(r[11])||rewardDay_(r[0])!==day||r[6]!==mode||String(r[1]).split(' ')[0].padStart(2,'0')!==seat)continue;
  let base=Number(r[4])===0?(mode==='spelling'?3:2):0;const competition=!!r[12];
  if(competition){try{const c=JSON.parse(r[12]);base=competitionStars_(c.rounds.map(v=>v.total-v.mistakes),c.seats.indexOf(seat));}catch{base=Number(r[10])||0;}}
  add(r[13],Number(r[10])||0,base,competition);
 }
 for(const r of dataRows_('搶答紀錄',17)){
  if(!isLearningRule_(r[12])||rewardDay_(r[0])!==day||r[6]!==mode)continue;
  for(let i=0;i<2;i++)if(String(r[1+i]).padStart(2,'0')===seat)add(r[15+i],Number(r[10+i])||0,competitionStars_([Number(r[3]),Number(r[4])],i),true);
 }
 return usage;
}
function dailyLearningAward_(seat,baseStars,mode,competition,at){
 const usage=dailyRewardUsage_(seat,mode,at),limits=dailyRewardLimits_(mode);
 const perfectStars=competition?0:Math.min(baseStars,Math.max(0,limits.perfectStars-usage.perfectStars));
 const perseveranceStars=(completedLearningRounds_(seat,mode)+1)%(mode==='spelling'?2:3)===0?Math.min(1,Math.max(0,limits.perseveranceStars-usage.perseveranceStars)):0;
 const competitionStars=competition?baseStars:0;
 return {seat,day:rewardDay_(at),perfectStars,perseveranceStars,competitionStars,stars:perfectStars+perseveranceStars+competitionStars,limits};
}
function savedAwards_(sheet,id,race){const r=dataRows_(sheet.getName(),race?17:14).find(r=>r[5]===id);if(!r)return [];return (race?[r[15],r[16]]:[r[13]]).flatMap(raw=>{try{return [JSON.parse(raw)];}catch{return [];}});}
function completedLearningRounds_(seat,mode){
 let count=0;
 for(const name of ['過關紀錄','測試紀錄'])for(const r of dataRows_(name,12))if(isLearningRule_(r[11])&&(mode===undefined||(r[6]==='spelling')===(mode==='spelling'))&&String(r[1]).split(' ')[0].padStart(2,'0')===seat)count++;
 for(const r of dataRows_('搶答紀錄',15))if(isLearningRule_(r[12])&&(mode===undefined||(r[6]==='spelling')===(mode==='spelling')))for(let i=0;i<2;i++)if(String(r[1+i]).padStart(2,'0')===seat&&r[13+i]===true)count++;
 return count;
}

function competitionStars_(scores,i){return scores[0]===scores[1]?1:scores[i]>scores[1-i]?2:1;}
function turnCompetitionStars_(d,seat){
 const c=d.competition;
 if(c.kind!=='turn'||!Array.isArray(c.seats)||c.seats.length!==2||c.seats[0]===c.seats[1]||!c.seats.every(id=>getRoster_().some(r=>r.id===id))||!Array.isArray(c.rounds)||c.rounds.length!==2)throw new Error('invalid_turn_competition');
 const i=c.seats.indexOf(seat);if(i<0)throw new Error('invalid_turn_competition');
 const scores=c.rounds.map(r=>{if(!validLearningRound_({...r,mode:d.mode})||!Number.isInteger(r.mistakes)||!Array.isArray(r.results)||r.results.length!==r.total||r.results.some(a=>typeof a.firstCorrect!=='boolean')||r.results.filter(a=>!a.firstCorrect).length!==r.mistakes)throw new Error('incomplete_turn_competition');return -r.mistakes;});
 if(c.rounds[i].mistakes!==d.mistakes||c.rounds[i].total!==d.total||JSON.stringify(c.rounds[i].results)!==JSON.stringify(d.results))throw new Error('mismatched_turn_competition');
 return competitionStars_(scores,i);
}
function wallet_(seat){
 let stars=0,candies=0;const owned=starterCharacters_();
 for(const name of ['過關紀錄','測試紀錄'])for(const row of dataRows_(name,11)){if(String(row[1]).split(' ')[0].padStart(2,'0')===seat)stars+=Number(row[10])||0;}
 for(const row of dataRows_('搶答紀錄',12)){if(String(row[1]).padStart(2,'0')===seat)stars+=Number(row[10])||0;if(String(row[2]).padStart(2,'0')===seat)stars+=Number(row[11])||0;}
 for(const row of dataRows_('角色交易',9)){if(String(row[1]).padStart(2,'0')!==seat)continue;stars+=Number(row[4])||0;candies+=Number(row[6])||0;if(allCharacters_().includes(row[3])&&!owned.includes(row[3]))owned.push(row[3]);}
 return {stars,candies,owned,dailyRewards:{day:rewardDay_(new Date()),modes:Object.fromEntries(['single','compound','spelling'].map(mode=>[mode,{...dailyRewardUsage_(seat,mode,new Date()),limits:dailyRewardLimits_(mode)}]))},practiceRounds:completedLearningRounds_(seat,'single'),spellingRounds:completedLearningRounds_(seat,'spelling')};
}
function saveRace_(d){
 if(!validId_(d.roundId)||!Array.isArray(d.seats)||d.seats.length!==2||d.seats[0]===d.seats[1]||!d.seats.every(id=>getRoster_().some(r=>r.id===id)))throw new Error('invalid_race_players');
 if(!['single','compound','spelling'].includes(d.mode)||!Number.isInteger(d.total)||d.total<1||d.total>20||!Array.isArray(d.results)||d.results.length!==d.total)throw new Error('incomplete_race');
 const scores=[0,0],attemptCounts=[0,0];
 const details=d.results.map(r=>{
  if(!r||typeof r.target!=='string'||!/^[ㄅ-ㄩ]{1,4}$/.test(r.target)||!Array.isArray(r.attempts)||r.attempts.length!==2)throw new Error('invalid_race_answer');
  const correct=[];const attempts=r.attempts.map((a,i)=>{if(a===null)return null;if(!a||typeof a.value!=='string'||!/^[ㄅ-ㄩ]{1,4}$/.test(a.value)||typeof a.correct!=='boolean'||a.correct!==(a.value===r.target))throw new Error('invalid_race_answer');attemptCounts[i]++;if(a.correct)correct.push(i);return {value:a.value,correct:a.correct};});
  if(correct.length>1||(correct.length===1?r.winner!==correct[0]:r.winner!==null||attempts.some(a=>a===null)))throw new Error('invalid_race_winner');
  if(correct.length)scores[correct[0]]++;return {target:r.target,winner:r.winner,attempts,seconds:Math.max(0,Math.min(3600,Number(r.seconds)||0))};
 });
 const lock=LockService.getScriptLock();lock.waitLock(15000);try{const s=ensureSheet_('搶答紀錄',['時間','左方座號','右方座號','左方分數','右方分數','回合編號','關卡','題數','耗時秒','答題明細','左方星星','右方星星','獎勵規則','左方計次','右方計次','左方每日獎勵','右方每日獎勵']);if(findRound_(s,d.roundId))return jsonResponse_({saved:true,duplicate:true,awards:savedAwards_(s,d.roundId,true)});const at=new Date(),awards=d.total===10?d.seats.map((seat,i)=>dailyLearningAward_(seat,competitionStars_(scores,i),d.mode,true,at)):[];s.appendRow([at,...d.seats,...scores,d.roundId,d.mode,d.total,Math.max(0,Math.min(86400,Number(d.seconds)||0)),JSON.stringify(details),...d.seats.map((seat,i)=>awards[i]?.stars||0),d.total===10?REWARD_RULE_:'',...attemptCounts.map(()=>d.total===10),...d.seats.map((seat,i)=>awards[i]?JSON.stringify(awards[i]):'')]);SpreadsheetApp.flush();return jsonResponse_({saved:true,awards});}finally{lock.releaseLock();}
}
function transactCharacter_(d){
 if(!validId_(d.roundId)||!getRoster_().some(r=>r.id===d.seat))throw new Error('invalid_character_request');
 const lock=LockService.getScriptLock();lock.waitLock(15000);try{
  const s=ensureSheet_('角色交易',['時間','座號','交易種類','角色','星星變動','交易編號','糖果變動','重複角色','角色池']);
  if(findRound_(s,d.roundId))return jsonResponse_({saved:true,duplicateRequest:true});
  const wallet=wallet_(d.seat);let character,stars=0,candies=0,duplicate=false;
  if(d.kind==='gacha'){
   if(!['animal','fairy','hero'].includes(d.category)||wallet.stars<5)throw new Error('insufficient_stars');
   const pool=characterPool_(d.category);if(!pool.length)throw new Error('empty_pool');character=pool[Math.floor(Math.random()*pool.length)];stars=-5;duplicate=wallet.owned.includes(character);candies=duplicate?1:0;
  }else{
   if(!allCharacters_().includes(d.character)||wallet.owned.includes(d.character)||wallet.candies<50)throw new Error('cannot_redeem');character=d.character;candies=-50;
  }
  s.appendRow([new Date(),d.seat,d.kind,character,stars,d.roundId,candies,duplicate,d.category||'']);SpreadsheetApp.flush();return jsonResponse_({saved:true,character,duplicate});
 }finally{lock.releaseLock();}
}
function setupGameSettings(){
 const ss=SpreadsheetApp.getActiveSpreadsheet();let s=ss.getSheetByName('遊戲設定');
 if(!s){s=ss.insertSheet('遊戲設定');s.getRange('A1:C3').setValues([['設定','值','說明'],['每回合題數',10,'固定每回合 10 題；雙人輪流每人各 10 題。'],['拼音示範音已確認',false,'44 個合成音先在試聽頁確認，再勾選開放拼音關卡。目前只提供第一聲。']]);s.getRange('B2').setDataValidation(SpreadsheetApp.newDataValidation().requireFormulaSatisfied('=AND(ISNUMBER(B2),B2=INT(B2),B2=10)').setAllowInvalid(false).build());s.getRange('B3').insertCheckboxes();s.setColumnWidth(1,190);s.setColumnWidth(2,100);s.setColumnWidth(3,600);s.getRange('A1:C1').setBackground('#164e63').setFontColor('white').setFontWeight('bold');s.setFrozenRows(1);}
 if(!ss.getSheetByName('已教結合韻')){s=ss.insertSheet('已教結合韻');s.getRange('A1:B2').setValues([['已教結合韻','說明'],['','A2 起，一列填一個完整結合韻，例如 ㄧㄠ。只有填入的結合韻才會出題。']]);s.setColumnWidth(1,180);s.setColumnWidth(2,650);s.setFrozenRows(1);}
 s=ss.getSheetByName('過關紀錄');if(s.getRange('F1:J1').isBlank())s.getRange('F1:J1').setValues([['回合編號','關卡','耗時秒','首次答對題數','答題明細']]);
 const settings=ss.getSheetByName('遊戲設定');settings.getRange('B2').setValue(10);settings.getRange('C2').setValue('固定每回合 10 題；雙人輪流每人 10 題、搶答共 10 題。');settings.getRange('B2').setDataValidation(SpreadsheetApp.newDataValidation().requireFormulaSatisfied('=B2=10').setAllowInvalid(false).build());
 for(const name of ['過關紀錄','測試紀錄']){const sheet=ss.getSheetByName(name);if(sheet)for(const [i,title] of ['學習星星','獎勵規則','輪流比賽明細','每日獎勵明細'].entries()){const cell=sheet.getRange(1,11+i);if(cell.isBlank())cell.setValue(title);}}
 const raceSheet=ss.getSheetByName('搶答紀錄');if(raceSheet)for(const [i,title] of ['獎勵規則','左方計次','右方計次','左方每日獎勵','右方每日獎勵'].entries()){const cell=raceSheet.getRange(1,13+i);if(cell.isBlank())cell.setValue(title);}
 const summary=ss.getSheetByName('每日任務總覽');if(summary)summary.getRange('B3').setValue('注音探險島：任一關卡');
 console.log('遊戲設定已完成；原遊戲介面仍相容。');
}
