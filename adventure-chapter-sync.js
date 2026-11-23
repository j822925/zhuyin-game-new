// Merge only a chapter-only edit over an authenticated, newer forest revision.
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const higher=(list,a,b)=>list[Math.max(list.indexOf(a),list.indexOf(b))];
export function rebaseChapter(base,local,remote){
 if(!local||local.version!==1||remote&&remote.version!==1)return null;
 if(!remote||eq(base,remote))return structuredClone(local);
 const out=structuredClone(remote);
 out.phase=higher(['friends','promise','star','clear'],local.phase,remote.phase);
 out.stars=Math.max(local.stars,remote.stars);
 if(local.island!==base?.island&&remote.island===(base?.island||'xiyu'))out.island=local.island;
 for(const [id,step] of Object.entries(local.quests))out.quests[id]=higher(['active','item','done'],step,remote.quests[id]);
 if(Object.values(out.quests).filter(v=>v!=='done').length>2)return null;
 out.mail.stage=higher(['new','search','sent','friend'],local.mail.stage,remote.mail.stage);
 out.mail.letters|=local.mail.letters;
 if(local.mail.partner!==base?.mail?.partner&&remote.mail.partner===(base?.mail?.partner||false))out.mail.partner=local.mail.partner;
 if(eq(remote.battle,base?.battle??null))out.battle=structuredClone(local.battle);
 if(out.battle){const id=out.battle.id;if(id==='empress'?out.phase!=='friends':id==='fog'?out.phase==='clear':out.quests[id]!=='active')out.battle=null;}
 return out;
}
export function sameForestOutsideChapter(a,b){
 if(!a||!b)return false;
 const without=({chapter,...rest})=>rest;
 return eq(without(a),without(b));
}
