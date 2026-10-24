import {FURNITURE,OUTFITS,eligibility,buyFurniture,buyOutfit} from './adventure-model.js';
import {BAITS,buyBait} from './adventure-bait.js';
import {WALLPAPERS,buyWallpaper} from './adventure-wallpaper.js';
import {SEEDS,buySeed,destinationOpen} from './adventure-exploration-model.js';
import {hasEnergy} from './adventure-food-model.js';
import {SHOP_FOODS} from './data/zone-shop-foods.js';
import {zoneShop,regionalProductAllowed} from './data/zone-shops.js';
export function cartItem(kind,id){const item=kind==='bait'?BAITS[id]:kind==='furniture'?FURNITURE.find(x=>x.id===id):kind==='wallpaper'?WALLPAPERS.find(x=>x.id===id):kind==='clothes'?OUTFITS.find(x=>x.id===id):kind==='seeds'?SEEDS[id]:kind==='meal'?SHOP_FOODS[id]:null;return item&&item.price>0&&!item.giftOnly?{...item,id,kind}:null;}
export const shopIsOpen=(state,id)=>!!zoneShop(id)||destinationOpen(state,id);
export function quoteCart(state,shop,lines){
 const energized=hasEnergy(state);
 if(!shopIsOpen(state,shop))return {ok:false,reason:'🔒 商店尚未開放'};
 if(!Array.isArray(lines)||!lines.length)return {ok:false,reason:'🧺 購物籃還是空的'};
 const seen=new Set();let total=0;
 for(const l of lines){const item=cartItem(l.kind,l.id),key=l.kind+':'+l.id;
  const allowed=zoneShop(shop)?regionalProductAllowed(shop,l.kind,l.id):!item?.zoneShop&&({furniture:['furniture','wallpaper'],clothes:['clothes'],seeds:['seeds','bait']}[shop]||[]).includes(l.kind);
  if(!item||!allowed||seen.has(key)||!Number.isInteger(l.quantity)||l.quantity<1||l.quantity>99||(!['seeds','meal','bait'].includes(l.kind)&&l.quantity!==1))return {ok:false,reason:'商品資料需要重新選擇'};
  if(!energized&&!['seeds','bait'].includes(l.kind))return {ok:false,reason:'🥄 先吃點東西；體力歸零時仍可購買種子和魚餌'};
  seen.add(key);if(l.kind==='furniture'&&state.furnitureOwned.includes(l.id)||l.kind==='wallpaper'&&state.wallpaperOwned.includes(l.id)||l.kind==='clothes'&&!['available','insufficient'].includes(eligibility(state,l.id)))return {ok:false,reason:'✓ 已擁有，或還不能使用'};
  if(l.kind==='seeds'&&(state.life.seeds[l.id]||0)+l.quantity>9999)return {ok:false,reason:'🎒 種子已滿'};
  if(l.kind==='bait'&&(state.life.bait?.[l.id]||0)+l.quantity>9999)return {ok:false,reason:'🎒 魚餌已滿'};
  if(l.kind==='meal'&&(state.life.nutrition.meals[l.id]||0)+l.quantity>9999)return {ok:false,reason:'🎒 食物籃已滿'};
  total+=item.price*l.quantity;
 }
 return {ok:Number.isSafeInteger(state.stars)&&state.stars>=total,total,remaining:state.stars-total,reason:state.stars<total?'✦ 星幣不夠，再去練習或探險吧':''};
}
export function checkoutCart(state,shop,lines){
 const quote=quoteCart(state,shop,lines);if(!quote.ok)return quote;const next=structuredClone(state);
 for(const l of lines)for(let i=0;i<l.quantity;i++){if(l.kind==='meal'){next.stars-=SHOP_FOODS[l.id].price;next.life.nutrition.meals[l.id]=(next.life.nutrition.meals[l.id]||0)+1;continue;}const fn={furniture:buyFurniture,clothes:buyOutfit,wallpaper:buyWallpaper,seeds:buySeed,bait:buyBait}[l.kind];if(!fn(next,l.id))return {ok:false,reason:'這件商品暫時無法購買'};}
 Object.assign(state,next);return {...quote,ok:true};
}
