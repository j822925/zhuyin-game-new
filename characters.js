import {CHARACTER_CATALOG} from './data/character-catalog.js?v=20260913-heroes1';
export const CHARACTERS=CHARACTER_CATALOG;
export const STARTERS=CHARACTERS.filter(c=>c.starter).map(c=>c.id);
export const DRAW_COST=5;
export const REDEEM_COST=50;
export function characterSvg(c){
 const p=c.color,l=c.light;
 const face='<ellipse cx="67" cy="91" rx="4" ry="5" fill="#344452"/><ellipse cx="93" cy="91" rx="4" ry="5" fill="#344452"/><path d="M73 103 Q80 110 87 103" fill="none" stroke="#344452" stroke-width="3" stroke-linecap="round"/><ellipse cx="55" cy="102" rx="8" ry="4" fill="#ed9ba6" opacity=".65"/><ellipse cx="105" cy="102" rx="8" ry="4" fill="#ed9ba6" opacity=".65"/>';
 let art;
 if(c.category==='fairy'){
  art=`<path d="M69 91 C18 30 3 101 50 121 C11 132 39 154 74 133 M91 91 C142 30 157 101 110 121 C149 132 121 154 86 133" fill="${l}" stroke="${p}" stroke-width="3"/><path d="M52 151 Q56 108 80 108 Q104 108 108 151Z" fill="${p}"/><path d="M64 144 L80 118 L96 144" fill="${l}"/><path d="M44 96 Q35 48 77 43 Q122 37 118 100 L101 111 L57 111Z" fill="${p}"/><ellipse cx="80" cy="84" rx="30" ry="32" fill="#ffe4d1"/><path d="M49 80 Q44 46 79 45 Q114 42 112 77 Q95 79 81 62 Q73 80 49 80" fill="${p}"/><path d="M58 47 L60 27 L74 39 L81 20 L88 39 L103 27 L101 48Z" fill="#f7d277" stroke="#dab66a" stroke-width="2"/><circle cx="81" cy="37" r="4" fill="${p}"/>${face}<path d="M116 132 L134 93" stroke="#c99857" stroke-width="4" stroke-linecap="round"/><path d="M135 80 L139 90 L150 93 L139 97 L135 108 L131 97 L120 93 L131 90Z" fill="#f7d277"/><path d="M21 50 l3 -8 3 8 8 3 -8 3 -3 8 -3 -8 -8 -3Z" fill="${p}"/>`;
 }else{
  const ears={rabbit:`<ellipse cx="57" cy="42" rx="15" ry="34" fill="${l}"/><ellipse cx="101" cy="42" rx="15" ry="34" fill="${l}"/><ellipse cx="57" cy="38" rx="6" ry="20" fill="${p}"/><ellipse cx="101" cy="38" rx="6" ry="20" fill="${p}"/>`,fox:`<path d="M37 79 L28 22 L71 60 M123 79 L132 22 L89 60" fill="${p}"/><path d="M40 57 L37 39 L54 59 M120 57 L123 39 L106 59" fill="${l}"/>`,cat:`<path d="M38 78 L34 29 L70 59 M122 78 L126 29 L90 59" fill="${p}"/>`,frog:`<circle cx="49" cy="60" r="22" fill="${p}"/><circle cx="111" cy="60" r="22" fill="${p}"/>`,owl:`<path d="M34 78 L27 40 L70 62 M126 78 L133 40 L90 62" fill="${p}"/>`,penguin:''}[c.id]??`<circle cx="37" cy="57" r="23" fill="${p}"/><circle cx="123" cy="57" r="23" fill="${p}"/><circle cx="37" cy="57" r="13" fill="${l}"/><circle cx="123" cy="57" r="13" fill="${l}"/>`;
  art=`${c.id==='lion'?'<circle cx="80" cy="84" r="66" fill="#bd7742"/>':''}${ears}<ellipse cx="80" cy="137" rx="38" ry="20" fill="${p}"/><ellipse cx="80" cy="91" rx="53" ry="49" fill="${c.id==='rabbit'||c.id==='panda'?l:p}"/>${c.id==='panda'?'<ellipse cx="63" cy="87" rx="15" ry="18" fill="#71818d" transform="rotate(20 63 87)"/><ellipse cx="97" cy="87" rx="15" ry="18" fill="#71818d" transform="rotate(-20 97 87)"/>':''}<ellipse cx="80" cy="107" rx="33" ry="24" fill="${l}"/>${face}<path d="M70 135 L80 141 L90 135 L90 151 L80 145 L70 151Z" fill="${c.id==='rabbit'?'#a189cb':'#669caa'}"/>`;
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 170"><ellipse cx="80" cy="155" rx="51" ry="9" fill="${p}" opacity=".17"/>${art}</svg>`;
}
const escapeAttr=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function portrait(c,className='character-portrait',loading='eager'){return `<img loading="${loading==='lazy'?'lazy':'eager'}" decoding="async" class="${escapeAttr(className)}" src="${escapeAttr((c.image?c.image+'?v=cozy-final':'')||'data:image/svg+xml,'+encodeURIComponent(characterSvg(c)))}" alt="${escapeAttr(c.name)}" draggable="false">`;}
export function drawCharacter(wallet,category,rng=Math.random){
 const available=CHARACTERS.filter(c=>c.category===category&&c.enabled!==false);
 if(!available.length)return {error:'complete'};
 if(wallet.stars<DRAW_COST)return {error:'stars'};
 const character=available[Math.min(available.length-1,Math.floor(rng()*available.length))];
 const duplicate=wallet.owned.includes(character.id);
 return {character,duplicate,wallet:{...wallet,stars:wallet.stars-DRAW_COST,candies:(wallet.candies||0)+(duplicate?1:0),owned:duplicate?[...wallet.owned]:[...wallet.owned,character.id]}};
}
export function redeemCharacter(wallet,id){
 const character=CHARACTERS.find(c=>c.id===id);
 if(!character||wallet.owned.includes(id))return {error:'owned_or_unknown'};
 if((wallet.candies||0)<REDEEM_COST)return {error:'candies'};
 return {character,wallet:{...wallet,candies:wallet.candies-REDEEM_COST,owned:[...wallet.owned,id]}};
}
