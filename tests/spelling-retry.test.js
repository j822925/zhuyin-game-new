import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {spellingParts} from '../core.js';
const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const extract=name=>source.match(new RegExp('(?:async )?function '+name+'\\([^]*?\\n\\}'))[0];
function setup(selection,question){
 const slots=Object.fromEntries(['initial','final'].map(k=>[k,{text:selection[k],dataset:{blank:String(selection[k]==='')},removed:[],classList:{remove(...names){slots[k].removed.push(...names);}},replaceChildren(){this.text='';},setAttribute(k,v){this[k]=v;}}]));
 const button={},status={},ctx={selected:{...selection},spellingParts,document:{querySelector:s=>s.includes('data-slot')?slots[s.includes('initial')?'initial':'final']:{}},showSpellingTone(){},$:id=>id==='check-spelling'?button:status,
  AbortController,rounds:[{current:question,locked:false}],active:0,session:1,audioReady:true,audio:{pause(){}},reviewAudio:{},voiceHelp:{stop(){}},tutorButton:{},practiceController:null,setAnswerEnabled(v){ctx.enabled=v;},stopPracticeReview(){}};
 vm.createContext(ctx);vm.runInContext(extract('clearWrongSpelling')+'\n'+extract('replayWrongSpelling'),ctx);return {ctx,slots,button,status};
}
test('clear only wrong initial or final; preserve correct value including intentional blank',()=>{
 for(const [selection,question,cleared] of [
  [{initial:'ㄅ',final:'ㄧ'},{initial:'ㄑ',final:'ㄧ'},['initial']],
  [{initial:'ㄑ',final:''},{initial:'ㄑ',final:'ㄧ'},['final']],
  [{initial:'ㄅ',final:'ㄚ'},{initial:'ㄑ',final:'ㄧ'},['initial','final']],
  [{initial:'',final:'ㄜ'},{initial:'ㄚ',final:''},['final']],
  [{initial:'ㄅ',final:''},{initial:'ㄓ',final:''},['initial']],
  [{initial:'ㄅ',final:'ㄩㄣ'},{initial:'ㄩㄣ',final:''},['initial']],
 ]){const f=setup(selection,question);f.ctx.clearWrongSpelling(question);for(const k of ['initial','final']){assert.equal(f.ctx.selected[k],cleared.includes(k)?undefined:selection[k]);if(cleared.includes(k)){assert.equal(f.slots[k].text,'');assert.equal(f.slots[k].dataset.blank,undefined);assert(f.slots[k].removed.includes('filled'));}else assert.equal(f.slots[k].text,selection[k]);}assert.equal(f.button.disabled,true);}
});
test('clear happens only after full review finishes, never after failure, abort or a changed question',async()=>{
 for(const action of ['finish','fail','abort','change']){const q={initial:'ㄑ',final:'ㄧ'},f=setup({initial:'ㄅ',final:'ㄧ'},q);let resolve,reject;f.ctx.playTutorOnce=()=>new Promise((yes,no)=>{resolve=yes;reject=no;});const pending=f.ctx.replayWrongSpelling();assert.equal(f.ctx.selected.initial,'ㄅ');assert.equal(f.ctx.audioReady,false);
  if(action==='fail')reject(Error('audio_failed'));else{if(action==='abort')f.ctx.practiceController.abort();if(action==='change')f.ctx.rounds[0].current={...q};resolve();}await pending;
  assert.equal(f.ctx.selected.initial,action==='finish'?undefined:'ㄅ');assert.equal(f.ctx.selected.final,'ㄧ');
 }
});
