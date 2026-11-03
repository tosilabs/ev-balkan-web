// BFCache pauses a page without reconstructing its modules. Resume periodic checks.
export function createPageTimer(callback,delay,{target=globalThis,schedule=setInterval,cancel=clearInterval}={}){
 let timer=null,disposed=false;
 function start(){if(!disposed&&timer===null)timer=schedule(callback,delay);}
 function pause(){if(timer!==null){cancel(timer);timer=null;}}
 function resume(event){start();if(event.persisted)callback();}
 target.addEventListener('pagehide',pause);target.addEventListener('pageshow',resume);start();
 return ()=>{disposed=true;pause();target.removeEventListener('pagehide',pause);target.removeEventListener('pageshow',resume);};
}
