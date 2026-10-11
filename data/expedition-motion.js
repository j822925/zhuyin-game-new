// Source-image eye bounds, hand checked per face (x, y, width, height).
// Kept separate from the shared character catalog: these are forest guardians.
export const GUARDIAN_EYES={
 bud:{human:[[247,67,17,7],[268,59,18,7]],beast:[[246,150,38,44]]},
 stone:{human:[[242,46,17,7],[262,51,15,7]],beast:[[204,139,47,48],[273,139,47,48]]},
 sand:{human:[[225,59,16,7],[248,51,17,7]],beast:[[195,128,24,37],[284,128,25,37]]},
 sail:{human:[[222,36,17,8],[239,28,18,8]],beast:[[405,72,31,23]]},
 shell:{human:[[231,50,19,9],[253,44,19,9]],beast:[[335,277,31,45],[409,275,33,45]]},
 whale:{human:[[275,50,16,7],[293,54,16,7]],beast:[[161,130,33,33]]},
 watch:{human:[[256,47,18,8],[278,51,17,8]],beast:[[75,174,32,22]]},
 port:{human:[[234,48,18,8],[254,52,18,8]],beast:[[168,164,39,49],[249,161,40,49]]},
 bridge:{human:[[255,43,17,8],[276,43,17,8]],beast:[[201,100,27,17]]},
 deep:{human:[[251,43,17,8],[272,47,17,8]],beast:[[110,104,30,21]]}
};
export const GUARDIAN_COLORS=['#c7e89f','#efc17c','#ffc56c','#a5e4ec','#e4befa','#a7d4ff','#8be1da','#f5c291','#ffe4a0','#9cceff'];
export function blinkAmount(clock,seed=0){const t=(clock+seed*.37)%(4.3+(seed%4)*.63);return t<.085?t/.085:t<.12?1:t<.23?1-(t-.12)/.11:0;}
export function guardianPose(action,t,clock=0,reduced=false){
 if(reduced)return {x:0,y:0,angle:0,stretch:1};
 const pulse=Math.sin(Math.PI*Math.max(0,Math.min(1,t))),breath=Math.sin(clock*1.65);
 if(action==='attack')return {x:-25*pulse,y:-5*pulse,angle:-.035*pulse,stretch:1+.015*pulse};
 if(action==='hurt')return {x:8*Math.sin(t*24)*pulse,y:0,angle:.025*pulse,stretch:1-.012*pulse};
 return {x:0,y:0,angle:0,stretch:1+breath*.004};
}
export function turnMotion(result){return result.phase==='defend'?{hero:'hurt',foe:'attack',guard:result.correct,target:'hero'}:{hero:'attack',foe:result.correct?'hurt':'idle',guard:false,target:'foe'};}
