/** One spoken passage at a time, including the original player and small previews. */
const players=new Map<string,(time:number)=>void>();
export function registerLessonPlayer(id:string,seek:(time:number)=>void){
  players.set(id,seek);return ()=>{if(players.get(id)===seek)players.delete(id);};
}
// Invoke playback inside the timestamp's click, preserving the mobile browser's
// user gesture instead of waiting for React's later effect.
export function seekLessonPlayer(id:string,time:number):boolean{
  const seek=players.get(id);if(!seek)return false;seek(time);return true;
}
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
