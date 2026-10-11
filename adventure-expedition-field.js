// Coordinates refer to the existing painted backgrounds, never the viewport crop.
const layouts={
 bud:{boss:[50,43],floor:[[17,37],[70,36],[82,66],[65,88],[18,88]]},
 stone:{boss:[52,35],floor:[[42,29],[61,39],[70,61],[91,88],[10,90],[21,64]]},
 sand:{boss:[55,39],floor:[[26,36],[68,35],[83,74],[65,91],[15,88],[18,59]]},
 sail:{boss:[67,39],floor:[[34,34],[80,36],[86,84],[15,88],[13,56]]},
 shell:{boss:[49,34],floor:[[34,30],[60,31],[77,57],[81,89],[70,91],[36,84],[19,55]]},
 whale:{boss:[58,40],floor:[[48,37],[73,42],[80,66],[63,87],[40,91],[29,79],[22,59]]},
 watch:{boss:[51,37],floor:[[37,34],[66,34],[85,92],[70,94],[27,88],[22,60]]},
 port:{boss:[57,44],floor:[[30,36],[72,43],[86,68],[62,90],[23,86],[14,60]]},
 bridge:{boss:[63,38],floor:[[58,34],[65,34],[92,93],[15,93],[38,59]]},
 deep:{boss:[65,35],floor:[[56,31],[77,33],[86,73],[65,89],[24,86],[23,53]]},
};
const places={bud:[[35,85],[20,53]],stone:[[30,86],[69,69]],sand:[[37,84],[72,63]],sail:[[25,83],[23,61]],shell:[[75,84],[62,54]],whale:[[46,85],[67,54]],watch:[[73,85],[69,63]],port:[[43,83],[28,60]],bridge:[[53,88],[79,76]],deep:[[48,81],[72,59]]};
for(const [id,[entry,shop]] of Object.entries(places)){Object.assign(layouts[id],{entry,shop,spawn:[entry[0],entry[1]-9]});}
export const fieldLayout=id=>layouts[id]||layouts.bud;
export function fieldWalkable(id,p){const poly=fieldLayout(id).floor;let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p.y)!==(b[1]>p.y)&&p.x<(b[0]-a[0])*(p.y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
export function fieldPoint(id,point){if(fieldWalkable(id,point))return {...point};const poly=fieldLayout(id).floor,center={x:poly.reduce((s,p)=>s+p[0],0)/poly.length,y:poly.reduce((s,p)=>s+p[1],0)/poly.length};for(let t=.98;t>=0;t-=.02){const p={x:center.x+(point.x-center.x)*t,y:center.y+(point.y-center.y)*t};if(fieldWalkable(id,p))return p;}return center;}
export function makeFieldActors(id,count){return Array.from({length:count},(_,i)=>{const home=fieldPoint(id,{x:30+i%3*22,y:57+Math.floor(i/3)*13});return {x:home.x,y:home.y,home,clock:i*2.1,direction:1};});}
export function stepFieldActors(id,actors,dt){for(const a of actors){a.clock+=dt*.45;const next=fieldPoint(id,{x:a.home.x+Math.sin(a.clock)*7,y:a.home.y+Math.sin(a.clock*.73)*4});a.direction=next.x<a.x?3:1;a.x=next.x;a.y=next.y;}}
