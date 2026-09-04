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
  const checks={version:VERSION,localStorage:true,supabase:!!window.supabase,cloudClient:!!client,online:navigator.onLine,diagnostics:(window.__ppcDiagnostics||[]).slice(-5),interactionGuard:(window.__ppcInteractionGuard||[]).slice(-5)};
  try{localStorage.setItem('__ppc_health','1');localStorage.removeItem('__ppc_health')}catch(e){checks.localStorage=false;report('storage',e)}
  try{if(client){const {error}=await client.rpc('get_my_cloud_sync_summary');checks.cloud=error?`attention: ${error.message}`:'reachable'}else checks.cloud='not initialized'}catch(e){checks.cloud='offline';report('cloud-health',e)}
  return checks;
 };
 window.addEventListener('online',()=>{try{window.ppcNotice?.('Back online. Cloud sync can resume.')}catch(_){}});
 window.addEventListener('offline',()=>{try{window.ppcNotice?.('Offline mode: local data remains available.')}catch(_){}});

 // Hotfix 14: recover from an unexpected transparent element covering the app.
 function interactionLog(kind,el){
  try{
   const r=el?.getBoundingClientRect?.(),s=el?getComputedStyle(el):null;
   const row={at:new Date().toISOString(),kind,tag:el?.tagName||'',id:el?.id||'',className:String(el?.className||'').slice(0,160),position:s?.position||'',zIndex:s?.zIndex||'',width:Math.round(r?.width||0),height:Math.round(r?.height||0)};
   window.__ppcInteractionGuard=window.__ppcInteractionGuard||[];window.__ppcInteractionGuard.push(row);if(window.__ppcInteractionGuard.length>20)window.__ppcInteractionGuard.shift();
   console.warn('[PocketNexus interaction guard]',row);
  }catch(_){ }
 }
 function intentionalOverlay(el){return !!el?.closest?.('#globalSearchOverlay,#ppcWhatsNewBackdrop,#onboardingBackdrop,#mobileMoreBackdrop,#cardModal')}
 function recoverShield(el){
  if(!el||!el.isConnected||intentionalOverlay(el))return false;
  const s=getComputedStyle(el),r=el.getBoundingClientRect(),ratio=(r.width*r.height)/Math.max(1,innerWidth*innerHeight);
  const interactive=['BUTTON','A','SUMMARY'].includes(el.tagName)||el.getAttribute('role')==='button'||s.cursor==='pointer';
  const layered=s.position==='fixed'||s.position==='absolute'||parseInt(s.zIndex||'0',10)>=60;
  if(interactive&&layered&&ratio>.55){el.style.setProperty('pointer-events','none','important');interactionLog('disabled-unexpected-click-shield',el);return true}
  return false;
 }
 function sweepInteractionShields(){
  [[.5,.18],[.25,.35],[.5,.5],[.75,.65]].forEach(([x,y])=>{
   const stack=document.elementsFromPoint(innerWidth*x,innerHeight*y);
   for(const el of stack.slice(0,5)){if(recoverShield(el))break}
  });
 }
 document.addEventListener('pointerdown',e=>{if(recoverShield(e.target)){e.preventDefault();e.stopImmediatePropagation();requestAnimationFrame(()=>document.elementFromPoint(e.clientX,e.clientY)?.click?.())}},true);
 window.PPCInteractionGuard={sweep:sweepInteractionShields,getLog:()=>((window.__ppcInteractionGuard||[]).slice())};
 setTimeout(sweepInteractionShields,0);setTimeout(sweepInteractionShields,300);setTimeout(sweepInteractionShields,1200);
})();
