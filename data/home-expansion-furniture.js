// Decoration prices follow the existing 10–25 tier; larger pieces stay below premium moon furniture.
const floor=(id,name,price,height,fw,fh,extra={})=>({id,name,price,height,fw,fh,...extra});
const wall=(id,name,price,height,fw,extra={})=>floor(id,name,price,height,fw,12,{wall:true,...extra});
const sets={
 honey:[floor('sofa','小熊暖暖沙發',36,155,185,75),floor('desk','蜂蜜寫字桌',24,158,150,70),floor('pantry','蜂蜜玻璃餐櫃',22,200,130,62),floor('range','蜂蜜燉煮爐',35,205,145,75,{cooking:true,areas:['kitchen']}),wall('clock','小熊搖擺掛鐘',12,135,74,{play:'music'}),wall('pot-shelf','暖木鍋具架',14,105,145),wall('flower-picture','暖陽雛菊畫',10,120,100),wall('coat-hooks','小熊帽帽掛架',10,100,130)],
 ocean:[floor('chair','小魚抱枕椅',32,155,120,70),floor('bookcase','貝殼閱讀書架',24,210,112,58),floor('aquarium','泡泡小魚缸',28,155,112,60,{play:'bubbles'}),floor('vanity','海洋洗手台',28,158,142,70,{areas:['bathroom','kitchen']}),floor('laundry','海風洗衣籃',10,100,83,50,{areas:['bathroom','bedroom']}),wall('mirror','珍珠貝殼鏡',16,140,100),wall('whale-picture','鯨魚旅行掛畫',10,120,110),wall('towel-bar','海風毛巾架',10,100,125)],
 berry:[floor('sofa','草莓花朵沙發',38,155,185,75),floor('desk','花園創作書桌',26,158,150,70,{play:'sparkles'}),floor('plant-stand','三層花草架',16,185,85,50),floor('tea-cart','草莓午茶推車',20,140,130,65),floor('flower-rug','花瓣編織地毯',15,130,225,125,{flat:true}),wall('hanging-vase','花園壁掛花瓶',12,130,80),wall('flower-sconce','花朵暖光壁燈',14,125,85,{play:'sparkles'}),wall('garden-picture','草莓小屋掛畫',10,115,125)]
};
export const EXPANSION_FURNITURE=Object.entries(sets).flatMap(([style,items])=>items.map((f,index)=>({...f,id:style+'-'+f.id,style,atlas:style+'More',index})));
