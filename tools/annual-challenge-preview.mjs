// Loopback-only QA server. Contains fictional accounts and has no production API access.
import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {createAnnualChallengeService} from '../annual-challenge-service.js';
import {STATIONS,active} from '../annual-challenge-core.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),dataPath=resolve(root,'../../output/annual-challenge-20261103/preview-data.json');
await mkdir(dirname(dataPath),{recursive:true});
const bank=JSON.parse(await readFile(resolve(root,'tone-questions.json'),'utf8'));
let saved={};try{saved=JSON.parse(await readFile(dataPath,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
// Single-process transaction queue, persisted only with fictional preview data.
let queue=Promise.resolve();const store={transaction(key,fn){const action=queue.then(async()=>{const result=fn(structuredClone(saved[key]??null));if(result.value!==undefined){saved[key]=structuredClone(result.value);await writeFile(dataPath,JSON.stringify(saved));}return structuredClone(result.out);});queue=action.catch(()=>{});return action;}};
const service=createAnnualChallengeService({store,bank,studentExists:({seat})=>['990001','990002','990003'].includes(seat)}),sessions=new Map(),streams=new Set();
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const send=(res,status,body)=>{res.writeHead(status,headers);res.end(JSON.stringify(body));};
const admin={role:'organizer',classId:'main',id:'preview-organizer'};
// First launch opens only the isolated fictional event for convenient review.
if(!saved['main:2026:event'])await service.configure(admin,2026,{revision:0,enabled:true,mode:'rehearsal'});
else if(!saved['main:2026:event'].mode)await service.configure(admin,2026,{revision:saved['main:2026:event'].revision,mode:'rehearsal',listenCount:10,spellCount:5});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webp':'image/webp','.mp3':'audio/mpeg'};
const allowed=new Set(['annual-challenge.html','annual-challenge.css','annual-challenge.js','annual-challenge-bootstrap.js','annual-challenge-core.js','annual-challenge-bank.js','annual-challenge-stamps.js']);
async function body(req){let text='';for await(const chunk of req){text+=chunk;if(text.length>300000)throw Object.assign(Error('資料過大'),{status:413});}return JSON.parse(text||'{}');}
function notify(who){for(const stream of streams)if(stream.classId===who.classId)stream.res.write('data: changed\n\n');}
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1'),path=decodeURIComponent(url.pathname).replace(/^\//,'');
  if(path.startsWith('annual-preview/')){
   const op=path.slice('annual-preview/'.length);
   if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`)return send(res,403,{error:'僅供本機試玩'});
   if(op==='health'&&req.method==='GET')return send(res,200,{preview:'annual-challenge-20261103',fictional:true});
   if(op==='login'&&req.method==='POST'){
    const input=await body(req);if(!['main','grade2'].includes(input.classId)||!['student','teacher','organizer'].includes(input.role))return send(res,400,{error:'示範登入有誤'});
    if(input.role==='student'&&!['990001','990002','990003'].includes(input.seat))return send(res,400,{error:'只能使用虛構示範帳號'});
    if(input.role==='teacher'&&!['listen','tone','spell','action','read'].includes(input.station))return send(res,400,{error:'請選關卡'});
    const token=randomUUID(),who={role:input.role,classId:input.classId,seat:input.seat,station:input.station,stations:[input.station],id:'preview-'+input.role};sessions.set(token,who);send(res,200,{...who,token});return;
   }
   const bearer=req.headers.authorization?.replace(/^Bearer /,''),who=sessions.get(bearer);if(!who||who.expiresAt&&who.expiresAt<=Date.now())return send(res,401,{error:'請重新登入或請關主重新解鎖'});
   if(op==='updates'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store',Connection:'keep-alive'});res.write('data: ready\n\n');const stream={res,classId:who.classId};streams.add(stream);req.on('close',()=>streams.delete(stream));return;}
   if(op==='config-read'&&req.method==='GET'){if(who.role==='student')return send(res,403,{error:'請由老師查看活動設定'});send(res,200,await service.config(who,Number(url.searchParams.get('year'))));return;}
   if(op==='availability'&&req.method==='GET'){send(res,200,await service.availability(who,Number(url.searchParams.get('year'))));return;}
   if(op==='roster'&&req.method==='GET'){if(who.role==='student')return send(res,403,{error:'請由老師選擇學生'});send(res,200,{seats:['990001','990002','990003']});return;}
   if(op==='card'&&req.method==='GET'){send(res,200,await service.card(who,Number(url.searchParams.get('year')),url.searchParams.get('seat'),url.searchParams.get('mode')||undefined,url.searchParams.has('round')?Number(url.searchParams.get('round')):undefined));return;}
   if(req.method!=='POST')return send(res,405,{error:'不支援此操作'});
   const input=await body(req);
   if(op==='config-read'){if(who.role==='student')return send(res,403,{error:'請由老師查看活動設定'});send(res,200,await service.config(who,input.year));return;}
   if(op==='unlock'){
    if(who.role!=='student'||!STATIONS.some(s=>s.id===input.station))return send(res,403,{error:'請從孩子目前的闖關卡進入'});
    const {event}=await service.card(who,input.year,who.seat,input.mode);if(!active(event))return send(res,403,{error:'活動模式已改變，請更新進度'});
    if(input.mode==='rehearsal'&&(input.rehearsalRound??1)!==event.rehearsalRound)return send(res,403,{error:'預演已重置，請更新進度'});
    const token=randomUUID(),grant={role:'teacher',classId:who.classId,seatScope:who.seat,station:input.station,stations:[input.station],yearScope:input.year,modeScope:input.mode,rehearsalRoundScope:input.mode==='rehearsal'?event.rehearsalRound:undefined,expiresAt:Date.now()+600000,id:'preview-handoff-'+input.station,handoff:true};sessions.set(token,{...grant,parentToken:bearer});send(res,200,{...grant,token});return;
   }
   if(op==='lock'||op==='logout'){
    sessions.delete(bearer);for(const [key,value]of sessions)if(value.parentToken===bearer)sessions.delete(key);send(res,200,{ok:true});return;
   }
   if(op==='configure'){send(res,200,await service.configure(who,input.year,input));notify(who);return;}
   if(op==='reset-rehearsal'){send(res,200,await service.resetRehearsal(who,input.year,input));notify(who);return;}
   if(op==='command'){send(res,200,await service.command(who,input.year,input.seat,input.station,input));notify(who);return;}
   return send(res,404,{error:'找不到試玩操作'});
  }
  const name=path||'annual-challenge.html';
  if(name==='annual-standalone.html'){
   const data=await readFile(resolve(root,'../../output/annual-challenge-20261103/注音闖關單檔試玩.html'));
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; media-src 'self'; connect-src 'none'; form-action 'none'"});res.end(data);return;
  }
  if(!allowed.has(name)&&!/^assets\/annual-challenge-20261103\/[a-z-]+\.webp$/.test(name)&&!/^audio\/tone-teacher-20261011\/T\d{4}\.mp3$/.test(name))return send(res,404,{error:'找不到檔案'});
  const full=resolve(root,name);if(!full.startsWith(root+sep))return send(res,403,{error:'無法讀取'});
  const data=await readFile(full);res.writeHead(200,{'Content-Type':mime[extname(full)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);
 }catch(e){if(e.code==='ENOENT')send(res,404,{error:'找不到檔案'});else send(res,e.status||400,{error:e.message||'操作失敗'});}
});
server.listen(Number(process.env.ANNUAL_PREVIEW_PORT)||8171,'127.0.0.1',()=>console.log('年度闖關本機試玩 http://127.0.0.1:'+server.address().port+'/annual-challenge.html'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{for(const s of streams)s.res.end();server.close(()=>process.exit());});
