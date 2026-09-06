/* PocketNexus V8.68.1 — Public Limitless Live Table service
   Public tournament data only. Never attempts judge/admin/private decklist access. */
(function(){
'use strict';
if(window.PPCLimitlessLiveTable)return;
const API='https://play.limitlesstcg.com/api';
const CACHE_PREFIX='ppc_limitless_live_table_v8681_';
const TTL=20000;
const mem=new Map();
const safeText=v=>String(v??'').trim();
function tournamentId(input){
 const s=safeText(input); if(!s)return '';
 const m=s.match(/(?:tournament\/|tournaments\/)([a-zA-Z0-9_-]+)/i); return m?m[1]:s.replace(/^\/+|\/+$/g,'');
}
async function getJson(path){
 const r=await fetch(API+path,{headers:{Accept:'application/json'},cache:'no-store'});
 if(!r.ok){const e=new Error(`Limitless request failed (${r.status})`);e.status=r.status;throw e}
 return r.json();
}
function readCache(id){
 const x=mem.get(id); if(x&&Date.now()-x.at<TTL)return x.data;
 try{const v=JSON.parse(localStorage.getItem(CACHE_PREFIX+id)||'null');if(v&&Date.now()-v.at<TTL){mem.set(id,v);return v.data}}catch{}
 return null;
}
function writeCache(id,data){const v={at:Date.now(),data};mem.set(id,v);try{localStorage.setItem(CACHE_PREFIX+id,JSON.stringify(v))}catch{}return data}
function list(v){return Array.isArray(v)?v:Array.isArray(v?.data)?v.data:Array.isArray(v?.items)?v.items:[]}
function playerId(v){return safeText(v?.player??v?.playerId??v?.id??v?.user??v?.userId)}
function playerName(v){return safeText(v?.name??v?.username??v?.displayName??v?.playerName) || 'Unknown Player'}
function normalizePlayer(v){return {id:playerId(v),name:playerName(v),record:v?.record||null,placing:v?.placing??v?.place??null,deck:v?.deck||v?.archetype||v?.deckName||null,raw:v}}
function normalizePairing(v){
 const a=v?.player1??v?.playerA??v?.left??v?.players?.[0]??{};
 const b=v?.player2??v?.playerB??v?.right??v?.players?.[1]??{};
 return {round:v?.round??v?.roundNumber??null,table:v?.table??v?.tableNumber??v?.number??null,playerAId:playerId(a)||safeText(v?.player1),playerBId:playerId(b)||safeText(v?.player2),score:v?.score??v?.result??null,raw:v};
}
function publicDeck(v){
 if(!v)return null;
 const cards=v?.cards??v?.decklist??v?.list??null;
 if(!cards)return null;
 return {public:true,cards,archetype:v?.archetype??v?.deck??v?.name??null,raw:v};
}
async function fetchTournament(input,{force=false}={}){
 const id=tournamentId(input);if(!id)throw new Error('Enter a Limitless tournament URL or ID.');
 if(!force){const cached=readCache(id);if(cached)return cached}
 // Public developer API only. Endpoints may return 404/403 when data is unavailable/not public.
 const [details,standings,pairings,decklists]=await Promise.all([
   getJson(`/tournaments/${encodeURIComponent(id)}`).catch(()=>null),
   getJson(`/tournaments/${encodeURIComponent(id)}/standings`).catch(()=>[]),
   getJson(`/tournaments/${encodeURIComponent(id)}/pairings`).catch(()=>[]),
   getJson(`/tournaments/${encodeURIComponent(id)}/decklists`).catch(()=>[])
 ]);
 const players=list(standings).map(normalizePlayer);
 const pairs=list(pairings).map(normalizePairing);
 const decks=list(decklists);
 const deckByPlayer=new Map();
 for(const d of decks){const pid=playerId(d);const pub=publicDeck(d);if(pid&&pub)deckByPlayer.set(pid,pub)}
 const data={id,details,players,pairings:pairs,deckByPlayer:Object.fromEntries(deckByPlayer),fetchedAt:new Date().toISOString(),source:'Limitless public API'};
 return writeCache(id,data);
}
function rounds(data){return [...new Set((data?.pairings||[]).map(x=>x.round).filter(x=>x!==null&&x!==undefined))].sort((a,b)=>Number(a)-Number(b))}
function tables(data,round){return (data?.pairings||[]).filter(x=>String(x.round)===String(round)).map(x=>x.table).filter(x=>x!==null&&x!==undefined)}
function resolveTable(data,round,table){
 const p=(data?.pairings||[]).find(x=>String(x.round)===String(round)&&String(x.table)===String(table));if(!p)return null;
 const byId=new Map((data.players||[]).map(x=>[String(x.id),x]));
 const A=byId.get(String(p.playerAId))||{id:p.playerAId,name:'Unknown Player'};
 const B=byId.get(String(p.playerBId))||{id:p.playerBId,name:'Unknown Player'};
 return {tournamentId:data.id,tournamentName:data.details?.name||data.details?.title||'Limitless Tournament',round:p.round,table:p.table,score:p.score,playerA:{...A,decklist:data.deckByPlayer?.[A.id]||null},playerB:{...B,decklist:data.deckByPlayer?.[B.id]||null},fetchedAt:data.fetchedAt};
}
window.PPCLimitlessLiveTable={tournamentId,fetchTournament,rounds,tables,resolveTable,refresh:(id)=>fetchTournament(id,{force:true}),cacheMs:TTL,publicOnly:true};
})();