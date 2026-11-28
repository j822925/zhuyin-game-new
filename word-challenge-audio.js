import {createToneAudio} from './tone-audio.js';
export function wordSpeaker(notice,{player=createToneAudio(),synth=window.speechSynthesis,Utterance=window.SpeechSynthesisUtterance}={}){
  let generation=0;
  function stop(){generation++;player.stop();synth?.cancel();}
  async function play(question){
    stop();const active=generation;
    if(question.clip && /^T\d{4}$/.test(question.clip)){
      try{await player.play(new URL('./audio/tone-teacher-20261011/'+question.clip+'.mp3',import.meta.url).href);return;}
      catch{if(active!==generation)return;}
    }
    if(!synth||!Utterance){notice('這台裝置無法朗讀，請檢查中文語音後再點一次。');return;}
    const utterance=new Utterance(question.word),voices=synth.getVoices();
    utterance.lang='zh-TW';utterance.rate=.82;
    utterance.voice=voices.find(v=>/^(zh|cmn)[-_](Hant[-_])?TW/i.test(v.lang))||voices.find(v=>/^(cmn|zh[-_](CN|Hans|SG))/i.test(v.lang))||null;
    utterance.onerror=()=>{if(active===generation)notice('播放失敗，請再點詞語聽一次。');};
    synth.speak(utterance);
  }
  return {play,stop};
}
