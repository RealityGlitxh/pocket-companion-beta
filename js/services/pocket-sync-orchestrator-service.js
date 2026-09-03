/* V8.59.3 Automatic Sync Orchestrator
   Runs registered read-only adapters, records each run, retries transient failures,
   and forwards successful envelopes to the existing ingestion layer.
   Browser scheduling only runs while Pocket Companion is open; server-side scheduling
   can be attached later without changing the adapter contract. */
(function(){
  const timers=new Map();
  const active=new Set();
  const DEFAULTS={cadenceMinutes:60,retryLimit:2,retryBackoffSeconds:5,autoApplyReady:true};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const client=()=>window.getPPCCloudClient?.()||window.cloudClient||null;
  const session=()=>window.getPPCCloudSession?.()||window.cloudSession||null;
  const signedIn=()=>!!client()&&!!session()?.user?.id;
  const nowIso=()=>new Date().toISOString();

  function safeError(e){return String(e?.message||e||'Unknown sync error').slice(0,1000)}
  function stableKey(parts){
    const s=parts.map(x=>String(x??'')).join('|');let h=2166136261;
    for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
    return `orch_${(h>>>0).toString(16)}`;
  }
  function meta(adapterId){return window.PPCPocketSyncAdapters?.get?.(adapterId)||null}
  function assertRunnable(adapterId){
    const a=meta(adapterId);
    if(!a)throw new Error(`Pocket Sync adapter not registered: ${adapterId}`);
    if(a.availability!=='available')throw new Error(`${a.label} is ${a.availability}; it cannot run automatically.`);
    return a;
  }
  async function createRun({adapterId,sourceKey,triggerKind,scheduleId}){
    if(!signedIn())return null;
    const c=client(),uid=session().user.id;
    const row={user_id:uid,adapter_id:adapterId,source_key:sourceKey,status:'syncing',trigger_kind:triggerKind||'manual',schedule_id:scheduleId||null,attempt_count:1,started_at:nowIso(),idempotency_key:stableKey([uid,adapterId,triggerKind||'manual',Date.now()])};
    const res=await c.from('pocket_sync_runs').insert(row).select('*').single();
    if(res.error)throw res.error;
    return res.data;
  }
  async function finishRun(run,status,{counts={},provenance={},error=null,attempts=1}={}){
    if(!run||!signedIn())return;
    const payload={status,completed_at:nowIso(),imported_counts:counts||{},provenance:provenance||{},error_message:error||null,attempt_count:attempts};
    const res=await client().from('pocket_sync_runs').update(payload).eq('id',run.id);
    if(res.error)console.warn('Pocket orchestrator finish run',res.error);
  }
  async function updateSchedule(scheduleId,patch){
    if(!scheduleId||!signedIn())return;
    const res=await client().from('pocket_sync_schedules').update({...patch,updated_at:nowIso()}).eq('id',scheduleId);
    if(res.error)console.warn('Pocket orchestrator schedule update',res.error);
  }
  async function run(adapterId,options={}){
    const a=assertRunnable(adapterId);
    if(active.has(adapterId))throw new Error(`${a.label} is already syncing.`);
    active.add(adapterId);
    const triggerKind=options.triggerKind||'manual';
    const retryLimit=Math.max(0,Math.min(5,Number(options.retryLimit??DEFAULTS.retryLimit)||0));
    const backoff=Math.max(1,Math.min(300,Number(options.retryBackoffSeconds??DEFAULTS.retryBackoffSeconds)||5));
    let runRow=null,attempt=0,lastError=null;
    try{
      runRow=await createRun({adapterId,sourceKey:a.sourceKey||adapterId,triggerKind,scheduleId:options.scheduleId||null});
      if(options.scheduleId)await updateSchedule(options.scheduleId,{last_started_at:nowIso(),last_status:'syncing',last_error:null});
      for(attempt=1;attempt<=retryLimit+1;attempt++){
        try{
          const result=await window.PPCPocketSyncAdapters.run(adapterId,{input:options.input??{},session:session(),signal:options.signal||null});
          if(typeof window.processPocketSyncEnvelope!=='function')throw new Error('Pocket Sync ingestion bridge did not load.');
          const ingestion=await window.processPocketSyncEnvelope(result.envelope,{sourceKey:result.envelope?.source?.key||a.sourceKey||adapterId,autoApplyReady:options.autoApplyReady!==false,rawFingerprintInput:result.envelope,recordBatch:true,sourceLabel:a.label,triggerKind});
          const counts={...(result.diagnostics?.counts||{}),applied:ingestion?.applied||{},conflicts:ingestion?.preview?.counts?.conflict||0,duplicates:ingestion?.preview?.counts?.duplicate||0,invalid:ingestion?.preview?.counts?.invalid||0};
          await finishRun(runRow,'completed',{counts,provenance:{adapter_id:adapterId,adapter_version:a.version,schema_version:result.diagnostics?.schema_version,trigger_kind:triggerKind},attempts:attempt});
          if(options.scheduleId){const next=new Date(Date.now()+(Number(options.cadenceMinutes)||DEFAULTS.cadenceMinutes)*60000).toISOString();await updateSchedule(options.scheduleId,{last_completed_at:nowIso(),last_status:'completed',last_error:null,next_due_at:next});}
          window.dispatchEvent(new CustomEvent('ppc-pocket-sync-complete',{detail:{adapterId,counts,attempts:attempt,triggerKind}}));
          return {ok:true,result,ingestion,attempts:attempt};
        }catch(e){lastError=e;if(attempt>retryLimit)break;await sleep(backoff*1000*Math.pow(2,attempt-1));}
      }
      const msg=safeError(lastError);
      await finishRun(runRow,'failed',{error:msg,attempts:attempt});
      if(options.scheduleId){const next=new Date(Date.now()+(Number(options.cadenceMinutes)||DEFAULTS.cadenceMinutes)*60000).toISOString();await updateSchedule(options.scheduleId,{last_completed_at:nowIso(),last_status:'failed',last_error:msg,next_due_at:next});}
      window.dispatchEvent(new CustomEvent('ppc-pocket-sync-failed',{detail:{adapterId,error:msg,attempts:attempt,triggerKind}}));
      throw lastError||new Error(msg);
    } finally {active.delete(adapterId)}
  }
  async function listSchedules(){
    if(!signedIn())return [];
    const res=await client().from('pocket_sync_schedules').select('*').order('updated_at',{ascending:false});
    if(res.error)throw res.error;return res.data||[];
  }
  async function saveSchedule(adapterId,settings={}){
    if(!signedIn())throw new Error('Sign in to save automatic sync schedules.');
    const a=assertRunnable(adapterId),uid=session().user.id;
    const cadence=Math.max(15,Math.min(10080,Number(settings.cadenceMinutes??DEFAULTS.cadenceMinutes)||60));
    const retryLimit=Math.max(0,Math.min(5,Number(settings.retryLimit??DEFAULTS.retryLimit)||0));
    const retryBackoff=Math.max(1,Math.min(300,Number(settings.retryBackoffSeconds??DEFAULTS.retryBackoffSeconds)||5));
    const row={user_id:uid,adapter_id:adapterId,source_key:a.sourceKey||adapterId,enabled:!!settings.enabled,cadence_minutes:cadence,retry_limit:retryLimit,retry_backoff_seconds:retryBackoff,auto_apply_ready:settings.autoApplyReady!==false,next_due_at:settings.enabled?new Date(Date.now()+cadence*60000).toISOString():null,nonsecret_metadata:{browser_scheduler:true}};
    const res=await client().from('pocket_sync_schedules').upsert(row,{onConflict:'user_id,adapter_id'}).select('*').single();
    if(res.error)throw res.error;await refreshScheduler();return res.data;
  }
  function clearTimers(){for(const id of timers.values())clearInterval(id);timers.clear()}
  async function refreshScheduler(){
    clearTimers();if(!signedIn())return [];
    let schedules=[];try{schedules=await listSchedules()}catch(e){console.warn('Pocket orchestrator schedules',e);return []}
    for(const s of schedules.filter(x=>x.enabled)){
      const cadence=Math.max(15,Number(s.cadence_minutes)||60);
      const tick=async()=>{if(document.visibilityState==='hidden')return;const due=!s.next_due_at||Date.now()>=new Date(s.next_due_at).getTime();if(!due)return;try{await run(s.adapter_id,{triggerKind:'scheduled',scheduleId:s.id,cadenceMinutes:cadence,retryLimit:s.retry_limit,retryBackoffSeconds:s.retry_backoff_seconds,autoApplyReady:s.auto_apply_ready,input:{}})}catch(e){console.warn('Scheduled Pocket sync failed',e)}};
      setTimeout(tick,1500);
      timers.set(s.id,setInterval(tick,Math.min(cadence*60000,60000)));
    }
    return schedules;
  }
  window.addEventListener('focus',()=>refreshScheduler());
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshScheduler()});
  window.PPCPocketSyncOrchestrator=Object.freeze({defaults:{...DEFAULTS},run,listSchedules,saveSchedule,refreshScheduler,isRunning:id=>active.has(id)});
  setTimeout(()=>refreshScheduler(),2500);
})();
