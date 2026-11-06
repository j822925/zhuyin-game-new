// A life action is complete only once the existing local save accepts it.
// Cloud retries remain the responsibility of the existing durable save journal.
export function commitLifeChange(state, action, save) {
 const before=structuredClone(state);
 const restore=()=>{for(const key of Object.keys(state))if(!Object.hasOwn(before,key))delete state[key];Object.assign(state,before);};
 try {
  const result=action();
  if(!result){restore();return result;}
  if(save()!==true){restore();return null;}
  return result;
 } catch {restore();return null;}
}
