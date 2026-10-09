import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('both class entrances load naming presentation without changing class launch',()=>{
 for(const file of ['index.html','grade2.html']){
  const text=read(file);assert.match(text,/island-names.css\?v=20261009-names1/);assert.match(text,/game-boot.js\?v=20261009-names1/);
  assert.match(text,/school-launch.js\?v=20261007-ipad1/);
 }
 assert.match(read('game-boot.js'),/reading-entry.js\?v=20261008-safari2/);
 assert.match(read('game-boot.js'),/app.js\?v=20261009-accounts1/);
});
test('names use local fonts, keep forest hidden and retain original battle nodes',()=>{
 const source=read('island-names.js'),css=read('island-names.css');
 for(const name of ['注音探險島','學習廣場','一起挑戰'])assert.ok(source.includes(name));
 assert.doesNotMatch(source,/森林世界|暖陽村|芽芽農場|fetch\(|setInterval\(/);
 assert.match(source,/row.append\(button\)/);assert.match(source,/get\('demo'\)!=='1'/);
 assert.doesNotMatch(css,/@font-face|https?:|@import/);
 assert.match(read('exam.html'),/class="island-page-title">📝 老師小考/);
 assert.match(read('online.html'),/class="island-page-title">一起挑戰/);
 assert.match(read('classroom.html'),/注音探險島 · 一起挑戰/);
});
