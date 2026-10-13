import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {runInNewContext} from 'node:vm';
// Contract of the actual local wrapper used by the farm's lesson button.
// Full plant/water/click/answer/harvest browser coverage lives in the release QA.
const source=readFileSync(new URL('../adventure-life.js',import.meta.url),'utf8');
const wrapper=source.match(/const save=\(\)=>\{[^\n]+\};/)?.[0];
test('farm save forwards both success and failure, rendering once without extra requests',()=>{
 assert(wrapper);for(const result of [true,false]){let saves=0,renders=0;const api={save(){saves++;return result;},renderState(){renders++;}};
  assert.equal(runInNewContext(wrapper+'save();',{api}),result);assert.equal(saves,1);assert.equal(renders,1);
 }
});
