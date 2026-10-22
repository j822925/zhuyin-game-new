import {ZONE_STOREFRONTS} from './data/zone-storefront-art.js';
import {ZONE_SHOPS,zoneShop} from './data/zone-shops.js';
import {ZONE_SHOP_ART} from './data/zone-shop-art.js';
import {SHOP_ROOM_ART} from './data/shop-room-art.js';
import {SHOP_ROOMS} from './data/adventure-shop-rooms.js';
const positions=[{x:16,y:39},{x:84,y:39},{x:16,y:53},{x:84,y:53},{x:24,y:69},{x:76,y:69},{x:16,y:27},{x:84,y:27}];
export function getShopRoomArt(id){const s=zoneShop(id);return s?{...ZONE_SHOP_ART[s.room],ownerSrc:ZONE_STOREFRONTS[s.zone].ownerSrc}:SHOP_ROOM_ART[id];}
const electricPositions=[{x:27,y:39},{x:83,y:39},{x:20,y:45},{x:88,y:75},{x:75,y:38},{x:25,y:70}];
export function getShopRoom(id){const s=zoneShop(id);return s?{...s,regional:true,paintedCounter:true,bounds:{left:35,right:65,top:47,bottom:92},counter:{x:50,y:48},displays:s.products.slice(0,8).map((p,i)=>({...p,position:s.zone==='port'?(electricPositions[i]||positions[i]):positions[i],...(s.zone==='port'&&i<5?{painted:true,caption:'展示'}:{})}))}:SHOP_ROOMS[id];}
export {ZONE_SHOPS,zoneShop};
