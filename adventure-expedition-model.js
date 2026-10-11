import {battleRewardLimit,earnedBattleReward} from './adventure-economy.js';
import {zoneShop} from './data/zone-shops.js';
import {ENEMIES,enemySpec} from './adventure-exploration-model.js';
import {ZONES,zoneById,MINIONS} from './data/adventure-zones.js';
import {RAW_FOOD,RECIPES,spendEnergy,decayEnergy} from './adventure-food-model.js';
const integer=(n,min,max,fallback=min)=>Number.isSafeInteger(n)?Math.max(min,Math.min(max,n)):fallback;
export const playerStats=l=>({hp:40+6*(l-1),attack:10+2*(l-1),defense:3+l-1});
export const monsterXP=l=>8+2*(l-1);
export const nextXP=l=>l>=30?0:monsterXP(l)*(l<=5?4:l<=10?6:l<=15?8:l<=20?10:l<=25?12:16);
// Each guardian offers its regional souvenir; duplicate furniture stays unique.
export const BOSS_GIFT_CHANCE=2/3;
export const bossIsFriend=(state,id)=>!!state.expedition.cards[id]?.wins;
export function enemyStats(z,boss=false){
 const l=z.level,defense=1+Math.floor((l-1)/2)+(boss?1:0),hits=boss?(z.index<3?4:z.index<6?5:6):(z.index===0?2:z.index<6?3:4);
 return {hp:Math.max(1,(playerStats(l).attack-defense)*hits),attack:Math.ceil((8+3*(l-1))*(boss?1.15:1)),defense,level:l,xp:monsterXP(l)*(boss?2:1),stars:battleRewardLimit({mode:z.mode,level:l,boss})};
}
export function freshExpedition(){return {version:1,level:1,xp:0,hp:40,runs:{},cards:{},active:null};}
export function expeditionZone(e){const z=zoneById(e.active);if(z)return z;const r=e.runs[e.active];if(!['local-forest','local-grove'].includes(e.active)||!r?.encounter)return null;const spec=enemySpec(r.encounter);return {...ZONES[0],id:e.active,local:true,minions:1,level:spec.level===2?3:1,mode:spec.mode,name:spec.name};}
export function enterLocalEncounter(state,area,id){
 const spec=ENEMIES.find(m=>m.id===id);if(!spec||!['forest','grove'].includes(area))return false;
 const e=state.expedition,key='local-'+area,old=e.runs[key];
 if(old?.battle&&old.encounter===id){e.active=key;return true;}
 if(!spendEnergy(state,'battle'))return false;
 const z={...ZONES[0],level:spec.level===2?3:1};e.active=key;e.runs[key]={id:key+'-'+Date.now(),encounter:id,monsters:[{art:0,mode:spec.mode,done:false}],complete:false,battle:{slot:0,hp:enemyStats(z).hp,phase:'attack',transformed:false,turn:0,correctAnswers:0,rewardRule:2,question:null}};return true;
}
export function sanitizeExpedition(raw){
 const e=freshExpedition();if(raw?.version!==1)return e;
 e.level=integer(raw.level,1,30,1);e.xp=integer(raw.xp,0,Math.max(0,nextXP(e.level)-1));e.hp=integer(raw.hp,1,playerStats(e.level).hp,playerStats(e.level).hp);
 for(const z of ZONES){
  if(raw.cards?.[z.id])e.cards[z.id]={wins:integer(raw.cards[z.id].wins,1,9999,1)};
  const r=raw.runs?.[z.id];if(!r||!Array.isArray(r.monsters)||![3,4,5].includes(r.monsters.length))continue;
  const run={id:typeof r.id==='string'?r.id.slice(0,80):z.id,visitClosed:r.visitClosed===true,monsters:r.monsters.map((m,i)=>({art:integer(m.art,0,5,i%6),mode:['single','spelling','tone'].includes(m.mode)?m.mode:'single',done:m.done===true})),complete:r.complete===true,battle:null};
  if(r.battle&&!run.complete){const b=r.battle,slot=integer(b.slot,0,run.monsters.length),boss=slot===run.monsters.length,spec=enemyStats(z,boss);if((boss&&run.monsters.every(m=>m.done))||(!boss&&!run.monsters[slot].done))run.battle={slot,hp:integer(b.hp,1,spec.hp,spec.hp),phase:['attack','defend','transform'].includes(b.phase)?b.phase:'attack',transformed:boss&&b.transformed===true,turn:integer(b.turn,0,99999),...(b.rewardRule===2?{rewardRule:2,correctAnswers:integer(b.correctAnswers,0,integer(b.turn,0,99999))}:{}),question:b.question&&typeof b.question==='object'?b.question:null};}
  e.runs[z.id]=run;
 }
 for(const key of ['local-forest','local-grove']){const r=raw.runs?.[key],spec=ENEMIES.find(m=>m.id===r?.encounter);if(!spec||!r?.battle)continue;const b=r.battle,stats=enemyStats({...ZONES[0],level:spec.level===2?3:1});e.runs[key]={id:key,encounter:spec.id,monsters:[{art:0,mode:spec.mode,done:false}],complete:false,battle:{slot:0,hp:integer(b.hp,1,stats.hp,stats.hp),phase:b.phase==='defend'?'defend':'attack',transformed:false,turn:integer(b.turn,0,99999),...(b.rewardRule===2?{rewardRule:2,correctAnswers:integer(b.correctAnswers,0,integer(b.turn,0,99999))}:{}),question:b.question&&typeof b.question==='object'?b.question:null}};}
 e.active=zoneById(raw.active)||e.runs[raw.active]?.encounter?raw.active:null;return e;
}
export function enterExpedition(state,id,rng=Math.random,{restart=false}={}){
 const z=zoneById(id);if(!z)return false;decayEnergy(state.life.nutrition);
 const e=state.expedition;let r=e.runs[id];if(restart||!r||r.complete||r.visitClosed&&!r.battle){r={id:id+'-'+Date.now()+'-'+Math.floor(rng()*1e6),visitClosed:false,monsters:Array.from({length:z.minions},(_,i)=>({art:(z.index+i)%6,mode:i===0?z.mode:['single','spelling','tone'][Math.floor(rng()*3)],done:false})),complete:false,battle:null};e.runs[id]=r;}r.visitClosed=false;e.active=id;return true;
}
// A normal exit ends a visit. An explicitly saved trip or paid battle can resume.
export function leaveExpedition(state,{suspend=false}={}){
 const e=state.expedition,r=e.runs[e.active];if(!zoneById(e.active)||!r)return false;
 r.visitClosed=!suspend&&!r.battle;e.active=null;return true;
}
export function startExpeditionBattle(state,slot){
 const e=state.expedition,z=expeditionZone(e),r=e.runs[e.active];if(!z||!r||r.battle||!Number.isInteger(slot)||slot<0||slot>r.monsters.length)return false;
 const boss=slot===r.monsters.length;if(boss?!r.monsters.every(m=>m.done):r.monsters[slot].done)return false;
 if(r.complete&&(!boss||!bossIsFriend(state,z.id)))return false;
 if(!spendEnergy(state,'battle'))return false;
 const spec=enemyStats(z,boss);r.complete=false;r.battle={slot,hp:spec.hp,phase:'attack',transformed:false,turn:0,correctAnswers:0,rewardRule:2,question:null};return true;
}
export function currentEnemy(state){
 const e=state.expedition,z=expeditionZone(e),r=e.runs[e.active],b=r?.battle;if(!z||!b)return null;const boss=b.slot===r.monsters.length,m=r.monsters[b.slot],stats=enemyStats(z,boss);
 return {...stats,stars:z.local?battleRewardLimit({mode:enemySpec(r.encounter).mode,chief:enemySpec(r.encounter).level===2}):battleRewardLimit({mode:boss?z.mode:m.mode,level:z.level,boss}),boss,name:z.local?enemySpec(r.encounter).name:boss?z.boss:MINIONS[m.art].name,mode:boss?z.mode:m.mode,art:boss?(b.transformed?z.beast:z.human):`assets/expedition/minions-${m.art}.webp`,attack:b.transformed?Math.ceil(stats.attack*1.15):stats.attack,defense:b.transformed?Math.max(0,stats.defense-2):stats.defense};
}
function gainXP(e,amount){e.xp+=amount;while(e.level<30&&e.xp>=nextXP(e.level)){e.xp-=nextXP(e.level);e.level++;e.hp=Math.min(playerStats(e.level).hp,e.hp+6);}if(e.level===30)e.xp=0;}
export function answerExpedition(state,correct,rng=Math.random){
 const e=state.expedition,r=e.runs[e.active],b=r?.battle,spec=currentEnemy(state);if(!b||!spec||b.phase==='transform')return {ok:false};
 const z=expeditionZone(e),stats=playerStats(e.level),result={ok:true,correct,phase:b.phase,damage:0,transformed:false,won:false,lost:false};
 if(b.phase==='attack'){
  result.damage=correct?Math.max(1,stats.attack-spec.defense):0;b.hp=Math.max(0,b.hp-result.damage);
  // A powerful hit still reveals the second form once, without restoring HP.
  if(spec.boss&&!b.transformed&&b.hp<=Math.ceil(spec.hp*.3)){b.hp=Math.max(1,b.hp);b.transformed=true;b.phase='transform';result.transformed=true;}
  else b.phase='defend';
 }else{result.damage=Math.max(1,spec.attack-stats.defense);if(correct)result.damage=Math.ceil(result.damage*.25);e.hp=Math.max(0,e.hp-result.damage);b.phase='attack';}
 b.correctAnswers=(b.correctAnswers||0)+Number(correct);b.turn++;b.question=null;
 if(e.hp<=0){result.lost=true;e.hp=stats.hp;state.life.nutrition.energy=0;delete e.runs[e.active];e.active=null;return result;}
 if(b.hp<=0){result.won=true;result.stars=b.rewardRule===2?earnedBattleReward(spec.stars,b.correctAnswers):spec.stars;result.xp=spec.xp;state.stars+=result.stars;gainXP(e,spec.xp);
  if(spec.boss){r.complete=true;result.newFriend=!bossIsFriend(state,z.id);e.cards[z.id]={wins:Math.min(9999,(e.cards[z.id]?.wins||0)+1)};if(result.newFriend)result.card=z.id;result.friend=z.id;const gift=zoneShop(z.id)?.gift;if(gift&&rng()<BOSS_GIFT_CHANCE){if(state.furnitureOwned.includes(gift))result.giftOwned=gift;else{state.furnitureOwned.push(gift);result.gift=gift;}}}else {r.monsters[b.slot].done=true;if(z.local){r.complete=true;state.wins=Math.min(9999,state.wins+1);}}r.battle=null;}
 return result;
}
export function acknowledgeTransform(state){const b=state.expedition.runs[state.expedition.active]?.battle;if(b?.phase!=='transform')return false;b.phase='defend';return true;}
export function expeditionFood(state,id,cooked=false){
 const e=state.expedition,r=e.runs[e.active],b=r?.battle;if(b&&b.phase!=='attack')return false;
 const food=(cooked?RECIPES:RAW_FOOD)[id],stock=cooked?state.life.nutrition.meals:state.life.harvest,n=state.life.nutrition,max=playerStats(e.level).hp;
 decayEnergy(n);if(!food||!stock[id]||(n.energy>=100&&e.hp>=max))return false;
 stock[id]--;n.energy=Math.min(100,n.energy+food.energy);e.hp=Math.min(max,e.hp+Math.ceil(max*(cooked?.5:.1)));
 if(b){b.phase='defend';b.turn++;b.question=null;}return true;
}
