/* PocketNexus V8.71.0 — remote OBS browser-source transport.
   Keeps local preview/BroadcastChannel behavior, but publishes a minimal
   revocable overlay snapshot that OBS can read from a separate browser context. */
(function(){
'use strict';
if(window.PPCStreamerOBSRemote)return;

const KEY='pn_stream_overlay_remote_v1';
const MODES=['ranked','tournament','caster'];
let busy=false,lastSerialized='',lastError='',timer=null,observer=null;

function safe(fn,f=null){try{return fn()}catch{return f}}
function client(){return safe(()=>window.PPCAccountCloudCore?.client?.(),null)||safe(()=>cloudClient,null)}
function readCreds(){try{const v=JSON.parse(localStorage.getItem(KEY)||'null');return v&&v.overlay_id&&v.write_token?v:null}catch{return null}}
function saveCreds(v){try{localStorage.setItem(KEY,JSON.stringify(v))}catch{}}
function clearCreds(){try{localStorage.removeItem(KEY)}catch{}}
function currentMode(){return safe(()=>state.streamer?.overlayMode,'ranked')||'ranked'}
function buildState(){
  const modes={};
  for(const m of MODES){
    let d=safe(()=>window.__ppcObs2BaseBuild?window.__ppcObs2BaseBuild():buildStreamerOverlayState(),{})||{};
    const cfg=safe(()=>window.PPCStreamerOBS2?.config?.(m),{})||{};
    d.config={...(d.config||{}),...cfg,overlayMode:m};d.overlayProduct=m;d.version='8.71.0';modes[m]=d;
  }
  return {modes,activeMode:currentMode(),version:'8.71.0'};
}
async function createRemote(){
  const c=client();if(!c)throw new Error('PocketNexus cloud client is not ready.');
  const {data,error}=await c.rpc('create_stream_overlay',{p_state:buildState()});if(error)throw error;
  if(!data?.overlay_id||!data?.write_token)throw new Error('Overlay connection was not created.');
  const creds={overlay_id:data.overlay_id,write_token:data.write_token};saveCreds(creds);lastSerialized='';return creds;
}
async function ensureRemote(){return readCreds()||await createRemote()}
async function publish(force=false){
  if(busy)return false;busy=true;
  try{
    const c=client();if(!c)return false;let creds=await ensureRemote();const snapshot=buildState(),serialized=JSON.stringify(snapshot);
    if(!force&&serialized===lastSerialized)return true;
    let {data,error}=await c.rpc('publish_stream_overlay',{p_overlay_id:creds.overlay_id,p_write_token:creds.write_token,p_state:snapshot});
    if(error)throw error;
    if(!data?.ok&&data?.status==='invalid'){
      clearCreds();creds=await createRemote();({data,error}=await c.rpc('publish_stream_overlay',{p_overlay_id:creds.overlay_id,p_write_token:creds.write_token,p_state:snapshot}));if(error)throw error;
    }
    if(!data?.ok)throw new Error('Overlay publish was rejected.');
    lastSerialized=serialized;lastError='';updateUi('connected');return true;
  }catch(e){lastError=e?.message||String(e);updateUi('error');return false}finally{busy=false}
}
function sourceUrl(m=currentMode()){
  const creds=readCreds();const u=new URL('overlay.html',location.href);u.searchParams.set('mode',m);if(creds?.overlay_id)u.searchParams.set('overlay',creds.overlay_id);u.searchParams.set('v','871000');return u.href;
}
async function copySource(m=currentMode()){
  try{await ensureRemote();await publish(true);const u=sourceUrl(m);if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(u);else window.copyFallbackDialog?.(u,'OBS Browser Source');window.ppcNotice?.('OBS overlay URL copied. Use 1920 × 1080 in OBS.');return u}catch(e){window.ppcNotice?.('Could not create the OBS overlay URL: '+(e?.message||e));return ''}
}
async function openTest(m=currentMode()){try{await ensureRemote();await publish(true);window.open(sourceUrl(m),'_blank')}catch(e){window.ppcNotice?.('Could not open the remote overlay: '+(e?.message||e))}}
async function waitForIdle(maxMs=3000){
  const started=Date.now();
  while(busy&&Date.now()-started<maxMs)await new Promise(resolve=>setTimeout(resolve,40));
  if(busy)throw new Error('Overlay publisher is still busy. Please try again.');
}
async function regenerate(m=currentMode()){
  try{
    await waitForIdle();busy=true;
    const c=client(),old=readCreds();
    if(old&&c){const {data,error}=await c.rpc('revoke_stream_overlay',{p_overlay_id:old.overlay_id,p_write_token:old.write_token});if(error)throw error;if(!data?.ok)throw new Error('Previous overlay URL could not be revoked.');}
    clearCreds();lastSerialized='';await createRemote();busy=false;
    const published=await publish(true);if(!published)throw new Error(lastError||'New overlay state could not be published.');
    window.ppcNotice?.('OBS overlay URL regenerated. The previous URL has been revoked.');inject();return sourceUrl(m)
  }catch(e){lastError=e?.message||String(e);window.ppcNotice?.('Could not regenerate the overlay URL: '+lastError);return ''}finally{busy=false}
}
function statusText(kind){if(kind==='connected')return 'Remote OBS: Ready';if(kind==='error')return 'Remote OBS: Connection issue';return 'Remote OBS: Connecting…'}
function updateUi(kind='connecting'){
  const text=statusText(kind),title=kind==='error'?lastError:'';
  document.querySelectorAll('[data-pn-remote-obs-status]').forEach(el=>{
    if(el.textContent!==text)el.textContent=text;
    if(el.dataset.state!==kind)el.dataset.state=kind;
    if(el.title!==title)el.title=title;
  });
}
function setupHtml(m){return `<div class="pnObsRemoteSetup" data-pn-remote-obs="${m}" style="margin:12px 0;padding:14px;border:1px solid #ffffff18;border-radius:14px;background:#ffffff08"><div class="between" style="gap:12px;align-items:flex-start"><div><span class="pnObsEyebrow">OBS BROWSER SOURCE</span><h3 style="margin:4px 0">Remote OBS Overlay</h3><p class="muted" style="margin:0">Works in OBS even when it does not share PocketNexus browser storage.</p></div><span class="pnObsStatus active" data-pn-remote-obs-status>Remote OBS: Connecting…</span></div><div class="row" style="margin-top:12px;flex-wrap:wrap"><button class="secondary" onclick="PPCStreamerOBSRemote.copySource('${m}')">Copy Overlay URL</button><button class="secondary" onclick="PPCStreamerOBSRemote.openTest('${m}')">Test Overlay</button><button class="secondary" onclick="PPCStreamerOBSRemote.regenerate('${m}')">Regenerate URL</button><span class="muted tiny">Recommended: 1920 × 1080</span></div></div>`}
function inject(){
  for(const m of MODES){const studio=document.querySelector(`.pnObsStudio[data-mode="${m}"]`);if(!studio||studio.querySelector('[data-pn-remote-obs]'))continue;const row=studio.querySelector('.pnObsStatusRow');if(row)row.insertAdjacentHTML('afterend',setupHtml(m));else studio.insertAdjacentHTML('afterbegin',setupHtml(m));}
  updateUi(lastError?'error':readCreds()?'connected':'connecting');
}
function patchObs2(){
  const obs=window.PPCStreamerOBS2;if(!obs||obs.__remotePatched)return false;
  obs.__remotePatched=true;obs.localSourceUrl=obs.sourceUrl;obs.localCopySource=obs.copySource;obs.sourceUrl=sourceUrl;obs.copySource=copySource;
  return true;
}
async function start(){
  patchObs2();inject();
  if(safe(()=>state.page,'')==='streamer'){try{await ensureRemote();await publish(true)}catch(e){lastError=e?.message||String(e);updateUi('error')}}
  if(!timer)timer=setInterval(()=>{patchObs2();inject();if(readCreds())publish(false);else if(safe(()=>state.page,'')==='streamer')publish(false)},1500);
  if(!observer){observer=new MutationObserver(()=>inject());observer.observe(document.documentElement,{childList:true,subtree:true})}
}

window.PPCStreamerOBSRemote={version:'8.71.0',sourceUrl,copySource,openTest,regenerate,publish,ensureRemote,buildState,readCreds,start};
let tries=0,constTimer=setInterval(()=>{if(patchObs2()){clearInterval(constTimer);start()}else if(++tries>80){clearInterval(constTimer)}},100);
})();
