// Device/browser preference only: no student identifier, transcript or recording.
const KEY='zhuyin-reading-auto-finish-v1';
const INPUT_KEY='zhuyin-reading-input-mode-v1';
export function readReadingInputMode(storage){try{return (storage??globalThis.localStorage)?.getItem(INPUT_KEY)==='keyboard'?'keyboard':'speech';}catch{return 'speech';}}
export function saveReadingInputMode(value,storage){if(!['speech','keyboard'].includes(value))return false;try{(storage??globalThis.localStorage)?.setItem(INPUT_KEY,value);return true;}catch{return false;}}
export function readSpeechAutoFinish(storage){try{return (storage??globalThis.localStorage)?.getItem(KEY)==='on';}catch{return false;}}
export function saveSpeechAutoFinish(value,storage){try{(storage??globalThis.localStorage)?.setItem(KEY,value?'on':'off');return true;}catch{return false;}}
export function speechDiagnostic(code,d={}){
 return '版本：20261029-auto1；Safari／瀏覽器辨識；回報：'+code+'；模式：'+(d.autoFinish?'停頓後送出':'按送出')+'；收音啟動：'+(d.capturing?'是':'否')+'；已按送出：'+(d.stopRequested?'是':'否')+'；文字回報：'+(d.resultEvents||0)+'次；曾有暫定文字：'+(d.hadInterim?'是':'否')+'。';
}
