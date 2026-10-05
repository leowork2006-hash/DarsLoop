/** One spoken passage at a time, including the original player and small previews. */
export function exclusiveAudio(active:HTMLAudioElement){
  document.querySelectorAll('audio').forEach(audio=>{if(audio!==active)audio.pause();});
}
export async function playAt(audio:HTMLAudioElement,time:number){
  audio.pause();
  if(audio.readyState<1)await new Promise<void>((resolve,reject)=>{
    const clean=()=>{clearTimeout(timer);audio.removeEventListener('loadedmetadata',ready);audio.removeEventListener('error',error);};
    const ready=()=>{clean();resolve();};const error=()=>{clean();reject(new Error('Audio unavailable'));};
    const timer=setTimeout(error,15000);
    audio.addEventListener('loadedmetadata',ready,{once:true});audio.addEventListener('error',error,{once:true});
  });
  audio.currentTime=Math.max(0,time);exclusiveAudio(audio);await audio.play();
}
