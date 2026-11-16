import {renderCopyNotebook} from './hanzi-copy-hub.js?v=20261116-copy1';
import {currentClass,classUrl,classStorageKey} from './class-context.js?v=20261023-exam1';
import {createStudentSession} from './student-session.js?v=20261009-accounts1';
import {createHanziClient} from './hanzi-client.js?v=20261116-hub1';
let storage;try{storage=sessionStorage;}catch{}
const sessions=createStudentSession({storage,key:classStorageKey('zhuyin.student-session.v1:'+new URL('.',location.href).pathname+':live')});
const endpoint=['localhost','127.0.0.1'].includes(location.hostname)?location.origin:'https://zhuyin-api.j822925.workers.dev';
const client=createHanziClient({endpoint,classId:currentClass,getSession:()=>sessions.read()});
const enabled=()=>!!sessions.read();
const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
export function hanziLaunch({task,review,mode,from}){const url=new URL(classUrl('hanzi.html'),location.href);for(const [k,v]of Object.entries({task,review,mode,from}))if(v)url.searchParams.set(k,v);return url.href;}
export async function hanziTasks(){if(!enabled())return [];const e=await client.request('exams');return e.exams.map(t=>({...t,kind:'exam'})).map(t=>({...t,hanzi:true,hanziMode:t.mode,mode:'hanzi',id:'hanzi:'+t.id,taskId:t.id,questions:t.count,starts:t.startsAt,ends:t.endsAt,status:t.attempt?.status==='started'?'working':t.attempt?'finished':'open',title:'國字森林｜'+t.title}));}
export async function renderHanziNotebook(host,{current=()=>true,optional=false}={}){
 if(!enabled()){host.hidden=optional;host.replaceChildren(node('p','這個帳號目前尚未開放國字森林。'));return 0;}
 host.hidden=false;host.replaceChildren(node('p','讀取國字森林錯題…'));
 try{const data=await client.request('notebook');if(!current())return 0;host.replaceChildren(node('h2','國字森林'));
  const copyCount=await renderCopyNotebook(host,{session:sessions.read(),endpoint,classId:currentClass,classUrl,current});if(!current())return 0;
  if(!data.items.length&&copyCount===0){host.append(node('p','國字森林的錯題都畢業了！'));return 0;}
  for(const item of data.items){const row=node('div');row.className='math-review-row';const text=node('div'),q=item.question;text.append(node('strong',q.word+' · '+q.bopomofo),node('p',item.mode==='writing'?'看注音，寫國字':'看國字，拼注音'));const a=node('a','再練一次 →');a.className='math-review-start';a.href=hanziLaunch({review:item.questionId,mode:item.mode,from:'notebook'});row.append(text,a);host.append(row);}return copyCount===null?null:data.items.length+copyCount;
 }catch(e){if(current())host.replaceChildren(node('p','國字錯題暫時讀取失敗，請按重新連線。'));if(!optional)throw e;return null;}
}
