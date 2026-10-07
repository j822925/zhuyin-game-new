"""Build immutable public-image renditions from original artwork using the mobile policy.
Example: python tools/build-mobile-images.py --kind portrait --output .local/stage ART.png
Prints the original -> rendition mapping; does not rewrite any runtime catalog.
"""
import argparse,hashlib,io,json,pathlib
from PIL import Image,ImageChops
parser=argparse.ArgumentParser();parser.add_argument('--kind',choices=['portrait','thumbnail','card','background'],required=True);parser.add_argument('--output',required=True);parser.add_argument('images',nargs='+');args=parser.parse_args()
policy=json.loads(pathlib.Path(__file__).with_name('mobile-asset-policy.json').read_text());rule=policy[args.kind];out=pathlib.Path(args.output);reports=[]
for original in args.images:
 source=pathlib.Path(original);image=Image.open(source).convert('RGBA');before=image.size;image.thumbnail((rule['maxDimension'],rule['maxDimension']),Image.Resampling.LANCZOS)
 buffer=io.BytesIO();image.save(buffer,'WEBP',quality=rule['quality'],method=6,exact=True);data=buffer.getvalue();decoded=Image.open(io.BytesIO(data)).convert('RGBA')
 assert decoded.size==image.size;assert ImageChops.difference(image.getchannel('A'),decoded.getchannel('A')).getbbox() is None
 if len(data)<source.stat().st_size:
  out.mkdir(parents=True,exist_ok=True);delivery=out/(hashlib.sha256(data).hexdigest()[:20]+'.webp');delivery.write_bytes(data)
 else:delivery=source
 reports.append({'source':source.as_posix(),'delivery':delivery.as_posix(),'before':before,'size':image.size,'bytes':delivery.stat().st_size,'alphaPreserved':True})
print(json.dumps(reports,ensure_ascii=False))
