// Extract only word/pronunciation facts, never definitions, examples or audio.
// Usage: node tools/build-reading-pronunciations.mjs rows.json /path/to/opencc-js/dist/esm/full.js
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const [source,openccPath]=process.argv.slice(2);
if(!source||!openccPath)throw Error('Supply the MOE row JSON and opencc-js 1.4.2 ESM module path');
const {Converter}=await import(pathToFileURL(path.resolve(openccPath)));
const simplify=Converter({from:'tw',to:'cn'}),input=fs.readFileSync(source),rows=JSON.parse(input);
const entries=new Map(),syllables=[],ids=new Map();let accepted=0,skipped=0;
function add(word,code){if(!entries.has(word))entries.set(word,new Set());entries.get(word).add(code);}
for(const row of rows){
 const word=row.A||'',chars=Array.from(word);
 if(chars.length<1||chars.length>4||!/^\p{Script=Han}+$/u.test(word))continue;
 const sounds=(row.G||'').trim().split(/\s+/u).map(s=>s.startsWith('˙')?s.slice(1)+'˙':s);
 if(sounds.length!==chars.length||!sounds.every(s=>/^[ㄅ-ㄩ]{1,3}[ˊˇˋ˙]?$/.test(s))){skipped++;continue;}
 const code=sounds.map(s=>{if(!ids.has(s)){ids.set(s,syllables.length.toString(36));syllables.push(s);}return ids.get(s);}).join('.');
 add(word,code);accepted++;
 // Script variants preserve whole words; never regional vocabulary substitution.
 const simple=Array.from(simplify(word));
 if(simple.length===chars.length){
  let forms=[''];for(let i=0;i<chars.length;i++)forms=forms.flatMap(p=>[...new Set([chars[i],simple[i]])].map(c=>p+c));
  for(const form of forms)add(form,code);
 }
}
const sorted=Object.fromEntries([...entries].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([word,codes])=>[word,[...codes].join('|')]));
const metadata={source:'MOE Concise Dictionary 2014 / 20260626',sha256:createHash('sha256').update(input).digest('hex'),acceptedRows:accepted,skippedSpecialNotation:skipped,spellings:entries.size,characters:[...entries.keys()].filter(w=>Array.from(w).length===1).length,syllables:syllables.length,converter:'opencc-js 1.4.2'};
const output='// Generated pronunciation facts. Source, limits and notices: docs/reading-pronunciations.md\nexport const PRONUNCIATION_METADATA='+JSON.stringify(metadata)+';\nexport const PRONUNCIATION_SYLLABLES='+JSON.stringify(syllables)+';\nexport const PRONUNCIATIONS='+JSON.stringify(sorted)+';\n';
fs.writeFileSync(new URL('../reading-pronunciation-data.js',import.meta.url),output);
console.log(JSON.stringify({...metadata,bytes:Buffer.byteLength(output)}));
