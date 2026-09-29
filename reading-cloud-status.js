export const readingClosedMessage=reason=>reason==='daily-limit'?'今日雲端朗讀已暫停，免費用量已達上限。可以改用 Safari 原有辨識；台灣時間上午 8 點重置後恢復雲端。':'雲端朗讀暫時無法連線，可以稍後再試，或改用 Safari 原有辨識。';
export async function getReadingCloudStatus(fetchImpl=globalThis.fetch){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
 try{const r=await fetchImpl('https://zhuyin-reading.j822925.workers.dev/status',{cache:'no-store',credentials:'omit',signal:controller.signal});if(!r.ok)throw Error();const d=await r.json();return {available:d.available===true,reason:d.reason||'unavailable',resetAt:d.resetAt};}
 catch{return {available:false,reason:'unavailable'};}finally{clearTimeout(timer);}
}
