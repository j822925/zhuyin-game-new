import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('public family and installation pages never link to teacher preview or backend',()=>{
 for(const file of ['parents.html','install.html']){
  const links=[...read(file).matchAll(/href="([^"]+)"/g)].map(m=>m[1]);
  for(const link of links)assert.doesNotMatch(link,/teacher\.html|demo=|script\.google|docs\.google/);
 }
 assert.match(read('install.html'),/href="parents.html"/);
 assert.match(read('app.js'),/demo\?'teacher.html':'parents.html'/);
 assert.match(read('child-ui.js'),/demo\?'老師專區':'親子專區'/);
});
test('family audio uses the complete shared catalogue without score or login code',()=>{
 const html=read('parents.html'),script=read('parents.js');
 for(const id of ['base','compounds','syllables','syllable-initial-filter','syllable-count'])assert.ok(html.includes('id="'+id+'"'));
 assert.match(script,/setupTeacherAudio\(\{BASE,COMPOUNDS,createCatalog\}\)/);
 assert.doesNotMatch(script,/api\.js|rewards|authenticate|submit|saveScore/);
 assert.match(read('teacher.html'),/demo=1/);
 assert.match(read('index.html'),/app.js\?v=20260913-family1/);
});
