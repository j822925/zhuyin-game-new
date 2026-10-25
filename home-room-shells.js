import {HOME_ROOM_SHELLS} from './data/home-room-shells.js';
import {adventureMediaUrl} from './adventure-media.js';
const pending=new WeakMap();
const normalizeStyle=style=>style==='original'?'daisy':style;
const keyFor=(style,area)=>normalizeStyle(style)+':'+area;

export function roomShell(art,style,area){
  return art?.roomShells?.[keyFor(style,area)]||null;
}

export function ensureRoomShell(art,style,area){
  const theme=normalizeStyle(style),meta=HOME_ROOM_SHELLS[theme]?.[area];
  if(!meta)return Promise.resolve(null);
  const key=keyFor(theme,area),ready=roomShell(art,theme,area);if(ready)return Promise.resolve(ready);
  let jobs=pending.get(art);if(!jobs){jobs=new Map();pending.set(art,jobs);}
  if(jobs.has(key))return jobs.get(key);
  const task=(async()=>{
    const image=new Image();image.src=adventureMediaUrl(meta.src);await image.decode();
    art.roomShells??={};art.roomShells[key]=image;return image;
  })();
  jobs.set(key,task);task.catch(()=>jobs.delete(key));return task;
}

export function drawRoomShell(ctx,art,style,area){
  const image=roomShell(art,style,area);if(!image)return false;
  const meta=HOME_ROOM_SHELLS[normalizeStyle(style)]?.[area];if(!meta)return false;
  // All skins preserve the same camera and wall corners. Draw one complete
  // image; splitting the wall and floor introduced a visible perspective seam.
  ctx.drawImage(image,0,0,1280,800);return true;
}

// Door frames are painted into these backgrounds. These bounds are interaction
// geometry only; drawing another doorway over them would reintroduce pasted art.
export function roomShellDoorGeometry(area,side){
  const visible=area==='room'||area==='bedroom'?[-1,1]:area==='kitchen'?[-1]:area==='bathroom'?[1]:[];
  if(!visible.includes(side))return null;
  return {x:side<0?80:1200,y:680,width:75,height:410,rise:0,flare:0,entryY:650};
}
