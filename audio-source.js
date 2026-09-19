// Keep saved question IDs/paths compatible while bypassing the old pronunciation cache.
export function audioSource(source){
 if(typeof source!=='string'||source.split(/[?#]/,1)[0]!=='audio/syllable-clear/s141.wav')return source;
 const [pathAndQuery,hash]=source.split('#',2),[path,query]=pathAndQuery.split('?',2),params=new URLSearchParams(query);
 params.set('v','20260920-le4');
 return path+'?'+params+(hash===undefined?'':'#'+hash);
}
