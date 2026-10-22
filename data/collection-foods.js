// Independent catalog shared by farming, cooking, shops and save sanitization.
const cropRows=[
 ['potato','馬鈴薯','🥔','single',1],['sweet-potato','地瓜','🍠','spelling',1],
 ['onion','洋蔥','🧅','spelling',1],['broccoli','花椰菜','🥦','tone',2],
 ['eggplant','茄子','🍆','reading',1],['pepper','甜椒','🫑','tone',2],
 ['peas','甜豌豆','🫛','single',1],['rice','稻米','🌾','reading',2],
 ['wheat','小麥','🌾','spelling',2],['watermelon','西瓜','🍉','single',2],
 ['melon','香瓜','🍈','tone',2],['radish','白蘿蔔','🥬','reading',1],
];
export const COLLECTION_CROPS=Object.fromEntries(cropRows.map(([id,name,icon,lesson,price],art)=>[id,{name,icon,lesson,art,atlas:'collectionCrops'}]));
export const COLLECTION_SEEDS=Object.fromEntries(cropRows.map(([id,name,icon,lesson,price])=>[id,{name,icon,price}]));
const fishRows=[
 ['圓肚鯉魚','#bd9869'],['紅尾鯉魚','#d98570'],['青背草魚','#6b9b7b'],['銀腹鰱魚','#b6c6c9'],
 ['點點鱒魚','#c796aa'],['鬍鬚鯰魚','#6f8a9b'],['溪光香魚','#acb373'],['山泉溪哥','#91b9cb'],
 ['花斑鱸魚','#8f9b6b'],['圓鰭吳郭魚','#bd9d98'],['金線鯝魚','#dbb361'],['湖光鯿魚','#b3a6d1'],
];
export const COLLECTION_FISH=Object.fromEntries(fishRows.map(([name,color],art)=>['collection-fish-'+art,{name,color,art,atlas:'collectionFish',weight:art<6?5:art<10?4:2,rarity:art<6?'常見':art<10?'少見':'稀有',salePrice:art<10?1:2}]));
export const COLLECTION_RAW_FOOD={pepper:{name:'甜椒',energy:7},peas:{name:'甜豌豆',energy:6},watermelon:{name:'西瓜',energy:10},melon:{name:'香瓜',energy:10},radish:{name:'白蘿蔔',energy:6}};
const homemade=[
 ['sweetSoup','地瓜暖湯',{'sweet-potato':1,carrot:1},35,'把香甜地瓜和紅蘿蔔煮成暖湯。'],
 ['cornMash','玉米薯泥',{potato:1,corn:1},40,'綿密馬鈴薯，配上甜甜玉米。'],
 ['gardenRice','田園燉飯',{rice:1,broccoli:1,tomato:1,eggplant:1},50,'把田裡的蔬菜慢慢燉進米飯。'],
 ['gardenNoodles','番茄蔬菜麵',{wheat:1,tomato:1,onion:1},50,'自種小麥做麵，淋上番茄洋蔥醬。'],
 ['fishPorridge','鮮魚米粥',{fish:1,rice:1,radish:1},55,'把釣到的魚和白蘿蔔煮成柔軟米粥。'],
 ['melonBowl','雙瓜水果盅',{watermelon:1,melon:1},35,'西瓜與香瓜切成小塊，清甜又多汁。'],
];
export const COLLECTION_RECIPES=Object.fromEntries(homemade.map(([key,name,ingredients,energy,description],art)=>['collection-'+key,{name,ingredients,energy,description,art,atlas:'collectionHomeMeals'}]));
const shopRows=[
 ['暖沙飯糰',8,50],['香烤地瓜餐',8,55],['田園濃湯餐',10,65],['蔬菜燉飯餐',12,75],
 ['南瓜濃湯餐',10,65],['香草烤魚餐',14,85],['甜椒焗飯餐',12,75],['鮮魚米粥餐',12,80],
 ['番茄蔬菜麵',12,75],['玉米薯泥盅',10,65],['雙色蔬菜飯',10,65],['暖沙野餐盒',16,95],
];
export const COLLECTION_SHOP_FOODS=Object.fromEntries(shopRows.map(([name,price,energy],art)=>['collection-sand-'+(art+1),{name,price,energy,art,atlas:'collectionMeals',ingredients:{},buyOnly:true,description:'暖沙小吃店的大份外帶餐，已放進食物籃。'}]));
