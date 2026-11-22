// Stable activity IDs are distinct from the similarly named legacy reading lesson.
export const CROP_LESSONS={
 single:{name:'聽音辨識',page:'index.html',questions:10,icon:'👂'},
 tone:{name:'聲調小劇場',page:'tone.html',questions:10,icon:'🎵'},
 spelling:{name:'拼音工坊',page:'index.html',questions:10,icon:'🧩'},
 reading:{name:'朗讀小舞台',page:'reading.html',questions:5,icon:'🎤'},
 'hanzi-reading':{name:'看國字寫注音',page:'hanzi.html?mode=reading',questions:5,variable:true,min:1,max:5,icon:'✏️'},
 'hanzi-writing':{name:'看注音寫國字',page:'hanzi.html?mode=writing',questions:5,variable:true,min:1,max:5,icon:'✍️'},
 'hanzi-copy':{name:'生字模仿',page:'hanzi-copy.html?mode=copy',questions:5,variable:true,min:1,max:5,icon:'📝'},
 'name-writing':{name:'看注音寫姓名',page:'hanzi-copy.html?mode=name-writing',questions:null,variable:true,min:2,max:6,icon:'✍️'},
 'name-copy':{name:'姓名模仿',page:'hanzi-copy.html?mode=name-copy',questions:null,variable:true,min:2,max:6,icon:'📝'},
 arithmetic:{name:'加減玩',page:'arithmetic.html',questions:10,variable:true,totals:[5,10,20],icon:'🔢'},
};
export function isVariableFarmLesson(mode){return Object.hasOwn(CROP_LESSONS,mode)&&CROP_LESSONS[mode].variable===true;}
export function validFarmLessonTotal(mode,total){
 const lesson=CROP_LESSONS[mode];
 return Object.hasOwn(CROP_LESSONS,mode)&&Number.isSafeInteger(total)&&(lesson.totals?lesson.totals.includes(total):lesson.variable?total>=lesson.min&&total<=lesson.max:total===lesson.questions);
}
export function farmLessonRequirement(mode){
 const lesson=CROP_LESSONS[mode];if(!lesson)return '';
 return lesson.variable?'完成一回合，第一次作答答對至少 70%':`第一次答對至少 ${Math.ceil(lesson.questions*.7)}／${lesson.questions} 題`;
}
