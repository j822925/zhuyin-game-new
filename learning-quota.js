// One class-scoped, atomic daily ledger for both learning games. No new schema.
export const LEARNING_LIMIT=150,LEARNING_BUCKET='hanzi-arithmetic-20261116';
export const learningDay=at=>new Date(at+28800000).toISOString().slice(0,10);
export async function learningUsage(db,classId,seat,at){
 const day=learningDay(at),row=await db.prepare('SELECT perfect FROM daily_usage WHERE seat=? AND day=? AND mode=?').bind(seat,day,LEARNING_BUCKET).first();
 if(row)return {day,spent:row.perfect};
 const from=Date.parse(day+'T00:00:00+08:00'),to=from+86400000;
 const old=await db.prepare("SELECT COALESCE(SUM(stars),0) AS stars FROM (SELECT COALESCE(json_extract(result,'$.stars'),0) stars FROM hanzi_runs WHERE class_id=? AND seat=? AND kind='practice' AND status<>'started' AND COALESCE(json_extract(result,'$.completedAt'),updated_at)>=? AND COALESCE(json_extract(result,'$.completedAt'),updated_at)<? UNION ALL SELECT COALESCE(json_extract(data,'$.result.stars'),0) stars FROM arithmetic_runs WHERE class_id=? AND seat=? AND kind='practice' AND status='submitted' AND updated_at>=? AND updated_at<?)").bind(classId,seat,from,to,classId,seat,from,to).first();
 return {day,spent:Number(old.stars)||0};
}
export async function learningAward(db,classId,seat,at,requested,guard){
 const usage=await learningUsage(db,classId,seat,at),stars=Math.min(requested,Math.max(0,LEARNING_LIMIT-usage.spent));
 const writes=[db.prepare('INSERT INTO daily_usage(seat,day,mode,perfect,perseverance) VALUES(?,?,?,?,0) ON CONFLICT(seat,day,mode) DO NOTHING').bind(seat,usage.day,LEARNING_BUCKET,usage.spent),db.prepare('UPDATE daily_usage SET perfect=perfect+? WHERE seat=? AND day=? AND mode=? AND perfect=?').bind(stars,seat,usage.day,LEARNING_BUCKET,usage.spent),...guard()];
 return {stars,writes,reward:{day:usage.day,limit:LEARNING_LIMIT,earned:usage.spent+stars,remaining:Math.max(0,LEARNING_LIMIT-usage.spent-stars),requested,capped:stars<requested}};
}
