// Preserve saved question paths while refreshing corrected pronunciation assets.
import {SUPPLIED_SYLLABLE_AUDIO,SUPPLIED_LISTENING_AUDIO} from './data/supplied-audio.js?v=20260925-recordings1';
export function audioSource(source){
 if(typeof source!=='string')return source;
 const base=source.split(/[?#]/,1)[0];
 const own=(map,key)=>Object.prototype.hasOwnProperty.call(map,key);
 const supplied=own(SUPPLIED_SYLLABLE_AUDIO,base)?SUPPLIED_SYLLABLE_AUDIO[base]:own(SUPPLIED_LISTENING_AUDIO,base)?SUPPLIED_LISTENING_AUDIO[base]:null;
 if(supplied)return supplied+source.slice(base.length);
 const version=base==='audio/syllable-clear/s141.wav'?'20260920-le4':
  /^audio\/compound\/c(?:0[1-9]|1[0-9]|2[0-2])\.mp3$/.test(base)?'20260922-compound-level1':null;
 if(!version)return source;
 const [pathAndQuery,hash]=source.split('#',2),[path,query]=pathAndQuery.split('?',2),params=new URLSearchParams(query);
 params.set('v',version);
 return path+'?'+params+(hash===undefined?'':'#'+hash);
}
