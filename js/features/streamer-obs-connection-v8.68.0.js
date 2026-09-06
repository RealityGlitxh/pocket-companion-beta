/* PocketNexus V8.68.0 — external OBS heartbeat tracking */
(function(){
 if(window.PPCOBS2Connection)return;
 const modes=['ranked','tournament','caster'],seen={};
 function current(){try{return state?.streamer?.overlayMode||'ranked'}catch{return'ranked'}}
 function paint(){const el=document.getElementById('pnObsExternalStatus'),m=current(),age=Date.now()-Number(seen[m]||0);if(!el)return;const ok=age<6500;el.classList.toggle('active',ok);el.textContent=ok?`OBS Browser Source: Connected • ${Math.max(0,Math.round(age/1000))}s ago`:'OBS Browser Source: Waiting'}
 for(const m of modes)try{const ch=new BroadcastChannel('ppc-stream-v868-'+m);ch.onmessage=e=>{const t=e.data?.type;if(t==='overlay-ready'||t==='pong'||t==='overlay-heartbeat'){seen[m]=Date.now();paint()}};setInterval(()=>{try{ch.postMessage({type:'ping',from:'app',at:Date.now()})}catch{}},3000)}catch{}
 setInterval(paint,1000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)paint()});
 window.PPCOBS2Connection={version:'8.68.0',seen,paint};
})();
