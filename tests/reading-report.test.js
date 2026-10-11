import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
test('report after grading targets previous displayed reading, not incremented next word',()=>{
 const source=fs.readFileSync(new URL('../reading.js',import.meta.url),'utf8');
 const line=source.split('\n').find(s=>s.startsWith('const questionReport='));let options;
 const ctx=vm.createContext({document:{querySelector:()=>({})},demo:false,seat:'115001',deck:[{id:'apple'},{id:'banana'}],rows:[],locked:false,auth:{request:()=>{}},createQuestionReport:o=>{options=o;return {};}});
 vm.runInContext(line,ctx);assert.equal(options.getQuestion().questionId,'apple');ctx.rows.push({firstCorrect:false});ctx.locked=true;assert.equal(options.getQuestion().questionId,'apple');assert.equal(options.getQuestion().mode,'reading');ctx.locked=false;assert.equal(options.getQuestion().questionId,'banana');
 assert.match(source,/questionReport.refresh\(\)/);
});
test('tone v2 is sent while rewards remain authoritative server responses',()=>{
 const source=fs.readFileSync(new URL('../tone.js',import.meta.url),'utf8'),html=fs.readFileSync(new URL('../tone.html',import.meta.url),'utf8');assert.match(source,/REWARD_RULE='tone-stars-20261011-v2'/);assert.match(source,/rewardRule:REWARD_RULE/);assert.match(source,/out.stars/);assert.match(html,/答對3～4題1顆星、5～9題2顆星、10題全對3顆星/);
});
