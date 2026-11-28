import {CLASS_ART} from './data/guided-prize-art.js?v=20261129-classprizes2';
import {CLASS_FURNITURE,CLASS_MEALS} from './data/guided-rewards.js?v=20261129-classprizes2';

const current=new Map([...CLASS_MEALS,...CLASS_FURNITURE].map(item=>[item.id,item]));
const images=new Map();
function loadImage(src){
  if(!images.has(src)){
    const image=new Image();
    const ready=new Promise((resolve,reject)=>{
      image.onload=()=>resolve(image);
      image.onerror=()=>{images.delete(src);reject(Error('reward-image'));};
    });
    images.set(src,ready);
    image.src=new URL(src,import.meta.url);
  }
  return images.get(src);
}

async function legacySprite(item){
  const {adventureMediaUrl}=await import('./adventure-media.js');
  if(item.kind==='meal'){
    const {RECIPES}=await import('./adventure-food-model.js');
    const food=RECIPES[item.id];
    if(!food)return;
    if(!food.atlas){
      const image=await loadImage(adventureMediaUrl('assets/adventure-prototype/cooking-atlas-v1.png'));
      const w=image.width/3,h=image.height/2;
      return {image,cell:{x:(food.art%3)*w,y:Math.floor(food.art/3)*h,w,h}};
    }
    const {COLLECTION_FOOD_ART}=await import('./data/collection-food-art.js');
    const atlas=COLLECTION_FOOD_ART[food.atlas];
    if(atlas)return {image:await loadImage(adventureMediaUrl(atlas.src)),cell:atlas.cells[food.art]};
  }else{
    const {furnitureFor,HOME_ATLASES}=await import('./data/home-furniture.js');
    const piece=furnitureFor(item.id);
    if(!piece)return;
    const [{WALL_DECOR_ART},{COLLECTION_ZONE_ART},{HOME_CELLS}]=await Promise.all([
      import('./data/wall-decor-art.js'),import('./data/collection-zone-art.js'),import('./data/home-atlas-cells.js')
    ]);
    const atlas=piece.atlas==='wallDecor'?WALL_DECOR_ART:COLLECTION_ZONE_ART[piece.atlas]||HOME_CELLS[piece.atlas];
    if(atlas)return {image:await loadImage(adventureMediaUrl(HOME_ATLASES[piece.atlas])),cell:atlas.cells[piece.index]};
  }
}

async function sprite(item){
  const product=current.get(item.id);
  if(!product)return legacySprite(item);
  const atlas=CLASS_ART[product.atlas];
  return {image:await loadImage(atlas.src),cell:atlas.cells[product.art??product.index]};
}

function rewardFigure(item){
  const figure=document.createElement('figure'),picture=document.createElement('div');
  const caption=document.createElement('figcaption');
  picture.className='reward-picture';
  caption.textContent=item.name;
  figure.append(picture,caption);
  async function draw(){
    picture.textContent=item.kind==='meal'?'🍽️':'🎁';
    try{
      const result=await sprite(item);
      if(!result?.cell)return;
      const {x,y,w,h}=result.cell, canvas=document.createElement('canvas');
      canvas.width=w;canvas.height=h;
      canvas.setAttribute('role','img');canvas.setAttribute('aria-label',item.name);
      canvas.getContext('2d').drawImage(result.image,x,y,w,h,0,0,canvas.width,canvas.height);
      picture.replaceChildren(canvas);
    }catch{
      const again=document.createElement('button');
      again.textContent='↻ 再看獎品圖片';again.onclick=draw;picture.append(again);
    }
  }
  void draw();
  return figure;
}

export function showRewardPictures(host,reward){
  const items=reward?.items || (reward?.id?[reward]:[]);
  host.replaceChildren(...items.map(rewardFigure));
  host.hidden=!items.length;
}
