import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {DatabaseSync} from 'node:sqlite';
import worker,{availability,reserve,freeQuotaError} from '../reading-service/worker.js';
import {encodeReadingWav,readingBase64,validateReadingWav} from '../reading-cloud-audio.js';
import {createCloudReadingSpeech} from '../reading-cloud-speech.js';
const tone=()=>Float32Array.from({length:16000},(_,i)=>.1*Math.sin(i*.1));
const audio=()=>readingBase64(encodeReadingWav(tone()));
const digest=async t=>Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t))).toString('hex');
async function setup(t){
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());sql.exec(fs.readFileSync(new URL('../reading-service/schema.sql',import.meta.url),'utf8'));
 sql.exec("CREATE TABLE platform_classes(id TEXT, active INTEGER); INSERT INTO platform_classes VALUES('main',1),('grade2',1);");
 for(const p of ['','c_grade2_'])sql.exec(`CREATE TABLE ${p}students(seat TEXT,pin_version TEXT,active INTEGER); CREATE TABLE ${p}sessions(token_hash TEXT,seat TEXT,version TEXT,expires INTEGER); INSERT INTO ${p}students VALUES('01','v1',1);`);
 const token='a'.repeat(64);sql.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(await digest(token),'01','v1',Date.now()+3600000);
 const db={prepare(query){return {bind(...args){const s=sql.prepare(query);return {async first(){return s.get(...args)||null;},async all(){return {results:s.all(...args)};},async run(){return s.run(...args);}};}};}};
 let calls=0,behavior=()=>({text:'蘋果'}),input;
 const env={DB:db,AI:{run:async(model,data)=>{calls++;input={model,data};return behavior();}},READING_CLOUD_ENABLED:'true'};
 const call=async(data,path='/transcribe',origin='https://j822925.github.io')=>{const r=await worker.fetch(new Request('https://test.example'+path,{method:data?'POST':'GET',headers:{Origin:origin},body:data?JSON.stringify(data):undefined}),env);return {status:r.status,data:await r.json()};};
 return {sql,db,env,token,call,get calls(){return calls;},get input(){return input;},behavior:fn=>behavior=fn};
}
test('PCM boundaries and silence are validated on server before any inference',()=>{
 assert.equal(validateReadingWav(audio()).seconds,1);
 assert.throws(()=>validateReadingWav(readingBase64(encodeReadingWav(new Float32Array(16000)))),/silence/);
 const blip=tone();blip.fill(0,100);assert.throws(()=>validateReadingWav(readingBase64(encodeReadingWav(blip))),/silence/);
 const wrong=encodeReadingWav(tone());new DataView(wrong.buffer).setUint32(24,8000,true);assert.throws(()=>validateReadingWav(readingBase64(wrong)),/invalid-audio/);
 assert.throws(()=>validateReadingWav('A'.repeat(426732)),/invalid-audio/);
});
test('requires valid class-specific student session; never sends identity or answer to AI',async t=>{
 const h=await setup(t),data={seat:'01',token:h.token,audio:audio(),answer:'蘋果',prompt:'蘋果'};
 assert.equal((await h.call({...data,token:'b'.repeat(64)})).status,401);
 assert.equal((await h.call(data,'/transcribe?class=grade2')).status,401);assert.equal(h.calls,0);
 assert.equal((await h.call(data)).data.text,'蘋果');assert.equal(h.calls,1);
 assert.deepEqual(Object.keys(h.input.data).sort(),['audio','condition_on_previous_text','language','task']);
 assert.equal(h.input.data.language,'zh');assert.equal(h.input.data.task,'transcribe');assert.equal(h.input.data.condition_on_previous_text,false);
 h.sql.exec("UPDATE students SET pin_version='v2'");assert.equal((await h.call(data)).status,401);
});
test('silence and malformed payloads do not consume quota or call the model',async t=>{
 const h=await setup(t);
 const r=await h.call({seat:'01',token:h.token,audio:readingBase64(encodeReadingWav(new Float32Array(16000)))});
 assert.equal(r.data.error,'silence');assert.equal(h.calls,0);assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM reading_cloud_usage').get().n,0);
 assert.equal((await h.call({seat:'01',token:h.token,audio:'not wav'})).data.error,'invalid-audio');
});
test('atomic quota cannot be overspent by simultaneous reservations',async t=>{
 const h=await setup(t);const results=await Promise.allSettled(Array.from({length:30},()=>reserve(h.db,'parallel',1,10)));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,10);assert.equal(h.sql.prepare("SELECT used FROM reading_cloud_usage WHERE bucket='parallel'").get().used,10);
 await assert.rejects(reserve(h.db,'new',11,10),/daily-limit/);
});
test('global limit closes both classes and resets at UTC midnight (Taiwan 08:00)',async t=>{
 const h=await setup(t),now=Date.now(),day=new Date(now).toISOString().slice(0,10);
 await reserve(h.db,'seconds:'+day,6000,6000);
 assert.equal((await h.call(null,'/status')).data.available,false);
 assert.equal((await h.call({seat:'01',token:h.token,audio:audio()})).data.error,'daily-limit');assert.equal(h.calls,0);
 const status=await availability(h.env,now);assert.equal(new Date(status.resetAt).getUTCHours(),0);
 assert.equal((await availability(h.env,status.resetAt)).available,true);
});
test('Cloudflare 3036 quota failure closes the level but ordinary capacity errors do not',async t=>{
 const h=await setup(t),data={seat:'01',token:h.token,audio:audio()};
 h.behavior(()=>{throw Error('3040: Capacity temporarily exceeded');});assert.equal((await h.call(data)).data.error,'unavailable');assert.equal((await availability(h.env)).available,true);
 h.behavior(()=>{throw Error('3036: daily free allocation exceeded');});assert.equal((await h.call(data)).data.error,'daily-limit');assert.equal((await availability(h.env)).available,false);
 await h.call(data);assert.equal(h.calls,2);assert.equal(freeQuotaError({code:3036}),true);
});
test('individual daily cap does not close reading for the rest of the class',async t=>{
 const h=await setup(t),day=new Date().toISOString().slice(0,10);await reserve(h.db,'student:'+day+':main:01',150,150);
 assert.equal((await h.call({seat:'01',token:h.token,audio:audio()})).data.error,'student-limit');assert.equal((await availability(h.env)).available,true);assert.equal(h.calls,0);
});
test('forbidden origin, oversized stream and disabled deployment reject before inference',async t=>{
 const h=await setup(t);
 const r=await worker.fetch(new Request('https://test.example/transcribe',{method:'POST',headers:{Origin:'https://bad.example'},body:'{}'}),h.env);assert.equal(r.status,403);
 const large=await worker.fetch(new Request('https://test.example/transcribe',{method:'POST',body:'x'.repeat(440001)}),h.env);assert.equal((await large.json()).error,'invalid-audio');
 h.env.READING_CLOUD_ENABLED='false';assert.equal((await h.call(null,'/status')).data.available,false);assert.equal(h.calls,0);
});
const tick=()=>new Promise(r=>setImmediate(r));
function speechHarness({silence=false,delayed=false}={}){
 let rec,resolve,stopped=0,requests=0;const results=[],errors=[],states=[];
 class Recorder{static isTypeSupported(){return true;}constructor(){rec=this;this.mimeType='audio/mp4';}start(){this.state='recording';}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['audio'])});this.onstop?.();}}
 const stream={getAudioTracks:()=>[{label:'iPad microphone'}],getTracks:()=>[{stop(){stopped++;}}]};
 const speech=createCloudReadingSpeech({Recorder,getUserMedia:async()=>stream,decode:async()=>({sampleRate:16000,numberOfChannels:1,getChannelData:()=>silence?new Float32Array(16000):tone()}),transcribe:async()=>{requests++;return delayed?new Promise(r=>resolve=r):{text:'蘋果'};},onState:s=>states.push(s),onResult:t=>results.push(t),onError:e=>errors.push(e)});
 return {speech,results,errors,states,get rec(){return rec;},get stopped(){return stopped;},get requests(){return requests;},resolve:()=>resolve({text:'蘋果'})};
}
test('five consecutive cloud recordings release microphone, yield five results, no duplicate Send',async()=>{
 const h=speechHarness();for(let i=0;i<5;i++){h.speech.start();await tick();h.speech.release();h.speech.release();await tick();assert.equal(h.speech.busy,false);}assert.equal(h.results.length,5);assert.equal(h.requests,5);assert.ok(h.stopped>=5);
});
test('local silence gate never uploads and leaves the question ungraded',async()=>{const h=speechHarness({silence:true});h.speech.start();await tick();h.speech.release();await tick();assert.deepEqual(h.errors,['silence']);assert.equal(h.requests,0);assert.equal(h.results.length,0);});
test('hiding/leaving during cloud processing discards delayed transcript',async()=>{const h=speechHarness({delayed:true});h.speech.start();await tick();h.speech.release();await tick();assert.equal(h.speech.busy,true);h.speech.cancel();h.resolve();await tick();assert.equal(h.results.length,0);assert.equal(h.speech.busy,false);});
