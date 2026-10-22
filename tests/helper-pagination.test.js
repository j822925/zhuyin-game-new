import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIALS, FINALS} from '../helper-core.js';
import {symbolPage, symbolPageSize, resizeSymbolPage} from '../helper-pagination.js';

test('all symbols remain reachable exactly once on either tablet layout', () => {
  for (const size of [10,12]) for (const [kind, expected] of [
    ['initial', ['', ...INITIALS]], ['final', ['', ...FINALS]], ['tone', [1,2,3,4,5]]
  ]) {
    const {count} = symbolPage(kind,0,size);
    const actual = Array.from({length:count},(_,page)=>symbolPage(kind,page,size).values).flat();
    assert.deepEqual(actual,expected);
    assert.equal(new Set(actual).size,actual.length);
    for (let page=0;page<count;page++) assert.ok(symbolPage(kind,page,size).values.length<=size);
  }
});
test('page boundaries are clamped without empty trailing pages', () => {
  assert.equal(symbolPage('initial',-1).page,0);
  assert.equal(symbolPage('final',999).page,3);
  assert.ok(symbolPage('final',999).values.length>0);
  assert.deepEqual(symbolPage('tone',10).values,[1,2,3,4,5]);
});
test('breakpoint and rotation keep the beginning of the old group reachable', () => {
  assert.equal(symbolPageSize(900),10); assert.equal(symbolPageSize(901),12);
  for (const [oldSize,newSize] of [[10,12],[12,10]]) for(let page=0;page<4;page++) {
    const next = resizeSymbolPage(page,oldSize,newSize);
    assert.ok(next*newSize<=page*oldSize);
    assert.ok((next+1)*newSize>page*oldSize);
  }
});
