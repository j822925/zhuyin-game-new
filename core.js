export const BASE = Array.from('ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦㄧㄨㄩ');
export const COMPOUNDS = ['ㄧㄚ','ㄧㄛ','ㄧㄝ','ㄧㄞ','ㄧㄠ','ㄧㄡ','ㄧㄢ','ㄧㄣ','ㄧㄤ','ㄧㄥ','ㄨㄚ','ㄨㄛ','ㄨㄞ','ㄨㄟ','ㄨㄢ','ㄨㄣ','ㄨㄤ','ㄨㄥ','ㄩㄝ','ㄩㄢ','ㄩㄣ','ㄩㄥ'];
export const normalize = value => String(value ?? '').trim().replaceAll('一','ㄧ');
export const QUESTIONS_PER_ROUND = 10;
export function cleanSymbols(input) {
  return [...new Set((Array.isArray(input) ? input : []).map(normalize))].filter(x=>BASE.includes(x)||COMPOUNDS.includes(x));
}
export function normalizeConfig(input) {
  const legacy = Array.isArray(input);
  const symbols = cleanSymbols(legacy ? input : input?.symbols);
  const compounds = cleanSymbols(legacy ? input : input?.compounds).filter(x=>COMPOUNDS.includes(x));
  const seats = legacy ? Array.from({length:20},(_,i)=>String(i+1).padStart(2,'0')) : (input?.seats ?? []);
  return {symbols:symbols.filter(x=>BASE.includes(x)), compounds:[...new Set([...symbols.filter(x=>COMPOUNDS.includes(x)),...compounds])], seats: [...new Set(seats.map(String).filter(x=>/^\d{1,3}$/.test(x)).map(x=>x.padStart(2,'0')))], questions:QUESTIONS_PER_ROUND, tutorWrites:input?.tutorWrites===true, heroWrites:input?.heroWrites===true, authRequired:input?.authRequired===true,verifiedWrites:input?.version>=2, raceWrites:input?.raceWrites===true, rewardsWrites:input?.rewardsWrites===true, spellingApproved:input?.spellingApproved===true, legacy};
}
export function createCatalog(rows) {
  return rows.map(([initial,final,word,tone=1,meta={}],index)=>{
    if(!Number.isInteger(tone)||tone<1||tone>5)throw new Error('Invalid spelling tone');
    const label=initial+final,mark=['','','ˊ','ˇ','ˋ','˙'][tone];
    if(COMPOUNDS.includes(label)){initial=label;final='';}
    if(meta.audio&&!/^audio\/(?:supplied|processed)-\d{8}\/m_\d+(?:_\d+){0,2}\.mp3$/.test(meta.audio))throw new Error('Invalid spelling audio');
    return {id:'s'+String(index+1).padStart(2,'0'),initial,final,word,tone,label,displayLabel:tone===5?mark+label:label+mark,toneMark:mark,enabled:meta.enabled!==false,reviewRequired:meta.reviewRequired===true,audio:meta.audio||'audio/syllable-clear/s'+String(index+1).padStart(2,'0')+'.wav',...(meta.preferredAudio===true?{preferredAudio:true}:{})};
  });
}
export function poolFor(mode,config,catalog) {
  // Keep the existing single record key so login, history and daily caps stay compatible.
  if(mode==='single') return cleanSymbols([...config.symbols,...config.compounds]).map(label=>({id:label,label,audio:BASE.includes(label)?'audio/audio_F'+(BASE.indexOf(label)+1)+'.WAV':'audio/compound/c'+String(COMPOUNDS.indexOf(label)+1).padStart(2,'0')+'.mp3'}));
  if(mode==='compound') return config.compounds.map(label=>({id:label,label,audio:'audio/compound/c'+String(COMPOUNDS.indexOf(label)+1).padStart(2,'0')+'.mp3'}));
  const taught=s=>!s||(BASE.includes(s)?config.symbols.includes(s):config.compounds.includes(s));
  const unique=new Map();
  // Keep one question and a fixed selected recording; alternate source files stay archived.
  for(const q of catalog.filter(x=>x.enabled!==false&&taught(x.initial)&&taught(x.final))){const key=q.displayLabel||((q.label||q.initial+(q.final||''))+':'+(q.tone||1)),old=unique.get(key);if(old){if(q.preferredAudio){old.audio=q.audio;old.preferredAudio=true;}}else unique.set(key,{...q});}
  return [...unique.values()];
}
export function spellingChoices(q,pool,rng=Math.random){
 return Object.fromEntries(['initial','final'].map(k=>[k,!q[k]?['']:shuffle([q[k],...shuffle([...new Set(pool.map(x=>x[k]).filter(Boolean))].filter(x=>x!==q[k]),rng).slice(0,3)],rng)]));
}
export function shuffle(items,rng=Math.random) {
  const result=[...items];
  for(let i=result.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
export function optionsFor(target,pool,count=3,rng=Math.random) {
  const wrong=[...new Map(pool.filter(x=>x.label!==target.label).map(x=>[x.label,x])).values()];
  // Contrast taught simple/compound finals (e.g. ㄠ / ㄧㄠ), never add untaught sounds.
  const listening=BASE.includes(target.label)||COMPOUNDS.includes(target.label);
  const related=x=>listening&&(BASE.includes(x.label)||COMPOUNDS.includes(x.label))&&x.label.slice(-1)===target.label.slice(-1);
  const distractors=[...shuffle(wrong.filter(related),rng),...shuffle(wrong.filter(x=>!related(x)),rng)];
  return shuffle([target,...distractors.slice(0,Math.max(0,count-1))],rng);
}
export function questionDeck(pool,count,rng=Math.random) {
  if(!pool.length) return [];
  let deck=[];
  while(deck.length<count){let batch=shuffle(pool,rng);if(batch.length>1&&deck.at(-1)?.id===batch[0].id) [batch[0],batch[1]]=[batch[1],batch[0]];deck.push(...batch);}
  return deck.slice(0,count);
}
export class Round {
  constructor(deck){this.deck=deck.map(q=>({...q}));this.index=0;this.locked=false;this.rows=[];this.errors=0;this.taught=new Set();this.questionStarted=Date.now();this.started=this.questionStarted;}
  get current(){return this.deck[this.index];}
  get canUseTutor(){return !!this.current&&!this.locked&&!this.taught.has(this.current)&&this.deck.length<=78;}
  useTutor(pool,rng=Math.random){
    if(!this.canUseTutor||!this.current.initial)return {ignored:true};
    const source=this.current;this.taught.add(source);
    // Preserve previously promised review positions when inserting another reminder.
    const pending=this.deck.slice(this.index+2,this.index+3).some(q=>q.tutorReviewOf);
    let offset=pending?3:(rng()<0.5?2:3),added=1;
    if(this.index+offset>this.deck.length)offset=2;
    if(this.index+2>this.deck.length){const alternatives=pool.filter(q=>q.id!==source.id);this.deck.push({...((alternatives.length?alternatives:pool)[Math.floor(rng()*(alternatives.length||pool.length))]),tutorSpacer:true});added++;}
    this.deck.splice(this.index+offset,0,{...source,tutorSpacer:undefined,tutorReviewOf:this.index+1});
    // A random base question immediately after help should not reveal the same answer again.
    const between=this.deck[this.index+1],alternatives=pool.filter(q=>q.id!==source.id);
    if(between.id===source.id&&!between.tutorReviewOf&&alternatives.length)this.deck[this.index+1]={...alternatives[Math.floor(rng()*alternatives.length)],...(between.tutorSpacer?{tutorSpacer:true}:{})};
    return {added,repeatAt:this.index+offset+1};
  }
  answer(value,now=Date.now()){
    if(this.locked||!this.current) return {ignored:true};
    if(value!==this.current.label){this.errors++;return {correct:false};}
    this.locked=true;
    const row={target:this.current.displayLabel||this.current.label,firstCorrect:this.errors===0,errors:this.errors,seconds:Math.max(0,Math.round((now-this.questionStarted)/1000))};
    if(this.taught.has(this.current))row.tutorUsed=true;
    if(this.current.tutorReviewOf)row.tutorReviewOf=this.current.tutorReviewOf;
    if(this.current.tutorSpacer)row.tutorSpacer=true;
    this.rows.push(row);
    return {correct:true,firstCorrect:row.firstCorrect,finished:this.index===this.deck.length-1};
  }
  next(){if(!this.locked)return;this.index++;this.locked=false;this.errors=0;this.questionStarted=Date.now();}
  get mistakes(){return this.rows.filter(x=>!x.firstCorrect).length;}
}
