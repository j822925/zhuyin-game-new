import {PACKED_BATTLES,PACKED_BATTLE_VERSION} from './packed-battle-frames.js?v=20261007-ipad1';

// A single cache key shared by lesson preparation and runtime Image loading.
export function battleAssetPath(id){
 const entry=PACKED_BATTLES[id];
 return entry?`${entry.atlas}?v=${encodeURIComponent(PACKED_BATTLE_VERSION)}`:null;
}
