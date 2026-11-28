export const ROUND_SIZE = 5;
export const DAILY_LIMIT = 15;
export const TONES = 'ˉˊˇˋ˙';
export const SYMBOLS = 'ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄧㄨㄩㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦ';

export function expectedReading(written) {
  if (written.includes('˙')) return written.replace('˙','')+'˙';
  return /[ˊˇˋ]$/.test(written) ? written : written+'ˉ';
}
export function drawWords(bank, random=Math.random) {
  const candidates=bank.slice(), used=new Set(), questions=[];
  while(candidates.length && questions.length<ROUND_SIZE){
    const index=Math.floor(random()*candidates.length);
    const [word,reading,clip]=candidates[index];
    candidates[index]=candidates.at(-1);candidates.pop();
    const chars=Array.from(word);
    const targets=chars.map((ch,i)=>used.has(ch)?null:i).filter(i=>i!==null);
    if(!targets.length)continue;
    const target=targets[Math.floor(random()*targets.length)];
    used.add(chars[target]);
    questions.push({word,target,key:reading.trim().split(/\s+/)[target],clip:clip||null});
  }
  if(questions.length!==ROUND_SIZE)throw Error('word_pool_small');
  return questions;
}
export const starReward = correct => correct===5?3:correct>=3?1:0;
export const taipeiDay = now => new Date(now+8*3600000).toISOString().slice(0,10);
export function newWordRound(bank,random) {
  return {questions:drawWords(bank,random),position:0,revision:0,correct:0,missed:false,last:null};
}
export function markAnswer(round,reading){
  if(!/^[ㄅ-ㄩ]{1,3}[ˉˊˇˋ˙]$/.test(reading)||typeof reading!=='string')throw Error('invalid_reading');
  const question=round.questions[round.position];
  if(!question)throw Error('round_complete');
  const right=reading===expectedReading(question.key);
  return {...round,revision:round.revision+1,position:round.position+Number(right),
    correct:round.correct+Number(right&&!round.missed),missed:!right,
    last:{revision:round.revision,reading,right,key:right?null:question.key,character:question.word[question.target]}};
}
export function visibleRound(round){
  const {position,revision,correct,last,stars,dailyStars}=round;
  const current=round.questions[position];
  const question=current?{word:current.word,target:current.target,clip:current.clip}:null;
  return {position,revision,correct,question,last,stars,dailyStars};
}
