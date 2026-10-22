// Stable IDs are separate from names; visiting a shop never creates a new expedition run.
import {collectionRegionalProducts} from './collection-zone-furniture.js';
const furniture=ids=>ids.map(id=>({kind:'furniture',id}));
const rows=[
 ['bud','花芽生活舖','🌼','森林精靈','furniture','今天想帶一點花草回家嗎？',['bud-daisies','wall-plant-shelf','wall-picture','berry-hanging-vase'],'boutiqueRoom'],
 ['stone','咕咕玩具店','🧸','荷葉蛙','seeds','呱！玩具在等新的小主人喔。',['plush-0','plush-1','plush-2','plush-6','honey-play'],'boutiqueRoom'],
 ['sand','暖沙小吃店','🍲','荷葉蛙','seeds','今天想吃什麼？外帶料理可以留到探險時吃。',[],'boutiqueRoom'],
 ['sail','風鈴樂器行','🎵','星河織夢師','clothes','挑一件樂器，回家奏出自己的旋律吧。',['sail-piano','sail-drum','port-radio','honey-play'],'boutiqueRoom'],
 ['shell','銀貝特產舖','🐚','森林精靈','furniture','海邊的小紀念品和香甜料理，都在這裡。',['shell-picture','ocean-whale-picture','plush-7'],'boutiqueRoom'],
 ['whale','鯨夢寵物用品店','🐾','荷葉蛙','seeds','先布置一個舒服的小角落吧！這裡的娃娃不會跟著走喔。',['whale-petbed','plush-5','plush-3','ocean-aquarium'],'boutiqueRoom'],
 ['watch','玄岩高級家具店','🪑','森林精靈','furniture','慢慢挑，找到最喜歡的那一件。',['watch-chair','moon-sofa','moon-bed','moon-table','deep-lamp'],'boutiqueRoom'],
 ['port','暮光電器行','📻','森林精靈','furniture','歡迎！讓小屋多一點燈光、音樂和生活的樂趣。',['port-fridge','port-tv','port-radio','port-fan','port-washer','port-toaster'],'electricRoom'],
 ['bridge','星光販賣機','🌟','星光販賣機','clothes','看中哪隻娃娃就選哪隻，確認付款後直接帶回家！',Array.from({length:12},(_,i)=>'plush-'+i),'boutiqueRoom'],
 ['deep','幻潮魔法飾品店','🔮','星河織夢師','clothes','把一點幻潮星光，帶回自己的小屋吧。',['deep-lamp','deep-mirror','plush-4','plush-11','moon-lamp'],'boutiqueRoom'],
];
const owners=[["rose","花瓣精靈"],["cat","奶糖貓"],["bear","蜂蜜熊"],["owl","星夜貓頭鷹"],["sea","海泡精靈"],["penguin","冰糖企鵝"],["lion","太陽獅"],["mecha","藍盾機甲"],["rainbow","彩虹精靈"],["moon","月光精靈"]];
export const ZONE_SHOPS=rows.map(([zone,name,icon,owner,ownerArt,greeting,ids,room],i)=>({id:'region-'+zone,zone,name,icon,owner:owners[i][1],ownerId:owners[i][0],ownerArt,greeting:greeting.replace('呱！',''),room,kind:'shop',price:0,ready:true,products:[...furniture(ids),...(zone==='sand'?[{kind:'meal',id:'sandSoup'},{kind:'meal',id:'sandFish'}]:zone==='shell'?[{kind:'meal',id:'shellCorn'}]:[]),...collectionRegionalProducts(zone)],gift:'gift-'+zone}));
export const zoneShop=id=>ZONE_SHOPS.find(s=>s.id===id||s.zone===id);
export const regionalProductAllowed=(shop,kind,id)=>!!zoneShop(shop)?.products.some(p=>p.kind===kind&&p.id===id);
