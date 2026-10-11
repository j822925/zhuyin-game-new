const rows=[
 ['bud','花芽原野',1,3,500,445,'stone','花冠之主','single','先聽聽森林的聲音吧。','讓你看看花冠下的祕密！'],
 ['stone','咕咕石巷',3,6,622,345,'stone','石堡公爵','spelling','石巷的謎題，你準備好了嗎？','石翼，展開！'],
 ['sand','暖沙灣',3,6,597,506,'sand','耀沙守衛','single','海風帶來了新的挑戰者。','潮沙之甲，覺醒！'],
 ['sail','風帆草原',9,11,653,276,'sail','風帆騎士','spelling','跟上風的節奏吧！','乘風的羽翼，回來吧！'],
 ['shell','銀貝潮灘',12,15,548,563,'shell','銀貝女王','tone','每個聲調，都是一顆珍珠。','聽見珍珠的歌聲了嗎？'],
 ['whale','鯨夢洞',15,17,729,206,'whale','鯨冠法師','tone','別著急，夢裡也能慢慢思考。','鯨夢之身，甦醒！'],
 ['watch','玄潮守望',18,21,839,147,'watch','玄潮守護者','spelling','勇氣，也包括守住自己。','玄岩之軀，守望深海！'],
 ['port','暮光燈港',21,23,511,619,'port','提燈船長','single','沿著燈光，來一場冒險吧。','深海的朋友，借我力量！'],
 ['bridge','星門長橋',24,26,968,101,'bridge','星翼女帝','tone','一步一步，就能走到星光彼岸。','星翼真身，降臨！'],
 ['deep','幻潮深境',27,30,399,697,'deep','幻潮龍皇','spelling','能走到這裡，你已經很了不起。','現在，面對真正的幻潮！'],
];
export const ZONES=rows.map(([id,name,level,maxLevel,x,y,scene,boss,mode,intro,transform],i)=>({id,name,level,maxLevel,x:x*2,y:y*2,scene,boss,mode,intro,transform,index:i,minions:3,icon:['🌿','🏰','🐚','⛵','🦪','🐋','🪨','🏮','🌟','🐉'][i],human:`assets/expedition/jrpg-${i<5?'a':'b'}-${i%5}.webp`,beast:`assets/expedition/boss-${i<5?'a':'b'}-${i%5}.webp`}));
export const zoneById=id=>ZONES.find(z=>z.id===id);
ZONES.find(z=>z.id==='shell').beast='assets/expedition/shell-beast.webp';
export const MINIONS=[
 {name:'嫩芽團子',art:0},{name:'咕咕石寶',art:1},{name:'沙沙蟹',art:2},
 {name:'風帆棉雲',art:3},{name:'珍珠蝸蝸',art:4},{name:'星星小鯨',art:5},
];

// A challenge is a friendly practice visit, never an attack on the guardian.
const guardianLines=[
 ['一起聽聽森林的聲音吧！切磋後，我們就是朋友。','我換回花冠獸形，陪你再練習一下！','好朋友回來了！今天也一起聽音練習吧。'],
 ['歡迎來石巷！要和我拼拼注音、交個朋友嗎？','石翼展開！換個樣子和你繼續切磋。','朋友，歡迎回來！今天要再拼一次嗎？'],
 ['海風帶來了新朋友！來場輕鬆的切磋吧。','換上潮沙之甲，我們繼續練習！','又見面了！聽聽今天的海風吧。'],
 ['跟著風的節奏，來和我一起練習吧！','乘風的羽翼！別急，慢慢回答就好。','朋友，要不要再跟我乘風練習？'],
 ['每個聲調都是珍珠，一起試試看吧！','珍珠獸形登場！我們繼續聽聲調。','歡迎回來，我的珍珠朋友！'],
 ['別著急，夢裡也能慢慢思考。一起切磋吧！','我換回小鯨的樣子，再陪你練習。','朋友，今天又帶來了什麼新夢呢？'],
 ['勇氣也包括嘗試。來和我練習守住自己吧！','玄岩之軀！跟著自己的步調回答。','很高興再見到你，要再練習一場嗎？'],
 ['沿著燈光走，這裡有朋友等你切磋。','深海的樣子登場！我們繼續練習吧。','老朋友，燈一直為你留著！'],
 ['一步一步學習，就能走到星光彼岸。試試吧！','星翼展開！你已經很努力了。','朋友，今天也一起往星光前進吧！'],
 ['走到這裡真不容易。來場友善的最終切磋吧！','讓你看看我的龍形，我們繼續加油！','好朋友，幻潮深境隨時歡迎你！'],
];
ZONES.forEach((z,i)=>{[z.intro,z.transform,z.friendIntro]=guardianLines[i];z.limitedGift='gift-'+z.id;});
