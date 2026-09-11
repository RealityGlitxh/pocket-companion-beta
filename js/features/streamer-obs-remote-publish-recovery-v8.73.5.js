/* PocketNexus V8.73.5 — Remote OBS forced-publish recovery.
   Forced publishes are user/QA critical transitions (workspace/mode/state changes).
   Verify that Supabase accepted the active mode and retry short transient failures
   instead of returning success/failure before the remote reader can observe it. */
(function(){
'use strict';
if(window.PPCStreamerOBSRemotePublishRecovery)return;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const safe=(fn,f=null)=>{try{return fn()}catch{return f}};

function cloud(){
  return safe(()=>window.PPCAccountCloudCore?.client?.(),null)||safe(()=>cloudClient,null);
}

function install(){
  const remote=window.PPCStreamerOBSRemote;
  if(!remote||typeof remote.publish!=='function')return false;
  if(remote.__publishRecoveryInstalled)return true;
  remote.__publishRecoveryInstalled=true;
  const original=remote.publish.bind(remote);

  remote.publish=async function(force=false){
    if(!force)return original(false);
    let last=false;
    for(let attempt=0;attempt<3;attempt++){
      try{last=await original(true)}catch{last=false}
      if(last){
        const creds=remote.readCreds?.();
        const c=cloud();
        const expected=String(remote.buildState?.().activeMode||'');
        if(!creds?.overlay_id||!c?.rpc||!expected)return true;
        try{
          const {data,error}=await c.rpc('read_stream_overlay',{p_overlay_id:creds.overlay_id});
          if(!error&&data?.status==='ok'&&String(data?.state?.activeMode||'')===expected)return true;
        }catch{}
      }
      if(attempt<2)await sleep(attempt===0?300:700);
    }
    return !!last;
  };
  return true;
}

window.PPCStreamerOBSRemotePublishRecovery={version:'8.73.5',install};
let tries=0;const timer=setInterval(()=>{if(install()||++tries>200)clearInterval(timer)},100);
install();
})();
