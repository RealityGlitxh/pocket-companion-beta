(function(){
"use strict";
const CONFIG={url:"https://cdmzrsvwztndqfwzsumo.supabase.co",publishableKey:"sb_publishable_rRpqFtZ_izENE8u8gTjo9Q_858RVJzl"};
const TTL=2*60*1000;
let client=null,catalog=[],formats=[],syncStatus=null,error="",loading=false,lastFetch=0,lastKey="";
const standings=new Map(),players=new Map(),listeners=new Set();
function getClient(){
  if(client)return client;
  const shared=window.getPPCCloudClient?.();
  if(shared){client=shared;return client}
  if(window.supabase?.createClient){client=window.supabase.createClient(CONFIG.url,CONFIG.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});return client}
  return null;
}
function emit(){listeners.forEach(fn=>{try{fn(status())}catch(e){console.warn("Tournament listener",e)}})}
function status(){return{loading,error,catalog,formats,syncStatus,lastFetch}}
async function loadCatalog(filters={},opts={}){
  const minPlayers=Math.max(0,Number(filters.minPlayers||0)),format=String(filters.format||""),search=String(filters.search||"").trim(),limit=Math.min(250,Math.max(1,Number(filters.limit||150))),offset=Math.max(0,Number(filters.offset||0));
  const key=JSON.stringify({minPlayers,format,search,limit,offset});
  if(!opts.force&&key===lastKey&&catalog.length&&Date.now()-lastFetch<TTL)return catalog;
  const c=getClient();if(!c){error="Tournament cloud service is unavailable.";emit();return catalog}
  loading=true;error="";emit();
  try{
    const [{data:rows,error:e1},{data:optsRows,error:e2},{data:syncRows,error:e3}]=await Promise.all([
      c.rpc("get_tournament_catalog",{p_min_players:minPlayers,p_format:format||null,p_search:search||null,p_limit:limit,p_offset:offset}),
      c.rpc("get_tournament_filter_options"),
      c.rpc("get_tournament_sync_status")
    ]);
    if(e1)throw e1;if(e2)throw e2;if(e3)throw e3;
    catalog=Array.isArray(rows)?rows:[];formats=Array.isArray(optsRows)?optsRows:[];syncStatus=Array.isArray(syncRows)?syncRows[0]||null:syncRows||null;
    lastKey=key;lastFetch=Date.now();return catalog;
  }catch(e){error=e?.message||String(e);console.warn("Tournament catalog load failed",e);return catalog}
  finally{loading=false;emit()}
}
async function loadStandings(id,opts={}){
  id=String(id||"");if(!id)return[];
  const cached=standings.get(id);if(!opts.force&&cached&&Date.now()-cached.at<TTL)return cached.rows;
  const c=getClient();if(!c)return cached?.rows||[];
  const {data,error:e}=await c.rpc("get_tournament_standings",{p_tournament_id:id});if(e)throw e;
  const rows=Array.isArray(data)?data:[];standings.set(id,{rows,at:Date.now()});return rows;
}
async function loadPlayer(sourcePlayerId,opts={}){
  const id=String(sourcePlayerId||"");if(!id)return null;const cached=players.get(id);if(!opts.force&&cached&&Date.now()-cached.at<TTL)return cached.row;
  const c=getClient();if(!c)return cached?.row||null;const {data,error:e}=await c.rpc("get_tracked_player_summary",{p_source_player_id:id});if(e)throw e;
  const row=Array.isArray(data)?data[0]||null:data||null;players.set(id,{row,at:Date.now()});return row;
}
function clear(){catalog=[];formats=[];syncStatus=null;lastFetch=0;lastKey="";standings.clear();players.clear()}
function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
window.PPCTournamentService={loadCatalog,loadStandings,loadPlayer,status,clear,subscribe,getCatalog:()=>catalog,getFormats:()=>formats,getSyncStatus:()=>syncStatus,CONFIG};
})();
