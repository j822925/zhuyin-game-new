import {ZONES} from './adventure-zones.js';
const mapPoint=([x,y])=>({x:x*3,y:y*3});
export const ISLAND_WORLD={width:4608,height:3072,cell:20};
export const ISLAND_ENTRY=mapPoint([540,558]);
export const ISLAND_HUB=mapPoint([807,541]);
// Coordinates are pixels on the 1536 × 1024 painting. Each target covers a
// doorway, with a separate arrival point on the trail in front of it.
const landmarks={
 forest:[504,503,507,534], furniture:[680,420,681,462], clothes:[929,461,931,514],
 seeds:[854,340,853,378], harbor:[508,842,566,823],
 bud:[627,526,630,561], stone:[801,444,800,477], sand:[775,618,776,655],
 sail:[744,233,739,270], shell:[635,660,643,697], whale:[925,254,926,292],
 watch:[1068,134,1070,209], port:[641,772,639,829], bridge:[1209,126,1204,156], deep:[336,812,345,842]
};
const base=[
 {id:'forest',name:'星光林地',icon:'🌲',kind:'route'},
 {id:'furniture',name:'家具行',icon:'🪑',kind:'shop',price:20},
 {id:'clothes',name:'服飾店',icon:'👗',kind:'shop',price:20},
 {id:'seeds',name:'種子店',icon:'🌱',kind:'shop'},
 {id:'harbor',name:'搭船拜訪',icon:'⛵',kind:'visits'},
 ...ZONES.map(z=>({id:'zone-'+z.id,name:z.name,icon:z.icon,kind:'adventure',zone:z.id}))
];
export const DESTINATIONS=base.map(d=>{
 const [x,y,ex,ey]=landmarks[d.zone||d.id];
 return {price:0,ready:true,...d,...mapPoint([x,y]),entry:mapPoint([ex,ey])};
});
// Trails traced from the new island painting, including the bridge to Baisha.
const trails=[
 [[507,534],[555,559],[627,572],[712,593],[771,569],[807,541],[792,507],[800,477],[824,388],[853,378],[920,363],[959,336],[941,309],[993,292],[1040,265],[1054,237],[1120,211],[1161,178],[1204,156],[1280,134],[1350,103],[1403,75],[1490,54]],
 [[627,572],[630,561]],[[792,507],[737,493],[695,475],[681,462]],[[807,541],[875,533],[931,514]],
 [[824,388],[754,370],[712,346],[702,320],[722,288],[739,270],[786,265],[816,220],[852,191],[817,160],[840,129],[907,101],[940,65]],
 [[941,309],[926,292]],[[1054,237],[1070,209]],[[712,593],[707,621],[728,650],[776,655]],
 [[776,655],[814,672],[776,689],[715,715],[661,724],[643,697]],
 [[715,715],[744,746],[758,785],[723,818],[674,840],[639,829],[589,841],[566,823]],
 [[661,724],[595,746],[570,776],[566,823]],[[595,746],[536,753],[484,737],[438,747],[403,771],[381,807],[345,842]],
 [[555,559],[522,551],[507,534]]
];
export const ISLAND_ROUTES=trails.map(line=>line.map(mapPoint));
