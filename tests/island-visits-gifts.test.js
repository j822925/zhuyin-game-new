import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../adventure-model.js';
import {availableVisitGifts} from '../island-visits-ui.js';

test('stored complimentary toilet is kept while purchased furniture and food remain giftable',()=>{
 const state=freshState();state.bathroomLayout=[];state.furnitureOwned.push('honey-toilet');state.life.harvest.carrot=6;
 const before=structuredClone(state),items=availableVisitGifts(state);
 assert(!items.some(item=>item.id==='daisy-complete-toilet'),'new starter cannot enter the gift confirmation');
 assert(items.some(item=>item.id==='honey-toilet'&&item.kind==='furniture'));
 assert(items.some(item=>item.id==='carrot'&&item.quantity===6));
 assert.deepEqual(state,before,'gift browsing is read only');
 state.bathroomLayout=[{id:'honey-toilet',x:370,y:433}];
 assert(!availableVisitGifts(state).some(item=>item.id==='honey-toilet'),'placed bought item still must be stored first');
});
