export const WALLPAPERS=[
 {id:'original',name:'原來的森林小屋',price:0,style:'daisy'},
 {id:'daisy',name:'雛菊田園整套風格',price:70,style:'daisy'},
 {id:'fox',name:'橡果木屋整套風格',price:85,style:'fox'},
 {id:'moon',name:'月光夢境整套風格',price:100,style:'moon'},
 {id:'honey',name:'蜂蜜暖木整套風格',price:80,style:'honey'},
 {id:'ocean',name:'泡泡海洋整套風格',price:90,style:'ocean'},
 {id:'berry',name:'草莓花園整套風格',price:90,style:'berry'},
].map(w=>({...w,resaleBase:w.price,price:({daisy:120,fox:150,moon:200,honey:140,ocean:160,berry:160})[w.id]??w.price}));
