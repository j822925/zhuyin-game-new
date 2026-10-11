// Saved preview sheets. approved is set only after explicit user acceptance.
// Future character batches follow docs/walk-animation-production-rules.json:
// both passing poses lift low under the hips; stabilize standing height and preserve approved art.
export const WALK_RELEASES={
  rabbit:{previewCycleMs:1250,kind:'rabbit',sideFrames:8,approved:true},
  'star-31-en':{image:'assets/walk-sprites/v1/star-31-en-v1.png',columns:5,rows:3},
  'star-32-ang':{image:'assets/walk-sprites/v1/star-32-ang-v1.png',columns:5,rows:3},
  'star-33-eng':{image:'assets/walk-sprites/v1/star-33-eng-v1.png',columns:5,rows:3},
  'star-34-er':{image:'assets/walk-sprites/v1/star-34-er-v1.png',columns:5,rows:3},
  'star-35-yi':{image:'assets/walk-sprites/v1/star-35-yi-v1.png',columns:5,rows:3},
  'star-36-wu':{image:'assets/walk-sprites/v1/star-36-wu-v1.png',columns:5,rows:3},
  'star-37-yu':{reviewPending:true,appearance:{sharedHead:false,image:'assets/walk-sprites/v2/star-37-yu-appearance-v21.png',rows:[{keepFrom:.88,headCut:.44,headHeight:.39,bodyCut:.88},{keepFrom:.93,headCut:.44,headHeight:.39,bodyCut:.93}]},previewCycleMs:1250,sideLayers:{body:'assets/walk-sprites/v2/star-37-yu-side-body-v14.png',boots:'assets/walk-sprites/v2/star-37-yu-side-boots-v14.png'},sideIntact:true,sidePreviewCycleMs:1250,cycleSidePosePatch:{image:'assets/walk-sprites/v2/star-37-yu-side-third-v13.png',index:2},sideReach:'staff',approved:false,approvedDirections:[1,2,3],image:'assets/walk-sprites/v1/star-37-yu-v1.png',cycleImage:'assets/walk-sprites/v2/star-37-yu-walk-v4.png',cycleFrontImage:'assets/walk-sprites/v2/star-37-yu-front-counter-v10.png',cycleSideNeutralImage:'assets/walk-sprites/v2/star-37-yu-side-neutral-v9.png',cycleSideImage:'assets/walk-sprites/v2/star-37-yu-side-four-v13.png',cycleSideGrid:[4,1],motion:'gown',columns:5,rows:3},
  'star-25-eh':{image:'assets/walk-sprites/v1/star-25-eh-v1.png',columns:5,rows:3},
  'star-26-ai':{image:'assets/walk-sprites/v1/star-26-ai-v1.png',columns:5,rows:3},
  'star-27-ei':{image:'assets/walk-sprites/v1/star-27-ei-v1.png',columns:5,rows:3},
  'star-28-ao':{image:'assets/walk-sprites/v1/star-28-ao-v1.png',columns:5,rows:3},
  'star-29-ou':{image:'assets/walk-sprites/v1/star-29-ou-v1.png',columns:5,rows:3},
  'star-30-an':{image:'assets/walk-sprites/v1/star-30-an-v1.png',columns:5,rows:3},
  'star-19-zi':{image:'assets/walk-sprites/v1/star-19-zi-v1.png',columns:5,rows:3},
  'star-20-ci':{image:'assets/walk-sprites/v1/star-20-ci-v1.png',columns:5,rows:3},
  'star-21-si':{image:'assets/walk-sprites/v1/star-21-si-v1.png',columns:5,rows:3},
  'star-22-a':{image:'assets/walk-sprites/v1/star-22-a-v1.png',columns:5,rows:3},
  'star-23-o':{image:'assets/walk-sprites/v1/star-23-o-v1.png',columns:5,rows:3},
  'star-24-e':{image:'assets/walk-sprites/v1/star-24-e-v1.png',columns:5,rows:3},
  'star-07-ne':{image:'assets/walk-sprites/v1/star-07-ne-v1.png',columns:5,rows:3},
  'star-08-le':{image:'assets/walk-sprites/v1/star-08-le-v1.png',columns:5,rows:3},
  'star-09-ge':{image:'assets/walk-sprites/v1/star-09-ge-v1.png',columns:5,rows:3},
  'star-10-ke':{image:'assets/walk-sprites/v1/star-10-ke-v1.png',columns:5,rows:3},
  'star-11-he':{image:'assets/walk-sprites/v1/star-11-he-v1.png',columns:5,rows:3},
  'star-12-ji':{image:'assets/walk-sprites/v1/star-12-ji-v1.png',columns:5,rows:3},
  'star-13-qi':{image:'assets/walk-sprites/v1/star-13-qi-v1.png',columns:5,rows:3},
  'star-14-xi':{image:'assets/walk-sprites/v1/star-14-xi-v1.png',columns:5,rows:3},
  'star-15-zhi':{image:'assets/walk-sprites/v1/star-15-zhi-v2.png',columns:5,rows:3},
  'star-16-chi':{image:'assets/walk-sprites/v1/star-16-chi-v1.png',columns:5,rows:3},
  'star-17-shi':{image:'assets/walk-sprites/v1/star-17-shi-v1.png',columns:5,rows:3},
  'star-18-ri':{image:'assets/walk-sprites/v1/star-18-ri-v1.png',columns:5,rows:3},
  'racer':{image:'assets/walk-sprites/v1/racer-v1.png',columns:5,rows:3},
  'dragon-knight':{image:'assets/walk-sprites/v1/dragon-knight-v1.png',columns:5,rows:3},
  'ocean-explorer':{image:'assets/walk-sprites/v1/ocean-explorer-v1.png',columns:5,rows:3},
  'firefighter':{image:'assets/walk-sprites/v1/firefighter-v1.png',columns:5,rows:3},
  'lightning-pilot':{image:'assets/walk-sprites/v1/lightning-pilot-v1.png',columns:5,rows:3},
  'star-01-bo':{image:'assets/walk-sprites/v1/star-01-bo-v2.png',columns:5,rows:3},
  'star-02-po':{image:'assets/walk-sprites/v1/star-02-po-v1.png',columns:5,rows:3},
  'star-03-mo':{image:'assets/walk-sprites/v1/star-03-mo-v1.png',columns:5,rows:3},
  'star-04-fo':{image:'assets/walk-sprites/v1/star-04-fo-v1.png',columns:5,rows:3},
  'star-05-de':{image:'assets/walk-sprites/v1/star-05-de-v1.png',columns:5,rows:3},
  'star-06-te':{image:'assets/walk-sprites/v1/star-06-te-v1.png',columns:5,rows:3},
  'swordsman':{reviewPending:true,backCycle:{cycleSideImage:'assets/walk-sprites/v2/swordsman-back-three-v21.png',cycleSideGrid:[3,1],sideNormalizeHeight:true,sideSharedHead:{index:1,joins:[.44,.44,.44]}},previewCycleMs:1250,approvedDirections:[1,3],sideSharedHead:{index:1,joins:[.449,.451,.456,.451]},sideNormalizeHeight:true,sideIntact:true,sidePreviewCycleMs:1250,cycleSidePosePatches:[{image:'assets/walk-sprites/v2/swordsman-side-first-v19b.png',index:0},{image:'assets/walk-sprites/v2/swordsman-side-second-v18.png',index:1},{image:'assets/walk-sprites/v2/swordsman-side-third-v19b.png',index:2},{image:'assets/walk-sprites/v2/swordsman-side-fourth-v18.png',index:3}],sideReach:'normal',image:'assets/walk-sprites/v1/swordsman-v1.png',cycleImage:'assets/walk-sprites/v2/swordsman-walk-v2.png',cycleFrontImage:'assets/walk-sprites/v2/swordsman-front-counter-v6.png',cycleSideImage:'assets/walk-sprites/v2/swordsman-side-v4.png',cycleSideGrid:[4,1],cyclePatchImage:'assets/walk-sprites/v2/swordsman-walk-fix-v3.png',cyclePatchCells:[8],columns:5,rows:3},
  'astronaut':{image:'assets/walk-sprites/v1/astronaut-v1.png',columns:5,rows:3},
  'footballer':{reviewPending:true,approvedDirections:[0,2],sideFrames:4,sideIntact:true,sideNormalizeHeight:true,sideSharedHead:{index:1,joins:[.435,.435,.435,.435]},cycleSideImage:'assets/walk-sprites/v2/footballer-side-four-v20.png',cycleSideGrid:[4,1],cycleSidePosePatches:[{image:'assets/walk-sprites/v2/footballer-side-low-pair-v20.png',index:1,columns:2,cellIndex:0},{image:'assets/walk-sprites/v2/footballer-side-third-v20.png',index:2},{image:'assets/walk-sprites/v2/footballer-side-low-pair-v20.png',index:3,columns:2,cellIndex:1}],previewCycleMs:1250,sideReach:'normal',approved:false,image:'assets/walk-sprites/v1/footballer-v1.png',sideImage:'assets/walk-sprites/v2/footballer-side-eight-v8.png',sideGrid:[4,2],humanFrontImage:'assets/walk-sprites/v2/footballer-front-v2.png',motion:'human',columns:5,rows:3},
  'ninja':{image:'assets/walk-sprites/v1/ninja-v1.png',columns:5,rows:3},
  'mecha':{image:'assets/walk-sprites/v1/mecha-v1.png',columns:5,rows:3},
  'snow':{image:'assets/walk-sprites/v1/snow-v1.png',columns:5,rows:3},
  'rainbow':{image:'assets/walk-sprites/v1/rainbow-v1.png',columns:5,rows:3},
  'berry':{image:'assets/walk-sprites/v1/berry-v1.png',columns:5,rows:3},
  'star':{image:'assets/walk-sprites/v1/star-v1.png',columns:5,rows:3},
  'lavender':{image:'assets/walk-sprites/v1/lavender-v1.png',columns:5,rows:3},
  'rose':{reviewPending:true,appearance:{sharedHead:false,image:'assets/walk-sprites/v2/rose-appearance-v21.png',rows:[{keepFrom:.83,headCut:.52,headHeight:.51,bodyCut:.83},{keepFrom:.83,headCut:.49,headHeight:.51,bodyCut:.83}]},previewCycleMs:1250,approvedDirections:[1,3],cycleSidePosePatch:{image:'assets/walk-sprites/v2/rose-side-third-left-v12.png',index:2},sideIntact:true,sidePreviewCycleMs:1250,sideReach:'normal',image:'assets/walk-sprites/v1/rose-v2.png',cycleImage:'assets/walk-sprites/v2/rose-walk-v3.png',cycleFrontImage:'assets/walk-sprites/v2/rose-front-counter-v6.png',cycleSideImage:'assets/walk-sprites/v2/rose-side-style-v10.png',cycleSideGrid:[4,1],columns:5,rows:3},
  'moon':{fullPatchImage:'assets/walk-sprites/v2/moon-neutral-patch-v4.png',fullPatchCells:[13],fullImage:'assets/walk-sprites/v2/moon-full-v3.png',sideReach:'normal',image:'assets/walk-sprites/v1/moon-v2.png',columns:5,rows:3},
  'sea':{fullImage:'assets/walk-sprites/v2/sea-full-v3.png',sideReach:'normal',image:'assets/walk-sprites/v1/sea-v1.png',columns:5,rows:3},
  'forest':{fullImage:'assets/walk-sprites/v2/forest-full-v3.png',sideReach:'normal',image:'assets/walk-sprites/v1/forest-v1.png',columns:5,rows:3},
  'sun':{fullImage:'assets/walk-sprites/v2/sun-full-v4.png',sideReach:'normal',image:'assets/walk-sprites/v1/sun-v1.png',columns:5,rows:3},
  'panda':{fullImage:'assets/walk-sprites/v2/panda-full-v3.png',fullPatchImage:'assets/walk-sprites/v2/panda-front-patch-v4.png',fullPatchCells:[0,1],sideReach:'normal',image:'assets/walk-sprites/v1/panda-v1.png',columns:5,rows:3},
  'cat':{endOutline:{color:'#b89c7d',opacity:.12,radius:.5},appearance:{image:'assets/walk-sprites/v2/cat-appearance-v21.png',rows:[{keepFrom:.87,headCut:.49,headHeight:.46,bodyCut:.85},{keepFrom:.87,headCut:.47,headHeight:.46,bodyCut:.85}]},uniformOutline:true,reviewPending:true,backCycle:{cycleSideImage:'assets/walk-sprites/v2/cat-back-three-v20.png',cycleSideGrid:[3,1],sideNormalizeHeight:true,sideSharedHead:{index:1,joins:[.49,.49,.49]}},previewCycleMs:1250,approvedDirections:[1,3],sideSharedHead:{index:1,joins:[.487,.455,.49,.455]},sideNormalizeHeight:true,sideIntact:true,sidePreviewCycleMs:1250,cycleSidePosePatches:[{image:'assets/walk-sprites/v2/cat-side-first-v20.png',index:0},{image:'assets/walk-sprites/v2/cat-side-low-pair-v20.png',index:1,columns:2,cellIndex:0},{image:'assets/walk-sprites/v2/cat-side-third-v20.png',index:2},{image:'assets/walk-sprites/v2/cat-side-low-pair-v20.png',index:3,columns:2,cellIndex:1}],sideReach:'normal',image:'assets/walk-sprites/v1/cat-v1.png',cycleImage:'assets/walk-sprites/v2/cat-walk-v2.png',cycleFrontImage:'assets/walk-sprites/v2/cat-front-counter-v6.png',cycleSideImage:'assets/walk-sprites/v2/cat-side-v4.png',cycleSideGrid:[4,1],cyclePatchImage:'assets/walk-sprites/v2/cat-walk-fix-v3.png',cyclePatchCells:[8],columns:5,rows:3},
  'bear':{fullImage:'assets/walk-sprites/v2/bear-full-v3.png',sideReach:'normal',image:'assets/walk-sprites/v1/bear-v1.png',columns:5,rows:3},
  'koala':{fullImage:'assets/walk-sprites/v2/koala-full-v3.png',sideReach:'normal',image:'assets/walk-sprites/v1/koala-v1.png',columns:5,rows:3},
  'frog':{fullImage:'assets/walk-sprites/v2/frog-full-v3.png',sideReach:'normal',image:'assets/walk-sprites/v1/frog-v1.png',columns:5,rows:3},
  'penguin':{fullSideMirrors:[8,9,10,11],fullImage:'assets/walk-sprites/v2/penguin-full-v3.png',sideReach:'normal',image:'assets/walk-sprites/v1/penguin-v1.png',columns:5,rows:3},
  'lion':{fullPatchImage:'assets/walk-sprites/v2/lion-front-patch-v4.png',fullPatchCells:[0],fullImage:'assets/walk-sprites/v2/lion-full-v3.png',sideReach:'normal',image:'assets/walk-sprites/v1/lion-v1.png',columns:5,rows:3},
  'owl':{fullFrontOriginal:true,fullBackFrames:[12,15,14,15],fullImage:'assets/walk-sprites/v2/owl-full-v3.png',sideReach:'normal',image:'assets/walk-sprites/v1/owl-v1.png',columns:5,rows:3},
  fox:{reviewPending:true,approvedDirections:[0,2],sideOcclusions:{1:[[235,284],[234,301],[234,316],[239,323],[294,323],[294,284]],2:[[227,263],[229,280],[232,302],[237,325],[297,325],[297,263]],6:[[227,263],[229,280],[231,305],[237,327],[299,327],[299,263]]},previewCycleMs:1250,sideReach:'normal',approved:false,image:'assets/walk-sprites/v1/fox-v1.png',sideImage:'assets/walk-sprites/v2/fox-side-eight-v8.png',sideGrid:[4,2],frontImage:'assets/walk-sprites/v2/fox-front-v4.png',columns:5,rows:3},
  'twilight-count':{image:'assets/walk-sprites/v1/twilight-count-v1.png',columns:5,rows:3},
  'frost-fox':{image:'assets/walk-sprites/v1/frost-fox-v1.png',columns:5,rows:3},
  'rose-knight':{image:'assets/walk-sprites/v1/rose-knight-v2.png',columns:5,rows:3},
  'raven-masquerade':{image:'assets/walk-sprites/v1/raven-masquerade-v1.png',columns:5,rows:3},
};

















// 2026-10-09: latest feedback accepts the other four reviewed roles.
for(const id of ['rose','swordsman','footballer','star-37-yu']){WALK_RELEASES[id].approved=true;WALK_RELEASES[id].reviewPending=false;}

// Teacher accepted v22. Freeze these seven; new work is limited to this batch.
for(const id of ['cat','fox']){WALK_RELEASES[id].approved=true;WALK_RELEASES[id].reviewPending=false;}
for(const [id,headCut,sideJoins] of [
  ['panda',.51,[.49,.47,.52,.47]],
  ['bear',.50,[.50,.48,.53,.48]],
  ['koala',.49,[.485,.46,.50,.46]],
]){
  const image=`assets/walk-sprites/v2/${id}-full-v3.png`;
  const ends=cells=>({cycleSideImage:image,cycleSideGrid:[4,4],cycleSideCells:cells,sideNormalizeHeight:true,sideSharedHead:{index:1,joins:[headCut,headCut,headCut]}});
  Object.assign(WALK_RELEASES[id],{
    fullImage:undefined,fullPatchImage:undefined,approved:false,reviewPending:true,previewCycleMs:1250,
    frontCycle:ends([0,1,2]),backCycle:ends([12,13,14]),
    sideIntact:true,sideFrames:4,sideNormalizeHeight:true,sideSharedHead:{index:1,joins:sideJoins},
    cycleSideImage:image,cycleSideGrid:[4,4],cycleSideCells:[4,5,8,9],
    cycleSidePosePatches:[
      {image:`assets/walk-sprites/v2/${id}-side-first-v23.png`,index:0},
      {image:`assets/walk-sprites/v2/${id}-side-low-pair-v23.png`,index:1,columns:2,cellIndex:0},
      {image:`assets/walk-sprites/v2/${id}-side-third-v23.png`,index:2},
      {image:`assets/walk-sprites/v2/${id}-side-low-pair-v23.png`,index:3,columns:2,cellIndex:1},
    ],
  });
}
WALK_RELEASES.panda.frontCycle.cycleSidePosePatches=[0,1].map(index=>({image:'assets/walk-sprites/v2/panda-front-patch-v4.png',index,columns:4,rows:4,cellIndex:index}));

WALK_RELEASES.bear.frontCycle.cycleSidePosePatches=[{image:'assets/walk-sprites/v2/bear-front-first-v23.png',index:0}];
WALK_RELEASES.koala.frontCycle.cycleSidePosePatches=[{image:'assets/walk-sprites/v2/koala-front-first-v23.png',index:0}];

// Latest teacher feedback supersedes the earlier side-view approval.
for(const [id,top,full,scale] of [['cat',.79,.88,1.20],['rose',.76,.86,1.18],['panda',.78,.88,1.25],['bear',.78,.88,1.22],['koala',.78,.88,1.25]]){
  Object.assign(WALK_RELEASES[id],{sidePassingVolume:{top,full,scale},approved:false,reviewPending:true});
  if(['cat','rose'].includes(id))WALK_RELEASES[id].approvedDirections=[0,2];
}
// Use four explicit alternating contacts/passing poses instead of repeating
// the old far-leg lifts. Complete art also removes the old masked hand joins.
Object.assign(WALK_RELEASES.fox,{
  approved:false,approvedDirections:[0,2],reviewPending:true,sideFrames:4,sideIntact:true,
  cycleSideImage:'assets/walk-sprites/v2/fox-side-eight-v8.png',cycleSideGrid:[4,2],cycleSideCells:[0,1,4,5],
  sideNormalizeHeight:true,sideSharedHead:{index:0,joins:[.48,.49,.51,.49]},
  cycleSidePosePatches:[
    {image:'assets/walk-sprites/v2/fox-side-low-pair-v24.png',index:1,columns:2,cellIndex:0},
    {image:'assets/walk-sprites/v2/fox-side-third-v24.png',index:2},
    {image:'assets/walk-sprites/v2/fox-side-low-pair-v24.png',index:3,columns:2,cellIndex:1},
  ],
});

// v25: teacher rejected the row-wise widening. Repaint just the lower artwork
// of the two passing poses; old head/torso sources stay in the pose atlas.
for(const [id,from,join] of [['cat',.81,.455],['rose',.79,.52],['panda',.73,.47],['bear',.72,.48],['koala',.76,.46]]){
  delete WALK_RELEASES[id].sidePassingVolume;
  WALK_RELEASES[id].sideLowerPatches=[1,3].map((index,cellIndex)=>({
    image:`assets/walk-sprites/v2/${id}-side-low-pair-v25.png`,index,columns:2,cellIndex,from,join
  }));
}

// v26: keep the teacher's fuller third pose unchanged; match the other three.
for(const [id,from,join] of [['cat',.80,.455],['rose',.79,.52],['panda',.74,.47],['bear',.72,.48],['koala',.75,.46]]){
  WALK_RELEASES[id].sideFinalLowerPatches=[0,1,3].map(index=>({
    image:`assets/walk-sprites/v2/${id}-side-plump-v26.png`,index,columns:4,cellIndex:index,from,join,
    ...(id==='cat'&&index===1?{leftOfNeck:.29}:{})
  }));
}

// v27 bear pilot: one immutable set of parts, no stack of lower-body repaints.
for(const key of ['cycleSideImage','cycleSideGrid','cycleSideCells','cycleSidePosePatches','sideLowerPatches','sideFinalLowerPatches','sideSharedHead','sideNormalizeHeight'])delete WALK_RELEASES.bear[key];
WALK_RELEASES.bear.bearSide={master:'assets/walk-sprites/v2/bear-side-third-v23.png',parts:'assets/walk-sprites/v2/bear-parts-v27.png'};

// v28: complete painted limbs/shoes; the teacher rejected the separate cuff rig.
delete WALK_RELEASES.bear.bearSide;
Object.assign(WALK_RELEASES.bear,{
  cycleSideImage:'assets/walk-sprites/v2/bear-three-poses-v28.png',cycleSideGrid:[3,1],cycleSideCells:[0,1,1,2],
  cycleSidePosePatches:[
    {image:'assets/walk-sprites/v2/bear-first-balanced-v34.png',index:0,columns:3,cellIndex:0},
    {image:'assets/walk-sprites/v2/bear-low-pair-shoes-v33.png',index:1,columns:2,cellIndex:0},
    {image:'assets/walk-sprites/v2/bear-third-gentle-v32.png',index:2},
    {image:'assets/walk-sprites/v2/bear-fourth-balanced-v34.png',index:3},
  ],
  sideNormalizeHeight:true,sideSharedHead:{index:2,image:'assets/walk-sprites/v2/bear-side-third-v23.png',slot:747,joins:[.502,.490,.505,.505]},sidePoseBob:.004,
});

// v35: front/back use the current plush design and opt into gentle balance.
for(const [direction,neck] of [['front',.455],['back',.465]]){
  WALK_RELEASES.bear[direction+'Cycle']={
    cycleSideImage:`assets/walk-sprites/v2/bear-${direction}-style-v35.png`,
    cycleSideGrid:[3,1],cycleSideCells:[0,1,2],sideNormalizeHeight:true,
    sideSharedHead:{index:1,joins:[neck,neck,neck]},
  };
}
WALK_RELEASES.bear.depthWalkMotion={front:{neck:.455,bob:.008,tilt:.025},back:{neck:.465,bob:.008,tilt:.025}};

// 2026-10-10: the teacher's current approval list supersedes historical batches.
// Keep the shared side head, adding gentle weight transfer with planted soles.
WALK_RELEASES.fox.sidePoseBob=.006;
// v40: restore the original leg poses; v39 also changed the lifted-foot shape.
// v43: teacher requested a live trial of the v42 first pose only.
WALK_RELEASES.fox.sideRegisteredPosePatches=[
  {index:0,image:'assets/walk-sprites/v2/fox-first-right-forward-v42.png'},
  // v44: hide the protruding far arm in poses 2 and 4, keeping the gait intact.
  {index:1,image:'assets/walk-sprites/v2/fox-second-arms-v44.png'},
  {index:3,image:'assets/walk-sprites/v2/fox-fourth-arms-v44.png'},
];
export const WALK_CONFIRMED_IDS=['rabbit','bear','fox'];
// v48: withdraw the rejected v47 leg composites; retain head movement.
WALK_RELEASES.panda.sideRegisteredPosePatches=[0,1,2,3].map(index=>({index,image:`assets/walk-sprites/v2/panda-side-${index+1}-v48.png`}));
WALK_RELEASES.panda.sidePoseBob=.006;
WALK_RELEASES.panda.depthWalkMotion={front:{neck:.51,bob:.006,tilt:.018},back:{neck:.51,bob:.006,tilt:.018}};
// v49: the front cycle keeps the original hand holding the bamboo basket.
WALK_RELEASES.panda.frontCycle.fixedPoseRegions=[{sourceIndex:0,targetIndices:[1,2],polygon:[[215,147],[334,147],[334,248],[233,248],[229,220],[215,211],[204,191],[204,168]]}];
// v45: only the third back-view action swings its left arm forward.
WALK_RELEASES.fox.registeredPosePatches=[{index:14,image:'assets/walk-sprites/v2/fox-back-arm-v45.png'}];
for(const [id,walk] of Object.entries(WALK_RELEASES)){
  walk.approved=WALK_CONFIRMED_IDS.includes(id);
  walk.reviewPending=!walk.approved;
  delete walk.approvedDirections;
}
