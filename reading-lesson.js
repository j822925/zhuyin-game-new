import {BASE,COMPOUNDS,cleanSymbols,shuffle} from './core.js?v=20260928-all1';
import {READING_WORDS,READING_TOTAL,readingDeck} from './reading-core.js?v=20260928-all1';
const INITIALS=new Set(BASE.slice(0,21));
const FINALS=new Set([...BASE.slice(21),...COMPOUNDS]);
export function readingTaughtSymbols(config){
 return [...new Set([...cleanSymbols(config?.symbols),...cleanSymbols(config?.compounds).filter(s=>COMPOUNDS.includes(s))])];
}
export function readingRequirements(word){
 if(typeof word?.zhuyin!=='string')return null;
 const syllables=word.zhuyin.split(' '),parts=[];
 if(syllables.length!==word.word?.length||syllables.length<2||syllables.length>4)return null;
 for(const syllable of syllables){
  if(!/^[ㄅ-ㄩ]{1,3}[ˊˇˋ˙]?$/.test(syllable))return null;
  const sound=syllable.replace(/[ˊˇˋ˙]/g,''),initial=INITIALS.has(sound[0])?sound[0]:'',final=sound.slice(initial.length);
  if(initial)parts.push(initial);
  if(final){if(!FINALS.has(final))return null;parts.push(final);}
 }
 return [...new Set(parts)];
}
export function readingPool(config,words=READING_WORDS){
 const taught=new Set(readingTaughtSymbols(config)),seen=new Set();
 return words.filter(word=>{
  const needed=readingRequirements(word);
  if(!needed?.length||needed.some(symbol=>!taught.has(symbol))||seen.has(word.zhuyin))return false;
  seen.add(word.zhuyin);return true;
 });
}
export function readingLessonDeck(pool,rng=Math.random){
 const seen=new Set(),unique=shuffle(pool,rng).filter(w=>{if(seen.has(w.zhuyin))return false;seen.add(w.zhuyin);return true;});
 // Teacher requested a full-bank round when fewer than five readings qualify.
 if(unique.length<READING_TOTAL)return readingDeck(rng);
 // Prefer the usual length mix; fill shortages using only the eligible pool.
 const selected=[...unique.filter(w=>w.word.length===2).slice(0,2),...unique.filter(w=>w.word.length===3).slice(0,2),...unique.filter(w=>w.word.length===4).slice(0,1)];
 const used=new Set(selected.map(w=>w.zhuyin));
 selected.push(...unique.filter(w=>!used.has(w.zhuyin)).slice(0,READING_TOTAL-selected.length));
 return shuffle(selected,rng);
}
