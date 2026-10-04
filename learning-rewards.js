import {validLearningRound} from './tutor-rules.js?v=20260928-all1';
export const REWARD_RULE='clear-stars-20261004-v4';
export const dailyLimits=mode=>({perfectStars:mode==='battle'?10:['spelling','reading'].includes(mode)?18:mode==='tone'?0:10,perseveranceStars:0});
export const rewardBucket=(mode,competition=false)=>'clear-v4-'+(competition?'battle':mode==='compound'?'single':mode);
export function dailyAwardMessage(award){return Number.isInteger(award?.dailyRemaining)?award.dailyRemaining===0?'今日星星已領滿，還可以繼續練習！':`今日還可領 ${award.dailyRemaining} 顆星星。`:'';}
export const taipeiDay=(date=new Date())=>new Date(new Date(date).getTime()+8*3600000).toISOString().slice(0,10);
export function cappedRoundAward(completedRounds,baseStars,mode='single',usage={},competition=false){
 const award=roundAward(completedRounds,baseStars,mode),limits=dailyLimits(competition?'battle':mode);
 const used=Math.max(0,Number(usage.spent??usage.perfectStars??0)),requestedStars=Math.max(0,baseStars);
 const stars=Math.min(requestedStars,Math.max(0,limits.perfectStars-used));
 return {...award,baseStars:stars,perfectStars:competition?0:stars,perseveranceStars:0,competitionStars:competition?stars:0,stars,limits,
  rewardRule:REWARD_RULE,requestedStars,dailyUsed:used+stars,dailyLimit:limits.perfectStars,dailyRemaining:Math.max(0,limits.perfectStars-used-stars),dailyCapped:stars<requestedStars};
}
export function competitionStars(scores,index){return scores[0]===scores[1]?1:scores[index]>scores[1-index]?2:1;}
export function roundAward(completedRounds,baseStars,mode='single'){
 const next=(Number.isInteger(completedRounds)&&completedRounds>=0?completedRounds:0)+1;
 return {completedRounds:next,threshold:0,baseStars,perseveranceStars:0,stars:baseStars};
}
export function practiceStars(result){
 const perfect=result.mistakes===0&&result.results.every(r=>r.firstCorrect===true);
 if(perfect)return result.mode==='spelling'?3:2;
 // Count the original ten questions, not added tutor reviews or spacer questions.
 const correct=result.results.filter(r=>r.firstCorrect===true&&!r.tutorReviewOf&&!r.tutorSpacer).length;
 return result.mode==='spelling'?correct>=5?1:0:['single','compound'].includes(result.mode)&&correct>=7?1:0;
}
export function rewardParticipants(result){
 if(result.kind==='race'?(result.total!==10||!Array.isArray(result.results)||result.results.length!==10):!validLearningRound(result))return [];
 if(result.kind==='race'){
  const scores=[0,1].map(i=>result.results.filter(r=>r.winner===i).length);
  return result.seats.map((seat,i)=>({seat,baseStars:competitionStars(scores,i)}));
 }
 if(result.competition?.kind==='turn'){
  const i=result.competition.seats.indexOf(result.seat),scores=result.competition.rounds.map(r=>-r.mistakes);
  return i>=0?[{seat:result.seat,baseStars:competitionStars(scores,i)}]:[];
 }
 return [{seat:result.seat,baseStars:practiceStars(result)}];
}
