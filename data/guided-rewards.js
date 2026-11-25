const dishes = [
  ['berry-crescent', '藍莓月牙鬆餅', 70],
  ['sushi-boat', '海苔小船壽司', 85],
  ['pumpkin-lion', '南瓜小獅飯糰', 95],
  ['tomato-pinwheel', '番茄風車蛋捲', 80],
  ['corn-cloud', '玉米雲朵蒸糕', 75],
  ['berry-book', '草莓書本三明治', 90],
  ['turtle-bread', '抹茶小龜麵包', 85],
  ['sunflower-jelly', '柚香向日葵果凍', 70],
  ['fish-pastry', '小魚紅豆燒', 80],
  ['pepper-pasta', '彩椒螺旋麵盅', 100]
];
const furnishings = [
  ['pencil-stool', '鉛筆小木凳', 84, 76, 46],
  ['whale-bookends', '鯨尾書擋', 62, 75, 34, {small:true}],
  ['acorn-rack', '橡果掛帽架', 146, 78, 38],
  ['boat-shelf', '帆船小書架', 123, 110, 43],
  ['pencil-cup', '彩虹鉛筆筒', 56, 48, 26, {small:true}],
  ['letter-bin', '信封收納籃', 65, 70, 38],
  ['mushroom-lamp', '蘑菇閱讀燈', 81, 60, 35, {small:true}],
  ['cloud-board', '雲朵留言板', 86, 124, 15, {wall:true}],
  ['melon-mat', '西瓜半圓地墊', 65, 145, 74, {flat:true}],
  ['house-calendar', '小屋翻頁桌曆', 59, 70, 30, {small:true}]
];
const exclusive = {rewardOnly:true, giftOnly:true, price:0};
export const CLASS_MEALS = dishes.map(([key,name,energy],art) => ({
  ...exclusive, id:'classmeal-'+key, name, kind:'meal', energy, atlas:'classMeals', art, ingredients:{}
}));
export const CLASS_FURNITURE = furnishings.map(([key,name,height,fw,fh,options],index) => ({
  ...exclusive, id:'classdecor-'+key, name, kind:'furniture', style:'classroom', atlas:'classFurniture',
  index, height, fw, fh, ...options
}));
export function drawClassRewards(perfect) {
  const draw = items => items[Math.floor(Math.random()*items.length)];
  return perfect ? [draw(CLASS_MEALS),draw(CLASS_FURNITURE)] : [draw(CLASS_MEALS)];
}
