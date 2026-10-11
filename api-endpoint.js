// Only this loopback preview uses the local relay; deployed games keep their API.
export function resolveApiEndpoint(endpoint,href=globalThis.location?.href){
 if(!href)return endpoint;
 const page=new URL(href),api=new URL(endpoint,page);
 if(['127.0.0.1','localhost','[::1]'].includes(page.hostname)&&page.port==='8093'&&api.origin==='https://zhuyin-api.j822925.workers.dev'&&api.pathname==='/api'){
  const local=new URL('/__island-api',page);local.search=api.search;return local.href;
 }
 return endpoint;
}
