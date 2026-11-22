import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../adventure-model.js';
import {availableVisitGifts} from '../island-visits-ui.js';
import {LESSON_CROPS,LESSON_RECIPES} from '../data/lesson-harvest-foods.js';

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

test('new learning harvests and meals are kept out of gifts until the server catalog supports them',()=>{
 const state=freshState();state.life.harvest.carrot=6;state.life.nutrition.meals.soup=1;
 for(const id of Object.keys(LESSON_CROPS)){state.life.harvest[id]=6;state.life.seeds[id]=1;}
 for(const id of Object.keys(LESSON_RECIPES))state.life.nutrition.meals[id]=1;
 const before=structuredClone(state),items=availableVisitGifts(state);
 assert(!items.some(item=>LESSON_CROPS[item.id]||LESSON_RECIPES[item.id]));
 assert(items.some(item=>item.kind==='harvest'&&item.id==='carrot'));assert(items.some(item=>item.kind==='meal'&&item.id==='soup'));
 assert.deepEqual(state,before);
});
