export const VISIT_ROOMS=['forest','room','bedroom','kitchen','bathroom'];
export const VISIT_LAYOUTS=['layout','bedroomLayout','kitchenLayout','bathroomLayout'];
export const VISIT_EMOTES=['👋','😊','❤️','👏'];
export const UNIQUE_GIFTS={furniture:'furnitureOwned',wallpaper:'wallpaperOwned',clothes:'owned'};
const bounded=(n,min,max)=>Number.isFinite(n)?Math.max(min,Math.min(max,n)):min;
const identifier=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,70}$/.test(v)?v:'';
// Explicit public projection: never spread a student's save into a visit response.
export function islandSnapshot(state={}){
 const out={version:1,wallpaper:identifier(state.wallpaper)||'original'};
 for(const key of VISIT_LAYOUTS)out[key]=(Array.isArray(state[key])?state[key]:[]).slice(0,180).filter(v=>v&&identifier(v.id)).map(v=>({id:v.id,x:bounded(v.x,0,1280),y:bounded(v.y,0,800),...(identifier(v.on)?{on:v.on,surface:bounded(v.surface,0,5),offsetX:bounded(v.offsetX,-300,300)}:{})}));
 return out;
}
export function giftStack(state,kind,create=false){
 if(create){state.life??={};state.life.nutrition??={};}
 const target=kind==='meal'?state.life?.nutrition:state.life,key={bait:'bait',seeds:'seeds',meal:'meals',harvest:'harvest',fish:'fish'}[kind];
 if(!key)return null;if(create)target[key]??={};return target?.[key];
}
export function giftQuantity(state,kind,id){return UNIQUE_GIFTS[kind]?(state[UNIQUE_GIFTS[kind]]||[]).includes(id)?1:0:giftStack(state,kind)?.[id]||0;}
export function giftBlocked(state,item){
 if(!item||item.protected)return '這是保留物品，不能送出';
 if(item.kind==='furniture'&&VISIT_LAYOUTS.some(k=>state[k]?.some(v=>v.id===item.id)))return '先把物品收納，再送給朋友';
 if(item.kind==='clothes'&&(state.outfit===item.id||Object.values(state.companionOutfits||{}).includes(item.id)))return '先換下這套衣服';
 if(item.kind==='wallpaper'&&state.wallpaper===item.id)return '先換掉使用中的室內風格';
 return '';
}
export function changeGift(state,item,amount){
 const next=structuredClone(state),qty=giftQuantity(next,item.kind,item.id);
 if(!Number.isSafeInteger(amount)||!Number.isSafeInteger(qty)||qty+amount<0||qty+amount>9999)throw Error('gift_quantity');
 const key=UNIQUE_GIFTS[item.kind];
 if(key){if(qty+amount>1)throw Error('gift_owned');next[key]=(next[key]||[]).filter(id=>id!==item.id);if(qty+amount===1)next[key].push(item.id);}
 else giftStack(next,item.kind,true)[item.id]=qty+amount;
 return next;
}
export function cleanVisitPose(p){
 if(!p||!VISIT_ROOMS.includes(p.room)||!Number.isFinite(p.x)||!Number.isFinite(p.y))return null;
 return {room:p.room,x:bounded(p.x,40,1240),y:bounded(p.y,120,770),direction:bounded(Math.floor(p.direction||0),0,3),moving:p.moving===true,emote:VISIT_EMOTES.includes(p.emote)?p.emote:'',character:identifier(p.character)||'rabbit',outfit:identifier(p.outfit)||'daisy'};
}
