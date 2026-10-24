// Cabinet run: two base units + sink, 100 stars; companion chair matches the
// existing collection chair at 20. No stat advantage or retroactive price change.
const themes={daisy:'雛菊',fox:'橡果',moon:'月光',honey:'蜂蜜',ocean:'貝殼',berry:'草莓'};
export const SPATIAL_FURNITURE=Object.entries(themes).flatMap(([style,label])=>[
 {id:'spatial-'+style+'-corner-kitchen',name:label+'轉角系統廚具',role:'corner-kitchen',corner:true,style,price:100,priceVersion:'20261025',areas:['kitchen'],height:260,fw:460,fh:180,surfaceKind:'cabinet',surfaceLevels:[.63],surfaceWidth:220,atlas:'collection'+style[0].toUpperCase()+style.slice(1),index:2},
 {id:'spatial-'+style+'-dining-chair',name:label+'木背餐椅・配對椅',role:'dining-chair-extra',style,price:20,priceVersion:'20261025',height:120,fw:72,fh:45,surfaceKind:'sofa',surfaceLevels:[.38],surfaceWidth:50,atlas:'collection'+style[0].toUpperCase()+style.slice(1),index:6}
]);
