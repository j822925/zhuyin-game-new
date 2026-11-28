import {PAINTED_ISLAND} from '../adventure-island-pilot.js';

// Raster coordinates are measured on the 1536 × 1024 survey of the island.
export const islandMapScale=PAINTED_ISLAND?3.75:3;
export function islandMapPoint(x,y){
 return {x:x*islandMapScale,y:y*islandMapScale};
}

