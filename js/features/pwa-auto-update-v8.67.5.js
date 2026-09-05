/* PocketNexus V8.67.5 — automatic deployed-build adoption
   Keeps user data intact. Only service-worker/cache lifecycle state is touched. */
(function(){
  'use strict';
  if(window.PPCPWAAutoUpdate)return;

  const VERSION='8.67.5-autoupdate1';
  const CHECK_EVERY_MS=5*60*1000;
  const RELOAD_GUARD='ppc_sw_reload_guard_v8675';
  let registration=null;
  let checking=false;

  const secureEnough=()=>location.protocol==='https:'||['localhost','127.0.0.1'].includes(location.hostname);

  function shouldReload(){
    try{
      const last=Number(sessionStorage.getItem(RELOAD_GUARD)||0);
      if(Date.now()-last<12000)return false;
      sessionStorage.setItem(RELOAD_GUARD,String(Date.now()));
    }catch{}
    return true;
  }

  function activateWaiting(reg){
    try{reg?.waiting?.postMessage({type:'SKIP_WAITING'})}catch{}
  }

  async function checkNow(){
    if(checking||!registration)return false;
    checking=true;
    try{
      await registration.update();
      activateWaiting(registration);
      return true;
    }catch(err){
      console.warn('[PWA Update] update check failed',err);
      return false;
    }finally{checking=false}
  }

  async function install(){
    if(!('serviceWorker' in navigator)||!secureEnough())return false;
    try{
      // updateViaCache:none tells the browser not to reuse cached service-worker
      // dependencies when checking for a newly deployed build.
      registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
      activateWaiting(registration);

      registration.addEventListener('updatefound',()=>{
        const worker=registration.installing;
        if(!worker)return;
        worker.addEventListener('statechange',()=>{
          if(worker.state==='installed')activateWaiting(registration);
        });
      });

      await checkNow();
      return true;
    }catch(err){
      console.warn('[PWA Update] registration failed',err);
      return false;
    }
  }

  navigator.serviceWorker?.addEventListener('controllerchange',()=>{
    if(shouldReload())location.reload();
  });

  navigator.serviceWorker?.addEventListener('message',event=>{
    if(event.data?.type==='POCKETNEXUS_SW_ACTIVATED'){
      // The worker has already claimed this page. controllerchange normally reloads;
      // this message is a fallback for browsers with delayed controller events.
      setTimeout(()=>{if(shouldReload())location.reload()},250);
    }
  });

  window.addEventListener('load',()=>{install()},{once:true});
  window.addEventListener('pageshow',()=>{checkNow()});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkNow()});
  window.addEventListener('online',()=>checkNow());
  setInterval(()=>checkNow(),CHECK_EVERY_MS);

  window.PPCPWAAutoUpdate={version:VERSION,checkNow,getRegistration:()=>registration};
})();
