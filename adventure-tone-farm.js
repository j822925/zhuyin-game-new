import {grade} from './tone-core.js';
// Adapt whole-word correctness only; do not change tone grading or star rewards.
export function toneFarmResult(payload,bank,seat){
 if(!bank||payload.bankVersion!==bank.version||!Array.isArray(payload.results)||payload.results.length!==10)return null;
 const rows=[];for(const row of payload.results){const question=bank.questions.find(q=>q.id===row.id);if(!question||!Array.isArray(row.answers)||row.answers.length!==question.lexicalTones.length)return null;rows.push({firstCorrect:grade(question,row.answers).wholeCorrect});}
 return {roundId:payload.roundId,seat,mode:'tone',total:10,results:rows};
}
