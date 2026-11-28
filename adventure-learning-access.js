import {createStudentSession} from './student-session.js';
import {questionPool} from './hanzi-bank.js';
import {generate,equation} from './arithmetic-core.js';
export function questionsFor(mode,data){
  if(mode==='name'){
    const group=(data.groups||[]).flatMap(g=>g.items).filter(i=>/^name:\d+$/.test(i.id));
    return group.length&&group.every(i=>i.canWrite&&i.reading)?group.map(i=>({character:i.character,prompt:i.reading})):[];
  }
  if(mode==='math'){
    const scope=data.scope;
    if(!scope?.enabled||!scope.levels?.includes(10))return [];
    const operation=['mix','add','sub'].find(x=>scope.operations?.includes(x));
    const skill=['mixed','basic','regroup'].find(x=>scope.skills?.includes(x));
    if(!operation||!skill)return [];
    let deck;
    try{deck=generate({max:10,operation,skill,count:5});}catch(error){if(error.message==='scope_too_small')return [];throw error;}
    return deck.slice(0,3).map(q=>({prompt:equation(q)+' ＝ ？',q}));
  }
  const writing=mode==='writing';
  const pool=questionPool(data.catalog,data.scope?.lessonIds,mode,{termId:data.scope?.termId})
    .filter(q=>!writing||data.writingReadyItemIds?.includes(q.itemId));
  if(!pool.length)return [];
  const deck=pool.slice();
  for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
  return Array.from({length:3},(_,i)=>{const q=deck[i%deck.length];
    const hintWord=[...q.word].map((ch,j)=>ch===q.character?'□':ch).join('');
    const similar=writing?[...new Set(data.catalog.items.filter(item=>item.character!==q.character&&item.strokeCount===q.strokeCount).map(item=>item.character))].slice(0,6):[];
    return {...q,similar,prompt:writing?q.bopomofo+'　'+hintWord:[...q.word].map((ch,j)=>j===q.targetIndex?'【'+ch+'】':ch).join('')};
  });
}

export function studentAccess(){
  const forest=globalThis.ForestStudent;
  if(!forest?.seat||!forest.classId)throw Error('請先回學習廣場登入，再來挑戰。');
  const suffix=forest.classId==='main'?'':':class:'+forest.classId;
  const auth=createStudentSession({storage:sessionStorage,key:'zhuyin.student-session.v1:'+new URL('.',location.href).pathname+':live'+suffix});
  const initial=auth.read();
  function current(){const s=auth.read();return !!initial&&s?.seat===forest.seat&&s.token===initial.token&&globalThis.ForestStudent===forest;}
  async function read(route,signal){
    if(!current())throw Error('請先重新登入。');
    const config=route==='config',url=new URL(config?'api':route,'https://zhuyin-api.j822925.workers.dev/');
    if(config){url.searchParams.set('api','config');url.searchParams.set('class',forest.classId);}
    const response=await fetch(url,{credentials:'omit',cache:'no-store',signal,...(config?{}:{method:'POST',headers:{Authorization:'Bearer '+initial.token,'Content-Type':'application/json'},body:JSON.stringify({classId:forest.classId})})});
    if(!current()||response.status===401)throw Error('請先重新登入。');
    if(response.status===403)return {};
    if(!response.ok)throw Error('題目暫時讀不到，請稍後再試。');
    const data=await response.json();
    if(!current())throw Error('請先重新登入。');
    return config?{symbols:data.symbols,compounds:data.compounds,spellingApproved:data.spellingApproved}:data;
  }
  return {current,read,async load(mode,signal){
    const route=mode==='name'?'hanzi/copy/classroom-choices':mode==='math'?'arithmetic/bootstrap':'hanzi/bootstrap';
    return questionsFor(mode,await read(route,signal));
  }};
}
