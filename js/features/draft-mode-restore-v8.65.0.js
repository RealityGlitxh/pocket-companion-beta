/* PocketNexus V8.65 RC1 — Draft Mode restore bridge
   Restores the last known-good Draft Mode implementation from PocketNexus history
   without reworking the frozen RC1 application. */
(function(){
'use strict';
if(window.PPCDraftMode||window.__ppcDraftRestoreLoading)return;
window.__ppcDraftRestoreLoading=true;

const BASE='https://cdn.jsdelivr.net/gh/RealityGlitxh/pocket-companion-beta';
const DRAFT=`${BASE}@d813acaa5ac9ed6b0ad448e4e4aa7f1d3df3311f/js/features/draft-mode-v8.69.0.js`;
const ONLINE=`${BASE}@a19a60adb6a8b15eef698dd7651fca5c82073732/js/features/draft-online-v8.69.4.js`;

function exposeHistoricalGlobals(){
  try{
    if(!('state' in window))Object.defineProperty(window,'state',{configurable:true,get:()=>state});
  }catch(error){console.warn('Draft restore state bridge unavailable',error)}
  try{
    if(!('cloudSession' in window))Object.defineProperty(window,'cloudSession',{configurable:true,get:()=>cloudSession});
  }catch(error){console.warn('Draft restore session bridge unavailable',error)}
}

function load(src,id){
  return new Promise((resolve,reject)=>{
    const existing=document.getElementById(id);
    if(existing){if(existing.dataset.loaded==='1')return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return;}
    const s=document.createElement('script');
    s.id=id;
    s.src=src;
    s.defer=true;
    s.crossOrigin='anonymous';
    s.addEventListener('load',()=>{s.dataset.loaded='1';resolve()},{once:true});
    s.addEventListener('error',()=>reject(new Error(`Could not load ${id}`)),{once:true});
    document.head.appendChild(s);
  });
}

async function restore(){
  try{
    exposeHistoricalGlobals();
    await load(DRAFT,'ppcDraftModeHistorical');
    if(!window.PPCDraftMode)throw new Error('Draft Mode did not initialize');
    await load(ONLINE,'ppcDraftOnlineHistorical');
    window.__ppcDraftRestoreReady=true;
    try{window.nav?.()}catch{}
  }catch(error){
    window.__ppcDraftRestoreError=String(error?.message||error);
    console.error('PocketNexus Draft Mode restore failed',error);
  }finally{
    window.__ppcDraftRestoreLoading=false;
  }
}

restore();
})();
