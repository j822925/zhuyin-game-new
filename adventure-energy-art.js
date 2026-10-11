// Apply mood around the active character renderer; keep every walking sprite intact.
export function withEnergyMood(draw,getEnergy){return function(c,art,options){
 if(getEnergy()>0){draw(c,art,options);return;}
 // Keep the tired pose inexpensive: filtering every layered atlas draw stalls
 // software rendering on low-power devices, even when the character is tiny.
 const {x,y,height=116}=options;c.save();c.translate(x,y);c.rotate(options.walking?-.025:-.06);draw(c,art,{...options,x:0,y:0});c.restore();
 c.save();c.translate(x,y-height-18);c.fillStyle='#fff8e8ee';c.beginPath();c.roundRect(-40,-17,80,25,12);c.fill();c.font='12px sans-serif';c.textAlign='center';c.fillStyle='#887861';c.fillText('肚子咕嚕…',0,0);c.restore();
};}
