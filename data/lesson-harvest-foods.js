// Six learning paths share one catalog across the farm, seed shop and kitchen.
// Atlas indexes follow this row order; keep existing crop IDs in their old catalogs.
const crops=[
 ['cabbage','高麗菜','🥬','hanzi-reading',1],
 ['spinach','菠菜','🌿','hanzi-writing',1],
 ['peanut','花生','🥜','hanzi-copy',1],
 ['sesame','芝麻','🌾','name-writing',1],
 ['taro','芋頭','🍠','name-copy',2],
 ['pineapple','鳳梨','🍍','arithmetic',2],
];
export const LESSON_CROPS=Object.fromEntries(crops.map(([id,name,icon,lesson],art)=>[id,{name,icon,lesson,art,atlas:'lessonCrops'}]));
export const LESSON_SEEDS=Object.fromEntries(crops.map(([id,name,icon,lesson,price])=>[id,{name,icon,price}]));
// The remaining new harvests are prepared through their recipes before eating.
export const LESSON_RAW_FOOD={pineapple:{name:'鳳梨',energy:10}};
const recipes=[
 ['cabbage-rice','高麗菜燉飯',{cabbage:1,rice:1},40,'把脆甜高麗菜和米飯慢慢燉成暖暖的一碗。'],
 ['spinach-soup','菠菜玉米湯',{spinach:1,corn:1},35,'鮮綠菠菜配上金黃玉米，煮成暖心蔬菜湯。'],
 ['peanut-sweet-soup','花生地瓜甜湯',{peanut:1,'sweet-potato':1},40,'把花生煮軟，再加入香甜地瓜。'],
 ['sesame-noodles','芝麻香麵',{sesame:1,wheat:1},40,'把自種小麥做成麵，拌上香香的芝麻醬。'],
 ['taro-porridge','芋頭米粥',{taro:1,rice:1},45,'綿密芋頭和米粒，一起煮成香暖的粥。'],
 ['pineapple-bowl','鳳梨水果盅',{pineapple:1,tomato:1},35,'把香甜鳳梨和小番茄裝進可愛的小碗。'],
];
export const LESSON_RECIPES=Object.fromEntries(recipes.map(([key,name,ingredients,energy,description],art)=>['lesson-'+key,{name,ingredients,energy,description,art,atlas:'lessonMeals'}]));
