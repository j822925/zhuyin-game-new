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
 return null;
}
function spade(ctx,x,y,size){ctx.save();ctx.translate(x,y);ctx.scale(size,size);ctx.beginPath();ctx.moveTo(0,-1);ctx.bezierCurveTo(-.25,-.64,-.9,-.18,-.9,.25);ctx.bezierCurveTo(-.9,.85,-.2,.95,0,.45);ctx.bezierCurveTo(.2,.95,.9,.85,.9,.25);ctx.bezierCurveTo(.9,-.18,.25,-.64,0,-1);ctx.fill();ctx.beginPath();ctx.moveTo(-.32,1);ctx.lineTo(.32,1);ctx.lineTo(0,.3);ctx.closePath();ctx.fill();ctx.restore();}
export function drawConceptAttackEffect(ctx,e){
 if(!e)return;ctx.save();ctx.globalAlpha=e.alpha;
 if(e.type==='beam'){
  const dx=e.end.x-e.origin.x,dy=e.end.y-e.origin.y,length=Math.hypot(dx,dy);ctx.translate(e.origin.x,e.origin.y);ctx.rotate(Math.atan2(dy,dx));
  const gradient=ctx.createLinearGradient(0,0,length,0);gradient.addColorStop(0,'#edfbff');gradient.addColorStop(.35,'#9fe5ff');gradient.addColorStop(1,'#93c8ff00');ctx.fillStyle=gradient;ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(length,-17);ctx.lineTo(length,17);ctx.lineTo(0,6);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#e9fbff';ctx.shadowColor='#9ae4ff';ctx.shadowBlur=13;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(length,0);ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(0,0,7,13,0,0,Math.PI*2);ctx.fill();
 }else{
  // A short streak belongs to the same card; no duplicate floating cards.
  ctx.strokeStyle='#e5c9e09a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(e.x-e.direction*45,e.y+6);ctx.lineTo(e.x-e.direction*17,e.y);ctx.stroke();
  ctx.translate(e.x,e.y);ctx.rotate(e.rotation);ctx.shadowColor='#d7a9e4';ctx.shadowBlur=9;ctx.fillStyle='#fff8e8';ctx.strokeStyle='#c7a36f';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(-20,-28,40,56,4);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#282033';spade(ctx,0,0,11);ctx.font='bold 9px serif';ctx.fillText('A',-15,-16);spade(ctx,-11,-8,3);ctx.save();ctx.rotate(Math.PI);ctx.fillText('A',-15,-16);ctx.restore();
 }ctx.restore();
}
