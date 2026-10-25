import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {HOME_ROOM_SHELLS} from '../data/home-room-shells.js';
import {ensureRoomShell,roomShell,drawRoomShell,roomShellDoorGeometry} from '../home-room-shells.js';

test('all six themes have four distinct compressed, room-sized shells',()=>{
  const sources=[];
  for(const style of ['daisy','fox','moon','honey','ocean','berry'])for(const area of ['room','kitchen','bedroom','bathroom']){
    const meta=HOME_ROOM_SHELLS[style][area],file=new URL('../'+meta.src,import.meta.url),buffer=readFileSync(file);
    assert.equal(meta.width,1280);assert.equal(meta.height,800);assert.equal(meta.backY,undefined);assert.equal(statSync(file).size,meta.bytes);
    assert.match(meta.src,/^assets\/home-rooms-v3\/[a-z]+-[a-z]+-[a-f0-9]{12}\.webp$/);
    assert.equal(buffer.toString('ascii',0,4),'RIFF');assert.equal(buffer.toString('ascii',8,12),'WEBP');sources.push(meta.src);
  }
  assert.equal(new Set(sources).size,24);
});

test('room shell loading is per room and per art object with concurrent deduplication and retry',async()=>{
  const old=globalThis.Image,created=[];let shouldReject=false;
  globalThis.Image=class {constructor(){created.push(this);} async decode(){if(shouldReject)throw Error('temporary image failure');}};
  try{
    const art={},first=ensureRoomShell(art,'moon','kitchen');assert.equal(first,ensureRoomShell(art,'moon','kitchen'));
    const image=await first;assert.equal(created.length,1);assert.equal(image.src,HOME_ROOM_SHELLS.moon.kitchen.src);assert.equal(roomShell(art,'moon','kitchen'),image);
    assert.equal(await ensureRoomShell(art,'moon','kitchen'),image);assert.equal(created.length,1);assert.equal(roomShell(art,'moon','bedroom'),null);
    assert.equal(await ensureRoomShell(art,'missing','kitchen'),null);assert.equal(await ensureRoomShell(art,'moon','forest'),null);assert.equal(created.length,1);
    await ensureRoomShell({},'moon','kitchen');assert.equal(created.length,2);
    shouldReject=true;await assert.rejects(ensureRoomShell(art,'moon','bathroom'));assert.equal(roomShell(art,'moon','bathroom'),null);
    shouldReject=false;await ensureRoomShell(art,'moon','bathroom');assert.equal(created.length,4);
    const original=await ensureRoomShell(art,'original','room');assert.equal(original.src,HOME_ROOM_SHELLS.daisy.room.src);assert.equal(roomShell(art,'daisy','room'),original);
  }finally{globalThis.Image=old;}
});

test('drawing has a safe fallback and painted door hotspots only exist at actual room doors',()=>{
  const args=[],ctx={drawImage(...value){args.push(value);}},image={};
  assert.equal(drawRoomShell(ctx,{},'moon','kitchen'),false);assert.equal(args.length,0);
  assert.equal(drawRoomShell(ctx,{roomShells:{'moon:kitchen':image}},'moon','kitchen'),true);
  assert.deepEqual(args,[[image,0,0,1280,800]]);
  for(const area of ['room','bedroom'])for(const side of [-1,1])assert(roomShellDoorGeometry(area,side));
  assert.equal(roomShellDoorGeometry('kitchen',1),null);assert.equal(roomShellDoorGeometry('bathroom',-1),null);assert.equal(roomShellDoorGeometry('forest',-1),null);
  const left=roomShellDoorGeometry('kitchen',-1),right=roomShellDoorGeometry('bathroom',1);
  assert.equal(left.x,80);assert.equal(right.x,1200);assert.equal(left.y,680);assert.equal(left.y-left.height,270);assert.equal(left.entryY,650);
  assert.equal(left.x+right.x,1280);assert.equal(left.width,right.width);assert.equal(left.height,right.height);
});
