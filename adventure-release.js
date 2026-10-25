const RETURN_PREFIX='zhuyin.adventure-stable.v1:';
const safeId=value=>typeof value==='string'&&/^[a-z0-9][a-z0-9-]{0,63}$/.test(value);
const tabStorage=()=>{try{return globalThis.sessionStorage;}catch{return null;}};

// Only call after connectForestStudent has completed its authenticated cloud load.
// Neither query parameters nor browser-stored student identifiers select a build.
export async function selectAdventureRelease({student,policy,cryptoImpl=globalThis.crypto,storage=tabStorage()}={}){
  const candidate=policy?.candidate;
  if(!student||typeof student.classId!=='string'||typeof student.seat!=='string'||!/^\d{6}$/.test(student.seat)||!safeId(candidate?.id))return null;
  const base='./adventure-candidate-'+candidate.id;
  if(candidate.bundle!==base+'.bundle.js'||!Array.isArray(candidate.styles)||candidate.styles.some(value=>typeof value!=='string'||!new RegExp('^\\./adventure-candidate-'+candidate.id+'(?:-[a-z0-9-]+)?\\.css$').test(value)))return null;
  if(!Array.isArray(policy.audience)||!cryptoImpl?.subtle||!storage?.getItem||!storage?.setItem)return null;
  try{
    const bytes=new TextEncoder().encode(student.classId+':'+student.seat);
    const digest=await cryptoImpl.subtle.digest('SHA-256',bytes);
    const identity=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
    if(!policy.audience.includes(identity))return null;
    const returnKey=RETURN_PREFIX+identity+':'+candidate.id;
    if(storage?.getItem(returnKey)==='1')return null;
    // Verify that recovery can be remembered before entering an experimental build.
    storage.setItem(returnKey,'0');if(storage.getItem(returnKey)!=='0')return null;
    return Object.freeze({id:candidate.id,bundle:candidate.bundle,styles:Object.freeze([...candidate.styles]),returnKey});
  }catch{return null;}
}

export function rememberStableRelease(release,storage=tabStorage()){
  try{storage?.setItem(release.returnKey,'1');return storage?.getItem(release.returnKey)==='1';}catch{return false;}
}

function loadStyle(href,doc){
  return new Promise((resolve,reject)=>{
    const link=doc.createElement('link');link.rel='stylesheet';link.href=href;link.dataset.adventureCandidate='true';
    const timer=setTimeout(()=>{link.remove();reject(Error('candidate_style_timeout'));},12000);
    link.onload=()=>{clearTimeout(timer);resolve();};
    link.onerror=()=>{clearTimeout(timer);link.remove();reject(Error('candidate_style_failed'));};
    doc.head.append(link);
  });
}

export async function startAdventureRelease({student,policy,loadStable,loadCandidate=url=>import(url),documentImpl=globalThis.document,storage=tabStorage(),reload=()=>globalThis.location.reload(),cryptoImpl=globalThis.crypto}={}){
  const release=await selectAdventureRelease({student,policy,cryptoImpl,storage});
  if(!release){await loadStable();return 'stable';}
  const doc=documentImpl;
  // Shared static HTML/styles remain stable; candidate-only styles are loaded here.
  doc.documentElement.dataset.adventureRelease=release.id;
  try{
    await Promise.all(release.styles.map(href=>loadStyle(href,doc)));
    await loadCandidate(release.bundle);
  }catch(error){
    // A failed module may already have installed handlers. Never initialize a
    // second game on top of it. Reload through the normal authenticated entrance.
    if(rememberStableRelease(release,storage)){reload();return 'recovering';}
    throw error;
  }
  const panel=doc.createElement('div'),label=doc.createElement('span'),button=doc.createElement('button');
  panel.id='adventure-test-release';panel.setAttribute('role','status');
  panel.style.cssText='position:fixed!important;z-index:12000!important;bottom:max(8px,env(safe-area-inset-bottom))!important;left:50%!important;transform:translateX(-50%)!important;display:flex!important;align-items:center!important;gap:10px!important;padding:6px 10px!important;background:#fff9e9!important;border:1px solid #ac9468!important;border-radius:14px!important;color:#365c48!important;font:14px system-ui,sans-serif!important;max-width:calc(100vw - 24px)!important;box-sizing:border-box!important';
  label.textContent='老師測試版';label.style.cssText='font:14px system-ui,sans-serif!important;color:#365c48!important;white-space:nowrap!important';
  button.type='button';button.textContent='回正式版';button.setAttribute('aria-label','保存後返回正式版');
  button.style.cssText='all:initial!important;display:block!important;box-sizing:border-box!important;padding:10px 14px!important;min-height:44px!important;font:bold 14px system-ui,sans-serif!important;color:#fff!important;background:#365c48!important;border-radius:10px!important;cursor:pointer!important;touch-action:manipulation!important;white-space:nowrap!important';
  button.onclick=async()=>{
    button.disabled=true;
    try{
      if(typeof student.flush==='function'&&!await student.flush()){button.disabled=false;label.textContent='請先完成保存';return;}
      if(!rememberStableRelease(release,storage)){button.disabled=false;label.textContent='請重新開啟遊戲';return;}
      reload();
    }catch{button.disabled=false;label.textContent='請先完成保存';}
  };
  panel.append(label,button);doc.body.append(panel);return 'candidate';
}
