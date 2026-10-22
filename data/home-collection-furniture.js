// Six coordinated household collections. Existing purchases and layouts retain
// their original IDs; these are new sizes/shapes with dedicated transparent art.
const themes={daisy:'雛菊',fox:'橡果',moon:'月光',honey:'蜂蜜',ocean:'貝殼',berry:'草莓'};
const specs=[
 ['tv-stand','電視矮櫃',45,105,240,52,{surfaceKind:'cabinet',surfaceLevels:[.82],surfaceWidth:205}],
 ['display-cabinet','展示高櫃',60,210,128,58,{surfaceKind:'shelf',surfaceLevels:[.66,.47,.28],surfaceWidth:104}],
 ['kitchen-base','廚具地櫃',50,125,215,65,{areas:['kitchen'],surfaceKind:'cabinet',surfaceLevels:[.84],surfaceWidth:180}],
 ['kitchen-wall','壁掛廚櫃',30,118,135,12,{areas:['kitchen'],wall:true}],
 ['appliance-counter','電器收納櫃',45,125,220,62,{areas:['kitchen'],surfaceKind:'cabinet',surfaceLevels:[.84],surfaceWidth:190}],
 ['dining-table','家用餐桌',40,145,190,72,{dining:true,surfaceKind:'table',surfaceLevels:[.80],surfaceWidth:150}],
 ['dining-chair','木背餐椅',20,120,72,45,{surfaceKind:'sofa',surfaceLevels:[.38],surfaceWidth:50}],
 ['bookcase','開放書櫃',45,205,145,58,{surfaceKind:'shelf',surfaceLevels:[.64,.39,.14],surfaceWidth:112}],
 ['nightstand','床頭小櫃',25,92,95,48,{surfaceKind:'cabinet',surfaceLevels:[.83],surfaceWidth:76}],
 ['bath-cabinet','衛浴收納高櫃',35,178,75,45,{areas:['bathroom']}],
 ['shower','淋浴花灑',30,175,78,12,{areas:['bathroom'],wall:true,rest:'bath'}],
 ['glass-door','霧面玻璃隔間',35,196,125,60,{areas:['bathroom']}]
];
export const COLLECTION_FURNITURE=Object.entries(themes).flatMap(([style,prefix])=>specs.map(([role,label,price,height,fw,fh,extra],index)=>({
 id:'collection-'+style+'-'+role,name:prefix+label,style,role,price,priceVersion:'20261022',height,fw,fh,
 atlas:'collection'+style[0].toUpperCase()+style.slice(1),index,...extra
})));
