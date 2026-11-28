// Positions use the footprint on the painted 3:2 map, in percent.
const districts={
 bud:['花籃小徑','06','花瓣精靈','正在照顧花苗','🌱','我剛在花牌上寫了「芽」。你看，草字頭下面藏著一顆小小的牙！','等這排花芽開了，我就把第一朵送去生活舖。'],
 stone:['石鈴里','54','峨岩小巨人','正在鋪石路','🪨','我把三塊圓石排好，又搬來兩塊。數一數，五塊剛好鋪到玩具店門口！','走上去聽聽看，最後一塊會叮地響一聲。'],
 sand:['潮音小埕','32','泡光領航員','正在整理浮標','🛟','我給浮標寫了「海」字。左邊三點水，就是提醒大家這條路通往海邊。','等潮水回來，這些浮標會排成一條回家的路。'],
 sail:['竹灣船匠里','13','疾風足球員','正在排練傳球','⚽','風把四個練習球吹走一個，我追回來以前，只剩三個可以傳了。','幫我看看船帆往哪邊飄！海風吹來，我就把球往那邊踢。'],
 shell:['拾貝巷','27','海洋探險家','正在分類貝殼','🐚','你看，這個「貝」字像不像一個直立的小貝殼？我想把它描在收藏盒上。','白色的殼排一排，最小的那顆要留給第一次來海邊的人。'],
 whale:['鯨燈洞里','64','耳語夢巡者','正在點亮夢燈','🏮','洞口亮了兩盞燈，轉角還有三盞。五盞全亮，小鯨夢裡也找得到家。','噓，聽到了嗎？水滴正在替牠唱晚安歌。'],
 watch:['玄岩堡里','11','蒼葉劍士','正在修整路牌','🪵','路牌上的「林」，是兩棵木站在一起。我扶著這一邊，你幫我看看有沒有寫正。','有了這塊牌子，送家具的人就找得到林間小路了。'],
 port:['燈塔街','59','歐若拉燈使','正在巡查街燈','💡','我帶來六顆燈泡，換好了兩盞燈，袋子裡還有四顆。','等天暗下來，漁船就能跟著燈光進港。'],
 bridge:['星穗橋里','12','星航太空人','正在核對星圖','✨','我在找星圖上的「明」字。左邊是日，右邊是月，合在一起就亮起來了。','看到橋那頭的雙星了嗎？那就是今晚的路標。'],
 deep:['紫潮晶巷','53','歐泊月姬','正在排列月石','🔮','桌上有七顆月石，我把三顆送去飾品店，還有四顆可以拼成小月亮。','把最亮的那一顆放在尖尖的地方，你看，像不像？']
};
export const neighborhoods=Object.fromEntries(Object.entries(districts).map(([id,[name,sprite,resident,work,icon,...lines]])=>[id,{name,sprite,resident,work,icon,lines}]));
const regionDirectory=id=>id==='stone'||id==='sail'?'assets/regions-coast/':'assets/regions-v2/';
export const neighborhoodArt=(id,village=false)=>regionDirectory(id)+id+(village?'-village':'-field')+'.webp';


export const regionalBattleArt=id=>regionDirectory(id)+id+'-battle.webp';
