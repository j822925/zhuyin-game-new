import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {HELPER_EXAMPLES} from '../helper-examples.js';
import {ELEMENTARY_HELPER_CASES} from './helper-elementary-cases.js';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('return works before modules load or when the main module fails, without leaking query data',()=>{
 const html=read('zhuyin-helper.html'),script=html.match(/<script id="helper-return-bootstrap">([\s\S]*?)<\/script>/)[1];
 assert.ok(html.indexOf('helper-return-bootstrap')<html.indexOf('type="module"'));
 for(const grade of ['main','grade2'])for(const demo of ['','&demo=1','&demo=0']){
  const url=new URL('https://j822925.github.io/zhuyin-game-new/zhuyin-helper.html?class='+grade+demo+'&token=private&next=https://example.invalid/');
  const link={href:''};
  runInNewContext(script,{URL,URLSearchParams,location:{href:url.href,search:url.search},document:{getElementById:id=>{assert.equal(id,'back');return link;}}});
  const target=new URL(link.href);
  assert.equal(target.pathname,'/zhuyin-game-new/'+(grade==='grade2'?'grade2':'index')+'.html');
  assert.equal(target.searchParams.get('class'),grade);
  assert.equal(target.searchParams.get('demo'),demo==='&demo=1'?'1':null);
  assert.ok(!target.searchParams.has('token'));assert.ok(!target.searchParams.has('next'));
 }
});
test('the 64 display examples are original fixtures, not runtime answer overrides',()=>{
 assert.deepEqual(HELPER_EXAMPLES.flatMap(g=>g.sentences),ELEMENTARY_HELPER_CASES.map(c=>c.text));
 assert.doesNotMatch(read('helper-core.js'),/helper-examples|helper-elementary-cases/);
});
test('release loads current audio, lazy dictionary and versioned data without game-server writes',()=>{
 const source=read('zhuyin-helper.js');
 assert.match(source,/little-teacher.js\?v=20261020-bo1/);assert.match(source,/audio-source.js\?v=20261020-bo1/);
 assert.match(source,/data\/syllables.json\?v=20261018-teacher1/);assert.match(source,/tone-questions.json\?v=20261011-teacher1/);
 assert.match(source,/function dictionary\(\)/);assert.match(source,/import\('\.\/reading-pronunciation-data/);
 assert.doesNotMatch(source,/localStorage|sessionStorage|workers\.dev|method:\s*['"]POST/);
});
