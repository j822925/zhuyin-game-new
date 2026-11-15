// Shared by the student, offline preview and authoritative service.
export const PRACTICE_RULE='hanzi-five-correction-stars-v2';
export function bonusQuestion(snapshot,number){
  const pool=snapshot.bonusPool||snapshot.baseQuestions||snapshot.questions;
  if(!pool?.length)throw Error('invalid_answers');
  const source=pool[(number-1)%pool.length];
  return {...source,id:source.id+'.bonus.'+number,questionId:source.id+'.bonus.'+number,sourceQuestionId:source.sourceQuestionId||source.id};
}
export function practiceQuestions(snapshot,answers){
  const questions=[...(snapshot.baseQuestions||snapshot.questions)];let extras=0;
  if(!Array.isArray(answers)||answers.length>200)throw Error('invalid_answers');
  for(let i=0;i<answers.length;i++){
    const row=answers[i];
    if(!questions[i]||row?.questionId!==questions[i].id||row.hintBeforeFirst!==undefined&&typeof row.hintBeforeFirst!=='boolean')throw Error('invalid_answers');
    if(row.hintBeforeFirst){if(snapshot.mode!=='writing')throw Error('invalid_answers');questions.push(bonusQuestion(snapshot,++extras));}
  }
  if(answers.length!==questions.length)throw Error('invalid_answers');
  return questions;
}
