export const EXTRA_STYLES=[
 {id:'honey',name:'蜂蜜暖木',character:'蜂蜜熊',description:'蜂蜜木色、奶油黃與小熊'},
 {id:'ocean',name:'泡泡海洋',character:'海洋夥伴',description:'珍珠白、淺海藍與小貝殼'},
 {id:'berry',name:'草莓花園',character:'花園夥伴',description:'草莓粉、奶油白與嫩綠葉'},
];
export const EXTRA_ATLASES=Object.fromEntries(EXTRA_STYLES.map(s=>[s.id+'Home','assets/home-comfort/'+s.id+'-v1.webp']));
const names={honey:['蜂蜜晚安床','小熊泡泡浴缸','蜂蜜小茶几','蜂巢故事櫃','小熊馬桶','小熊音樂盒'],ocean:['貝殼晚安床','貝殼泡泡浴缸','珍珠小茶几','海洋故事櫃','貝殼馬桶','水母泡泡燈'],berry:['草莓晚安床','草莓泡泡浴缸','花園小茶几','草莓故事櫃','草莓馬桶','花園小畫架']};
const prices={honey:[35,20,20,18,12,25],ocean:[45,30,25,22,15,18],berry:[50,35,28,25,18,22]};
export const EXTRA_FURNITURE=EXTRA_STYLES.flatMap(({id:style})=>[
 {type:'bed',height:215,fw:145,fh:105,rest:'sleep'},
 {type:'tub',height:160,fw:190,fh:85,rest:'bath',areas:['bathroom']},
 {type:'table',height:116,fw:120,fh:62,dining:true},
 {type:'cabinet',height:155,fw:150,fh:65},
 {type:'toilet',height:125,fw:75,fh:60,areas:['bathroom']},
 {type:'play',height:style==='berry'?160:105,fw:80,fh:48,play:style==='honey'?'music':style==='ocean'?'bubbles':'sparkles'},
].map((f,index)=>({...f,id:style+'-'+f.type,name:names[style][index],style,atlas:style+'Home',index,price:prices[style][index]})));
