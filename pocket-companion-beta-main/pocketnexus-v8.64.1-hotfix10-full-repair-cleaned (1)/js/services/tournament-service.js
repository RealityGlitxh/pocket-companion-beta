(function(){
"use strict";
const CONFIG={url:"https://cdmzrsvwztndqfwzsumo.supabase.co",publishableKey:"sb_publishable_rRpqFtZ_izENE8u8gTjo9Q_858RVJzl"};
const TTL=2*60*1000;
const RPC_TIMEOUT=12000;
const STANDINGS_CACHE_KEY="ppc_tournament_standings_v8641rc1";
const STANDINGS_CACHE_TTL=24*60*60*1000;
const CACHE_KEY="ppc_tournament_catalog_v8641";
const CACHE_MAX=500;
let client=null,catalog=[],masterCatalog=[],formats=[],syncStatus=null,error="",warning="",loading=false,lastFetch=0,lastSuccess=0,lastKey="",source="idle";
const standings=new Map(),players=new Map(),listeners=new Set();
function withTimeout(promise,ms=RPC_TIMEOUT,label="Tournament request"){let timer;return Promise.race([promise,new Promise((_,rej)=>{timer=setTimeout(()=>rej(new Error(`${label} timed out`)),ms)})]).finally(()=>clearTimeout(timer))}
function readStandingsCache(){try{const raw=localStorage.getItem(STANDINGS_CACHE_KEY);const data=raw?JSON.parse(raw):{};for(const [id,v] of Object.entries(data||{})){if(v&&Array.isArray(v.rows)&&Date.now()-Number(v.at||0)<STANDINGS_CACHE_TTL)standings.set(String(id),v)}}catch{}}
function writeStandingsCache(){try{const obj={};[...standings.entries()].slice(-40).forEach(([id,v])=>obj[id]=v);localStorage.setItem(STANDINGS_CACHE_KEY,JSON.stringify(obj))}catch{}}
function safeJsonParse(raw,fallback){try{return raw?JSON.parse(raw):fallback}catch{return fallback}}
function readCache(){try{return safeJsonParse(localStorage.getItem(CACHE_KEY),null)}catch{return null}}
function writeCache(){try{localStorage.setItem(CACHE_KEY,JSON.stringify({savedAt:Date.now(),lastSuccess,masterCatalog:masterCatalog.slice(0,CACHE_MAX),formats,syncStatus}))}catch{}}
function hydrate(){const c=readCache();if(!c||!Array.isArray(c.masterCatalog)||!c.masterCatalog.length)return;masterCatalog=c.masterCatalog;catalog=masterCatalog.slice();formats=Array.isArray(c.formats)?c.formats:[];syncStatus=c.syncStatus||null;lastSuccess=Number(c.lastSuccess||c.savedAt||0);lastFetch=lastSuccess;source="cached"}
function getClient(){
  if(client)return client;
  const shared=window.getPPCCloudClient?.();
  if(shared){client=shared;return client}
  if(window.supabase?.createClient){client=window.supabase.createClient(CONFIG.url,CONFIG.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});return client}
  return null;
}

async function rpc(name,args={}){
  let firstError=null;
  const c=getClient();
  if(c){
    try{const res=await withTimeout(c.rpc(name,args),RPC_TIMEOUT,`RPC ${name}`);if(!res?.error)return res;firstError=res.error}catch(e){firstError=e}
  }
  try{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),RPC_TIMEOUT);let r;try{r=await fetch(`${CONFIG.url}/rest/v1/rpc/${encodeURIComponent(name)}`,{method:"POST",headers:{"Content-Type":"application/json","apikey":CONFIG.publishableKey,"Accept":"application/json"},body:JSON.stringify(args||{}),signal:controller.signal})}finally{clearTimeout(timer)};
    if(!r.ok){let detail="";try{detail=await r.text()}catch{}throw new Error(`Tournament service ${r.status}${detail?`: ${detail.slice(0,180)}`:""}`)}
    const data=await r.json();return{data,error:null};
  }catch(e){throw firstError||e}
}
function emit(){listeners.forEach(fn=>{try{fn(status())}catch(e){console.warn("Tournament listener",e)}})}
function status(){return{loading,error,warning,source,catalog,formats,syncStatus,lastFetch,lastSuccess,hasCachedData:masterCatalog.length>0}}
function norm(v){return String(v??"").trim().toLowerCase()}
function localFilter(rows,{minPlayers=0,format="",search="",limit=150,offset=0}={}){
  const needle=norm(search),fmt=norm(format);let out=(Array.isArray(rows)?rows:[]).filter(r=>Number(r?.player_count||0)>=Number(minPlayers||0));
  if(fmt)out=out.filter(r=>norm(r?.format)===fmt);
  if(needle)out=out.filter(r=>`${r?.name||""} ${r?.organizer_name||""}`.toLowerCase().includes(needle));
  out.sort((a,b)=>new Date(b?.start_date||0)-new Date(a?.start_date||0));return out.slice(offset,offset+limit);
}
function mergeCatalog(rows){const map=new Map(masterCatalog.map(r=>[String(r.id),r]));(rows||[]).forEach(r=>{if(r?.id)map.set(String(r.id),{...(map.get(String(r.id))||{}),...r})});masterCatalog=[...map.values()].sort((a,b)=>new Date(b?.start_date||0)-new Date(a?.start_date||0)).slice(0,CACHE_MAX)}
async function loadCatalog(filters={},opts={}){
  const normalized={minPlayers:Math.max(0,Number(filters.minPlayers||0)),format:String(filters.format||""),search:String(filters.search||"").trim(),limit:Math.min(250,Math.max(1,Number(filters.limit||150))),offset:Math.max(0,Number(filters.offset||0))};
  const key=JSON.stringify(normalized);
  if(masterCatalog.length)catalog=localFilter(masterCatalog,normalized);
  if(!opts.force&&key===lastKey&&catalog.length&&Date.now()-lastFetch<TTL)return catalog;
  getClient();if(typeof fetch!=="function"){error="Tournament service is unavailable.";source=masterCatalog.length?"cached":"error";emit();return catalog}
  loading=true;error="";warning="";source=masterCatalog.length?"cached":"loading";emit();
  try{
    const catalogResult=await rpc("get_tournament_catalog",{p_min_players:normalized.minPlayers,p_format:normalized.format||null,p_search:normalized.search||null,p_limit:normalized.limit,p_offset:normalized.offset});
    if(catalogResult.error)throw catalogResult.error;
    const rows=Array.isArray(catalogResult.data)?catalogResult.data:[];
    mergeCatalog(rows);catalog=rows;lastKey=key;lastFetch=Date.now();lastSuccess=lastFetch;source="live";
    const ancillary=await Promise.allSettled([rpc("get_tournament_filter_options"),rpc("get_tournament_sync_status")]);
    const filterResult=ancillary[0]?.status==="fulfilled"?ancillary[0].value:null;
    const syncResult=ancillary[1]?.status==="fulfilled"?ancillary[1].value:null;
    if(filterResult&&!filterResult.error&&Array.isArray(filterResult.data))formats=filterResult.data;
    if(syncResult&&!syncResult.error)syncStatus=Array.isArray(syncResult.data)?syncResult.data[0]||null:syncResult.data||null;
    const ancillaryErrors=[filterResult?.error,syncResult?.error,ancillary[0]?.reason,ancillary[1]?.reason].filter(Boolean);
    if(ancillaryErrors.length)warning="Live catalog loaded; some sync metadata is temporarily unavailable.";
    writeCache();return catalog;
  }catch(e){
    error=e?.message||String(e);console.warn("Tournament catalog refresh failed; preserving cached data",e);catalog=localFilter(masterCatalog,normalized);source=masterCatalog.length?"cached":"error";return catalog;
  } finally{loading=false;emit()}
}
async function loadStandings(id,opts={}){
  id=String(id||"");if(!id)return[];
  const cached=standings.get(id);if(!opts.force&&cached&&Date.now()-cached.at<TTL)return cached.rows;
  getClient();if(typeof fetch!=="function")return cached?.rows||[];
  try{const {data,error:e}=await rpc("get_tournament_standings",{p_tournament_id:id});if(e)throw e;const rows=Array.isArray(data)?data:[];standings.set(id,{rows,at:Date.now()});writeStandingsCache();return rows}catch(e){console.warn("Tournament standings request failed",e);if(cached)return cached.rows;standings.set(id,{rows:[],at:Date.now(),error:e?.message||String(e)});writeStandingsCache();return []}
}
async function loadPlayer(sourcePlayerId,opts={}){
  const id=String(sourcePlayerId||"");if(!id)return null;const cached=players.get(id);if(!opts.force&&cached&&Date.now()-cached.at<TTL)return cached.row;
  getClient();if(typeof fetch!=="function")return cached?.row||null;const {data,error:e}=await rpc("get_tracked_player_summary",{p_source_player_id:id});if(e)throw e;
  const row=Array.isArray(data)?data[0]||null:data||null;players.set(id,{row,at:Date.now()});return row;
}
function clear(){catalog=[];masterCatalog=[];formats=[];syncStatus=null;error="";warning="";source="idle";lastFetch=0;lastSuccess=0;lastKey="";standings.clear();players.clear();try{localStorage.removeItem(CACHE_KEY);localStorage.removeItem(STANDINGS_CACHE_KEY)}catch{}}
function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
hydrate();
readStandingsCache();
window.PPCTournamentService={loadCatalog,loadStandings,loadPlayer,status,clear,subscribe,getCatalog:()=>catalog,getFormats:()=>formats,getSyncStatus:()=>syncStatus,CONFIG};
})();
