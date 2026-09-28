// This worker only downloads public software/model assets. Never upload audio.
const download=globalThis.fetch.bind(globalThis);
globalThis.fetch=(input,options={})=>{const method=(options.method||input?.method||'GET').toUpperCase();if(!['GET','HEAD'].includes(method)||options.body)throw Error('Uploads are disabled');return download(input,{...options,credentials:'omit'});};
let transcriber,loading,busy=false;
async function prepare(id){
 if(transcriber)return transcriber;
 if(!loading)loading=(async()=>{
  const {pipeline,env}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js');
  env.allowLocalModels=false;env.useBrowserCache=true;
  env.backends.onnx.wasm.numThreads=1;env.backends.onnx.wasm.proxy=false;
  return pipeline('automatic-speech-recognition','Xenova/whisper-tiny',{revision:'5332fcc35e32a33b86612b9a57a89be7906102b1',device:'wasm',dtype:'q8',progress_callback:p=>{if(p.status==='progress')postMessage({id,type:'progress',file:p.file,loaded:p.loaded,total:p.total});}});
 })();
 try{transcriber=await loading;return transcriber;}catch(e){loading=null;throw e;}
}
self.onmessage=async({data})=>{
 const {id,type,audio}=data;if(busy)return;busy=true;
 try{
  const engine=await prepare(id);
  if(type==='prepare')postMessage({id,type:'ready'});
  else if(type==='transcribe'){
   if(!(audio instanceof Float32Array)||audio.length>16_000*13||audio.length<4000)throw Error('Invalid audio');
   const start=performance.now();
   const result=await engine(audio,{language:'chinese',task:'transcribe',return_timestamps:false,max_new_tokens:32,do_sample:false,num_beams:1});
   postMessage({id,type:'result',text:result.text||'',seconds:(performance.now()-start)/1000});
  }
 }catch(e){postMessage({id,type:'error',message:String(e.message||e).slice(0,300)});}finally{busy=false;}
};
