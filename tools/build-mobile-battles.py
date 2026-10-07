"""Compress precut PNG battle poses without changing their world geometry.
Input: source directory containing manifest.json and <character-id>.png atlases.
Output: staged assets and data/packed-battle-frames.js. Requires Pillow.
"""
import argparse,concurrent.futures,copy,json,pathlib
from PIL import Image,ImageChops
parser=argparse.ArgumentParser();parser.add_argument('--source',required=True);parser.add_argument('--output',required=True);parser.add_argument('--version',required=True);parser.add_argument('--workers',type=int,default=2);args=parser.parse_args()
source=pathlib.Path(args.source).resolve();output=pathlib.Path(args.output).resolve();manifest=json.loads((source/'manifest.json').read_text(encoding='utf8'));reports=[]
def layout(poses):
 best=None
 for width in [640,768,896,1024,1280,1536,1792,2048,2080]:
  if any(p['rect'][2]+8>width for p in poses):continue
  shelves=[];positions={};height=0
  for index,p in sorted(enumerate(poses),key=lambda item:(-item[1]['rect'][3],-item[1]['rect'][2])):
   w,h=p['rect'][2]+8,p['rect'][3]+8
   choices=[s for s in shelves if s['height']>=h and s['used']+w<=width]
   if choices:shelf=min(choices,key=lambda s:width-s['used']-w)
   else:shelf={'y':height,'height':h,'used':0};shelves.append(shelf);height+=h
   positions[index]=(shelf['used']+4,shelf['y']+4);shelf['used']+=w
  # Prefer the fewest decoded pixels. Padding prevents alpha bleed at edges.
  candidate=(width*height,width,height,positions)
  if best is None or candidate[0]<best[0]:best=candidate
 return best[1:]
def build(item):
 id,original=item;entry=copy.deepcopy(original);im=Image.open(source/(id+'.png')).convert('RGBA');poses=entry['frames']+([entry['allyStar']] if entry.get('allyStar') else []);width,height,positions=layout(poses);atlas=Image.new('RGBA',(width,height))
 for index,p in enumerate(poses):
  x,y,w,h=p['rect'];tile=im.crop((x,y,x+w,y+h));left,top=positions[index];atlas.paste(tile,(left,top));p['rect']=[left,top,w,h]
 entry['width'],entry['height']=width,height;file=output/entry['atlas'];file.parent.mkdir(parents=True,exist_ok=True);atlas.save(file,'WEBP',quality=84,method=6,exact=True)
 decoded=Image.open(file).convert('RGBA');assert decoded.size==(width,height);assert ImageChops.difference(atlas.getchannel('A'),decoded.getchannel('A')).getbbox() is None
 return id,entry,{'id':id,'bytes':file.stat().st_size,'sourcePixels':im.width*im.height,'pixels':width*height,'size':[width,height]}
with concurrent.futures.ThreadPoolExecutor(max_workers=max(1,min(args.workers,4))) as pool:
 for id,entry,report in pool.map(build,manifest.items()):manifest[id]=entry;reports.append(report)
(output/'data').mkdir(parents=True,exist_ok=True);(output/'data/packed-battle-frames.js').write_text("// Compact precut poses. Geometry, alpha and effect anchors remain unchanged.\nexport const PACKED_BATTLE_VERSION="+json.dumps(args.version)+";\nexport const PACKED_BATTLES="+json.dumps(manifest,separators=(',',':'))+';\n',encoding='utf8')
summary={'characters':len(manifest),'poses':sum(len(e['frames'])+bool(e.get('allyStar')) for e in manifest.values()),'bytes':sum(r['bytes'] for r in reports),'sourcePixels':sum(r['sourcePixels'] for r in reports),'pixels':sum(r['pixels'] for r in reports),'alphaPreserved':True,'reports':reports};(output/'build-report.json').write_text(json.dumps(summary),encoding='utf8');print(json.dumps({k:v for k,v in summary.items() if k!='reports'}))
