export const WALK_CYCLE_DISTANCE=100;
// Legacy sheets use four poses; expanded sheets include down/up in-betweens.
// Phase is advanced by actual distance travelled, not by elapsed time.
export function walkFrame(walking,phase,frameCount=4){
  if(!walking)return 0;
  const cycle=((phase%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
  return 1+Math.min(frameCount-1,Math.floor(cycle/(Math.PI*2/frameCount)));
}

// Two weight transfers per stride. Positive bob lowers the collar just
// after contact; negative bob raises it during the passing/up phase.
// Values are proportions of character height and radians, not pixels.
export function walkPosture(walking,phase,direction){
  if(!walking)return {bob:0,headAngle:0};
  const side=direction===1||direction===3;
  return {
    bob:(direction===0?.010:.014)*Math.sin(phase*2),
    // A small lag in the nod, mirrored with travel direction. Front/back
    // views show a restrained alternating balance tilt instead of a nod.
    headAngle:side?(direction===1?1:-1)*.018*Math.sin(phase*2-.28):
      (direction===2?-.012:.004)*Math.sin(phase-.18),
  };
}
