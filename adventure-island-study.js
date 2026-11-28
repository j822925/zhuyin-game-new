import {regionalBattleArt} from './data/island-neighborhoods.js';
import {battleSnapshot} from './adventure-battle-presentation.js';
import {studentAccess} from './adventure-learning-access.js';
export {questionsFor,studentAccess} from './adventure-learning-access.js';
import {mountLearningInput} from './adventure-battle-input.js';
import {mixedSource} from './adventure-mixed-questions.js';
import {battleRewardLimit} from './adventure-economy.js';
import {canSpendEnergy,spendEnergy} from './adventure-food-model.js';
import {drawStudyBeast} from './adventure-island-actors.js';

export function studyReward(level){
  return battleRewardLimit({mode:'spelling',level})+1;
}
export function settleStudy(state,id,save){
  if(state.settled.includes(id))return true;
  const old={energy:state.life.nutrition.energy,wins:state.wins,stars:state.stars,settled:state.settled};
  if(!spendEnergy(state,'battle'))return false;
  state.stars+=studyReward(state.expedition.level);state.wins=Math.min(9999,state.wins+1);
  state.settled=[...state.settled,id].slice(-50);
  if(save())return true;
  state.stars=old.stars;state.wins=old.wins;state.settled=old.settled;state.life.nutrition.energy=old.energy;return false;
}
export function createIslandStudy({presentation,state,save,changed,stop,paintHero,onWon,access=studentAccess}){
  const dialog=document.createElement('dialog');dialog.className='island-study';dialog.ariaLabel='小怪答題挑戰';
  document.body.append(dialog);
  const node=(tag,txt,cls)=>{const e=document.createElement(tag);e.textContent=txt||'';if(cls)e.className=cls;return e;};
  const button=(label,fn)=>{const b=node('button',label);b.type='button';b.onclick=fn;return b;};
  let run=null,clearInput=null,controller,timeout,raf;
  function close(){run=null;controller?.abort();clearTimeout(timeout);cancelAnimationFrame(raf);clearInput?.();clearInput=null;dialog.close();dialog.replaceChildren();stop();}
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  function finish(r){
    if(run!==r||r.paid)return;
    if(!r.access.current()){close();return;}
    const before=battleSnapshot(state());
    if(!settleStudy(state(),r.id,save)){
      r.note.textContent='還沒存好，請再試一次。';r.controls.replaceChildren(button('再試一次',()=>finish(r)));return;
    }
    r.paid=true;changed();onWon(r.b);r.prompt.textContent='挑戰成功！';
    if(presentation){
      const after=battleSnapshot(state());presentation.show({before,after,result:{won:true,stars:after.stars-before.stars},enemy:r.b.name,place:'探險島',keepsake:'✅ 完成 '+r.index+' 題',onReturn:close});return;
    }
    r.note.textContent='獲得 '+studyReward(state().expedition.level)+' 枚星幣';r.controls.replaceChildren(button('回到地圖',close));
  }
  function showQuestion(r){
    if(run!==r||!r.access.current()){close();return;}
    clearInput?.();
    const q=r.questions[r.index],mode=q.mode||r.b.mode;
    dialog.dataset.mode=mode==='weekly'?'reading':mode;
    dialog.classList.remove('study-hit');r.prompt.textContent=q.prompt;r.count.textContent=(r.index+1)+' / '+r.questions.length;r.note.textContent='';
    clearInput=mountLearningInput(r,{...q,mode},(ok,hint)=>{
      if(!ok){r.note.textContent=hint;showRetry();return;}
      clearInput();r.strike=performance.now();dialog.classList.add('study-hit');r.note.textContent='答對！星光擊中 '+r.b.name;
      r.hp.value=r.questions.length-r.index-1;r.index++;r.controls.replaceChildren();
      timeout=setTimeout(()=>{if(run!==r)return;if(r.index===r.questions.length)finish(r);else showQuestion(r);},540);
    },()=>run===r&&r.access.current());
    function showRetry(){clearInput();const note=r.note.textContent;showQuestion(r);r.note.textContent=note;}
  }
  async function open(b){
    if(run)return;stop();
    const r={b,id:'island-'+crypto.randomUUID(),index:0,strike:-10000};run=r;
    const fieldWriting=Boolean(presentation);
    dialog.dataset.mode=b.mode;
    const background=fieldWriting?regionalBattleArt(({writing:'sand',name:'sail',reading:'bud',math:'stone'})[b.mode]):null;
    dialog.classList.toggle('writing-battle',fieldWriting);
    dialog.classList.remove('study-hit');
    dialog.style.setProperty('--study-background',background?'url("'+background+'")':'none');
    dialog.replaceChildren();const top=node('header'),title=node('strong',presentation?b.name+'・隨機挑戰':b.label);r.count=node('span','');
    top.append(title,r.count,button('回地圖',close));const stage=node('div','','study-stage'),left=node('canvas'),right=node('canvas');
    left.width=right.width=160;left.height=right.height=130;left.ariaLabel=b.name;right.ariaLabel='我的角色';
    const middle=node('div','','study-center');r.prompt=node('h2',b.name);r.hp=node('progress');middle.append(r.prompt,r.hp);
    stage.append(left,middle,right);r.note=node('div','準備題目中…','study-note');r.note.setAttribute('role','status');
    r.controls=node('div','','study-controls');
    if(fieldWriting){
      const panel=node('section','','writing-panel');
      const enemy=node('div','','writing-enemy');
      enemy.append(node('strong',b.name),r.hp);stage.replaceChildren(left,enemy,right);
      panel.append(r.prompt,r.note,r.controls);dialog.append(top,stage,panel);
    }else dialog.append(top,stage,r.note,r.controls);
    if(presentation)await presentation.changeScene(()=>{if(run===r)dialog.showModal();},background);else dialog.showModal();
    if(run!==r)return;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    let last=-100;
    function frame(now){if(run!==r)return;raf=requestAnimationFrame(frame);if(document.hidden||now-last<42)return;last=now;
      const c=left.getContext('2d');c.clearRect(0,0,160,130);const dt=now-r.strike;
      drawStudyBeast(c,b,80,109,reduced?0:now/1000,{scale:1.36,label:false,hit:!reduced&&dt<330?-8*Math.sin(Math.PI*dt/330):0});
      const h=right.getContext('2d');h.clearRect(0,0,160,130);paintHero(h,!reduced&&dt>=0&&dt<330?dt/330:0);
      if(dt<420){c.fillStyle='#f6c346';c.font='bold 32px sans-serif';c.fillText('✦',98,45);}
    }frame(performance.now());
    try{
      if(!canSpendEnergy(state(),'battle'))throw Error('體力不足，吃點東西再回來吧。');
      if(globalThis.ForestAccess&&!(await globalThis.ForestAccess.check())){if(run===r)close();return;}
      if(run!==r)return;
      r.access=access();controller=new AbortController();timeout=setTimeout(()=>controller.abort(),12000);
      let questions;if(presentation&&r.access.read){const source=mixedSource(r.access);questions=[];for(let i=0;i<3;i++)questions.push(await source.next(controller.signal));}else questions=await r.access.load(b.mode,controller.signal);if(run!==r)return;clearTimeout(timeout);
      if(!questions.length)throw Error(b.mode==='name'?'老師還沒有設定可書寫的姓名。':'目前還沒有開放這種題目。');
      r.questions=questions;r.hp.max=questions.length;r.hp.value=questions.length;await showQuestion(r);
    }catch(e){if(run!==r)return;clearTimeout(timeout);r.note.textContent=e.name==='AbortError'?'連線較慢，請再試一次。':e.message;r.controls.replaceChildren(button('再試一次',()=>{close();void open(b);}));}
  }
  return {open,get busy(){return !!run;}};
}
