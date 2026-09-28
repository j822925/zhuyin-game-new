export const MONSTERS=[
 {id:'twilight-count',name:'暮影小伯爵',kind:'古堡龍族',theme:'castle',mark:'♜',move:'暮影星波',image:'assets/monsters/twilight-count-v1.png',line:'披風一揚，影子也跟著行禮。'},
 {id:'frost-fox',name:'霜月幻狐',kind:'冰晶幻獸',theme:'frost',mark:'❄',move:'霜月旋光',image:'assets/monsters/frost-fox-v1.png',line:'笑容像月光，腳步比雪還輕。'},
 {id:'rose-knight',name:'荊棘薔薇爵士',kind:'翡翠甲蟲',theme:'rose',mark:'❦',move:'薔薇突擊',image:'assets/monsters/rose-knight-v1.png',line:'玫瑰藏著鋒芒，決鬥也要優雅。'},
 {id:'raven-masquerade',name:'墨羽假面師',kind:'人形幻魔',theme:'theater',mark:'☾',move:'墨羽幻術',image:'assets/monsters/raven-masquerade-v1.png',line:'摘下面具之前，先猜猜他的下一招。'}
];
export function monsterForEncounter(key){let hash=2166136261;for(const ch of String(key)){hash=Math.imul(hash^ch.charCodeAt(0),16777619)>>>0;}return MONSTERS[hash%MONSTERS.length];}
export function randomMonster(){const limit=4294967296-4294967296%MONSTERS.length;let n;do{n=crypto.getRandomValues(new Uint32Array(1))[0];}while(n>=limit);return MONSTERS[n%MONSTERS.length];}
