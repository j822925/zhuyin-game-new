import {ZONES,zoneById} from './data/adventure-zones.js';
import {enemyStats,playerStats} from './adventure-expedition-model.js';

export const BRIDGE_END={x:3750,y:90}, BRIDGE_RETURN={x:3560,y:152};
export const QUESTS=[
 ['bud','榕樹下的名牌','通梁榕根路','通梁榕樹下還有一籃小苗。你願意幫牠們把名牌掛回去嗎？','reading',[],'榕根下的小苗長出新葉了。'],
 ['sand','蟹腳印和小船','通梁潮灘','小蟹搬來的浮子好像多了一顆。能幫小船把繩子拉直嗎？','math',[],'小船浮正了！小蟹在沙上畫了一個圈。'],
 ['stone','會回音的路石','石岔口','送苗的小怪在岔路迷路了。跟著回音，把路石翻正吧！','echo',['bud'],'三聲回音替送苗的小怪指了路。'],
 ['sail','借風回港','風旗坡','海風起來了，你願意幫我把風旗轉向港口嗎？','spelling',['sand'],'帆索拉緊，第一艘船進了後寮。'],
 ['shell','找回珍珠歌','後寮貝棚','霧吞掉了歌的尾音。可以替我敲響貝鈴嗎？','tone',['sail'],'最後一顆貝鈴響了，小怪也跟著唱。'],
 ['whale','讓夢走回家','夢灣凹地','一隻小鯨在霧裡睡不著。幫我找回牠熟悉的歌。','tone',['stone'],'小鯨睡著了，尾巴朝著瞭望岸。'],
 ['watch','守住安全線','瞭望岸','岸邊有暗礁。請替走得慢的居民插好安全旗。','flags',['whale'],'兩面安全旗立好了，居民排隊走過岸邊。'],
 ['port','為末班船留燈','後寮候船棚','夜霧快來了。陪我替最後一班船點燈吧。','single',['sail'],'岸燈亮了，末班船回了一聲鈴。'],
 ['deep','幻潮裡的回信','白沙會合步道','旗、鈴和燈都準備好了！這次讓你帶最後一隊居民走過來。','guide',['shell','watch','port'],'這條路，你可以帶我走了。海面遠處露出中屯的輪廓。']
].map(([id,name,place,request,mode,requires,ending])=>({id,name,place,request,mode,requires,ending}));
export const STARS=[[25,78],[38,65],[48,54],[55,46]];
export const POS={bud:[34,36],sand:[70,65],stone:[24,24],sail:[79,51],shell:[88,37],whale:[34,16],watch:[47,15],port:[69,26],deep:[56,11]};
export const freshChapter=()=>({version:1,phase:'friends',island:'xiyu',stars:0,quests:{},mail:{stage:'new',letters:0,partner:false},battle:null});
export const allFriends=state=>ZONES.every(({id})=>state.expedition?.cards?.[id]?.wins>0);
export function bridgeEntered(before,after){
 const near=p=>Math.hypot(p.x-BRIDGE_END.x,p.y-BRIDGE_END.y)<62;
 return !near(before)&&near(after)&&(after.x-before.x)*.94-(after.y-before.y)*.34>0;
}
export function questOffer(c,id){
 const q=QUESTS.find(x=>x.id===id);
 return !!q&&c.phase==='clear'&&!c.quests[id]&&q.requires.every(k=>c.quests[k]==='done');
}
export function openRoads(c){
 if(c.phase!=='clear')return [];
 return QUESTS.filter(q=>!q.requires.length||c.quests[q.id]).map(q=>q.id);
}
export function chapterEvent(c,type,id){
 if(type==='accept'&&c.phase==='promise'){c.phase='star';return true;}
 if(type==='cross'&&['star','clear'].includes(c.phase)&&c.island==='xiyu'){c.island='baisha';return true;}
 if(type==='return'&&c.island==='baisha'){c.island='xiyu';return true;}
 if(type==='light'&&c.island==='baisha'&&c.phase==='star'&&id===c.stars+1&&id<=3){c.stars=id;return true;}
 if(type==='quest'&&c.island==='xiyu'&&questOffer(c,id)&&Object.values(c.quests).filter(s=>s!=='done').length<2){c.quests[id]='active';return true;}
 if(type==='deliver'&&c.island==='baisha'&&c.quests[id]==='item'){c.quests[id]='done';return true;}
 return false;
}
export function mailbox(c,action){
 const m=c.mail;
 if(action==='accept'&&m.stage==='new')m.stage='search';
 else if(['leaf','mud'].includes(action)&&m.stage==='search'){
   const bit=action==='leaf'?1:2;if(m.letters&bit)return false;m.letters|=bit;
 }else if(action==='post'&&m.stage==='search'&&m.letters===3)m.stage='sent';
 else if(action==='recruit'&&m.stage==='sent'){m.stage='friend';m.partner=true;}
 else if(action==='toggle'&&m.stage==='friend')m.partner=!m.partner;
 else return false;
 return true;
}
export function prepareSkill(state,b){
 const role=state.companions.active,lv=state.expedition.level;
 if(b.id!=='sand'||b.skillUsed||b.skillReady)return false;
 if(role==='fox'&&lv>=6&&b.goodDefenses>0&&b.turn==='attack')b.skillReady='fox';
 else if(role==='bear'&&lv>=4&&b.goodAttacks>0&&b.turn==='defend')b.skillReady='bear';
 else return false;return true;
}
export function beginChallenge(state,c,id){
 if(c.battle)return c.battle.id===id;
 const valid=id==='empress'?c.island==='xiyu'&&c.phase==='friends'&&allFriends(state):
   c.island==='baisha'&&(id==='fog'?c.phase==='star'&&c.stars===3:c.quests[id]==='active');
 if(!valid)return false;
 const hero=playerStats(state.expedition.level),foe=enemyStats(zoneById('bridge'),true);
 c.battle={id,roundId:crypto.randomUUID(),hp:id==='empress'?foe.hp:id==='fog'?3:id==='sand'?81:1,
   heroHP:id==='empress'?hero.hp:id==='sand'?hero.hp:4,goodAttacks:0,goodDefenses:0,skillReady:'',skillUsed:false,shield:0,turn:'attack',transformed:false,question:null};
 return true;
}
export function answerChallenge(state,c,correct){
 const b=c.battle;if(!b?.question)return null;
 if(!correct&&!['empress','fog'].includes(b.id)){b.question.retried=true;return 'retry';}
 const first=correct&&!b.question.retried;
 b.question=null;
 const hero=playerStats(state.expedition.level),foe=enemyStats(zoneById('bridge'),true);
 if(b.turn==='attack'){
   if(b.id==='sand'&&correct){
     if(first)b.goodAttacks++;
     let amount=Math.min(20,Math.max(16,hero.attack-3));
     if(first&&b.skillReady==='fox'){amount+=12;b.skillUsed=true;b.skillReady='';}
     if(first&&b.goodAttacks===3&&c.mail.partner)amount+=9;
     b.hp-=amount;
   }else if(correct)b.hp-=b.id==='empress'?Math.max(1,hero.attack-foe.defense+(b.transformed?2:0)):1;
   if(b.id==='empress'&&!b.transformed&&b.hp<=Math.ceil(foe.hp*.3)){
     b.hp=Math.max(1,b.hp);b.transformed=true;b.turn='defend';return 'transform';
   }
   if(b.hp<=0){
     if(b.id==='empress')c.phase='promise';
     else if(b.id==='fog')c.phase='clear';else c.quests[b.id]='item';
     c.battle=null;return 'won';
   }
   b.turn='defend';
 }else{
   if(first)b.goodDefenses++;
   if(b.id==='sand'&&first&&b.skillReady==='bear'){b.shield=2;b.skillUsed=true;b.skillReady='';}
   const power=b.id==='sand'?Math.max(1,12-hero.defense-(first&&b.shield>0?6:0)):b.id==='empress'?Math.max(1,Math.ceil(foe.attack*(b.transformed?1.15:1))-hero.defense):1;
   if(b.shield>0)b.shield--;
   b.heroHP-=correct?(['empress','sand'].includes(b.id)?Math.max(1,Math.ceil(power/4)):0):power;
   if(b.heroHP<=0){c.battle=null;return 'lost';}
   b.turn='attack';
 }
 return correct?'hit':'miss';
}
export function cleanChapter(raw){
 const c=freshChapter();if(raw?.version!==1)return c;
 if(['friends','promise','star','clear'].includes(raw.phase))c.phase=raw.phase;
 if(['star','clear'].includes(c.phase)){
   if(raw.island==='baisha')c.island='baisha';
   if(Number.isInteger(raw.stars))c.stars=Math.min(3,Math.max(0,raw.stars));
 }
 for(const q of QUESTS)if(c.phase==='clear'&&['active','item','done'].includes(raw.quests?.[q.id]))c.quests[q.id]=raw.quests[q.id];
 if(['search','sent','friend'].includes(raw.mail?.stage))c.mail={stage:raw.mail.stage,letters:Number.isInteger(raw.mail.letters)?raw.mail.letters&3:0,partner:raw.mail.stage==='friend'&&raw.mail.partner===true};
 const b=raw.battle;
 if(b&&typeof b.roundId==='string'&&b.roundId.length<=80&&Number.isSafeInteger(b.hp)&&b.hp>0&&b.hp<2000&&Number.isSafeInteger(b.heroHP)&&b.heroHP>0&&b.heroHP<1000&&['attack','defend'].includes(b.turn)&&
   (b.id==='empress'&&c.phase==='friends'||b.id==='fog'&&c.phase==='star'&&c.stars===3||c.quests[b.id]==='active')){
   c.battle={id:b.id,roundId:b.roundId,hp:b.hp,heroHP:b.heroHP,turn:b.turn,transformed:b.transformed===true,question:null};
   for(const k of ['goodAttacks','goodDefenses','shield'])c.battle[k]=Number.isSafeInteger(b[k])?Math.max(0,Math.min(1000,b[k])):0;
   c.battle.skillReady=['fox','bear'].includes(b.skillReady)?b.skillReady:'';c.battle.skillUsed=b.skillUsed===true;
   const q=b.question;if(q&&typeof q.prompt==='string'&&q.prompt.length<=240&&Array.isArray(q.choices)&&q.choices.length<=12&&q.choices.every(x=>typeof x==='string'&&x.length<=48)&&q.choices.includes(q.answer)){
     c.battle.question={prompt:q.prompt,choices:q.choices.slice(),answer:q.answer,audio:typeof q.audio==='string'&&q.audio.length<200?q.audio:'',guide:q.guide===true,retried:q.retried===true};
     if(Array.isArray(q.keys))c.battle.question.keys=q.keys.filter(k=>typeof k==='string'&&/^[ㄅ-ㄩ]$/.test(k)).slice(0,20);
     if(typeof q.word==='string')c.battle.question.word=q.word.slice(0,30);
     if(typeof q.hint==='string')c.battle.question.hint=q.hint.slice(0,130);
   }
 }
 return c;
}
