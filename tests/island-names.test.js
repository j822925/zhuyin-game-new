import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('both class entrances load naming presentation without changing class launch',()=>{
 for(const [file,bootVersion]of [['index.html','20261106-annual2'],['grade2.html','20261102-a1']]){
  const text=read(file);assert.match(text,/island-names.css\?v=20261022-helper1/);assert(text.includes('game-boot.js?v='+bootVersion),file);
  assert.match(text,/school-launch.js\?v=20261007-ipad1/);
 }
 assert.match(read('game-boot.js'),/reading-entry.js\?v=20261025-homegallery1/);
 assert.match(read('game-boot.js'),/app.js\?v=20261102-a1/);
 assert.match(read('game-boot.js'),/annual-challenge-entry.js\?v=20261106-annual2/);
 assert.match(read('game-boot.js'),/teacher-hub.js\?v=20261106-annual2/);
});
test('names use local fonts, keep forest hidden and retain original battle nodes',()=>{
 const source=read('island-names.js'),css=read('island-names.css');
 for(const name of ['池東注音探險島','學習廣場','一起挑戰'])assert.ok(source.includes(name));
 assert.doesNotMatch(source,/森林世界|暖陽村|芽芽農場|fetch\(|setInterval\(/);
 assert.match(source,/row.append\(button\)/);assert.match(source,/get\('demo'\)!=='1'/);
 assert.doesNotMatch(css,/@font-face|https?:|@import/);
 assert.match(read('exam.html'),/class="island-page-title">📝 老師小考/);
 assert.match(read('online.html'),/class="island-page-title">一起挑戰/);
 assert.match(read('classroom.html'),/注音探險島 · 一起挑戰/);
});
