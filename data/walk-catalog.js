import {WALK_IDENTITIES} from './walk-identities.js';
import {WALK_RELEASES} from './walk-releases.js?v=panda-hold-v49';

// Preview catalog only. Ownership and battle collection remain in their own models.
// The additional identities are released (docs/villains-release-20261004.md).
// Their walking work remains separately tracked; battle data is not changed here.
export const WALK_CATALOG=WALK_IDENTITIES.map(c=>({...c,walk:WALK_RELEASES[c.id]??null}));
export const walkCharacter=id=>WALK_CATALOG.find(c=>c.id===id);
