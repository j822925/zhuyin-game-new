// Run only against our loopback fictional preview. Never contacts the production API.
import test from 'node:test';
import assert from 'node:assert/strict';
const root='http://127.0.0.1:'+Number(process.env.ANNUAL_PREVIEW_PORT||8172)+'/annual-preview/';
async function call(path,token,body){const response=await fetch(root+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});return {status:response.status,data:await response.json()};}
test('preview teacher unlock cannot cross child, become organizer or survive lock/logout',async()=>{
 const health=await call('health');assert.equal(health.data.preview,'annual-challenge-20261103');assert.equal(health.data.fictional,true);
 const login=await call('login',null,{role:'student',classId:'main',seat:'990003'});assert.equal(login.status,200);const child=login.data.token;
 try{
  const initial=await call('card?year=2026&seat=990003',child),mode=initial.data.mode;
  const grant=await call('unlock',child,{year:2026,mode,rehearsalRound:initial.data.rehearsalRound,station:'read'});assert.equal(grant.status,200);const token=grant.data.token;
  assert.equal(grant.data.seatScope,'990003');assert.equal(grant.data.modeScope,mode);assert.equal(grant.data.yearScope,2026);
  assert.equal((await call('card?year=2026&seat=990002',token)).status,403);
  assert.equal((await call('configure',token,{year:2026,revision:initial.data.event.revision,enabled:false})).status,403);
  assert.equal((await call('command',child,{year:2026,mode,seat:'990003',station:'read',type:'start',revision:0,requestId:'http-test-start'})).status,403);
  assert.equal((await call('lock',token,{})).status,200);assert.equal((await call('card?year=2026&seat=990003',token)).status,401);
  const second=await call('unlock',child,{year:2026,mode,rehearsalRound:initial.data.rehearsalRound,station:'tone'});assert.equal(second.status,200);
  await call('logout',child,{});assert.equal((await call('card?year=2026&seat=990003',second.data.token)).status,401);
 }finally{await call('logout',child,{});}
});
