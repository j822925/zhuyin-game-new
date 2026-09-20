// Keep only the primary student's expiring token in this browser tab. Never store a PIN.
export function createStudentSession({storage,key,now=()=>Date.now()}){
 const valid=r=>r&&typeof r.seat==='string'&&/^\d{1,3}$/.test(r.seat)&&typeof r.token==='string'&&r.token.length>0&&r.token.length<8192&&Number.isFinite(r.expires)&&r.expires>now();
 function clear(){try{storage?.removeItem(key);}catch{}}
 return {
  read(){try{const r=JSON.parse(storage?.getItem(key)||'null');if(valid(r))return {seat:r.seat,token:r.token,expires:r.expires};}catch{}clear();return null;},
  save(r){if(!valid(r)){clear();return;}try{storage?.setItem(key,JSON.stringify({seat:r.seat,token:r.token,expires:r.expires}));}catch{}},
  clear
 };
}
