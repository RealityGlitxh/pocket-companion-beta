(function(){
"use strict";
const CONFIG={
  url:"https://cdmzrsvwztndqfwzsumo.supabase.co",
  publishableKey:"sb_publishable_rRpqFtZ_izENE8u8gTjo9Q_858RVJzl"
};
const WINDOWS=[24,168,336,720];
const CACHE_PREFIX="ppc_meta_live_";
const WINDOW_KEY="ppc_meta_active_window";
const FIVE_MIN=5*60*1000;
let activeWindow=168;
try{activeWindow=Number(localStorage.getItem(WINDOW_KEY)||168)}catch{}
if(!WINDOWS.includes(activeWindow))activeWindow=168;
let payload=null, source="fallback", error="", loading=false, inFlight=null, inFlightWindow=null, lastFetchAt=0;
const listeners=new Set();

function now(){return Date.now()}
function emit(){listeners.forEach(fn=>{try{fn(getStatus())}catch(e){console.warn("Meta listener failed",e)}})}
function cacheKey(w){return CACHE_PREFIX+w}
function readCache(w){
  try{
    const row=JSON.parse(localStorage.getItem(cacheKey(w))||"null");
    return row&&row.payload?row:null;
  }catch{return null}
}
function saveCache(w,p){
  try{localStorage.setItem(cacheKey(w),JSON.stringify({payload:p,cachedAt:now()}))}catch{}
}
function bundled(){
  const list=typeof ARCHETYPE_DATA!=="undefined"&&Array.isArray(ARCHETYPE_DATA)?ARCHETYPE_DATA:[];
  const generatedAt=typeof BTM_META_SNAPSHOT!=="undefined"&&BTM_META_SNAPSHOT?.generatedAt?BTM_META_SNAPSHOT.generatedAt:null;
  return {
    ok:true,status:"fallback",windowHours:activeWindow,
    snapshot:{id:"bundled",generatedAt,ageMinutes:null,source:"bundled",tournaments:null,decklists:list.length,matches:list.reduce((s,a)=>s+(Number(a?.stats?.matches)||0),0),validDecks:list.length,invalidDecks:0,classifiedDecks:list.length,unclassifiedDecks:0,classificationRate:null,matchMappingRate:null,processorVersion:"bundled",classifierVersion:"bundled"},
    overview:{},archetypes:list,matchups:[]
  };
}
function normalizeLiveArchetype(a){
  const fallback=(typeof ARCHETYPE_DATA!=="undefined"&&Array.isArray(ARCHETYPE_DATA))?ARCHETYPE_DATA.find(x=>x.id===a.id):null;
  return {
    ...(fallback||{}),
    id:a.id,slug:a.slug||a.id,name:a.name||fallback?.name||"Unknown",shortName:a.shortName||a.name||fallback?.shortName||"Unknown",
    type:a.type||fallback?.type||"Unknown",tier:a.tier??null,pokemon:Array.isArray(a.pokemon)?a.pokemon:(fallback?.pokemon||[]),
    keyCards:Array.isArray(a.keyCards)?a.keyCards:[],aliases:Array.isArray(a.aliases)?a.aliases:[],liveConfidence:a.confidence||"Limited",
    stats:{
      ...(fallback?.stats||{}),rank:a.rank??null,previousRank:a.previousRank??null,usage:a.usage??null,winRate:a.winRate??null,
      samples:a.sampleSize??a.deckCount??null,matches:a.matches??null,deckCount:a.deckCount??null,wins:a.wins??0,losses:a.losses??0,draws:a.draws??0,confidence:a.confidence||"Limited"
    }
  };
}
function normalizedPayload(){
  const p=payload||bundled();
  if(source==="live"||source==="cached"||source==="stale"){
    return {...p,archetypes:(p.archetypes||[]).map(normalizeLiveArchetype)};
  }
  return p;
}
function setFromCache(w){
  const c=readCache(w); if(!c)return false;
  payload=c.payload; lastFetchAt=Number(c.cachedAt||0);
  const age=now()-Number(c.cachedAt||0);
  source=age>6*60*60*1000?"stale":"cached";
  return true;
}
function getStatus(){
  const p=payload||bundled();
  return {source,loading,error,windowHours:activeWindow,payload:p,snapshot:p.snapshot||null,cached:source==="cached"||source==="stale"};
}
function getArchetypes(){return normalizedPayload().archetypes||[]}
function getArchetype(id){return getArchetypes().find(a=>a.id===id)||null}
function getMatchups(){return (payload||bundled()).matchups||[]}
function getPayload(){return normalizedPayload()}
function setWindow(w){
  w=Number(w); if(!WINDOWS.includes(w))w=168;
  if(w===activeWindow)return;
  activeWindow=w; try{localStorage.setItem(WINDOW_KEY,String(w))}catch{}
  payload=null; source="fallback"; error=""; setFromCache(w); emit();
}
async function fetchWindow(w=activeWindow,{force=false}={}){
  w=Number(w); if(!WINDOWS.includes(w))w=168;
  setWindow(w);
  const cache=readCache(w);
  if(!force&&cache&&now()-Number(cache.cachedAt||0)<FIVE_MIN){if(!payload){payload=cache.payload;source="cached";lastFetchAt=Number(cache.cachedAt||0)}return payload}
  if(inFlight&&inFlightWindow===w)return inFlight;
  loading=true;error="";inFlightWindow=w;emit();
  const endpoint=`${CONFIG.url}/functions/v1/meta-live?window=${encodeURIComponent(w)}`;
  inFlight=(async()=>{
    try{
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),12000);
      let res;
      try{res=await fetch(endpoint,{method:"GET",headers:{Accept:"application/json",apikey:CONFIG.publishableKey},signal:controller.signal,cache:"no-store"})}
      finally{clearTimeout(timer)}
      const data=await res.json().catch(()=>null);
      if(!res.ok||!data?.ok)throw new Error(data?.error||data?.message||`Live Meta request failed (${res.status})`);
      payload=data; source=["live","cached","stale"].includes(data.status)?data.status:"live"; error=""; lastFetchAt=now(); saveCache(w,data); return data;
    }catch(e){
      error=e?.message||String(e);
      if(!setFromCache(w)){payload=bundled();source="fallback"}
      console.warn("Live Meta refresh failed; using fallback",e);
      return payload;
    }finally{loading=false;inFlight=null;inFlightWindow=null;emit()}
  })();
  return inFlight;
}
function ensure(w=activeWindow){
  setWindow(w);
  if(!payload)setFromCache(w);
  if(!payload){payload=bundled();source="fallback"}
  if(!inFlight&&(source==="fallback"||source==="stale"||!lastFetchAt||now()-lastFetchAt>=FIVE_MIN))fetchWindow(w,{force:false});
  return payload;
}
function refresh(){return fetchWindow(activeWindow,{force:true})}
function clearCache(){WINDOWS.forEach(w=>{try{localStorage.removeItem(cacheKey(w))}catch{}});payload=null;source="fallback";error="";ensure(activeWindow);emit()}
function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
window.PPCMetaService={WINDOWS,ensure,refresh,fetchWindow,setWindow,getWindow:()=>activeWindow,getPayload,getArchetypes,getArchetype,getMatchups,getStatus,clearCache,subscribe,CONFIG};
})();
