// Rearrange the existing controls without replacing their handlers or state.
export function installAdventureControls(){
 const bar=document.querySelector('.topbar'),dock=document.querySelector('.world-actions');
 if(!bar||!dock)return;
 document.body.classList.add('adventure-polished');dock.setAttribute('aria-label','冒險工具');
 for(const id of ['wardrobe-open','decor-open','companions-open']){const node=document.getElementById(id);if(node)dock.prepend(node);}
 const controls={'forest-home':['🏫','學習廣場'],'wardrobe-open':['🧥','換裝'],'decor-open':['🎒','物品'],'companions-open':['🐰','夥伴'],'trail-open':['🗺️','地圖'],'find-monster':['⚔️','挑戰'],'go-home':['🏡','回家'],'fullscreen':['⛶','全螢幕'],'forest-music-toggle':['♫','音樂']};
 function refresh(){for(const [id,[icon,label]]of Object.entries(controls)){const node=document.getElementById(id);if(!node)continue;node.classList.add('adventure-control');node.dataset.uiIcon=icon;node.dataset.uiLabel=id==='go-home'?(/回客廳/.test(node.textContent)?'客廳':/回臥室/.test(node.textContent)?'臥室':/出門/.test(node.textContent)?'出門':/暖陽村/.test(node.textContent)?'村莊':'回家'):id==='forest-music-toggle'&&node.getAttribute('aria-pressed')==='false'?'靜音':label;}}
 refresh();new MutationObserver(refresh).observe(document.querySelector('.app-shell'),{childList:true,subtree:true});
}
