import {fail} from './arithmetic-core.js?v=20261115-math2';
export function createArithmeticStore(db,classId){
 if(!/^[a-z][a-z0-9]{1,20}$/.test(classId))fail('forbidden',403);
 const s=(sql,...v)=>db.prepare(sql).bind(...v),one=async(sql,...v)=>s(sql,...v).first(),many=async(sql,...v)=>(await s(sql,...v).all()).results;
 const parse=row=>row?{...JSON.parse(row.data),revision:row.revision}:null;
 const guard=()=>[s('INSERT INTO arithmetic_mutation_guard(value) VALUES(changes())'),s('DELETE FROM arithmetic_mutation_guard')];
 const batch=async statements=>{try{await db.batch(statements);}catch(e){if(/constraint|arithmetic_mutation_guard/i.test(e.message))fail('stale_revision',409);throw e;}};
 return {
  async getDoc(kind,id){return parse(await one('SELECT data,revision FROM arithmetic_documents WHERE class_id=? AND kind=? AND id=?',classId,kind,id));},
  async listDocs(kind){return (await many('SELECT data,revision FROM arithmetic_documents WHERE class_id=? AND kind=? ORDER BY updated_at DESC LIMIT 300',classId,kind)).map(parse);},
  async saveDoc(kind,id,d,revision,at){if(!Number.isInteger(revision)||revision<0)fail('invalid_config');const value={...d,id,revision:revision+1,updatedAt:at};const write=revision===0?s('INSERT INTO arithmetic_documents(class_id,kind,id,revision,data,updated_at) VALUES(?,?,?,1,?,?) ON CONFLICT(class_id,kind,id) DO NOTHING',classId,kind,id,JSON.stringify(value),at):s('UPDATE arithmetic_documents SET data=?,updated_at=?,revision=revision+1 WHERE class_id=? AND kind=? AND id=? AND revision=?',JSON.stringify(value),at,classId,kind,id,revision);await batch([write,...guard()]);return value;},
  async getRun(id){return parse(await one('SELECT data,revision FROM arithmetic_runs WHERE class_id=? AND id=?',classId,id));},
  async getStart(seat,id){return parse(await one('SELECT data,revision FROM arithmetic_runs WHERE class_id=? AND seat=? AND start_request_id=?',classId,seat,id));},
  async getExam(seat,id){return parse(await one("SELECT data,revision FROM arithmetic_runs WHERE class_id=? AND seat=? AND task_id=? AND kind='exam'",classId,seat,id));},
  async listRuns(f={}){const where=['class_id=?'],v=[classId];if(f.seat){where.push('seat=?');v.push(f.seat);}if(f.taskId){where.push('task_id=?');v.push(f.taskId);}if(f.from){where.push('updated_at>=?');v.push(f.from);}if(f.to){where.push('updated_at<?');v.push(f.to);}const limit=Math.min(5001,Math.max(1,Number(f.limit)||300));return (await many('SELECT data,revision FROM arithmetic_runs WHERE '+where.join(' AND ')+' ORDER BY updated_at DESC,id DESC LIMIT ?',...v,limit)).map(parse);},
  async createRun(r){await batch([s('INSERT INTO arithmetic_runs(class_id,id,seat,kind,task_id,status,start_request_id,revision,data,updated_at) VALUES(?,?,?,?,?,?,?,0,?,?)',classId,r.id,r.seat,r.kind,r.taskId,r.status,r.startRequestId,JSON.stringify(r),r.updatedAt)]);},
  async saveRun(r,revision,stars=0){if(![0,1].includes(stars))fail('invalid_answers');await batch([s('UPDATE arithmetic_runs SET status=?,data=?,updated_at=?,revision=revision+1 WHERE class_id=? AND id=? AND revision=?',r.status,JSON.stringify({...r,revision:revision+1}),r.updatedAt,classId,r.id,revision),...guard(),...(stars?[s('INSERT INTO wallets(seat) VALUES(?) ON CONFLICT(seat) DO NOTHING',r.seat),s('UPDATE wallets SET stars=stars+1,revision=revision+1 WHERE seat=? AND stars<9007199254740991',r.seat),...guard()]:[])]);}
 };
}
