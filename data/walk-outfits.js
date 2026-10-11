// The eight v55 outfits were approved by the teacher on 2026-10-11.
export const WALK_OUTFITS = [
  {id:'gardener',character:'rabbit',name:'胡蘿蔔園丁裝',price:8,approved:false,image:'assets/walk-outfits/v50/rabbit-gardener-v2.webp',idleImage:'assets/walk-outfits/v50/rabbit-idle-v1.webp',idleRow:0,columns:4,rows:4,cycleMs:1250},
  {id:'rabbit-strawberry',character:'rabbit',name:'草莓烘焙裝',price:8,approved:false,image:'assets/walk-outfits/v50/rabbit-strawberry-v1.webp',idleImage:'assets/walk-outfits/v50/rabbit-idle-v1.webp',idleRow:1,columns:4,rows:4,cycleMs:1250},
];
// Only the two mistaken side poses are replaced; other frames keep v50 pixels.
WALK_OUTFITS[0].posePatches=[
  {direction:1,frame:0,image:'assets/walk-outfits/v51/gardener-first-pair.webp',rect:[0,0,.5,1],neckY:474,targetNeck:180},
  {direction:3,frame:0,image:'assets/walk-outfits/v51/gardener-first-pair.webp',rect:[.5,0,1,1],neckY:474,targetNeck:180},
  {direction:1,frame:3,image:'assets/walk-outfits/v51/gardener-right-fourth.webp',rect:[0,0,1,1],neckY:670,targetNeck:180},
  {direction:3,frame:3,image:'assets/walk-outfits/v51/gardener-left-fourth.webp',rect:[0,0,1,1],neckY:681,targetNeck:180},
];
WALK_OUTFITS[1].posePatches=[
  {direction:1,frame:0,image:'assets/walk-outfits/v51/strawberry-side-patches.webp',rect:[0,0,.5,680/1278],neckY:382,targetNeck:180},
  {direction:1,frame:3,image:'assets/walk-outfits/v51/strawberry-fourth-pair.webp',rect:[0,0,.5,1],neckY:438,targetNeck:180},
  {direction:3,frame:0,image:'assets/walk-outfits/v51/strawberry-side-patches.webp',rect:[0,680/1278,.5,1],neckY:991,targetNeck:180},
  {direction:3,frame:3,image:'assets/walk-outfits/v51/strawberry-fourth-pair.webp',rect:[.5,0,1,1],neckY:438,targetNeck:180},
];
export const walkOutfit=id=>WALK_OUTFITS.find(item=>item.id===id);
for(const [id,character,name,idleRow,idleRows,idleName] of [
  ['rabbit-wedding','rabbit','白色婚紗',0,1,'rabbit-wedding-idle'],
  ['fox-postman','fox','森林郵差裝',0,3,'fox-idle'],
  ['fox-stars','fox','星空旅人裝',1,3,'fox-idle'],
  ['fox-suit','fox','黑色西裝',2,3,'fox-idle'],
  ['bear-baker','bear','蜂蜜烘焙裝',0,2,'bear-idle'],
  ['bear-orchard','bear','果園吊帶裝',1,2,'bear-idle'],
]) WALK_OUTFITS.push({id,character,name,price:8,approved:false,image:'assets/walk-outfits/v52/'+id+'.webp',idleImage:'assets/walk-outfits/v52/'+idleName+'.webp',idleRow,idleRows,columns:4,rows:4,cycleMs:1250});
export const releasedWalkOutfits=character=>WALK_OUTFITS.filter(item=>item.approved&&item.character===character);
for(const item of WALK_OUTFITS.filter(i=>i.character==='fox')) item.idleRowBounds=[0,402/1254,816/1254,1];
walkOutfit('fox-postman').posePatches=[1,3].map((direction,i)=>({direction,frame:3,image:'assets/walk-outfits/v52/fox-postman-fourth-v2.webp',rect:[i*.5,0,(i+1)*.5,1],neckY:438,targetNeck:160,offsetX:i?22:-22}));
// v53: connected passing poses below the original head; no separate leg or boot pieces.
for(const [id,neckY,targetNeck,offset] of [
  ['gardener',510,176,-7],['rabbit-strawberry',510,176,0],['rabbit-wedding',514,178,-2],
  ['fox-postman',460,158,-25],['fox-stars',460,158,-25],['fox-suit',460,158,-25],
  ['bear-baker',476,165,-1],['bear-orchard',480,165,-1],
]){
  const item=walkOutfit(id);item.posePatches??=[];
  item.posePatches.push(...[1,3].map((direction,i)=>({direction,frame:1,image:'assets/walk-outfits/v53/'+id+'-second-pair.webp',rect:[i*.5,0,(i+1)*.5,1],neckY,targetNeck:targetNeck-4,headOverlap:4,offsetX:i?-offset:offset})));
}
// v54: only the bears' lifted-leg region is updated; all registration stays fixed.
for(const item of WALK_OUTFITS.filter(i=>i.character==='bear'))for(const p of item.posePatches)if(p.frame===1)p.image=p.image.replace('/v53/','/v54/');
// v55 authoring-only clothing repairs, retaining all originals and approval status.
for(const item of WALK_OUTFITS)item.sideReview={
  image:'assets/walk-outfits/v55/'+item.id+'-side.webp',
  frames:item.id==='gardener'?[0,1,2,3]:item.character==='fox'?[1]:[1,3],
};
// Original clothes are tier 1; permanent new outfits use teacher-approved tiers.
const outfitPrices={gardener:35,'rabbit-strawberry':70,'rabbit-wedding':100,'fox-postman':35,'fox-stars':70,'fox-suit':100,'bear-baker':35,'bear-orchard':70};
for(const item of WALK_OUTFITS)if(Object.hasOwn(outfitPrices,item.id)){item.approved=true;item.price=outfitPrices[item.id];}
// Teacher approved Honey Bear's fourth outfit on 2026-10-11; all 16 frames are final.
WALK_OUTFITS.push({
  id:'bear-gentleman',character:'bear',name:'蜂蜜紳士裝',price:100,approved:true,
  image:'assets/walk-outfits/v56/bear-gentleman.webp',
  idleImage:'assets/walk-outfits/v56/bear-gentleman-idle.webp',
  idleRow:0,idleRows:1,columns:4,rows:4,cycleMs:1250
});
