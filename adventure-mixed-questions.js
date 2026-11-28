import {questionsFor,studentAccess} from './adventure-learning-access.js';
import {createCatalog,normalizeConfig,optionsFor,poolFor,shuffle,spellingChoices,spellingParts} from './core.js';
import {teacherToneDeck} from './adventure-tone-question.js';
import {generate,equation,LEVELS} from './arithmetic-core.js';
import {createQuestionLoader} from './adventure-question-loader.js';

const catalog=createQuestionLoader('data/syllables.json?v=20261128-pou3-off1',createCatalog);
export const battleModes=['single','spelling','tone','reading','writing','copy','name','name-copy','weekly','math'];
export function mixedSource(access=studentAccess(),rng=Math.random){
 const cache=new Map(),pick=items=>items[Math.floor(rng()*items.length)];
 async function read(route,signal){
  const entry=cache.get(route);
  if(entry&&Date.now()-entry.time<60000)return entry.data;
  const data=await access.read(route,signal);
  cache.set(route,{time:Date.now(),data});return data;
 }
 async function question(mode,signal){
  if(mode==='single'||mode==='spelling'){
   const config=normalizeConfig(await read('config',signal));
   if(mode==='spelling'&&!config.spellingApproved)return;
   const pool=poolFor(mode,config,mode==='single'?[]:await catalog()).filter(q=>!q.reviewRequired);
   const q=pick(pool);if(!q)return;
   if(mode==='single')return {mode,prompt:'聽一聽，選出注音',audio:q.audio,choices:optionsFor(q,pool,4,rng).map(x=>x.label),answer:q.label};
   const parts=spellingParts(q);return {mode,prompt:'聽一聽，拼出注音',audio:q.audio,parts:spellingChoices(q,pool,rng),initial:parts.initial,final:parts.final};
  }
  if(mode==='tone'){
   const {deck:[q]}=await teacherToneDeck(1,rng);
   return {mode,prompt:'「'+q.targetCharacter+'」是第幾聲？',audio:q.audio,label:q.label,targetIndex:q.targetIndex,choices:['一聲','ˊ','ˇ','ˋ','˙'],answer:['一聲','ˊ','ˇ','ˋ','˙'][q.tone-1]};
  }
  if(mode==='math'){
   if(!(await read('arithmetic/access',signal)).available)return;
   const {scope}=await read('arithmetic/bootstrap',signal);
   if(!scope?.enabled)return;
   const combos=[];
   for(const max of LEVELS.filter(n=>scope.levels?.includes(n)))for(const operation of (scope.operations||[]))for(const skill of (scope.skills||[]))combos.push({max,operation,skill,count:5});
   for(const c of shuffle(combos,rng)){try{const q=pick(generate(c,rng));return {mode,q,prompt:equation(q)+' ＝ ？'};}catch(e){if(e.message!=='scope_too_small')throw e;}}
   return;
  }
  if(mode==='weekly'){
   const q=pick((await read('hanzi/weekly-set',signal)).cards||[]);
   if(q?.char&&q.reading)return {mode,prompt:q.char,bopomofo:q.reading};
   return;
  }
  if(['copy','name','name-copy'].includes(mode)){
   const status=await read('hanzi/copy/bootstrap',signal),name=mode!=='copy';
   if(!(name?status.nameReady:status.copyReady))return;
   const groups=(await read('hanzi/copy/classroom-choices',signal)).groups||[];
   const q=pick(groups.flatMap(g=>g.items).filter(i=>i.canWrite&&i.reading&&/^name:\d+$/.test(i.id)===name));
   if(q)return {mode,character:q.character,prompt:mode==='name'?q.reading:'照著寫「'+q.character+'」'};
   return;
  }
  const q=pick(questionsFor(mode,await read('hanzi/bootstrap',signal)));if(q)return {...q,mode};
 }
 return {current:access.current,async next(signal){
  for(const mode of shuffle(battleModes,rng)){
   if(signal.aborted||!access.current())throw Error('請重新進入挑戰。');
   const q=await question(mode,signal);
   if(signal.aborted||!access.current())throw Error('請重新進入挑戰。');
   if(q)return q;
  }
  throw Error('目前沒有開放的題目，請回學習廣場查看。');
 }};
}
