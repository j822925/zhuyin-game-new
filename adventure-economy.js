export const FOREST_ECONOMY_VERSION='20261011-economy2';
const basic={ 'daisy-fridge':20,'daisy-sink':15,'daisy-stool':10,'daisy-complete-cabinet':15,'daisy-complete-tub':20,'daisy-complete-toilet':10,'daisy-complete-desk':20,'wall-towel':8,'wall-towel-shelf':15 };
export function priceFurniture(item){
 if(item.starter||item.giftOnly||!item.price)return item;
 // New collections carry reviewed final shelf prices; legacy catalog pricing stays unchanged.
 if(['20261022','20261025'].includes(item.priceVersion))return {...item,resaleBase:item.price};
 const old=item.price,large=item.height>=150||item.fw>=160;
 const price=basic[item.id]??(item.zoneShop?Math.min(120,Math.max(35,Math.ceil(old*2/5)*5)):item.style==='moon'?Math.min(120,Math.max(45,Math.ceil(old*2/5)*5)):large?Math.min(100,Math.max(60,Math.ceil(old*1.8/5)*5)):Math.min(60,Math.max(25,Math.ceil(old*1.8/5)*5)));
 return {...item,price,resaleBase:Math.min(price,old)};
}
export function battleRewardLimit({mode='single',level=1,boss=false,chief=false}={}){
 return (mode==='single'?3:4)+Math.min(2,Math.floor((level-1)/10))+(boss?3:chief?2:0);
}
export function earnedBattleReward(limit,correct){return Math.min(limit,Math.max(0,Math.floor(correct))*2);}
