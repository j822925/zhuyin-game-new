import {allFriends,answerChallenge,beginChallenge,bridgeEntered,chapterEvent,cleanChapter,freshChapter,mailbox,prepareSkill,questOffer,QUESTS} from './adventure-chapter-model.js';
import {gradeReading} from './hanzi-bank.js';
import {zoneById} from './data/adventure-zones.js';
import {audioSource} from './audio-source.js';
import {guidedQuestion,nextQuestion} from './adventure-chapter-questions.js';
import {mountShore} from './adventure-chapter-map.js';

export function createChapter(api){
 const dialog=document.createElement('dialog');dialog.className='baisha-chapter';dialog.setAttribute('aria-label','跨越星門長橋');document.body.append(dialog);
 const get=()=>api.state().chapter||freshChapter();
 let shortcutVisit=false;
 let disposeMap=null,request=null,audio=null,revision=0,busy=false;
 function write(change){
   const state=api.state(),before=state.chapter,next=cleanChapter(before);
   const result=change(next);if(!result)return false;
   state.chapter=next;if(api.save())return result;
   if(before)state.chapter=before;else delete state.chapter;api.toast('進度還在保存，請稍後再試。');return false;
 }
 function stop(){revision++;disposeMap?.();disposeMap=null;request?.abort();request=null;audio?.pause();audio=null;globalThis.speechSynthesis?.cancel();}
 function close(){stop();dialog.close();api.stop();}
 function page(title,kind='talk'){
   stop();api.stop();dialog.replaceChildren();dialog.dataset.page=kind;
   if(!dialog.open)dialog.showModal();
   const head=document.createElement('header'),h=document.createElement('h2');h.textContent=title;head.append(h);dialog.append(head);
   const body=document.createElement('section');body.className='bs-body';dialog.append(body);
   return body;
 }
 function button(host,label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;host.append(b);return b;}
 function line(host,text){const p=document.createElement('p');p.textContent=text;host.append(p);return p;}
 function picture(host,url,name){const img=document.createElement('img');img.className='bs-portrait';img.alt=name;img.src=url;host.append(img);}
 function speak(text){if(!window.speechSynthesis)return;speechSynthesis.cancel();const s=new SpeechSynthesisUtterance(text);s.lang='zh-TW';s.rate=.84;speechSynthesis.speak(s);}
 function textPage(title,lines,options,art){
   let i=0;function show(){
     const body=page(title);if(art)picture(body,art,title);const box=document.createElement('article');body.append(box);line(box,lines[i]);
     button(box,'🔊 重聽',()=>speak(lines[i]));
     if(i<lines.length-1)button(box,'下一句 →',()=>{i++;show();});else for(const [label,fn] of options)button(box,label,fn);
   }show();
 }
 function returnHome(){
   if(!write(c=>chapterEvent(c,'return')))return;
   close();api.returnToBridge();
 }
 function shore(){
   const c=get(),clear=c.phase==='clear',body=page(clear?'白沙・通梁':'霧中的星光','map');
   const header=dialog.querySelector('header');button(header,'↩ 回長橋',returnHome);
   line(body,clear?'點一個地點，沿著已露出的路前進。':'跟著亮起的引路星，一步一步往前走。');
   disposeMap=mountShore(body,{chapter:get,paintHero:api.paintHero,onArrive:id=>{
     if(id==='s0')return returnHome();
     if(id.startsWith('s')){
       if(clear)return;
       const n=Number(id.slice(1));if(n>get().stars&&!write(s=>chapterEvent(s,'light',n)))return;
       if(n===3&&get().stars===3)fogOffer();else shore();return;
     }
     const q=QUESTS.find(q=>q.id===id);if(!q)return;
     if(get().quests[id]==='active'){void launch(id);return;}
     if(get().quests[id]==='item'){
       textPage(q.place,[id==='bud'?'把找回來的名牌掛回苗籃吧。':id==='sand'?'把浮子繫回船繩吧。':'把帶回來的信物放好吧。'],[
         ['放好了',()=>{if(write(s=>chapterEvent(s,'deliver',id)))textPage(q.place,[q.ending],[['沿路回去',shore]]);}],['等一下',shore]]);return;
     }
     textPage(q.place,[get().quests[id]==='done'?q.ending:id==='bud'?'榕樹下有一籃幼苗，木牌上的字被霧打濕了。':'潮灘上的小蟹圍著繩樁打轉。'],[['回到小路',shore]]);
   }});
 }
 function fogOffer(){
   textPage('捲霧獸',['呼——誰把我的霧吹出一個洞？','我再捲一圈！'],[['接招',()=>void launch('fog')],['回到星點',shore]],'assets/exploration/cloud-v1.webp');
 }
 function audience(id){
   const c=get();
   if(id==='bud'&&c.mail.stage==='search'&&c.mail.letters===3)return '把信投入收件籃';
   if(id==='bridge'&&allFriends(api.state())){
     if(c.phase==='friends')return '找星翼女帝切磋';
     if(c.phase==='promise')return '聽女帝說';
   }
   const quest=QUESTS.find(q=>q.id===id);
   return quest&&c.phase==='clear'&&(questOffer(c,id)||c.quests[id])?'和'+zoneById(id).boss+'說話':'';
 }
 function visit(id){
   const z=zoneById(id),c=get();
   if(id==='bud'&&c.mail.stage==='search'&&c.mail.letters===3){textPage(z.boss,['是小苗的畫！我一直替牠留著一個位子。'],[['投進收件籃',()=>{if(write(s=>mailbox(s,'post')))close();}],['等一下',close]],z.human);return;}
   if(id==='bridge'&&c.phase==='friends'){
     textPage(z.boss,['還記得我的星翼嗎？一起練一場吧！'],[['來切磋',()=>void launch('empress')],['等一下',close]],z.human);return;
   }
   if(id==='bridge'&&c.phase==='promise'){
     textPage(z.boss,['朋友，我想請你幫個忙。','長橋那頭，有一隻捲霧獸。牠把整座島藏進霧裡。','小怪想回去，居民也找不到路。','你願意走進霧裡，打敗牠，把路找回來嗎？'],[
       ['我願意',()=>{if(write(s=>chapterEvent(s,'accept')))textPage(z.boss,['這顆引路星送給你。走到長橋的最尾端，起霧時就跟著它！'],[['收好引路星',()=>{close();if(shortcutVisit){shortcutVisit=false;api.returnToBridge();}}]],z.human);}],['我等一下來',close]],z.human);return;
   }
   const q=QUESTS.find(q=>q.id===id);if(!q)return;
   const active=Object.values(c.quests).filter(v=>v!=='done').length;
   if(c.quests[id]||active>=2){
     const msg=c.quests[id]==='done'?q.ending:c.quests[id]?'我等著你的好消息！去'+q.place+'看看吧。':'先把手上兩件事辦好，我在這裡等你。';
     textPage(z.boss,[msg],[['再見',close]],z.human);return;
   }
   textPage(z.boss,[q.request],[['我來幫忙',()=>{if(write(s=>chapterEvent(s,'quest',id)))textPage(z.boss,['謝謝你！過橋後，到'+q.place+'找一找。'],[['出發',close]],z.human);}],['等一下',close]],z.human);
 }
 async function launch(id){
   if(busy)return;busy=true;const generation=revision;
   try{
     if(!(await (globalThis.ForestAccess?.check()??true))||generation!==revision)return;
     if(write(c=>beginChallenge(api.state(),c,id)))await battle();
     else api.toast('先完成原來的挑戰，再來幫忙。');
   }finally{busy=false;}
 }
 function leaveBattle(){get().island==='baisha'?shore():close();}
 async function battle(notice=''){
   const b=get().battle;if(!b)return;
   const name=b.id==='empress'?'星翼女帝':b.id==='fog'?'捲霧獸':QUESTS.find(q=>q.id===b.id).name;
   const body=page(name,'battle'),box=document.createElement('article');
   const art=b.id==='empress'?(b.transformed?zoneById('bridge').beast:zoneById('bridge').human):
     b.id==='fog'?'assets/exploration/cloud-v1.webp':'assets/expedition/minions-'+(b.id==='sand'?2:0)+'.webp';
   picture(body,art,name);body.append(box);line(box,(b.turn==='attack'?'⚔ 輪到你出招':'🛡 守住這一回合')+'　♥ '+b.heroHP+'　對手 ♥ '+b.hp);
   const hero=document.createElement('canvas');hero.className='bs-fighter';hero.width=180;hero.height=220;hero.setAttribute('aria-label','我的角色');body.append(hero);
   api.paintHero(hero.getContext('2d'),{x:90,y:205,height:170,direction:3,walking:false,phase:0});
   if(notice)line(box,notice);
   button(dialog.querySelector('header'),'稍後再來',leaveBattle);
   if(!b.question){
     const token=revision;request=new AbortController();const signal=request.signal;
     line(box,'正在準備題目…');
     try{const q=await nextQuestion(b.id,signal);if(token!==revision||signal.aborted)return;
       if(write(c=>{c.battle.question=q;return true;}))return battle(notice);
     }catch{if(token!==revision)return;line(box,'這一題暫時讀不到。');button(box,'重新讀題',()=>void battle());if(b.id!=='empress')button(box,'跟星光做一次',guide);}
     return;
   }
   const q=b.question;line(box,q.prompt);
   if(q.audio)button(box,'🔊 聽題目',()=>{audio?.pause();audio=new Audio(audioSource(q.audio));audio.play().catch(()=>{if(!box.isConnected)return;line(box,'音檔暫時無法播放，可以重聽。');if(b.id!=='empress'&&!box.querySelector('[data-guide]'))button(box,'改跟星光做',guide).dataset.guide='1';});});
   const skill=structuredClone(b);
   if(prepareSkill(api.state(),skill))button(box,skill.skillReady==='fox'?'使出送信快步':'準備蜂巢護盾',()=>{if(write(c=>prepareSkill(api.state(),c.battle)))void battle('技能準備好了。');});
   const answers=document.createElement('div');answers.className='bs-answers';box.append(answers);
   if(q.keys){
     let syllable='',tone=null;const field=line(answers,'□');field.className='bs-input';
     const refresh=()=>{field.textContent=(syllable||'□')+(tone||'');};
     button(box,'🔊 聽詞語',()=>speak(q.word));
     for(const key of q.keys)button(answers,key,()=>{if(syllable.length<3)syllable+=key;refresh();});
     for(const key of ['一聲','ˊ','ˇ','ˋ','˙'])button(answers,key,()=>{tone=key==='一聲'?'':key;refresh();});
     button(answers,'清除',()=>{syllable='';tone=null;refresh();});
     button(answers,'出招',()=>{if(!syllable||tone===null){field.textContent='先拼注音，再選聲調';return;}
       const grade=gradeReading({bopomofo:q.answer},syllable+tone);
       const part={initial:'聲母',rime:'韻母',tone:'聲調'}[grade.errors[0]?.part];
       submit(grade.correct,part?'再聽聽看「'+part+'」這一格。':'');});
   }else for(const choice of q.choices)button(answers,choice||'∅',()=>submit(choice===q.answer,q.hint));
   function submit(correct,hint){
     if(get().battle?.roundId!==b.roundId||!answers.isConnected)return;
     const result=write(c=>answerChallenge(api.state(),c,correct));
     if(!result)return;
     if(result==='won'){
       if(b.id==='empress'){visit('bridge');return;}
       if(b.id==='fog'){textPage('星翼女帝',['看，橋腳露出來了！榕樹下的小路和沙灘也看得見了。','捲霧獸的力氣變小了。遠處還有霧，但我們已經找回一段路了！'],[['去看看',shore]],zoneById('bridge').human);return;}
       textPage(name,['找到了！把信物送到'+QUESTS.find(q=>q.id===b.id).place+'吧。'],[['帶上信物',shore]]);return;
     }
     if(result==='lost'){textPage(name,['歇一歇，準備好再來。'],[['好的',leaveBattle]]);return;}
     void battle(result==='transform'?'星翼真身，降臨！':result==='retry'?(hint||'再試一次，看看題目裡的提示。'):result==='miss'?'下一回合再試試。':'答對了！');
   }
   function guide(){if(write(c=>{c.battle.question=guidedQuestion();return true;}))void battle();}
 }
 dialog.addEventListener('cancel',e=>{e.preventDefault();if(get().island==='baisha'){if(dialog.dataset.page==='map')returnHome();else shore();}else close();});
 dialog.addEventListener('keydown',e=>e.stopPropagation());
 function visitMail(which){
   const m=get().mail,done=(action,msg)=>{if(write(c=>mailbox(c,action)))textPage('郵差阿橘',[msg],[['收好',close]]);};
   if(which!=='home'){
     if(m.stage==='search')done(which,which==='leaf'?'這封有葉子的香味。':'找到了！這封信還沾著泥。');return;
   }
   if(m.stage==='new')textPage('郵差阿橘',['哎呀！郵袋底下破了一個洞。陪我找回路上的兩封信，好嗎？'],[['一起找',()=>done('accept','沿著小屋旁的路找信封吧。兩封都找到後，送到花芽原野。')],['等一下',close]]);
   else if(m.stage==='sent')textPage('郵差阿橘',['你找到的兩封信都送到了！下回出門，可以帶我一起嗎？'],[['一起走',()=>done('recruit','你答出來，我就接著幫忙！')],['等一下',close]]);
   else if(m.stage==='friend')textPage('郵差阿橘',['今天想怎麼出發？'],[[m.partner?'留在小屋休息':'一起出發',()=>done('toggle',m.partner?'我在小屋等你。':'我們走吧！')],['再見',close]]);
   else textPage('郵差阿橘',[m.letters===3?'信都找到了！送去花芽原野的收件籃吧。':'草地上還有信封，沿著這段路找找看。'],[['知道了',close]]);
 }
 if(api.direct)document.addEventListener('baisha-shortcut',()=>{
   if(dialog.open||!api.available())return;
   const c=get();shortcutVisit=true;
   if(c.island==='baisha'){shore();return;}
   if(c.phase==='friends'){
     if(c.battle?.id==='empress'){void launch('empress');return;}
     if(!write(s=>{s.phase='promise';return true;}))return;
   }
   if(get().phase==='promise')visit('bridge');
   else{api.returnToBridge();api.toast('沿長橋往右上方走，就會抵達白沙。');}
 });
 return {audience,visit,visitMail,mail:()=>get().mail,get busy(){return dialog.open;},restore(){if(get().island==='baisha'){if(get().battle&&get().battle.id!=='empress')void battle();else shore();}},
   step(before,after){
     if(!bridgeEntered(before,after))return;
     const c=get();if(['star','clear'].includes(c.phase)){
       if(write(s=>chapterEvent(s,'cross'))){api.stop();shore();}
     }else api.toast(!allFriends(api.state())?'橋那頭起霧了。先和島上的十位守護者交朋友吧！':c.phase==='promise'?'星翼女帝有話要跟你說。':'回星門長橋找星翼女帝切磋吧！');
   }};
}
