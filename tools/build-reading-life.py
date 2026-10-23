"""Explicitly curated everyday vocabulary; reference facts only, no definitions."""
from pathlib import Path
import json, re, collections, hashlib
ROOT=Path(__file__).resolve().parents[1]
REFERENCE=ROOT.parent/'m-audio-review-20260922/moe-release/dictionary-rows.json'
rows=json.loads(REFERENCE.read_text(encoding='utf-8'))
lookup=collections.defaultdict(list)
for row in rows: lookup[row.get('A','')].append(row)
old=set(re.findall(r'"([^"]+)","[ㄅ-ㄩ]',(ROOT/'reading-words.js').read_text(encoding='utf-8')))
old.update(re.findall(r"'([^']+)','[ㄅ-ㄩ]",(ROOT/'reading-core.js').read_text(encoding='utf-8')))
entries=[]; differences=[]; category=''; seen=set(old)
selections={'大家':'101500258','泡泡':'035400000'}
for line in (ROOT/'data/reading-life-reviewed.txt').read_text(encoding='utf-8').splitlines():
 if line.startswith('# '):category=line[2:];continue
 if not line.strip():continue
 word,reviewed=line.split('|')
 assert word not in seen, 'Duplicate: '+word
 seen.add(word)
 reference=lookup[word]
 if word in selections:reference=[r for r in reference if r['B']==selections[word]]
 assert len(reference)<=1, 'Select meaning: '+word
 zhuyin=reviewed;moeId=None
 if reference:
  moeId=reference[0]['B']
  parts=reference[0]['G'].split()
  zhuyin=' '.join(p[1:]+'˙' if p.startswith('˙') else p for p in parts)
  if zhuyin!=reviewed:differences.append([word,reviewed,zhuyin])
 assert 2<=len(word)<=3 and len(zhuyin.split())==len(word), word
 assert all(re.fullmatch(r'[ㄅ-ㄩ]{1,3}[ˊˇˋ˙]?',s) for s in zhuyin.split()), word
 entries.append({'id':f'life-{len(entries)+1:03d}','word':word,'zhuyin':zhuyin,'aliases':[],'category':category, 'source': 'moe-term' if moeId else 'reviewed-compound',**({'moeId':moeId} if moeId else {})})
assert len(entries)==300, len(entries)
out='// 300 everyday additions, 2026-10-23. See docs/reading-wordbank-sources.md.\nexport const LIFE_READING_WORDS = '+json.dumps(entries,ensure_ascii=False,indent=1)+';\n'
(ROOT/'reading-life-words.js').write_text(out,encoding='utf-8')
report={'new':len(entries),'byLength':dict(collections.Counter(len(e['word']) for e in entries)),'categories':dict(collections.Counter(e['category'] for e in entries)),'sources':dict(collections.Counter(e['source'] for e in entries)),'referenceSha256':hashlib.sha256(REFERENCE.read_bytes()).hexdigest(),'referenceOverrides':differences}
(ROOT/'docs/reading-life-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
