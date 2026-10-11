import {BAITS,FISH_SALE_PRICE} from './adventure-bait.js';
import {FURNITURE,OUTFITS,outfitIsWorn} from './adventure-model.js';
import {STARTER_FURNITURE} from './data/home-furniture.js';
import {WALLPAPERS} from './adventure-wallpaper.js';
import {SEEDS,DESTINATIONS} from './adventure-exploration-model.js';
import {zoneShop} from './data/zone-shops.js';
import {CROPS,FISH} from './adventure-life-model.js';
import {RECIPES,hasEnergy} from './adventure-food-model.js';
import {shopIsOpen} from './adventure-cart-model.js';

export const TRADE_KINDS={all:'全部',furniture:'家具',wallpaper:'風格',clothes:'服飾',bait:'魚餌',seeds:'種子',meal:'料理',harvest:'收穫',fish:'魚'};
const UNIQUE={furniture:'furnitureOwned',wallpaper:'wallpaperOwned',clothes:'owned'};
const stack=(s,kind)=>({bait:s.life?.bait,seeds:s.life?.seeds,meal:s.life?.nutrition?.meals,harvest:s.life?.harvest,fish:s.life?.fish})[kind];
export function ownedQuantity(s,kind,id){return UNIQUE[kind]?(s[UNIQUE[kind]]||[]).includes(id)?1:0:stack(s,kind)?.[id]||0;}
export function shopAcceptsItem(shop,kind,id){
 if(shop==='clothes')return kind==='clothes';
 if(shop==='furniture')return ['furniture','wallpaper'].includes(kind);
 if(shop==='seeds')return ['seeds','harvest','bait','fish'].includes(kind);
 const region=zoneShop(shop);if(!region)return false;
 if(region.products.some(p=>p.kind==='meal')&&['meal','harvest','fish'].includes(kind))return true;
 return region.products.some(p=>p.kind===kind&&p.id===id)||kind==='furniture'&&id===region.gift;
}
export function inventoryItems(s,shop=null){
 const catalogs={bait:Object.entries(BAITS).map(([id,v])=>({...v,id})),furniture:FURNITURE,wallpaper:WALLPAPERS,clothes:OUTFITS,seeds:Object.entries(SEEDS).map(([id,v])=>({...v,id})),meal:Object.entries(RECIPES).map(([id,v])=>({...v,id})),harvest:Object.entries(CROPS).map(([id,v])=>({...v,id})),fish:Object.entries(FISH).map(([id,v])=>({...v,id,icon:'🐟'}))};
 return Object.entries(catalogs).flatMap(([kind,items])=>items.map(item=>{
  const quantity=ownedQuantity(s,kind,item.id);let sellPrice=Math.floor((item.resaleBase??item.price??0)/2),reason='';
  if(kind==='harvest')sellPrice=item.id==='pumpkin'?2:1;
  else if(kind==='fish')sellPrice=FISH_SALE_PRICE[item.id];
  else if(kind==='meal'&&!item.buyOnly)sellPrice={soup:2,tomatoFish:3,cornCup:3,pumpkinPlate:3}[item.id]||1;
  else if(!item.price||item.starter||STARTER_FURNITURE.includes(item.id))reason='初始贈品';
  else if(sellPrice===0)reason='半價不足 1 星幣，保留使用';
  if(item.giftOnly)reason='好友紀念品';
  if(kind==='furniture'&&['layout','bedroomLayout','kitchenLayout','bathroomLayout'].some(k=>s[k]?.some(v=>v.id===item.id)))reason=reason||'擺放中，先收納';
  if(kind==='clothes'&&outfitIsWorn(s,item.id))reason=reason||'穿著中';
  if(kind==='wallpaper'&&s.wallpaper===item.id)reason=reason||'使用中';
  return {...item,kind,quantity,sellPrice:reason?0:sellPrice,sellReason:reason};
 }).filter(v=>Number.isSafeInteger(v.quantity)&&v.quantity>0&&(!shop||shopAcceptsItem(shop,v.kind,v.id))));
}
export function quoteSale(s,shop,lines){
 if(!hasEnergy(s))return {ok:false,reason:'🥄 先吃點東西'};
 if(!shopIsOpen(s,shop)||(!zoneShop(shop)&&!DESTINATIONS.some(d=>d.id===shop&&d.kind==='shop')))return {ok:false,reason:'🔒 商店尚未開放'};
 if(!Array.isArray(lines)||!lines.length)return {ok:false,reason:'賣出籃還是空的'};
 const inventory=new Map(inventoryItems(s,shop).map(v=>[v.kind+':'+v.id,v])),seen=new Set();let total=0;
 for(const line of lines){if(!line||typeof line!=='object')return {ok:false,reason:'請重新選擇物品'};const key=line.kind+':'+line.id,item=inventory.get(key);
  if(!item||seen.has(key)||!Number.isInteger(line.quantity)||line.quantity<1||line.quantity>99||line.quantity>item.quantity)return {ok:false,reason:'持有數量已改變，請重新選擇'};
  if(item.sellReason)return {ok:false,reason:item.name+'：'+item.sellReason};
  seen.add(key);total+=item.sellPrice*line.quantity;
 }
 if(!Number.isSafeInteger(s.stars)||s.stars<0||!Number.isSafeInteger(s.stars+total))return {ok:false,reason:'✦ 金額過大，請減少賣出數量'};
 return {ok:true,total,remaining:s.stars+total};
}
export function checkoutSale(s,shop,lines){
 const quote=quoteSale(s,shop,lines);if(!quote.ok)return quote;
 const next=structuredClone(s);
 for(const line of lines){if(UNIQUE[line.kind])next[UNIQUE[line.kind]]=next[UNIQUE[line.kind]].filter(id=>id!==line.id);else stack(next,line.kind)[line.id]-=line.quantity;}
 next.stars=quote.remaining;Object.assign(s,next);return quote;
}
