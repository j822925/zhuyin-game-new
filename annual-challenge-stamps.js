// One shared catalog keeps the child's choice and teacher's final award aligned.
const groups={
 listen:[['owl','聰明貓頭鷹'],['deer','小鹿'],['elephant','小象'],['koala','無尾熊'],['dolphin','海豚']],
 tone:[['rabbit','小白兔'],['bird','小鳥'],['frog','青蛙'],['penguin','企鵝'],['chick','小雞']],
 spell:[['fox','小狐狸'],['bear','小熊'],['raccoon','浣熊'],['squirrel','松鼠'],['otter','水獺']],
 action:[['monkey','小猴子'],['panda','貓熊'],['dog','小狗'],['hamster','倉鼠'],['kangaroo','袋鼠']],
 read:[['cat','小貓'],['turtle','烏龜'],['lion','小獅子'],['hedgehog','刺蝟'],['alpaca','羊駝']]
};
export const STAMPS=Object.freeze(Object.entries(groups).flatMap(([station,items])=>items.map(([animal,name])=>Object.freeze({id:station+'-'+animal,station,name,src:'assets/annual-challenge-20261103/'+station+'-'+animal+'.webp'}))));
export const stampsForStation=station=>STAMPS.filter(stamp=>stamp.station===station);
export const stampById=id=>STAMPS.find(stamp=>stamp.id===id);
export const isStampForStation=(id,station)=>STAMPS.some(stamp=>stamp.id===id&&stamp.station===station);
