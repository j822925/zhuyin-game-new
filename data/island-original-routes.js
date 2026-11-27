import {ZONES} from './adventure-zones.js';
export const ISLAND_SCALE=1.5;
export const ISLAND_WORLD={width:3840,height:2400,cell:20};
export const ISLAND_ENTRY={x:920*ISLAND_SCALE,y:880*ISLAND_SCALE};
export const ISLAND_HUB={x:1300*ISLAND_SCALE,y:860*ISLAND_SCALE};
// Extension point: each destination owns its kind, entry, cost and readiness.
// Future classmates must come from an authenticated same-class adapter, never mock names.
export const DESTINATIONS=[
 {id:'forest',name:'星光林地',icon:'🌲',kind:'route',x:448,y:423,entry:{x:460,y:440},price:0,ready:true},
 {id:'furniture',name:'家具行',icon:'🪑',kind:'shop',x:570,y:349,entry:{x:570,y:369},via:[{x:633,y:401},{x:586,y:384}],price:20,ready:true},
 {id:'clothes',name:'服飾店',icon:'👗',kind:'shop',x:760,y:388,entry:{x:760,y:409},via:[{x:703,y:424}],price:20,ready:true},
 {id:'seeds',name:'種子店',icon:'🌱',kind:'shop',x:700,y:284,entry:{x:695,y:305},via:[{x:657,y:382},{x:643,y:334},{x:650,y:308}],price:0,ready:true},
 {id:'harbor',name:'搭船拜訪',icon:'⛵',kind:'visits',x:448,y:649,entry:{x:480,y:629},via:[{x:640,y:476},{x:602,y:521},{x:558,y:560},{x:523,y:593}],price:0,ready:true},
] .map(d=>({...d,x:d.x*2*ISLAND_SCALE,y:d.y*2*ISLAND_SCALE,entry:{x:d.entry.x*2*ISLAND_SCALE,y:d.entry.y*2*ISLAND_SCALE},via:d.via?.map(p=>({x:p.x*2*ISLAND_SCALE,y:p.y*2*ISLAND_SCALE}))}));
DESTINATIONS.push(...ZONES.map(z=>({id:'zone-'+z.id,name:z.name,icon:z.icon,kind:'adventure',x:z.x*ISLAND_SCALE,y:z.y*ISLAND_SCALE,entry:{x:z.x*ISLAND_SCALE,y:(z.y+30)*ISLAND_SCALE},price:0,ready:true,zone:z.id})));
const rawRoutes=[
 [[460,440],[513,457],[565,463],[619,455],[650,430],[657,382],[643,334],[630,307],[645,268],[674,233],[693,203],[774,152],[875,139],[968,101],[1060,86],[1175,58],[1250,30]],
 [[650,430],[633,401],[586,384],[570,369]],[[650,430],[703,424],[760,409]],
 [[630,307],[650,308],[695,305]],[[774,152],[740,90],[760,70],[710,50],[660,60]],
 [[650,430],[640,476],[602,521],[558,560],[523,593],[480,629],[440,655],[399,697]],
 [[558,560],[455,585],[380,605],[275,654],[170,667]],
 [[602,521],[685,548],[755,565]],[[480,629],[565,666],[620,690]]
 ];
 export const ISLAND_ROUTES=rawRoutes.map(path=>path.map(([x,y])=>({x:x*2*ISLAND_SCALE,y:y*2*ISLAND_SCALE})));
 for(const z of ZONES){const p={x:z.x*ISLAND_SCALE,y:(z.y+30)*ISLAND_SCALE};let nearest=ISLAND_ROUTES.flat().reduce((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)<Math.hypot(b.x-p.x,b.y-p.y)?a:b);ISLAND_ROUTES.push([nearest,p]);}
