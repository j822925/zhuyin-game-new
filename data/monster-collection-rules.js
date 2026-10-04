// These are learning levels, not play formats (solo/exam/online).
export const MONSTER_LEVELS=[{id:'listening',label:'聽音',bit:1},{id:'spelling',label:'拼音',bit:2},{id:'reading',label:'朗讀',bit:4},{id:'tone',label:'聲調',bit:8}];
export function monsterLevel(mode){return ({single:'listening',compound:'listening',spelling:'spelling',reading:'reading',tone:'tone'})[mode]||null;}
export function monsterRequirements(monster,{tone=false}={}){return monster?.theme==='concept'?MONSTER_LEVELS.slice(0,tone?4:3).map(x=>x.id):[];}
export function monsterProgress(monster,record={},options={}){
 const required=monsterRequirements(monster,options),mask=record.level_mask||0,levels=MONSTER_LEVELS.filter(x=>(mask&x.bit)!==0).map(x=>x.id);
 return {monsterLevels:levels,monsterRequiredLevels:required,monsterWins:required.length?required.filter(x=>levels.includes(x)).length:Math.min(3,record.victories||0),monsterRequiredWins:required.length||3,monsterCollected:record.acquired!=null};
}
export function monsterLevelLabel(id){return MONSTER_LEVELS.find(x=>x.id===id)?.label||id;}
