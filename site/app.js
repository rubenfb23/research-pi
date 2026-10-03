// Replay recorded output as text. Retrieved recording content is never evaluated as code/HTML.
const play=document.querySelector('#play'),terminal=document.querySelector('#terminal'),status=document.querySelector('#replay-status');
let playing=false;
play.addEventListener('click',async()=>{
 if(playing)return;playing=true;play.disabled=true;terminal.textContent='';status.textContent='Playing recorded output. No commands are being executed.';
 try{
  const response=await fetch('assets/study.cast');if(!response.ok)throw Error('Recording unavailable');
  const entries=(await response.text()).trim().split('\n').map(line=>JSON.parse(line)),frames=entries.slice(1);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let previous=0;
  for(const [time,kind,text] of frames){
   if(kind!=='o')continue;
   if(!reduced)await new Promise(resolve=>setTimeout(resolve,Math.min(1000,Math.max(0,(time-previous)*1000))));
   terminal.textContent+=String(text).replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'').replace(/\r/g,'');previous=time;terminal.scrollTop=terminal.scrollHeight;
  }
  status.textContent='Recording complete. Twenty actual training runs; inspect capture provenance for hashes.';
 }catch{terminal.textContent='The recording could not be loaded. Open the repository assets or try again.';status.textContent='Recording unavailable.';}
 finally{playing=false;play.disabled=false;play.textContent='Replay study recording';}
});
