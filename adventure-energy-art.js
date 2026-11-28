// Apply mood around the active character renderer; keep every walking sprite intact.
export function withEnergyMood(draw,getEnergy){return function(c,art,options){
 if(getEnergy()>0){draw(c,art,options);return;}
 // Keep the tired pose inexpensive: filtering every layered atlas draw stalls
 // software rendering on low-power devices, even when the character is tiny.
 const {x,y,height=116}=options;c.save();c.translate(x,y);c.rotate(options.walking?-.025:-.06);draw(c,art,{...options,x:0,y:0});c.restore();
 // Small character canvases have less headroom than the main scene.
 const compact=options.moodTop!==undefined;
 const top=Math.max(options.moodTop??-Infinity,y-height-35),width=compact?108:80;
 c.save();c.translate(x,top);c.fillStyle='#fff8e8ee';c.beginPath();c.roundRect(-width/2,0,width,25,12);c.fill();
 c.font=(compact?'16':'12')+'px sans-serif';c.textAlign='center';c.fillStyle='#887861';c.fillText('肚子咕嚕…',0,17);c.restore();
};}
