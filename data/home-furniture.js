import {FARM_CROP_ART} from './farm-crop-art.js';
import {priceFurniture} from '../adventure-economy.js';
import {SPATIAL_FURNITURE} from './home-spatial-furniture.js';
import {scaleHomeFurniture} from '../furniture-surfaces.js';
import {DISPLAY_FURNITURE} from './home-display-furniture.js';
import {ZONE_FURNITURE} from './zone-shop-furniture.js';
import {ZONE_SHOP_ART} from './zone-shop-art.js';
import {EXTRA_STYLES,EXTRA_ATLASES,EXTRA_FURNITURE} from './home-extra-furniture.js';
import {WALL_FURNITURE} from './home-wall-furniture.js';
import {WALL_DECOR_ART} from './wall-decor-art.js';
import {EXPANSION_FURNITURE} from './home-expansion-furniture.js';
import {HOME_EXPANSION_ART} from './home-expansion-art.js';
import {COMPLETION_FURNITURE} from './home-completion-furniture.js';
import {HOME_COMPLETION_ART} from './home-completion-art.js';
import {COLLECTION_FURNITURE} from './home-collection-furniture.js';
import {HOME_COLLECTION_ART} from './home-collection-art.js';
import {COLLECTION_ZONE_FURNITURE} from './collection-zone-furniture.js';
import {COLLECTION_ZONE_ART} from './collection-zone-art.js';
import {COLLECTION_FOOD_ART} from './collection-food-art.js';
export const HOME_STYLES=[...EXTRA_STYLES,
 {id:'daisy',name:'雛菊田園',character:'棉花兔',description:'鼠尾草綠、奶油白與小雛菊'},
 {id:'fox',name:'橡果木屋',character:'橘子狐',description:'橡果木紋、暖橘與森林青綠'},
 {id:'moon',name:'月光夢境',character:'月亮精靈',description:'柔紫、月牙與小金星'},
];
export const HOME_ATLASES={...EXTRA_ATLASES,extraCrops:FARM_CROP_ART.extraCrops.src,
 ...Object.fromEntries(Object.entries(HOME_COLLECTION_ART).map(([key,v])=>[key,v.src])),
 ...Object.fromEntries(Object.entries(COLLECTION_ZONE_ART).map(([key,v])=>[key,v.src])),
 ...Object.fromEntries(Object.entries(COLLECTION_FOOD_ART).map(([key,v])=>[key,v.src])),
 ...Object.fromEntries(Object.entries(HOME_COMPLETION_ART).map(([key,v])=>[key,v.src])),
 ...Object.fromEntries(Object.entries(ZONE_SHOP_ART).filter(([,v])=>v.cells).map(([key,v])=>[key,v.src])),
 ...Object.fromEntries(Object.entries(HOME_EXPANSION_ART).map(([key,v])=>[key,v.src])),
 wallDecor:WALL_DECOR_ART.src,
 daisyHome:'assets/adventure-prototype/daisy-home-v1.png',
 foxHome:'assets/adventure-prototype/fox-home-v1.png',
 moonHome:'assets/adventure-prototype/moon-home-v1.png',
};
const set=(style,atlas,prices)=>[
 {id:style+'-bed',name:style==='fox'?'橡果暖被床':'月牙晚安床',index:0,height:215,fw:145,fh:105},
 {id:style+'-sofa',name:style==='fox'?'狐尾小沙發':'月光軟沙發',index:1,height:162,fw:198,fh:75},
 {id:style+'-table',name:style==='fox'?'橡果小茶几':'星語小茶几',index:2,height:116,fw:120,fh:62},
 {id:style+'-lamp',name:style==='fox'?'橡果暖光燈':'月牙小夜燈',index:3,height:176,fw:54,fh:32},
 {id:style+'-rug',name:style==='fox'?'秋葉編織毯':'月光星星毯',index:4,height:141,fw:248,fh:136,flat:true},
 {id:style+'-stove',name:style==='fox'?'橡果料理爐':'月光料理爐',index:5,height:160,fw:140,fh:75,cooking:true,areas:['kitchen']},
].map((f,i)=>({...f,style,atlas,price:prices[i],...(f.id.endsWith('-bed')?{rest:'sleep'}:{}),...(f.id.endsWith('-table')?{dining:true}:{})}));
export const FURNITURE=[
 {id:'bed',rest:'sleep',name:'雛菊小床',index:0,height:215,fw:145,fh:105},
 {id:'sofa',name:'森林沙發',index:1,height:162,fw:198,fh:75},
 {id:'table',dining:true,name:'圓圓小茶几',index:2,height:116,fw:120,fh:62},
 {id:'lamp',name:'暖光立燈',index:3,height:176,fw:54,fh:32},
 {id:'plant',name:'葉子盆栽',index:4,height:139,fw:62,fh:39},
 {id:'rug',name:'雛菊編織毯',atlas:'daisyHome',index:0,height:141,fw:248,fh:136,flat:true},
].map(f=>({...f,style:'daisy',price:0,starter:true})).concat([
 {id:'daisy-stove',name:'雛菊料理爐',style:'daisy',atlas:'daisyHome',index:1,height:160,fw:132,fh:75,price:0,starter:true,cooking:true,areas:['kitchen']},
 {id:'daisy-fridge',name:'雛菊小冰箱',style:'daisy',atlas:'daisyHome',index:3,height:192,fw:108,fh:66,price:30,areas:['kitchen']},
 {id:'daisy-sink',name:'雛菊洗手台',style:'daisy',atlas:'daisyHome',index:4,height:153,fw:145,fh:70,price:25,areas:['kitchen','bathroom']},
 {id:'daisy-stool',name:'雛菊圓凳',style:'daisy',atlas:'daisyHome',index:5,height:86,fw:73,fh:43,price:10},
 ...set('fox','foxHome',[50,45,25,15,18,40]),
 ...set('moon','moonHome',[65,60,35,25,25,55]),
 ...EXTRA_FURNITURE,
 ...WALL_FURNITURE,
 ...EXPANSION_FURNITURE,
 ...COMPLETION_FURNITURE,
 ...ZONE_FURNITURE,
 ...DISPLAY_FURNITURE,
 ...COLLECTION_FURNITURE,
 ...SPATIAL_FURNITURE,
 ...COLLECTION_ZONE_FURNITURE,
]).map(priceFurniture).map(f=>f.id==='daisy-complete-toilet'?{...f,starter:true,price:0}:f).map(scaleHomeFurniture);
export const STARTER_FURNITURE=FURNITURE.filter(f=>f.starter).map(f=>f.id);
