import {PRONUNCIATIONS,PRONUNCIATION_SYLLABLES} from './reading-pronunciation-data.js?v=20260930-sound1';
const baseSound=s=>s.replace(/[ˊˇˋ˙]/gu,'');
const lookup=text=>Object.hasOwn(PRONUNCIATIONS,text)?PRONUNCIATIONS[text].split('|'):null;
const decode=code=>code.split('.').map(id=>PRONUNCIATION_SYLLABLES[parseInt(id,36)]);
const initialPairs=['ㄓㄗ','ㄔㄘ','ㄕㄙ','ㄋㄌ'];
const finalPairs=['ㄣㄥ','ㄢㄤ'];
// Teacher-selected lenient practice: ignore tone/neutral-tone differences and
// permit one listed near-sound substitution per syllable, never arbitrary edits.
export function similarReadingSyllable(a,b){
 a=baseSound(a);b=baseSound(b);
 if(!/^[ㄅ-ㄩ]{1,3}$/.test(a)||!/^[ㄅ-ㄩ]{1,3}$/.test(b))return false;
 if(a===b)return true;if(a.length!==b.length)return false;
 const changed=[...a].map((c,i)=>c===b[i]?-1:i).filter(i=>i>=0);
 if(changed.length!==1)return false;const i=changed[0];
 const pair=group=>group.some(p=>p.includes(a[i])&&p.includes(b[i]));
 return (i===0&&pair(initialPairs))||(i===a.length-1&&pair(finalPairs));
}
const fits=(code,wanted)=>{const sounds=decode(code);return sounds.length===wanted.length&&sounds.every((s,i)=>similarReadingSyllable(s,wanted[i]));};

// Compare whole syllable sequences. Known whole words take priority over
// character readings so 銀行 cannot borrow 行's ㄒㄧㄥˊ reading from another word.
export function pronunciationDecision(word,text){
 const chars=Array.from(text),wanted=word.zhuyin.trim().split(/\s+/u);
 if(chars.length!==wanted.length)return 'incorrect';
 if(wanted.some(s=>!/^[ㄅ-ㄩ]{1,3}$/.test(baseSound(s))))return 'retry';
 const whole=lookup(text);
 if(whole)return whole.some(code=>fits(code,wanted))?'correct':'incorrect';
 let ambiguous=false;
 for(let offset=0;offset<chars.length;){
  let segment=null,length=0;
  // Longest available term supplies context before falling back to one letter.
  for(let size=Math.min(4,chars.length-offset);size>=1;size--){
   const found=lookup(chars.slice(offset,offset+size).join(''));
   if(found){segment=found;length=size;break;}
  }
  if(!segment)return 'retry'; // Unknown text is not evidence of a wrong reading.
  const matches=segment.map(code=>fits(code,wanted.slice(offset,offset+length)));
  if(!matches.some(Boolean))return 'incorrect';
  // Tone-only alternatives no longer make an otherwise matching segment ambiguous.
  if(!matches.every(Boolean))ambiguous=true;
  offset+=length;
 }
 // An unfamiliar spelling with unresolved polyphony must not be made correct
// by choosing whichever pronunciation happens to agree with the answer.
 return ambiguous?'retry':'correct';
}
