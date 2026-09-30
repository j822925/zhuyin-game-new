import {PRONUNCIATIONS,PRONUNCIATION_SYLLABLES} from './reading-pronunciation-data.js?v=20260930-sound1';
const ids=new Map(PRONUNCIATION_SYLLABLES.map((s,i)=>[s,i.toString(36)]));
const normalizeSyllable=s=>s.startsWith('˙')?s.slice(1)+'˙':s;
const lookup=text=>Object.hasOwn(PRONUNCIATIONS,text)?PRONUNCIATIONS[text].split('|'):null;

// Compare Mandarin syllables WITH tones. Known whole words take priority over
// character readings so 銀行 cannot borrow 行's ㄒㄧㄥˊ reading from another word.
export function pronunciationDecision(word,text){
 const chars=Array.from(text),syllables=word.zhuyin.trim().split(/\s+/u).map(normalizeSyllable);
 if(chars.length!==syllables.length)return 'incorrect';
 const wanted=syllables.map(s=>ids.get(s));
 if(wanted.some(s=>s===undefined))return 'retry';
 const whole=lookup(text);
 if(whole)return whole.includes(wanted.join('.'))?'correct':'incorrect';
 let ambiguous=false;
 for(let offset=0;offset<chars.length;){
  let segment=null,length=0;
  // Longest available term supplies context before falling back to one letter.
  for(let size=Math.min(4,chars.length-offset);size>=1;size--){
   const found=lookup(chars.slice(offset,offset+size).join(''));
   if(found){segment=found;length=size;break;}
  }
  if(!segment)return 'retry'; // Unknown text is not evidence of a wrong reading.
  if(!segment.includes(wanted.slice(offset,offset+length).join('.')))return 'incorrect';
  if(segment.length>1)ambiguous=true;
  offset+=length;
 }
 // An unfamiliar spelling with unresolved polyphony must not be made correct
// by choosing whichever pronunciation happens to agree with the answer.
 return ambiguous?'retry':'correct';
}
