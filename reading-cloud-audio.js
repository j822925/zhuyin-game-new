// Canonical mono 16 kHz PCM keeps Safari MP4 and Chrome WebM off the API.
export function encodeReadingWav(audio){
 if(!(audio instanceof Float32Array)||audio.length<4000||audio.length>160000)throw Error('invalid-audio');
 const bytes=new Uint8Array(44+audio.length*2),v=new DataView(bytes.buffer);
 const put=(p,s)=>{for(let i=0;i<s.length;i++)bytes[p+i]=s.charCodeAt(i);};
 put(0,'RIFF');v.setUint32(4,bytes.length-8,true);put(8,'WAVE');put(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,16000,true);v.setUint32(28,32000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);put(36,'data');v.setUint32(40,audio.length*2,true);
 for(let i=0;i<audio.length;i++)v.setInt16(44+2*i,Math.round(Math.max(-1,Math.min(1,audio[i]||0))*32767),true);
 return bytes;
}
export function readingBase64(bytes){let text='';for(let p=0;p<bytes.length;p+=8192)text+=String.fromCharCode(...bytes.subarray(p,p+8192));return btoa(text);}
export function validateReadingWav(base64){
 if(typeof base64!=='string'||base64.length>426728||!base64.length||base64.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(base64))throw Error('invalid-audio');
 let raw;try{raw=atob(base64);}catch{throw Error('invalid-audio');}
 const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);const v=new DataView(bytes.buffer);
 if(bytes.length<8044||bytes.length>320044||(bytes.length-44)%2||raw.slice(0,4)!=='RIFF'||raw.slice(8,16)!=='WAVEfmt '||raw.slice(36,40)!=='data'||v.getUint32(4,true)!==bytes.length-8||v.getUint32(16,true)!==16||v.getUint16(20,true)!==1||v.getUint16(22,true)!==1||v.getUint32(24,true)!==16000||v.getUint32(28,true)!==32000||v.getUint16(32,true)!==2||v.getUint16(34,true)!==16||v.getUint32(40,true)!==bytes.length-44)throw Error('invalid-audio');
 const count=(bytes.length-44)/2;let voiced=0;
 for(let p=0;p<count;p+=320){const end=Math.min(p+320,count);let energy=0;for(let i=p;i<end;i++){const s=v.getInt16(44+i*2,true)/32768;energy+=s*s;}if(Math.sqrt(energy/(end-p))>=.008)voiced+=end-p;}
 if(voiced<2560)throw Error('silence');
 return {seconds:count/16000};
}
