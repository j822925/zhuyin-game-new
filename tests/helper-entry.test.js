import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {helperUrl,mountHelperEntry} from '../helper-entry.js';
const base='https://j822925.github.io/zhuyin-game-new/';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('helper links preserve the explicit class and only carry the supported demo flag',()=>{
 for(const [path,expected] of [['','main'],['index.html','main'],['grade2.html','grade2'],['?class=main','main'],['?class=grade2','grade2'],['grade2.html?class=main','main']]){
  for(const demo of ['', '&demo=1', '&demo=0']){
   const source=base+path+(path.includes('?')?'&':'?')+'seat=115001&pin=1234&token=private&next=https://example.invalid/'+demo+'#private';
   const link=new URL(helperUrl(source));
   assert.equal(link.origin,'https://j822925.github.io');
   assert.equal(link.pathname,'/zhuyin-game-new/zhuyin-helper.html');
   assert.equal(link.searchParams.get('class'),expected);
   assert.equal(link.searchParams.get('v'),'20261022-helper1');
   assert.equal(link.searchParams.get('demo'),demo==='&demo=1'?'1':null);
   assert.equal(link.hash,'');
   assert.deepEqual([...link.searchParams.keys()].sort(),demo==='&demo=1'?['class','demo','v']:['class','v']);
  }
 }
});

test('helper mounts once as a standard link and needs no account or network access',()=>{
 const elements=new Map();
 const make=()=>({children:[],style:{},attributes:{},setAttribute(k,v){this.attributes[k]=v;},append(node){this.children.push(node);},prepend(node){this.children.unshift(node);elements.set(node.id,node);}});
 const home=make(),root={getElementById:id=>id==='home'?home:elements.get(id),createElement:make};
 mountHelperEntry(root,base+'grade2.html?demo=1');
 mountHelperEntry(root,base+'grade2.html?demo=1');
 assert.equal(home.children.length,1);
 const panel=home.children[0],link=panel.children[0];
 assert.equal(panel.id,'helper-home-entry');
 assert.equal(panel.attributes['aria-label'],'注音小幫手');
 assert.match(link.innerHTML,/📖.*注音小幫手.*說詞查注音・拼音聽讀音/);
 assert.equal(new URL(link.href).searchParams.get('class'),'grade2');
 assert.equal(link.onclick,undefined);
 mountHelperEntry({getElementById:()=>null},base);
});

test('homepage removes only the classroom entry and retains its existing services and battle navigation',()=>{
 const boot=read('game-boot.js'),names=read('island-names.js'),entry=read('helper-entry.js');
 assert.match(boot,/helper-entry.js\?v=20261022-helper1/);
 assert.match(boot,/island-names.js\?v=20261022-helper1/);
 assert.doesNotMatch(boot,/classroom-entry/);
 assert.match(names,/if\(helper\|\|root.getElementById\('duo'\)\|\|root.getElementById\('race'\)\)/);
 assert.match(names,/row.append\(button\)/);
 assert.match(names,/if\(helper\)challenge.append\(helper\)/);
 assert.doesNotMatch(entry,/fetch\(|localStorage|sessionStorage|api-client|student-auth|data-mode/);
 assert.match(read('student-login-gate.js'),/target.closest\('header,#home'\)/);
 assert.match(read('classroom.html'),/classroom/);
 assert.match(read('classroom-entry.js'),/加入全班問答/);
});
