import {battleAssetPath} from './battle-asset-url.js?v=20261123-starenvoys1';
import {battleCharacter} from './battle-catalog.js?v=20261123-starenvoys1';
import {CHARACTER_CATALOG} from './character-catalog.js?v=20261123-starenvoys1';
import {MONSTERS} from './monsters.js?v=20261004-villains1';
import {STAR_CARDS} from './star-cards.js?v=20261123-starenvoys1';
import {STAR_SPRITES} from './star-sprites.js?v=20261123-starenvoys1';
import {optimizedImage} from './portrait-thumbnails.js?v=20261123-starenvoys1';

export const BATTLE_PRELOAD_VERSION='20261123-starenvoys1';
const available=[...CHARACTER_CATALOG,...MONSTERS,...STAR_CARDS.map(c=>({...c,image:STAR_SPRITES[c.id]}))];
export const BATTLE_PRELOAD=[...new Set(available.flatMap(c=>[
 battleAssetPath(battleCharacter(c.id)),c.image?optimizedImage(c.image):null
]).filter(Boolean))];
