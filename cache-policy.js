export const CACHE_VERSION='v2',MAX_ITEMS=512,MAX_BYTES=96*1024*1024,MAX_FILE=4*1024*1024,TTL=30*86400000;
export function publicMedia(path,base){try{const u=new URL(path,base),b=new URL(base);return u.origin===b.origin&&u.pathname.startsWith(b.pathname)&&/^(audio|assets)\//.test(u.pathname.slice(b.pathname.length))&&/\.(mp3|wav|ogg|webp|png|jpg|jpeg|svg)$/i.test(u.pathname);}catch{return false;}}
export function cacheName(base){return 'zhuyin-public-media-'+encodeURIComponent(new URL(base).pathname)+'-'+CACHE_VERSION;}
export function orderedCards(cards){const order=Array.from('ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦㄧㄨㄩ');return cards.filter(c=>order.includes(c.symbol)).slice().sort((a,b)=>order.indexOf(a.symbol)-order.indexOf(b.symbol));}
