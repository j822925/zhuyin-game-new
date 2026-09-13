import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {CHARACTERS,STARTERS,drawCharacter,redeemCharacter,characterSvg} from '../characters.js';
const wallet=()=>({stars:15,candies:0,owned:[...STARTERS]});
test('30 個不同角色，10 個動物、10 個精靈和 10 個冒險小隊，均有獨立原創圖片',()=>{
 assert.equal(CHARACTERS.length,30);assert.equal(new Set(CHARACTERS.map(c=>c.id)).size,30);
 for(const category of ['animal','fairy','hero'])assert.equal(CHARACTERS.filter(c=>c.category===category).length,10);
 assert.equal(new Set(CHARACTERS.map(c=>c.image)).size,30);
 for(const c of CHARACTERS){assert.ok(existsSync(new URL('../'+c.image,import.meta.url)));assert.ok(characterSvg(c).includes('<svg'));}
});
test('抽中重複角色扣 5 星星、加 1 糖果，不重複加入角色',()=>{
 const before=wallet(),out=drawCharacter(before,'animal',()=>0);
 assert.equal(out.duplicate,true);assert.equal(out.wallet.stars,10);assert.equal(out.wallet.candies,1);
 assert.deepEqual(out.wallet.owned,STARTERS);assert.equal(before.stars,15);
});
test('抽中新角色加入收藏、不加糖果；不足 5 星不能抽',()=>{
 const out=drawCharacter(wallet(),'fairy',()=>0);assert.equal(out.duplicate,false);assert.equal(out.wallet.candies,0);assert.equal(out.wallet.owned.length,3);
 assert.equal(drawCharacter({...wallet(),stars:4},'fairy').error,'stars');
});
test('有 50 糖果才能自選未擁有角色，恰好扣 50，不扣星星',()=>{
 assert.equal(redeemCharacter({...wallet(),candies:49},'moon').error,'candies');
 const out=redeemCharacter({...wallet(),candies:50},'moon');assert.equal(out.wallet.candies,0);assert.equal(out.wallet.stars,15);assert.ok(out.wallet.owned.includes('moon'));
 assert.equal(redeemCharacter({...out.wallet,candies:50},'moon').error,'owned_or_unknown');
});
