// Art-space anchors: shop threshold, community gate, guardian's feet, field exit,
// resident work station and the return lane in the residential scene.
const landmarks={
 bud:[[17,56],[81,33],[51,40],[46,90],[37,53],[49,92]],
 stone:[[20,62],[83,40],[51,38],[47,89],[62,54],[49,91]],
 sand:[[17,65],[84,34],[53,34],[50,91],[39,55],[49,91]],
 sail:[[16,55],[82,38],[53,39],[51,90],[59,51],[47,92]],
 shell:[[18,53],[82,37],[51,38],[50,91],[41,53],[48,92]],
 whale:[[19,58],[83,37],[52,35],[49,91],[60,51],[50,92]],
 watch:[[21,60],[82,35],[52,36],[44,91],[42,52],[47,92]],
 port:[[18,62],[82,41],[52,40],[48,91],[58,49],[49,92]],
 bridge:[[17,57],[83,40],[52,38],[49,90],[42,53],[50,92]],
 deep:[[18,51],[81,33],[53,36],[49,90],[58,51],[49,92]]
};
const layouts=Object.fromEntries(Object.entries(landmarks).map(([id,[shop,gate,boss,entry,resident,back]])=>{
 const floor=[[5,shop[1]-3],shop,[boss[0],boss[1]-3],[gate[0],gate[1]-5],[95,gate[1]],[95,92],[entry[0]+5,98],[5,92]];
 const mirror=['stone','sail','whale','port','deep'].includes(id);
 const project=([x,y])=>[mirror?100-x:x,y];
 return [id,{mirror,shop:project(shop),gate:project(gate),boss:project(boss),entry:project(entry),resident,return:back,spawn:project([entry[0],entry[1]-8]),floor:floor.map(project)}];
}));
export const districtLayout=id=>layouts[id];

