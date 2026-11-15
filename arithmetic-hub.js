import {currentClass,classUrl,classStorageKey} from './class-context.js?v=20261023-exam1';
import {createStudentSession} from './student-session.js?v=20261009-accounts1';
import {createArithmeticClient,errorText} from './arithmetic-client.js?v=20261115-math2';
import {configLabel,equation} from './arithmetic-core.js?v=20261115-math2';
let storage;try{storage=sessionStorage;}catch{}
const sessions=createStudentSession({storage,key:classStorageKey('zhuyin.student-session.v1:'+new URL('.',location.href).pathname+':live')});
const endpoint=['localhost','127.0.0.1'].includes(location.hostname)?location.origin:'https://zhuyin-api.j822925.workers.dev';
const client=createArithmeticClient({endpoint,classId:currentClass,getSession:()=>sessions.read()});
const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
export function arithmeticLaunch({task,review,from}){const url=new URL(classUrl('arithmetic.html'),location.href);if(task)url.searchParams.set('task',task);if(review)url.searchParams.set('review',review);url.searchParams.set('from',from);return url.href;}
export async function arithmeticTasks(){if(!sessions.read())return [];try{const data=await client.request('bootstrap');return [...data.exams,...data.assignments].map(t=>({...t,arithmetic:true,mode:'arithmetic',id:'math:'+t.id,taskId:t.id,questions:t.config.count,starts:t.startsAt,ends:t.endsAt,title:'加減玩｜'+t.title}));}catch(e){return [];}}
export async function renderArithmeticNotebook(host,{current=()=>true,optional=false}={}){
 host.hidden=false;host.replaceChildren(node('p','讀取加減玩錯題…'));
 try{const data=await client.request('notebook');if(!current())return;host.replaceChildren();const heading=node('h2','加減玩');host.append(heading);
  if(!data.items.length){host.append(node('p','加減玩的錯題都畢業了！'));return 0;}
  for(const item of data.items){const row=node('div');row.className='math-review-row';const text=node('div');text.append(node('strong',equation(item.question)+'＝？'),node('p',configLabel(item.config)));const link=node('a','再練一次 →');link.className='math-review-start';link.href=arithmeticLaunch({review:item.questionId,from:'notebook'});row.append(text,link);host.append(row);}return data.items.length;
 }catch(e){if(!current())return;if(optional&&e.message==='forbidden'){host.hidden=true;return 0;}host.replaceChildren(node('p',e.message==='forbidden'?'這個帳號目前尚未開放加減玩。':errorText(e)));}
}
