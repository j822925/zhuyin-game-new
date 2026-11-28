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
const mealSheets = [
  ['classMeals', dishes],
  ['classSnacksA', [
    ['pineapple-square','鳳梨小方酥',85],
    ['pearl-pudding','黑糖珍珠奶酪',90],
    ['sesame-bun','芝麻螺旋花捲',85],
    ['orange-agar','橘瓣寒天',70],
    ['bear-paw-cookie','可可熊掌餅',80],
    ['taro-bites','香芋小丸子',90],
    ['lemon-honey-cake','蜂蜜檸檬蛋糕',95],
    ['apple-rose-tart','蘋果玫瑰塔',100],
    ['red-bean-dorayaki','紅豆銅鑼燒',90],
    ['nori-rice-bars','海苔米香棒',75]
  ]],
  ['classSnacksB', [
    ['osmanthus-dumplings','桂花小湯圓',95],
    ['banana-choc-pop','香蕉可可冰棒',80],
    ['strawberry-puff','草莓鮮奶泡芙',90],
    ['scallion-palmier','香蔥蝴蝶酥',80],
    ['carrot-bunny-bun','胡蘿蔔兔耳饅頭',85],
    ['sesame-yam-chips','芝麻地瓜脆片',75],
    ['mango-sago','芒果椰奶西米露',100],
    ['peanut-sandwich','花生夾心餅',85],
    ['candied-grapes','葡萄糖葫蘆',75],
    ['cactus-gummies','仙人掌雙色軟糖',70]
  ]]
];
const furnitureSheets = [
  ['classFurniture', furnishings],
  ['classDecorA', [
    ['ladybug-note-clip','瓢蟲便條夾',50,40,24,{small:true}],
    ['rainboot-planter','雨靴小花盆',69,55,32,{small:true}],
    ['paper-plane-weight','紙飛機鎮紙',37,53,27,{small:true}],
    ['orange-wall-clock','橘子切片壁鐘',73,65,12,{wall:true}],
    ['pinwheel-stand','彩色風車擺件',70,50,28,{small:true}],
    ['bear-tape-measure','小熊捲尺',45,44,25,{small:true}],
    ['pigeon-mailbox','信鴿小郵筒',67,55,34,{small:true}],
    ['crab-glasses-stand','螃蟹眼鏡架',52,63,30,{small:true}],
    ['pebble-stack','彩石疊疊樂',57,44,27,{small:true}],
    ['puppy-doorstop','小狗門擋',54,67,36]
  ]],
  ['classDecorB', [
    ['goose-tissue-case','白鵝面紙套',58,64,32,{small:true}],
    ['checker-footstool','棋盤格小腳凳',59,68,42],
    ['raindrop-mobile','雨滴小吊飾',72,66,12,{wall:true}],
    ['lotus-soap-dish','荷葉肥皂碟',37,48,25,{small:true}],
    ['snail-tape-holder','蝸牛膠帶臺',53,57,31,{small:true}],
    ['onigiri-cushion','海苔飯糰抱枕',60,63,38],
    ['starfish-photo-stand','海星相片架',64,50,29,{small:true}],
    ['striped-spinning-top','彩紋木陀螺',45,40,24,{small:true}],
    ['teacup-birdbath','茶杯小鳥浴盆',72,68,37],
    ['pompom-rug','毛線彩球圓墊',62,115,67,{flat:true}]
  ]]
];
const exclusive = {rewardOnly:true, giftOnly:true, price:0};
export const CLASS_MEALS = mealSheets.flatMap(([atlas,rows])=>rows.map(([key,name,energy],art)=>({
  ...exclusive, id:'classmeal-'+key, name, kind:'meal', energy, atlas, art, ingredients:{}
})));
export const CLASS_FURNITURE = furnitureSheets.flatMap(([atlas,rows])=>rows.map(([key,name,height,fw,fh,options],index)=>({
  ...exclusive, id:'classdecor-'+key, name, kind:'furniture', style:'classroom', atlas, index, height, fw, fh, ...options
})));
export function drawClassRewards(perfect) {
  const draw = items => items[Math.floor(Math.random()*items.length)];
  return perfect ? [draw(CLASS_MEALS),draw(CLASS_FURNITURE)] : [draw(CLASS_MEALS)];
}
