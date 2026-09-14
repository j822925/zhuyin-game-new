import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('uncollected gallery and redemption preview hide portrait colors and details',()=>{
 const css=read('child-ui.css');
 assert.match(css,/#collection-dialog \.character-card\.locked img,#exchange-character img\{filter:brightness\(0\);opacity:\.68\}/);
 assert.doesNotMatch(css,/\.owned img\{filter:brightness\(0\)/);
 assert.match(read('index.html'),/child-ui.css\?v=20260914-shadow1/);
 const rewards=read('rewards.js');
 assert.match(rewards,/w\.owned\.includes\(c.id\)\?'owned':'locked'/);
 assert.match(rewards,/\$\('gacha-reveal'\)\.innerHTML=portrait\(c\)/);
});
