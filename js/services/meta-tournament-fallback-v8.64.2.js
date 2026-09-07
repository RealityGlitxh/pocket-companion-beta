/* PocketNexus V8.64.2 — Combined Competitive Meta empty-live repair.
   If the aggregate Meta endpoint is healthy but returns zero archetypes, derive a bounded
   field snapshot from real recent Tournament standings. No synthetic rows are created. */
(function(){
"use strict";
const meta=window.PPCMetaService;
if(!meta||meta.__tournamentFallbackInstalled)return;
meta.__tournamentFallbackInstalled=true;
let tournamentPayload=null,building=null;
const original={
 ensure:meta.ensure.bind(meta),refresh:meta.refresh.bind(meta),fetchWindow:meta.fetchWindow.bind(meta),setWindow:meta.setWindow.bind(meta),
 getPayload:meta.getPayload.bind(meta),getArchetypes:meta.getArchetypes.bind(meta),getArchetype:meta.getArchetype.bind(meta),getMatchups:meta.getMatchups.bind(meta),getStatus:meta.getStatus.bind(meta),clearCache:meta.clearCache.bind(meta)
};
function clean(v){return String(v||"").trim()}
function key(v){return clean(v).toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
function slug(v){return key(v).replace(/\s+/g,"-")||"unknown"}
function bundledMatch(name){
 const list=Array.isArray(window.ARCHETYPE_DATA)?window.ARCHETYPE_DATA:(typeof ARCHETYPE_DATA!=="undefined"&&Array.isArray(ARCHETYPE_DATA)?ARCHETYPE_DATA:[]);
 const k=key(name);return list.find(a=>key(a?.name)===k||key(a?.shortName)===k)||null;
}
function liveIsEmpty(){const p=original.getPayload();return !!p&&Array.isArray(p.archetypes)&&p.archetypes.length===0}
function withinWindow(event,hours){const t=new Date(event?.start_date||event?.date||0).getTime();return Number.isFinite(t)&&t>0&&t>=Date.now()-Number(hours||168)*3600000}
async function buildTournamentPayload(hours){
 const svc=window.PPCTournamentService;if(!svc?.loadCatalog||!svc?.loadStandings)return null;
 const catalog=await svc.loadCatalog({minPlayers:0,format:"",search:"",limit:150,offset:0},{force:false});
 const recent=(Array.isArray(catalog)?catalog:[]).filter(e=>withinWindow(e,hours)).slice(0,12);
 if(!recent.length)return null;
 const groups=new Map();let classified=0,totalRows=0,totalGames=0,usedEvents=0;
 for(const event of recent){
  let rows=[];try{rows=await svc.loadStandings(event.id,{force:false})}catch{rows=[]}
  if(!Array.isArray(rows)||!rows.length)continue;usedEvents++;
  for(const row of rows){
   totalRows++;
   const name=clean(row?.archetype_name);if(!name||/^unknown\b/i.test(name))continue;
   classified++;
   const k=key(name),g=groups.get(k)||{name,deckCount:0,wins:0,losses:0,draws:0};
   g.deckCount++;g.wins+=Number(row?.wins)||0;g.losses+=Number(row?.losses)||0;g.draws+=Number(row?.ties??row?.draws)||0;
   totalGames+=Number(row?.wins)||0;totalGames+=Number(row?.losses)||0;totalGames+=Number(row?.ties??row?.draws)||0;groups.set(k,g);
  }
 }
 if(!groups.size)return null;
 const sorted=[...groups.values()].sort((a,b)=>b.deckCount-a.deckCount||b.wins-a.wins||a.name.localeCompare(b.name));
 const archetypes=sorted.map((g,i)=>{
  const base=bundledMatch(g.name),decided=g.wins+g.losses,matches=decided+g.draws;
  return {id:base?.id||`tournament-${slug(g.name)}`,slug:base?.slug||slug(g.name),name:g.name,shortName:base?.shortName||g.name,type:base?.type||"Unknown",tier:base?.tier||null,rank:i+1,previousRank:null,deckCount:g.deckCount,usage:classified?g.deckCount/classified*100:null,wins:g.wins,losses:g.losses,draws:g.draws,matches,winRate:decided?g.wins/decided*100:null,sampleSize:g.deckCount,confidence:g.deckCount>=8?"Medium":"Limited",pokemon:base?.pokemon||[],keyCards:[],aliases:base?.aliases||[]};
 });
 const base=original.getPayload()||{};
 return {ok:true,status:"tournament-fallback",windowHours:Number(hours||168),snapshot:{...(base.snapshot||{}),generatedAt:new Date().toISOString(),source:"tournament-standings",tournaments:usedEvents,decklists:totalRows,validDecks:totalRows,classifiedDecks:classified,unclassifiedDecks:Math.max(0,totalRows-classified),classificationRate:totalRows?classified/totalRows*100:null,matches:Math.round(totalGames/2),matchMappingRate:null,processorVersion:"tournament-fallback-v8.64.2"},overview:{},archetypes,matchups:[]};
}
async function recoverIfEmpty(hours){
 if(!liveIsEmpty()){tournamentPayload=null;return original.getPayload()}
 if(building)return building;
 building=buildTournamentPayload(hours).then(p=>{tournamentPayload=p;return p||original.getPayload()}).catch(e=>{console.warn("Combined Meta tournament fallback failed",e);return original.getPayload()}).finally(()=>{building=null});
 return building;
}
meta.fetchWindow=async function(w,opts){const p=await original.fetchWindow(w,opts);await recoverIfEmpty(Number(w)||meta.getWindow?.()||168);return tournamentPayload||p};
meta.refresh=async function(){const p=await original.refresh();await recoverIfEmpty(meta.getWindow?.()||168);return tournamentPayload||p};
meta.ensure=function(w){const p=original.ensure(w);if(liveIsEmpty())recoverIfEmpty(Number(w)||meta.getWindow?.()||168).then(()=>{if(window.state?.page==="meta"&&typeof window.render==="function")window.render()});else tournamentPayload=null;return tournamentPayload||p};
meta.setWindow=function(w){tournamentPayload=null;return original.setWindow(w)};
meta.getPayload=function(){return tournamentPayload||original.getPayload()};
meta.getArchetypes=function(){return (tournamentPayload?.archetypes)||original.getArchetypes()};
meta.getArchetype=function(id){return meta.getArchetypes().find(a=>a.id===id)||original.getArchetype(id)};
meta.getMatchups=function(){return tournamentPayload?[]:original.getMatchups()};
meta.getStatus=function(){const s=original.getStatus();return tournamentPayload?{...s,source:"tournament-fallback",payload:tournamentPayload,snapshot:tournamentPayload.snapshot}:s};
meta.clearCache=function(){tournamentPayload=null;return original.clearCache()};
})();
