import {ZONES} from './adventure-zones.js';
import {islandMapScale,islandMapPoint} from './island-map-space.js';
const mapPoint=([x,y])=>islandMapPoint(x,y);
export const ISLAND_WORLD={width:1536*islandMapScale,height:1024*islandMapScale,cell:24};
export const ISLAND_ENTRY=mapPoint([540,558]);
export const ISLAND_HUB=mapPoint([807,541]);
// Coordinates are pixels on the 1536 × 1024 painting. Each target covers a
// doorway, with a separate arrival point on the trail in front of it.
const landmarks={
 forest:[504,503,507,534], furniture:[680,420,681,462], clothes:[929,461,931,514],
 seeds:[854,340,853,378], harbor:[508,842,566,823],
 bud:[627,526,630,561], stone:[797,446,798,482], sand:[775,618,776,655],
 sail:[744,233,739,270], shell:[635,660,643,697], whale:[925,254,926,292],
 watch:[1068,134,1070,209], port:[641,772,639,829], bridge:[1190,133,1185,157], deep:[336,812,345,842]
};
const thresholds={
 bud:[630,527],stone:[797,447],sand:[768,622],sail:[748,232],shell:[635,660],
 whale:[925,254],watch:[1081,194],port:[643,803],bridge:[1175,149],deep:[335,814]
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
 return {price:0,ready:true,...d,...mapPoint([x,y]),entry:mapPoint([ex,ey]),...(d.zone?{threshold:mapPoint(thresholds[d.zone])}:{})};
});
// Trails traced from the new island painting, including the bridge to Baisha.
const trails=[
 [[507,534],[555,559],[627,572],[695,579],[711,568],[718,560],[741,550],[789,547],[807,541],[792,507],[762,493],[719,482],[706,470],[731,457],[741,441],[736,415],[744,402],[770,384],[800,389],[824,388],[853,378],[920,363],[959,336],[941,309],[993,292],[1040,265],[1054,237],[1120,211],[1152,195],[1165,176],[1185,157],[1179,140],[1190,134],[1214,130],[1245,131],[1280,124],[1350,103],[1403,75],[1490,54]],
 [[627,572],[630,561],[630,545],[630,526]],[[792,507],[798,482],[797,462],[797,446]],[[762,493],[738,495],[702,479],[681,462]],[[807,541],[875,533],[931,514]],
 [[824,388],[754,370],[712,346],[702,320],[722,288],[739,270],[786,265],[816,220],[852,191],[817,160],[840,129],[907,101],[940,65]],
 [[941,309],[926,292],[925,273],[925,254]],[[739,270],[744,253],[748,232]],[[1054,237],[1070,209],[1081,194]],[[789,547],[843,548],[878,557],[900,573],[920,599],[935,626],[924,651],[886,664],[846,666],[814,672],[776,655]],
 [[776,655],[785,646],[776,633],[768,622]],[[776,655],[814,672],[776,689],[715,715],[661,713],[643,697]],
 [[715,715],[744,746],[758,785],[723,818],[674,840],[639,829],[589,841],[566,823]],
 [[661,713],[628,713],[600,723],[595,746],[570,776],[566,823]],[[595,746],[536,753],[484,737],[438,747],[403,771],[383,805],[380,831],[368,844],[345,842]],
 [[643,697],[637,678],[635,660]],[[639,829],[641,814],[643,803]],[[345,842],[337,834],[335,814]],
 [[555,559],[522,551],[507,534]]
];
export const ISLAND_ROUTES=trails.map(line=>line.map(mapPoint));

 // Solid faces extend from the lintel/roof down to the threshold. Coordinates
 // stay in survey space so collision, zoom and the background share an origin.
const solidFaces=[
 [475,461,532,520],[627,374,723,444],[892,412,971,496],[811,302,890,363],
 [578,488,606,548],[652,488,675,548],[747,406,777,461],[820,397,841,463],
 [714,573,745,638],[803,580,855,642],[689,202,725,249],[768,196,792,246],
 [589,629,615,681],[656,631,677,678],[879,224,901,275],[951,226,971,273],
 [1010,99,1124,180],[606,721,673,796],
 [1144,81,1159,147],[1235,78,1250,119],[286,766,314,827],[354,769,372,827],[399,707,467,737]
];
export function blockedByLandmark(x,y){
 const px=x/islandMapScale,py=y/islandMapScale;
 return solidFaces.some(([l,t,r,b])=>px>=l&&px<=r&&py>=t&&py<=b);
}
