// Missing pieces only: keep all existing IDs, purchases and layouts intact.
const specs={sofa:[165,205,90],
 cabinet:[155,150,65],fridge:[190,105,65],sink:[153,145,70,{areas:['kitchen','bathroom']}],tub:[160,190,85,{rest:'bath',areas:['bathroom']}],toilet:[125,75,60,{rest:'toilet',areas:['bathroom']}],chair:[115,70,45],desk:[155,150,70,{play:'sparkles'}],mirror:[140,95,12,{wall:true}],towel:[110,100,12,{wall:true}],picture:[125,100,12,{wall:true}],shelf:[130,145,12,{wall:true}],plant:[139,65,40],lamp:[175,55,32],rug:[135,235,130,{flat:true}],stove:[160,140,75,{cooking:true,areas:['kitchen']}]
};
const sets={
 moon:[['cabinet','月光星語櫃',32],['fridge','月光小冰箱',45],['sink','月牙洗手台',35],['tub','月光泡泡浴缸',45],['toilet','月牙馬桶',24],['chair','星語軟墊椅',20],['desk','月光寫字桌',35],['mirror','月牙星鏡',24],['towel','月光毛巾架',14],['picture','月夜森林畫',18],['shelf','月光盆栽架',22],['plant','月牙綠葉盆栽',18]],
 fox:[['cabinet','橡果收納櫃',26],['fridge','橡果小冰箱',38],['sink','橡果洗手台',30],['tub','橡果泡泡浴缸',35],['toilet','橡果馬桶',18],['chair','狐尾軟墊椅',16],['desk','橡果寫字桌',28],['mirror','秋葉木框鏡',20],['towel','狐尾毛巾架',12],['picture','秋日森林畫',14],['shelf','橡果盆栽架',18],['plant','橡果綠葉盆栽',14]],
 daisy:[['cabinet','雛菊收納櫃',20],['tub','雛菊泡泡浴缸',25],['toilet','雛菊馬桶',12],['desk','雛菊寫字桌',22]],
 honey:[['lamp','小熊暖光立燈',16],['rug','蜂蜜編織毯',16],['fridge','蜂蜜小冰箱',32],['sink','蜂蜜洗手台',26],['chair','小熊軟墊椅',14],['mirror','蜂蜜木框鏡',16],['towel','小熊毛巾架',10],['plant','蜂蜜花草盆栽',12]],
 ocean:[['sofa','貝殼泡泡沙發',42],['rug','海洋貝殼毯',18],['stove','海洋料理爐',40],['fridge','海洋小冰箱',36],['desk','貝殼寫字桌',28],['shelf','貝殼盆栽架',18],['plant','海風綠葉盆栽',14],['chair','珍珠軟墊凳',14]],
 berry:[['stove','草莓料理爐',40],['fridge','草莓小冰箱',36],['sink','草莓洗手台',28],['chair','草莓軟墊椅',16],['mirror','草莓花框鏡',18],['towel','草莓毛巾架',10],['shelf','花園盆栽架',18],['plant','草莓花草盆栽',14]]
};
export const COMPLETION_FURNITURE=Object.entries(sets).flatMap(([style,rows])=>rows.map(([role,name,price],index)=>{const [height,fw,fh,extra={}]=specs[role];return{id:style+'-complete-'+role,name,price,height,fw,fh,style,role,atlas:style+'Complete',index,...extra};}));
// Each style now covers these 18 core needs. Existing decorative extras remain unique.
export const CORE_FURNITURE_ROLES=['bed','sofa','table','lamp','rug','cabinet','stove','fridge','sink','tub','toilet','chair','desk','mirror','towel','picture','shelf','plant'];
export const EXISTING_ROLE_IDS={
 daisy:['bed','sofa','table','lamp','rug','daisy-stove','daisy-fridge','daisy-sink','daisy-stool','wall-mirror','wall-towel','wall-picture','wall-plant-shelf','plant'],
 fox:['fox-bed','fox-sofa','fox-table','fox-lamp','fox-rug','fox-stove'],
 moon:['moon-bed','moon-sofa','moon-table','moon-lamp','moon-rug','moon-stove'],
 honey:['honey-bed','honey-sofa','honey-table','honey-cabinet','honey-range','honey-tub','honey-toilet','honey-desk','honey-flower-picture','honey-pot-shelf'],
 ocean:['ocean-bed','ocean-table','ocean-play','ocean-cabinet','ocean-vanity','ocean-tub','ocean-toilet','ocean-mirror','ocean-towel-bar','ocean-whale-picture'],
 berry:['berry-bed','berry-sofa','berry-table','berry-flower-sconce','berry-flower-rug','berry-cabinet','berry-tub','berry-toilet','berry-desk','berry-garden-picture']
};

