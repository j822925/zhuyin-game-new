import {FREE_SEEDS,SEEDS} from './adventure-exploration-model.js';
import {STARTER_BAIT} from './adventure-bait.js';
import {validLearningRound} from './tutor-rules.js';
import {freshNutrition,sanitizeNutrition,spendEnergy,hasEnergy} from './adventure-food-model.js';
// Local prototype activities use the existing home's wallet and save boundary.
export const ACTIVITY_PRICES={pond:10,farm:10};
export const CROP_LESSONS={single:{name:'聽音辨識',page:'index.html',questions:10},tone:{name:'聲調小劇場',page:'tone.html',questions:10},spelling:{name:'拼音工坊',page:'index.html',questions:10},reading:{name:'朗讀小舞台',page:'reading.html',questions:5}};
export const CROP_ACCURACY=70;
export const CROPS={strawberry:{name:'草莓',icon:'🍓',lesson:'single',art:0,atlas:'extraCrops'},cucumber:{name:'小黃瓜',icon:'🥒',lesson:'spelling',art:1,atlas:'extraCrops'},blueberry:{name:'藍莓',icon:'🫐',lesson:'tone',art:2,atlas:'extraCrops'},lettuce:{name:'萵苣',icon:'🥬',lesson:'reading',art:3,atlas:'extraCrops'},carrot:{name:'紅蘿蔔',icon:'🥕',lesson:'single',art:3},tomato:{name:'小番茄',icon:'🍅',lesson:'spelling',art:4},sunflower:{name:'向日葵',icon:'🌻',lesson:'spelling',art:5},corn:{name:'甜玉米',icon:'🌽',lesson:'single',art:0,atlas:'cooking'},pumpkin:{name:'南瓜',icon:'🎃',lesson:'spelling',art:1,atlas:'cooking'}};
export const FISH={silver:{name:'圓圓鯽魚',color:'#a8c2ba'},gold:{name:'金尾魚',color:'#e6b56e'},star:{name:'星點魚',color:'#a4b0ce'}};
export const FARM_GATE={x:450,y:735};
export const POND_BANK={x:855,y:645};
export const FARM_ENTRY={x:625,y:720};
export const FARM_PLOTS=[355,620,885].flatMap((x,i)=>[{id:i,x,y:418},{id:i+3,x,y:598}]).sort((a,b)=>a.id-b.id);
export const FARM_TREES=[{x:90,y:235,size:240,type:1},{x:175,y:115,size:215,type:2},{x:1110,y:170,size:250,type:1},{x:1180,y:412,size:220,type:2},{x:140,y:650,size:210,type:1},{x:1100,y:765,size:210,type:1}];
export function freshLife(){return {bait:{basic:STARTER_BAIT},baitGiftVersion:1,pondUnlocked:false,farmUnlocked:false,seeds:Object.fromEntries(Object.keys(SEEDS).map(id=>[id,0])),learningOwner:null,plots:Array(6).fill(null),harvest:Object.fromEntries(Object.keys(CROPS).map(id=>[id,0])),fish:{silver:0,gold:0,star:0},fishFound:{silver:0,gold:0,star:0},fishing:null,nutrition:freshNutrition()};}
export function sanitizeLife(raw){const s=freshLife();if(!raw||typeof raw!=='object')return s;s.pondUnlocked=raw.pondUnlocked===true;s.farmUnlocked=raw.farmUnlocked===true;const count=n=>Number.isSafeInteger(n)&&n>=0?Math.min(n,9999):0;
 if(typeof raw.learningOwner==='string'&&raw.learningOwner.length<200)s.learningOwner=raw.learningOwner;
 if(raw.baitGiftVersion===1)s.bait.basic=count(raw.bait?.basic);
 s.nutrition=sanitizeNutrition(raw.nutrition);for(const id of Object.keys(SEEDS))s.seeds[id]=count(raw.seeds?.[id]);
 for(const id of Object.keys(CROPS))s.harvest[id]=count(raw.harvest?.[id]);for(const id of Object.keys(FISH)){s.fish[id]=count(raw.fish?.[id]);s.fishFound[id]=Math.max(s.fish[id],count(raw.fishFound?.[id]));}
 if(s.farmUnlocked)for(let i=0;i<6;i++){const p=raw.plots?.[i];if(!p||!Object.hasOwn(CROPS,p.crop))continue;const watered=p.watered===true||(Number.isFinite(p.readyAt)&&p.readyAt>0);s.plots[i]={crop:p.crop,plantId:typeof p.plantId==='string'&&p.plantId?p.plantId:crypto.randomUUID(),watered,ready:watered&&p.ready===true,...(p.growthSeen===true?{growthSeen:true}:{})};}
 if(s.pondUnlocked&&Object.hasOwn(FISH,raw.fishing?.fish)&&Number.isFinite(raw.fishing.biteAt)&&raw.fishing.biteAt>0)s.fishing={fish:raw.fishing.fish,biteAt:raw.fishing.biteAt};return s;
}
export function unlockActivity(state,id){if(!Object.hasOwn(ACTIVITY_PRICES,id)||!state.life)return false;const key=id+'Unlocked',price=ACTIVITY_PRICES[id];if(state.life[key]||!Number.isInteger(state.stars)||state.stars<price)return false;state.stars-=price;state.life[key]=true;return true;}
export function plotStage(plot){return !plot?'empty':!plot.watered?'seed':plot.ready?'ready':'growing';}
export function plantCrop(state,index,crop){if(!state.life?.farmUnlocked||!Number.isInteger(index)||index<0||index>=6||!Object.hasOwn(CROPS,crop)||state.life.plots[index])return false;if(!FREE_SEEDS.includes(crop)){if(!(state.life.seeds?.[crop]>0))return false;state.life.seeds[crop]--;}state.life.plots[index]={crop,plantId:crypto.randomUUID(),watered:false,ready:false};return true;}
export function waterCrop(state,index){const p=state.life?.plots?.[index];if(!state.life?.farmUnlocked||!Number.isInteger(index)||!p||p.watered)return false;p.watered=true;return true;}
// Snapshot the planted batch at the START of an existing island round.
export function beginFarmRound(state,{owner,mode,roundId,allowClaim=false}){
 if(!state.life?.farmUnlocked||!Object.hasOwn(CROP_LESSONS,mode)||!owner||!roundId)return null;
 if(state.life.learningOwner?state.life.learningOwner!==owner:!allowClaim)return null;
 const plantIds=state.life.plots.filter(p=>plotStage(p)==='growing'&&CROPS[p.crop].lesson===mode).map(p=>p.plantId);
 if(!plantIds.length)return null;state.life.learningOwner=owner;
 return {owner,mode,roundId,plantIds};
}
export function farmRoundScore(result){
 if(!['single','spelling','tone','reading'].includes(result?.mode)||result.kind==='race'||!Array.isArray(result.results)||result.results.length!==result.total||!result.results.every(r=>typeof r?.firstCorrect==='boolean'))return null;
 if(result.mode==='reading'?result.total!==5:!validLearningRound(result))return null;
 const base=result.results.filter(r=>!r.tutorReviewOf&&!r.tutorSpacer);
 if(base.length!==(result.mode==='reading'?5:10))return null;
 return {correct:base.filter(r=>r.firstCorrect).length,total:base.length};
}
export function settleFarmRound(state,ticket,result){
 const score=farmRoundScore(result);
 if(!ticket||!score||state.life?.learningOwner!==ticket.owner||result.roundId!==ticket.roundId||result.mode!==ticket.mode||score.correct*100<score.total*CROP_ACCURACY||!Array.isArray(ticket.plantIds))return 0;
 let grown=0;for(const p of state.life.plots){if(plotStage(p)==='growing'&&CROPS[p.crop].lesson===ticket.mode&&ticket.plantIds.includes(p.plantId)){p.ready=true;grown++;}}return grown;
}
export function harvestCrop(state,index){const p=state.life?.plots?.[index];if(!state.life?.farmUnlocked||!Number.isInteger(index)||plotStage(p)!=='ready')return false;state.life.harvest[p.crop]=Math.min(9999,state.life.harvest[p.crop]+1);state.life.plots[index]=null;return p.crop;}
export function castLine(state,now=Date.now(),rng=Math.random){if(!state.life?.pondUnlocked||state.life.fishing||!(state.life.bait?.basic>0)||!Number.isFinite(now)||now<=0)return false;const n=Math.max(0,Math.min(.999999,Number(rng())||0));if(!Number.isFinite(n)||!spendEnergy(state,'fish'))return false;const fish=n<.5?'silver':n<.85?'gold':'star';state.life.bait.basic--;state.life.fishing={fish,biteAt:now+2500};return true;}
export function reelFish(state,now=Date.now()){const f=state.life?.fishing;if(!state.life?.pondUnlocked||!f||!Number.isFinite(now)||now<f.biteAt)return false;state.life.fish[f.fish]=Math.min(9999,state.life.fish[f.fish]+1);state.life.fishFound[f.fish]=Math.min(9999,state.life.fishFound[f.fish]+1);state.life.fishing=null;return f.fish;}
export function farmWalkable(x,y,padding=13){if(!Number.isFinite(x)||!Number.isFinite(y)||x<35||x>1245||y<70||y>766)return false;if(x>510-padding&&x<765+padding&&y>105-padding&&y<261+padding)return false;
 if(FARM_TREES.some(t=>((x-t.x)/(23+padding))**2+((y-t.y+8)/(17+padding))**2<1))return false;
 return !FARM_PLOTS.some(p=>x>p.x-93-padding&&x<p.x+93+padding&&y>p.y-66-padding&&y<p.y+5+padding);
}

