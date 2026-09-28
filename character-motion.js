import {portrait} from './characters.js?v=20260928-all1';
import {STAR_SPRITES} from './data/star-sprites.js?v=20260928-all1';
import {battleCharacter as characterRig} from './data/battle-catalog.js?v=20260928-all1';
import {BATTLE_DURATIONS as DURATIONS} from './battle-sprite.js?v=20260928-size1';

const controllers=new WeakMap();
export const MOTION_MS={idle:0,attack:DURATIONS.attack,victory:1500,defeat:1900,star:2100};
const labels={idle:'準備迎戰',attack:'向小怪物發動攻擊',victory:'答對了！勝利收勢',defeat:'舉起手保護自己，受傷後重新站好',star:'雙手捧起星星'};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Explicit choreography for every current character; future characters get a
// stable variation. The seed changes timing, handedness and gesture strength.
const dances={
 hop:['rabbit','frog','berry'],sway:['fox','cat','penguin','sea','star-21-si','star-28-ao','star-36-wu'],
 clap:['panda','bear','koala','star-03-mo','star-16-chi','star-24-e','star-33-eng'],
 wings:['owl','sun','lightning-pilot','star-02-po','star-13-qi','star-22-a','star-26-ai','star-37-yu'],
 twirl:['rose','rainbow','star-04-fo','star-23-o'],
 magic:['moon','forest','snow','star','lavender','star-07-ne','star-11-he','star-14-xi','star-15-zhi','star-18-ri','star-25-eh','star-29-ou','star-30-an','star-34-er'],
 salute:['lion','mecha','dragon-knight','firefighter','star-01-bo','star-06-te','star-17-shi','star-31-en','star-32-ang'],
 slash:['swordsman','ninja','star-08-le','star-12-ji','star-19-zi','star-20-ci'],
 dash:['footballer','racer','ocean-explorer','star-05-de','star-09-ge','star-10-ke'],
 float:['astronaut','star-35-yi'],conduct:['star-27-ei']
};
const danceNames={hop:'蹲低、連跳兩下舉手',sway:'左右踏步擺舞',clap:'雙手合攏拍手慶祝',wings:'展開雙臂、振翅飛起',twirl:'轉身跳舞、張手謝幕',magic:'單手畫弧、施放星光',salute:'挺胸舉盾致意',slash:'側身揮動武器、收勢',dash:'側滑衝刺、舉手歡呼',float:'失重漂浮、揮手',conduct:'雙手交替揮舞指揮'};
export function choreography(c){const seed=[...c.id].reduce((n,s)=>(n*31+s.charCodeAt(0))>>>0,7),dance=Object.keys(dances).find(k=>dances[k].includes(c.id))||Object.keys(dances)[seed%11];return {dance,seed,tempo:0.88+(seed%27)/100,direction:seed%2?1:-1,strength:.78+(seed%23)/100,label:danceNames[dance]};}
export function motionStyle(c){
 if(c.category==='animal')return 'bounce';
 if(c.category==='fairy'||/精靈|仙|翼|風|泡|雲|羽/.test(c.name))return 'float';
 return 'hero';
}
export function motionPortrait(c){
 const art={...c,image:STAR_SPRITES[c.id]||c.image};
 const dance=choreography(c);
 return `<span class="character-motion" data-motion="idle" data-character="${esc(c.id)}" data-rig="${characterRig(c.id)||''}" data-style="${motionStyle(c)}" data-dance="${dance.dance}" data-tempo="${dance.tempo}" data-strength="${dance.strength}" data-direction="${dance.direction}" data-name="${esc(c.name)}" data-celebration="${dance.label}" style="--cheer-duration:${1500*dance.tempo}ms;--motion-direction:${dance.direction}" role="img" aria-label="${esc(c.name)}，${labels.idle}">
 <span class="motion-shadow" aria-hidden="true"></span>
 <span class="motion-enemy" aria-hidden="true"><svg viewBox="0 0 100 100"><path d="M15 83 Q2 20 34 29 Q51 1 69 29 Q98 18 89 82 Q71 99 53 86 Q33 100 15 83" fill="#a597c6" stroke="#786993" stroke-width="3"/><path d="M24 27 19 10 40 24 M67 24 85 9 81 30" fill="#d4c7e9"/><ellipse cx="37" cy="55" rx="5" ry="7" fill="#4c425f"/><ellipse cx="67" cy="55" rx="5" ry="7" fill="#4c425f"/><path d="M43 72 Q52 64 62 72" fill="none" stroke="#4c425f" stroke-width="4" stroke-linecap="round"/></svg></span>
 <span class="motion-body" aria-hidden="true"><span class="motion-art">${portrait(art,'motion-fallback')}<canvas class="motion-canvas"></canvas></span>
 <span class="motion-trophy"><svg viewBox="0 0 160 135"><path d="m80 7 20 39 44 6-32 32 8 44-40-21-40 21 8-44L16 52l44-6Z" fill="#ffd76b" stroke="#cf9231" stroke-width="4" stroke-linejoin="round"/><path d="m79 22 13 29 29 5" fill="none" stroke="#fff2bf" stroke-width="7" stroke-linecap="round"/><ellipse cx="67" cy="72" rx="4" ry="6" fill="#79502d"/><ellipse cx="94" cy="72" rx="4" ry="6" fill="#79502d"/><path d="M73 88q8 9 16 0" fill="none" stroke="#79502d" stroke-width="3" stroke-linecap="round"/><ellipse cx="30" cy="101" rx="18" ry="13" fill="${esc(c.category==='animal'?c.light||'#fff2df':'#fff2df')}" stroke="#bc9e74" stroke-width="3" transform="rotate(22 30 101)"/><ellipse cx="130" cy="101" rx="18" ry="13" fill="${esc(c.category==='animal'?c.light||'#fff2df':'#fff2df')}" stroke="#bc9e74" stroke-width="3" transform="rotate(-22 130 101)"/></svg></span></span>
 <span class="motion-sparks" aria-hidden="true"><i>✦</i><i>✧</i><i>✦</i></span><span class="motion-impact" aria-hidden="true">✧</span>
 </span>`;
}

// A textured mesh bends the original character's arms and torso. No card crops,
// detached body parts, per-frame image downloads, or changes to collectible art.
function makeRig(canvas,img){
 const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:true});
 if(!gl)return null;
 const shaders=[];let program,buffer,texture;
 const dispose=()=>{shaders.forEach(s=>gl.deleteShader(s));if(program)gl.deleteProgram(program);if(buffer)gl.deleteBuffer(buffer);if(texture)gl.deleteTexture(texture);gl.getExtension('WEBGL_lose_context')?.loseContext();};
 try{
  const compile=(type,source)=>{const s=gl.createShader(type);shaders.push(s);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('shader');return s;};
  const vs=compile(gl.VERTEX_SHADER,`attribute vec2 uv; varying vec2 tex; uniform vec3 pose; uniform vec2 hands; uniform vec2 fit;
   void main(){tex=uv;vec2 p=uv;float side=sign(p.x-.5);float arm=exp(-pow((p.y-.62)/.12,2.))*smoothstep(.10,.30,abs(p.x-.5));
    float lift=side<0.?hands.x:hands.y;p.y-=lift*arm*.15;p.x+=side*lift*arm*.035;
    p.x-=side*pose.y*arm*.10;p.y-=pose.y*arm*.025;
    p.x+=pose.z*exp(-pow((p.y-.38)/.28,2.))*.025;
    gl_Position=vec4((p.x-.5)*fit.x*1.62,(.5-p.y)*fit.y*1.62,0.,1.);}`);
  const fs=compile(gl.FRAGMENT_SHADER,'precision mediump float; varying vec2 tex; uniform sampler2D art; void main(){gl_FragColor=texture2D(art,tex);}');
  program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('program');gl.useProgram(program);
  const vertices=[],steps=32;
  for(let y=0;y<steps;y++)for(let x=0;x<steps;x++){const a=x/steps,b=y/steps,c=(x+1)/steps,d=(y+1)/steps;vertices.push(a,b,c,b,a,d,a,d,c,b,c,d);}
  buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);const loc=gl.getAttribLocation(program,'uv');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  // The on-screen rig is 512px: do not upload a multi-megapixel collectible texture.
  const art=document.createElement('canvas'),scale=Math.min(1,512/Math.max(img.naturalWidth,img.naturalHeight));art.width=Math.max(1,Math.round(img.naturalWidth*scale));art.height=Math.max(1,Math.round(img.naturalHeight*scale));art.getContext('2d').drawImage(img,0,0,art.width,art.height);
  texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,art);
  const ratio=img.naturalWidth/img.naturalHeight;gl.uniform2f(gl.getUniformLocation(program,'fit'),Math.min(1,ratio),Math.min(1,1/ratio));const pose=gl.getUniformLocation(program,'pose'),hands=gl.getUniformLocation(program,'hands');
  const draw=(lift=0,hug=0,nod=0,right=lift)=>{if(gl.isContextLost())return;gl.uniform3f(pose,lift,hug,nod);gl.uniform2f(hands,lift,right);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,vertices.length/2);};
  canvas.width=canvas.height=512;gl.viewport(0,0,512,512);draw();return {draw,dispose};
 }catch{dispose();return null;}
}

export function mountCharacter(root,c){clearCharacters(root);root.innerHTML=motionPortrait(c);return prepare(root.querySelector('.character-motion'));}
function prepare(el){
 if(controllers.has(el))return controllers.get(el);
 if(el.dataset.rig)return prepareArticulated(el);
 const img=el.querySelector('img'),canvas=el.querySelector('canvas'),media=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
 let rig=null,raf=0,timer=0,disposed=false,generation=0;
 const cancel=()=>{cancelAnimationFrame(raf);clearTimeout(timer);generation++;};
 function reset(){cancel();el.dataset.motion='idle';el.setAttribute('aria-label',el.dataset.name+'，'+labels.idle);rig?.draw();}
 function play(state){
  if(!Object.hasOwn(MOTION_MS,state))return;
  cancel();if(state==='idle'){reset();return;}const gen=generation;
  el.dataset.motion='idle';void el.offsetWidth;el.dataset.motion=state;el.setAttribute('aria-label',el.dataset.name+'，'+(state==='victory'?el.dataset.celebration:labels[state]));
  ready();let lastFrame=-Infinity;const start=performance.now(),duration=MOTION_MS[state]*(state==='victory'?Number(el.dataset.tempo):1);
  const frame=now=>{
   if(disposed||gen!==generation)return;
   if(!el.isConnected){dispose();return;}
   if(document.hidden){if(state==='star')rig?.draw(0,1,0);else reset();return;}
   if(now-lastFrame<1000/30){raf=requestAnimationFrame(frame);return;}lastFrame=now;
   const t=Math.min(1,(now-start)/duration),wave=Math.sin(Math.PI*t);
   const gesture=celebrationPose(el.dataset.dance,t,Number(el.dataset.strength),Number(el.dataset.direction));
   rig?.draw(state==='victory'?gesture.left:0,state==='star'?Math.min(1,t*3):state==='victory'?gesture.hug:0,state==='defeat'?-wave:state==='victory'?wave:0,state==='victory'?gesture.right:0);
   if(t<1)raf=requestAnimationFrame(frame);
  };
  if(!media?.matches)raf=requestAnimationFrame(frame);else rig?.draw(state==='victory'?.7:0,state==='star'?1:0,0);
  if(state!=='star')timer=setTimeout(()=>{if(gen===generation)reset();},duration);
 }
 function ready(){if(disposed||rig||el.dataset.motion==='idle'||!img.complete||!img.naturalWidth||media?.matches)return;rig=makeRig(canvas,img);if(rig){el.classList.add('motion-rig-ready');if(el.dataset.motion==='star')rig.draw(0,1,0);}}
 function lost(e){e.preventDefault();rig=null;el.classList.remove('motion-rig-ready');}
 function dispose(){if(disposed)return;disposed=true;cancel();img.removeEventListener('load',ready);canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('webglcontextrestored',ready);rig?.dispose();rig=null;el.classList.remove('motion-rig-ready');media?.removeEventListener?.('change',reset);controllers.delete(el);}
 img.addEventListener('load',ready,{once:true});canvas.addEventListener('webglcontextlost',lost);canvas.addEventListener('webglcontextrestored',ready);media?.addEventListener?.('change',reset);
 if(img.complete&&img.naturalWidth)ready();
 const control={play,reset,dispose};controllers.set(el,control);return control;
}
// Load the battle drawings only for an authored character. Its lifecycle is tied
// to the question/result element, including an answer received before art loads.
function prepareArticulated(el){
 const canvas=el.querySelector('canvas'),family=el.dataset.rig;
 let rig=null,timer=0,disposed=false,state='idle',started=performance.now();
 const action=s=>s==='defeat'?'hurt':s;
 function play(next){if(disposed||!Object.hasOwn(MOTION_MS,next))return;clearTimeout(timer);state=next;started=performance.now();el.dataset.motion=next;el.setAttribute('aria-label',el.dataset.name+'，'+labels[next]);rig?.play(action(next));
  const duration=DURATIONS[action(next)];if(duration&&next!=='star')timer=setTimeout(()=>play('idle'),duration);
 }
 function dispose(){if(disposed)return;disposed=true;clearTimeout(timer);rig?.dispose();rig=null;el.classList.remove('motion-skeleton-ready','motion-rig-ready','motion-battle-ready');controllers.delete(el);}
 const control={play,reset:()=>play('idle'),dispose};controllers.set(el,control);el.dataset.rigStatus='loading';
 import('./battle-sprite.js?v=20260928-size1').then(async({BattleSprite:CharacterRig})=>{
  if(disposed)return;rig=new CharacterRig(canvas);await rig.character(family,0);if(disposed||!rig.ready)return;
  rig.play(action(state));rig.started=started;const now=performance.now(),duration=DURATIONS[action(state)],t=duration?Math.min(1,(now-started)/duration):0;rig.draw(rig.reduced.matches?(state==='star'?1:.45):t,now/1000);el.classList.add('motion-skeleton-ready','motion-rig-ready','motion-battle-ready');el.dataset.rigStatus='ready';
 }).catch(()=>{if(disposed)return;rig?.dispose();rig=null;el.dataset.rigStatus='fallback';});
 return control;
}
export function reactCharacter(root,state){root?.querySelectorAll('.character-motion').forEach(el=>prepare(el).play(state));}
export function clearCharacters(root){root?.querySelectorAll('.character-motion').forEach(el=>controllers.get(el)?.dispose());}
export function prepareCharacters(root){root?.querySelectorAll('.character-motion').forEach(prepare);}
export function celebrationPose(dance,t,strength=1,direction=1){
 const w=Math.sin(Math.PI*t)*strength,beat=Math.sin(Math.PI*t*6)*w;
 let left=w,right=w,hug=0;
 if(dance==='clap'){left=right=w*.2;hug=(.5+.5*Math.cos(t*Math.PI*8))*w;}
 if(dance==='wings'){left=right=beat*.8;}
 if(['salute','slash','magic'].includes(dance)){left=w;right=dance==='slash'?-w*.65:w*.15;}
 if(['sway','conduct','float'].includes(dance)){left=beat;right=-beat;}
 if(dance==='hop'){left=right=Math.abs(beat);}
 if(dance==='dash'){left=w;right=-w*.7;}
 if(direction<0)[left,right]=[right,left];return {left,right,hug};
}
export function awardCharacter(root,c,stars){
 if(!Number.isFinite(stars)||stars<=0)return null;
 return characterScene(root,c,'star');
}
export function celebrateCharacter(root,c){return characterScene(root,c,'victory');}
function characterScene(root,c,state){
 const scene=document.createElement('div');scene.className='character-award';
 const art=document.createElement('div');art.className='award-actor';scene.append(art);root.append(scene);
 const control=mountCharacter(art,c);control.play(state);return scene;
}
