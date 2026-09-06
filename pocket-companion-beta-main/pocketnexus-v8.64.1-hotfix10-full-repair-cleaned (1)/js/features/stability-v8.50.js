/* V8.50 — Stabilization & Recovery */
(()=>{
 const VERSION='8.50';
 const report=(kind,err)=>{
  try{
   const msg=String(err?.message||err?.reason?.message||err?.reason||err||'Unknown error');
   console.warn(`[V${VERSION}] ${kind}:`,err);
   window.__ppcDiagnostics=window.__ppcDiagnostics||[];
   window.__ppcDiagnostics.push({at:new Date().toISOString(),kind,message:msg.slice(0,500)});
   if(window.__ppcDiagnostics.length>20)window.__ppcDiagnostics.shift();
  }catch(_){ }
 };
 window.addEventListener('error',e=>report('runtime',e.error||e.message));
 window.addEventListener('unhandledrejection',e=>report('promise',e.reason));
 window.v850HealthCheck=async function(){
  const client=window.getPPCCloudClient?.()||window.cloudClient||window.sb||null;
  const checks={version:VERSION,localStorage:true,supabase:!!window.supabase,cloudClient:!!client,online:navigator.onLine,diagnostics:(window.__ppcDiagnostics||[]).slice(-5)};
  try{localStorage.setItem('__ppc_health','1');localStorage.removeItem('__ppc_health')}catch(e){checks.localStorage=false;report('storage',e)}
  try{if(client){const {error}=await client.rpc('get_my_cloud_sync_summary');checks.cloud=error?`attention: ${error.message}`:'reachable'}else checks.cloud='not initialized'}catch(e){checks.cloud='offline';report('cloud-health',e)}
  return checks;
 };
 window.addEventListener('online',()=>{try{window.ppcNotice?.('Back online. Cloud sync can resume.')}catch(_){}});
 window.addEventListener('offline',()=>{try{window.ppcNotice?.('Offline mode: local data remains available.')}catch(_){}});
})();
