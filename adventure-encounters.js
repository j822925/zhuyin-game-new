import {BASE,COMPOUNDS,createCatalog,poolFor,questionDeck,spellingParts,spellingChoices,optionsFor} from './core.js';
import {teacherToneDeck} from './adventure-tone-question.js';
import {createQuestionLoader} from './adventure-question-loader.js';
const loadCatalog=createQuestionLoader('data/syllables.json',rows=>poolFor('spelling',{symbols:BASE,compounds:COMPOUNDS},createCatalog(rows)).filter(q=>!q.reviewRequired));
export async function encounterDeck(spec){
 if(spec.mode==='tone')return teacherToneDeck(spec.hp);
 if(spec.mode==='single'){const pool=poolFor('single',{symbols:spec.level===2?BASE:BASE.slice(0,12),compounds:[]},[]);return {deck:questionDeck(pool,spec.hp),pool};}
 const catalog=await loadCatalog(),pool=catalog.filter(q=>spec.mode==='tone'||(q.initial&&q.final));if(!pool.length)throw new Error('沒有可用題目');return {deck:questionDeck(pool,spec.hp),pool};
}
export const TONES=[{label:'—',value:1},{label:'ˊ',value:2},{label:'ˇ',value:3},{label:'ˋ',value:4},{label:'˙',value:5}];
export function challengeChoices(round){const q=round.deck[round.index],mode=round.spec.mode;
 if(mode==='tone')return TONES.map(x=>({label:x.label,value:String(x.value)}));
 if(mode==='spelling'){round.parts??=spellingChoices(q,round.pool);return round.parts[round.part||'initial'].map(x=>({label:x||'∅',value:x}));}
 return optionsFor(q,round.pool,round.spec.level===2?4:3).map(x=>({label:x.label,value:x.label}));
}
export function expectedAnswer(round){const q=round.deck[round.index];return round.spec.mode==='tone'?String(q.tone):round.spec.mode==='spelling'?spellingParts(q)[round.part||'initial']:q.label;}
export function challengePrompt(round){const q=round.deck[round.index];if(round.spec.mode==='tone')return `${q.label}　選「${q.targetCharacter}」的聲調`;if(round.spec.mode==='spelling')return `${round.part==='final'?(spellingParts(q).initial||'∅'):'□'} ＋ □`;return '👂 → ㄅ ㄆ ㄇ';}
