(function(){
"use strict";
const CONFIG={
  url:"https://cdmzrsvwztndqfwzsumo.supabase.co",
  publishableKey:"sb_publishable_rRpqFtZ_izENE8u8gTjo9Q_858RVJzl",
  legacySeason:"B4",
  ttlMs:5*60*1000,
  autoRefreshMs:15*60*1000
};
const CACHE_KEY="ppc_rank_border_live_active_v4";
let memory=null;
let status={source:"idle",season:"auto",lastUpdated:0,error:"",loading:false,auto:true};
let refreshTimer=null;
function readCache(){try{const raw=localStorage.getItem(CACHE_KEY);if(!raw)return null;const p=JSON.parse(raw);return p&&p.data?p:null}catch{return null}}
function writeCache(data){const p={cachedAt:Date.now(),data};memory=p;try{localStorage.setItem(CACHE_KEY,JSON.stringify(p))}catch{}}
function getCached(){return memory||readCache()}
function getData(){const c=getCached();if(c?.data&&status.source==="idle")status={source:"cached",season:c.data?.season?.code||"auto",lastUpdated:c.cachedAt||0,error:"",loading:false,auto:true};return c?.data||null}
function getStatus(){return {...status}}
async function request(endpoint,signal){
 const res=await fetch(endpoint,{method:"GET",headers:{Accept:"application/json",apikey:CONFIG.publishableKey},signal,cache:"no-store"});
 const payload=await res.json().catch(()=>null);
 if(!res.ok||!payload?.ok)throw new Error(payload?.error||payload?.message||`Rank Border endpoint returned ${res.status}`);
 return payload;
}
async function fetchActive({force=false}={}){
 const cached=getCached();
 if(!force&&cached&&Date.now()-cached.cachedAt<CONFIG.ttlMs){status={source:"cached",season:cached.data?.season?.code||"auto",lastUpdated:cached.cachedAt,error:"",loading:false,auto:true};return cached.data}
 status={...status,loading:true,error:"",auto:true};
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
 try{
   let payload;
   try{payload=await request(`${CONFIG.url}/functions/v1/rank-border-live`,controller.signal)}
   catch(activeError){
     // Compatibility fallback for older deployments while V8.11 backend migration is completed.
     payload=await request(`${CONFIG.url}/functions/v1/rank-border-live?season=${encodeURIComponent(CONFIG.legacySeason)}`,controller.signal);
   }
   writeCache(payload);
   status={source:"live",season:payload?.season?.code||"auto",lastUpdated:Date.now(),error:"",loading:false,auto:true};
   return payload;
 }catch(e){
   const fallback=cached||getCached();
   status={source:fallback?"cached":"error",season:fallback?.data?.season?.code||"auto",lastUpdated:fallback?.cachedAt||0,error:e?.message||String(e),loading:false,auto:true};
   if(fallback)return fallback.data;
   throw e;
 }finally{clearTimeout(timeout)}
}
// Backward-compatible alias: callers may still pass a season, but V8.11 intentionally ignores it.
async function fetchSeason(_season,{force=false}={}){return fetchActive({force})}
function clearCache(){memory=null;try{localStorage.removeItem(CACHE_KEY)}catch{}}
function startAutoRefresh(callback){
 stopAutoRefresh();
 refreshTimer=setInterval(()=>{fetchActive({force:true}).then(data=>{try{callback?.(data)}catch{}}).catch(()=>{})},CONFIG.autoRefreshMs);
}
function stopAutoRefresh(){if(refreshTimer){clearInterval(refreshTimer);refreshTimer=null}}
window.PPCRankBorderService={fetchActive,fetchSeason,getData,getStatus,getCached,clearCache,startAutoRefresh,stopAutoRefresh,config:{ttlMs:CONFIG.ttlMs,autoRefreshMs:CONFIG.autoRefreshMs,mode:"historical-rank-v3"}};
})();
