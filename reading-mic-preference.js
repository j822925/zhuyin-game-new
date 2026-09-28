// This browser's hardware choice is shared across seats/classes, never uploaded.
const KEY='zhuyin.reading.microphone.v1';
function valid(value){return value&&typeof value.deviceId==='string'&&value.deviceId.length<=1024&&typeof value.label==='string'&&value.label.length<=512;}
export function createMicPreference(getStorage=()=>globalThis.localStorage){
 let choice=null,saved=false;
 try{const value=JSON.parse(getStorage().getItem(KEY));if(valid(value)){choice={deviceId:value.deviceId,label:value.label};saved=true;}}catch{}
 return {
  get choice(){return choice?{...choice}:null;},
  get saved(){return saved;},
  select(deviceId,label){
   if(!valid({deviceId,label}))return false;
   choice={deviceId,label};saved=false;
   try{getStorage().setItem(KEY,JSON.stringify(choice));saved=true;}catch{}
   return saved;
  }
 };
}
