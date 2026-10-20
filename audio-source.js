// Preserve saved question paths while refreshing corrected pronunciation assets.
import {SUPPLIED_SYLLABLE_AUDIO,SUPPLIED_LISTENING_AUDIO,SUPPLIED_SOURCE_AUDIO} from './data/supplied-audio.js?v=20260928-all1';
import {TEACHER_AUDIO} from './data/teacher-recordings.js?v=20261020-bo1';
export function audioSource(source){
 if(typeof source!=='string')return source;
 const base=source.split(/[?#]/,1)[0];
 // The classroom can provide absolute public game URLs; never rewrite another origin.
 const publicRoot='https://j822925.github.io/zhuyin-game-new/';
 const key=base.startsWith(publicRoot)?base.slice(publicRoot.length):base;
 const has=(map,k)=>Object.prototype.hasOwnProperty.call(map,k);
 const legacy=has(SUPPLIED_SYLLABLE_AUDIO,key)?SUPPLIED_SYLLABLE_AUDIO[key]:has(SUPPLIED_LISTENING_AUDIO,key)?SUPPLIED_LISTENING_AUDIO[key]:has(SUPPLIED_SOURCE_AUDIO,key)?SUPPLIED_SOURCE_AUDIO[key]:key;
 const replacement=has(TEACHER_AUDIO,key)?TEACHER_AUDIO[key]:has(TEACHER_AUDIO,legacy)?TEACHER_AUDIO[legacy]:null;
 if(replacement)return (base.startsWith(publicRoot)?publicRoot:'')+replacement+source.slice(base.length);
 // Teacher-approved original-pitch whole ㄅㄛˋ; preserve saved question IDs.
 if(['audio/processed-20260925/m_1_26_40.mp3','audio/supplied-20260923/m_1_26_40.mp3','audio/supplied-20260925/m_1_26_40.mp3'].includes(base))return 'audio/original-bo4-20260928.wav'+source.slice(base.length);
 // Teacher-selected original standalone ㄦ; keep all syllable recordings unchanged.
 if(['audio/audio_F34.WAV','audio/processed-20260925/s_37.mp3','audio/supplied-20260923/s_37.mp3','audio/supplied-20260925/s_37.mp3'].includes(base))return 'audio/original-er-20260925.wav'+source.slice(base.length);
 const own=(map,key)=>Object.prototype.hasOwnProperty.call(map,key);
 const supplied=own(SUPPLIED_SYLLABLE_AUDIO,base)?SUPPLIED_SYLLABLE_AUDIO[base]:own(SUPPLIED_LISTENING_AUDIO,base)?SUPPLIED_LISTENING_AUDIO[base]:own(SUPPLIED_SOURCE_AUDIO,base)?SUPPLIED_SOURCE_AUDIO[base]:null;
 if(supplied)return supplied+source.slice(base.length);
 const version=base==='audio/syllable-clear/s141.wav'?'20260920-le4':
  /^audio\/compound\/c(?:0[1-9]|1[0-9]|2[0-2])\.mp3$/.test(base)?'20260922-compound-level1':null;
 if(!version)return source;
 const [pathAndQuery,hash]=source.split('#',2),[path,query]=pathAndQuery.split('?',2),params=new URLSearchParams(query);
 params.set('v',version);
 return path+'?'+params+(hash===undefined?'':'#'+hash);
}
