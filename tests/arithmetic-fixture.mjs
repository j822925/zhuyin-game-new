import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createArithmeticAPI} from '../arithmetic-api.js';
import {createArithmeticStore} from '../arithmetic-store.js';
export function createFixture(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('../migrations/arithmetic-v1.sql',import.meta.url),'utf8'));sqlite.exec("CREATE TABLE wallets(seat TEXT PRIMARY KEY,stars INTEGER NOT NULL DEFAULT 0,revision INTEGER NOT NULL DEFAULT 0);CREATE TABLE students(seat TEXT,name TEXT,test INTEGER,active INTEGER);INSERT INTO students VALUES('990001','測試一',1,1),('990002','測試二',1,1),('990003','未開放測試',1,1);");
 class Statement{constructor(sql,v=[]){this.sql=sql;this.v=v;}bind(...v){return new Statement(this.sql,v);}async first(){return sqlite.prepare(this.sql).get(...this.v)||null;}async all(){return {results:sqlite.prepare(this.sql).all(...this.v)};}async run(){const r=sqlite.prepare(this.sql).run(...this.v);return {meta:{changes:Number(r.changes)}};}}
 const db={prepare:sql=>new Statement(sql),async batch(statements){sqlite.exec('SAVEPOINT math_batch');try{const out=[];for(const s of statements){const result=sqlite.prepare(s.sql).run(...s.v);out.push({meta:{changes:Number(result.changes)}});}sqlite.exec('RELEASE math_batch');return out;}catch(e){sqlite.exec('ROLLBACK TO math_batch;RELEASE math_batch');throw e;}}};
 const env={DB:db,ENVIRONMENT:'local',STUDENT_WRITES:'true',ALLOWED_ORIGINS:'https://school.example.test'},tokens={a:'990001',b:'990002',c:'990003'};
 const deps={digest:async x=>x,requireAdmin:async req=>{if(req.headers.get('Authorization')!=='Bearer fixture-teacher')throw Object.assign(Error('admin_required'),{status:401});return {};},scopeClass:async(e,cid)=>{if(!['main','grade2'].includes(cid))throw Error('forbidden');return e;},authorizeClass:async(e,i,cid)=>{if(cid!=='main')throw Object.assign(Error('forbidden'),{status:403});return e;},authenticate:async(db,token)=>{const seat=tokens[token[0]];if(!seat)throw Object.assign(Error('authentication_required'),{status:401});return {seat,test:1};},pilotSeats:async(e,cid)=>cid==='main'?['990001','990002']:['990001']};
 const api=createArithmeticAPI(deps),store=createArithmeticStore(db,'main');
 async function call(op,data={},who='a',cid='main'){const response=await api.fetch(new Request('https://math.example.test/'+(who==='teacher'?'admin/api/':'')+'arithmetic/'+op,{method:'POST',headers:{Authorization:'Bearer '+(who==='teacher'?'fixture-teacher':who.repeat(64)),'Content-Type':'application/json'},body:JSON.stringify({...data,classId:cid})}),env);return {status:response.status,data:await response.json()};}
 return {sqlite,db,env,api,store,call,close:()=>sqlite.close()};
}
