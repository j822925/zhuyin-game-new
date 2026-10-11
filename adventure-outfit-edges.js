// Remove a dark export fringe without changing alpha, dimensions, or interior pixels.
// Used only for authoring pose patches; original atlases and released art are untouched.
export function cleanOutfitEdgeRGB(pixels,width,height){
  const n=width*height,depth=new Uint8Array(n),out=new Uint8ClampedArray(pixels);
  for(let i=0;i<n;i++)depth[i]=pixels[i*4+3]>160?8:0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x;if(depth[i])depth[i]=Math.min(depth[i],x?depth[i-1]+1:1,y?depth[i-width]+1:1);}
  for(let y=height-1;y>=0;y--)for(let x=width-1;x>=0;x--){const i=y*width+x;if(depth[i])depth[i]=Math.min(depth[i],x+1<width?depth[i+1]+1:1,y+1<height?depth[i+width]+1:1);}
  let changed=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=y*width+x,k=i*4;if(!pixels[k+3]||depth[i]>3)continue;
    let r=0,g=0,b=0,w=0;
    for(let dy=-6;dy<=6;dy+=2)for(let dx=-6;dx<=6;dx+=2){const xx=x+dx,yy=y+dy;if(xx<0||xx>=width||yy<0||yy>=height)continue;const j=yy*width+xx;if(depth[j]<4||pixels[j*4+3]<245)continue;const weight=1/(1+dx*dx+dy*dy);r+=pixels[j*4]*weight;g+=pixels[j*4+1]*weight;b+=pixels[j*4+2]*weight;w+=weight;}
    if(!w)continue;r/=w;g/=w;b/=w;
    const current=(pixels[k]+pixels[k+1]+pixels[k+2])/3,inside=(r+g+b)/3;
    if(current>=inside*.82||inside-current<16)continue;
    for(const [c,v] of [r,g,b].entries())out[k+c]=Math.round(pixels[k+c]*.08+v*.92);
    changed++;
  }
  return {pixels:out,changed};
}
