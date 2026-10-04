const clamp=t=>Math.max(0,Math.min(1,t));
// Explicit weapon origins prevent magic appearing beside the body or from
// the embossed back of a mirror. All geometry uses stage coordinates.
export function conceptAttackEffect(meta,t,side,origin){
 if(!origin)return null;
 const hero=side==='hero',d=hero?-1:1,target={x:hero?260:700,y:310};
 if(meta.id==='mirror-countess'&&t>=.43&&t<.74){
  const q=clamp((t-.43)/.31),reach=Math.min(1,q/.18);
  return{type:'beam',origin,target,end:{x:origin.x+(target.x-origin.x)*reach,y:origin.y+(target.y-origin.y)*reach},alpha:Math.min(1,q/.08,(1-q)/.18),direction:d};
 }
 if(meta.id==='spade-prince'&&t>=.43&&t<.80){
  const q=clamp((t-.43)/.37);
  return{type:'card',count:1,origin,target,x:origin.x+(target.x-origin.x)*q,y:origin.y+(target.y-origin.y)*q-28*Math.sin(Math.PI*q),rotation:d*(q*2.4-.2),alpha:Math.min(1,q/.04,(1-q)/.08),direction:d};
 }
 if(['ink-book-spirit','coin-mimic'].includes(meta.id)&&t>=.43&&t<.91){
  const ink=meta.id==='ink-book-spirit',particles=[];
  for(let i=0;i<(ink?9:7);i++){
   const start=.43+i*.018,q=(t-start)/.34;
   if(q<0||q>=1)continue;
   const scatter=(i%3-1)*(ink?19:24),arc=18;
   particles.push({index:i,q,x:origin.x+(target.x-origin.x)*q,y:origin.y+(target.y+scatter-origin.y)*q-(arc+i%3*9)*Math.sin(Math.PI*q),radius:ink?7+i%3*2:12+i%2*2,rotation:d*(q*7+i*.7),alpha:Math.min(1,q/.035,(1-q)/.12)});
  }
  return{type:ink?'ink':'coins',origin,target,direction:d,alpha:1,particles};
 }
 return null;
}
function spade(ctx,x,y,size){ctx.save();ctx.translate(x,y);ctx.scale(size,size);ctx.beginPath();ctx.moveTo(0,-1);ctx.bezierCurveTo(-.25,-.64,-.9,-.18,-.9,.25);ctx.bezierCurveTo(-.9,.85,-.2,.95,0,.45);ctx.bezierCurveTo(.2,.95,.9,.85,.9,.25);ctx.bezierCurveTo(.9,-.18,.25,-.64,0,-1);ctx.fill();ctx.beginPath();ctx.moveTo(-.32,1);ctx.lineTo(.32,1);ctx.lineTo(0,.3);ctx.closePath();ctx.fill();ctx.restore();}
export function drawConceptAttackEffect(ctx,e){
 if(!e)return;ctx.save();ctx.globalAlpha=e.alpha;
 if(e.type==='beam'){
  const dx=e.end.x-e.origin.x,dy=e.end.y-e.origin.y,length=Math.hypot(dx,dy);ctx.translate(e.origin.x,e.origin.y);ctx.rotate(Math.atan2(dy,dx));
  const gradient=ctx.createLinearGradient(0,0,length,0);gradient.addColorStop(0,'#edfbff');gradient.addColorStop(.35,'#9fe5ff');gradient.addColorStop(1,'#93c8ff00');ctx.fillStyle=gradient;ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(length,-17);ctx.lineTo(length,17);ctx.lineTo(0,6);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#e9fbff';ctx.shadowColor='#9ae4ff';ctx.shadowBlur=13;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(length,0);ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(0,0,7,13,0,0,Math.PI*2);ctx.fill();
 }else if(e.type==='card'){
  // A short streak belongs to the same card; no duplicate floating cards.
  ctx.strokeStyle='#e5c9e09a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(e.x-e.direction*45,e.y+6);ctx.lineTo(e.x-e.direction*17,e.y);ctx.stroke();
  ctx.translate(e.x,e.y);ctx.rotate(e.rotation);ctx.shadowColor='#d7a9e4';ctx.shadowBlur=9;ctx.fillStyle='#fff8e8';ctx.strokeStyle='#c7a36f';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(-20,-28,40,56,4);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#282033';spade(ctx,0,0,11);ctx.font='bold 9px serif';ctx.fillText('A',-15,-16);spade(ctx,-11,-8,3);ctx.save();ctx.rotate(Math.PI);ctx.fillText('A',-15,-16);ctx.restore();
 }else if(e.type==='ink'||e.type==='coins'){
  for(const p of e.particles){ctx.save();ctx.globalAlpha=p.alpha;ctx.translate(p.x,p.y);
   if(e.type==='ink'){
    ctx.rotate(e.direction*.28);ctx.strokeStyle='#9cb7e0';ctx.lineWidth=1.2;ctx.fillStyle='#192341';
    ctx.beginPath();ctx.moveTo(-e.direction*p.radius*2.2,0);ctx.quadraticCurveTo(-e.direction*p.radius,-p.radius,p.radius*.5,-p.radius*.7);ctx.bezierCurveTo(p.radius*1.6,-p.radius*.3,p.radius*1.6,p.radius*.65,0,p.radius*.75);ctx.quadraticCurveTo(-e.direction*p.radius,p.radius*.65,-e.direction*p.radius*2.2,0);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#7089be';ctx.beginPath();ctx.ellipse(1,-p.radius*.35,p.radius*.32,p.radius*.13,0,0,Math.PI*2);ctx.fill();
   }else{
    ctx.rotate(-e.direction*.3);ctx.scale(.3+.7*Math.abs(Math.cos(p.rotation)),1);ctx.shadowColor='#e4af40';ctx.shadowBlur=6;
    const gold=ctx.createLinearGradient(-p.radius,-p.radius,p.radius,p.radius);gold.addColorStop(0,'#fff2a8');gold.addColorStop(.4,'#ffd357');gold.addColorStop(1,'#b97820');ctx.fillStyle=gold;ctx.strokeStyle='#956014';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,p.radius,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.strokeStyle='#fff1ad';ctx.beginPath();ctx.arc(0,0,p.radius*.72,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#b5771a';ctx.font='bold '+p.radius+'px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('✦',0,1);
   }ctx.restore();
  }
 }ctx.restore();
}
