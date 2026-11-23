import {encounterDeck,challengeChoices,expectedAnswer,TONES} from './adventure-encounters.js';
import {studentAccess} from './adventure-island-study.js';
import {answer as mathAnswer,hint as mathHint} from './arithmetic-core.js';
import {QUESTS} from './adventure-chapter-model.js';

const story={
 echo:['石牌依序響起「低、低、高」。哪一面石牌要最後翻？',['低','高'],'高'],
 flags:['慢走的居民看見紅旗，現在應該怎麼做？',['停在岸上','向前跑'],'停在岸上'],
 guide:['船燈亮了，安全旗也插好了。帶大家走哪裡？',['兩面旗之間','礁石外面'],'兩面旗之間']
};
export function guidedQuestion(){
 const signs=['✦','☾','☀'];
 const chosen=signs[Math.floor(Math.random()*signs.length)];
 return {prompt:'跟引路星做一次。點亮「'+chosen+'」。',choices:signs,answer:chosen,audio:'',guide:true};
}
export async function nextQuestion(id,signal){
 const mode=id==='empress'?'tone':id==='fog'?'single':QUESTS.find(q=>q.id===id)?.mode;
 if(story[mode]){
   const [prompt,choices,answer]=story[mode];return {prompt,choices,answer,audio:''};
 }
 if(mode==='reading'||mode==='math'){
   const access=studentAccess(),items=await access.load(mode,signal);if(!access.current())throw Error('session_changed');
   if(!items.length)return guidedQuestion();
   const q=items[0];
   if(mode==='math')return {prompt:q.prompt,hint:mathHint(q.q),answer:String(mathAnswer(q.q)),choices:Array.from({length:11},(_,i)=>String(i)),audio:''};
   const answer=q.bopomofo;
   const alternatives=[...new Set(items.map(s=>s.bopomofo).filter(s=>s!==answer))];
   if(!alternatives.length){const stem=answer.replace(/[ˊˇˋ˙]/g,'');for(const mark of ['','ˊ','ˇ','ˋ'])if(stem+mark!==answer)alternatives.push(stem+mark);}
   const choices=[answer,...alternatives.slice(0,3)].sort((a,b)=>a.localeCompare(b,'zh-Hant'));
   return {prompt:'替「'+q.word+'」裡的「'+q.character+'」拼出讀音。',word:q.word,keys:[...new Set(choices.join('').replace(/[ˊˇˋ˙]/g,'')+'ㄅㄆㄧㄡ')].slice(0,16),choices,answer,audio:''};
 }
 const {deck,pool}=await encounterDeck({mode,level:2,hp:1}),q=deck[0];
 if(mode==='tone')return {prompt:'聽「'+q.label+'」，「'+q.targetCharacter+'」是第幾聲？',answer:String(q.tone),choices:TONES.map(x=>x.value.toString()),audio:q.audio};
 const round={deck,pool,spec:{mode,level:2},index:0};
 if(mode==='spelling')round.part='final';
 return {prompt:mode==='spelling'?'聽聽看，選出後面的韻。':'聽聽看，是哪個注音？',choices:challengeChoices(round).map(x=>x.value),answer:expectedAnswer(round),audio:q.audio};
}
