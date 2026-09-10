/* PocketNexus V8.72.2 — Public Limitless player/table service
   Public tournament data only. Builds player choices from standings + live pairings so Tournament Follow works even when standings are not populated. */
(function(){
'use strict';
if(window.PPCLimitlessLiveTable)return;
const API='https://play.limitlesstcg.com/api';
const CACHE_PREFIX='ppc_limitless_live_table_v8722_';
const TTL=20000;
const mem=new Map();
const safeText=v=>String(v??'').trim();
function tournamentId(input){
 const s=safeText(input);if(!s)return '';
 const m=s.match(/(?:tournament\/|tournaments\/)([a-zA-Z0-9_-]+)/i);return m?m[1]:s.replace(/^\/+|\/+$/g,'').split('/')[0];
}
async function getJson(path){
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),12000);
 try{
  const r=await fetch(API+path,{headers:{Accept:'application/json'},cache:'no-store',signal:ctl.signal});
  if(!r.ok){const e=new Error(`Limitless request failed (${r.status})`);e.status=r.status;throw e}
  return await r.json();
 }finally{clearTimeout(timer)}
}
function readCache(id){
 const x=mem.get(id);if(x&&Date.now()-x.at<TTL)return x.data;
 try{const v=JSON.parse(localStorage.getItem(CACHE_PREFIX+id)||'null');if(v&&Date.now()-v.at<TTL){mem.set(id,v);return v.data}}catch{}
 return null;
}
function writeCache(id,data){const v={at:Date.now(),data};mem.set(id,v);try{localStorage.setItem(CACHE_PREFIX+id,JSON.stringify(v))}catch{}return data}
function list(v){
 if(Array.isArray(v))return v;
 for(const k of ['data','items','results','standings','players','pairings','decklists','entries'])if(Array.isArray(v?.[k]))return v[k];
 if(v&&typeof v==='object'&&!('id' in v)&&!('name' in v)){const vals=Object.values(v);if(vals.length&&vals.every(x=>x&&typeof x==='object'))return vals}
 return [];
}
function playerId(v){
 if(v===null||v===undefined)return '';
 if(typeof v==='string'||typeof v==='number')return safeText(v);
 const nested=v?.player&&typeof v.player==='object'?v.player:null;
 return safeText(v?.playerId??v?.id??v?.userId??v?.user??nested?.id??nested?.playerId??v?.player);
}
function playerName(v){
 if(!v||typeof v!=='object')return '';
 const nested=v?.player&&typeof v.player==='object'?v.player:null;
 return safeText(v?.name??v?.username??v?.displayName??v?.playerName??nested?.name??nested?.username??nested?.displayName);
}
function normalizeRecord(v){return v?.record??v?.score??v?.matchRecord??null}
function normalizePlayer(v){
 const nested=v?.player&&typeof v.player==='object'?{...v,...v.player}:v;
 return {id:playerId(nested),name:playerName(nested)||'Unknown Player',record:normalizeRecord(nested),placing:nested?.placing??nested?.place??nested?.rank??null,deck:nested?.deck??nested?.archetype??nested?.deckName??null,raw:v};
}
function pairingSides(v){
 const a=v?.player1??v?.playerA??v?.left??v?.players?.[0]??v?.opponents?.[0]??{};
 const b=v?.player2??v?.playerB??v?.right??v?.players?.[1]??v?.opponents?.[1]??{};
 return {a,b};
}
function normalizePairing(v){
 const {a,b}=pairingSides(v);
 const ap=normalizePlayer(a),bp=normalizePlayer(b);
 return {round:v?.round??v?.roundNumber??v?.stageRound??null,table:v?.table??v?.tableNumber??v?.number??v?.tableNo??null,playerAId:ap.id||safeText(v?.player1Id??v?.playerAId??v?.player1),playerBId:bp.id||safeText(v?.player2Id??v?.playerBId??v?.player2),playerA:ap,playerB:bp,score:v?.score??v?.result??null,raw:v};
}
function publicDeck(v){
 if(!v)return null;
 const cards=v?.cards??v?.decklist??v?.list??null;if(!cards)return null;
 return {public:true,cards,archetype:v?.archetype??v?.deck??v?.name??null,raw:v};
}
function mergePlayers(...groups){
 const byId=new Map(),byName=new Map();
 for(const group of groups)for(const raw of group||[]){
  const p=raw?.id!==undefined&&raw?.name!==undefined?raw:normalizePlayer(raw);
  const name=safeText(p.name);if(!p.id&&!name||name==='Unknown Player'&&!p.id)continue;
  const key=p.id?String(p.id):'';const nk=name.toLocaleLowerCase();
  const prior=(key&&byId.get(key))||(!key&&byName.get(nk))||{};
  const merged={...prior,...p,id:p.id||prior.id||'',name:(name&&name!=='Unknown Player'?name:prior.name)||'Unknown Player',record:p.record??prior.record??null,placing:p.placing??prior.placing??null,deck:p.deck??prior.deck??null};
  if(merged.id)byId.set(String(merged.id),merged);else byName.set(merged.name.toLocaleLowerCase(),merged);
 }
 return [...byId.values(),...byName.values()];
}
async function fetchTournament(input,{force=false}={}){
 const id=tournamentId(input);if(!id)throw new Error('Enter a Limitless tournament URL or ID.');
 if(!force){const cached=readCache(id);if(cached)return cached}
 const [details,standings,pairings,decklists]=await Promise.all([
  getJson(`/tournaments/${encodeURIComponent(id)}`).catch(()=>null),
  getJson(`/tournaments/${encodeURIComponent(id)}/standings`).catch(()=>[]),
  getJson(`/tournaments/${encodeURIComponent(id)}/pairings`).catch(()=>[]),
  getJson(`/tournaments/${encodeURIComponent(id)}/decklists`).catch(()=>[])
 ]);
 const pairs=list(pairings).map(normalizePairing);
 const pairingPlayers=[];for(const p of pairs){if(p.playerA)pairingPlayers.push(p.playerA);if(p.playerB)pairingPlayers.push(p.playerB)}
 const players=mergePlayers(list(standings).map(normalizePlayer),list(details?.players).map(normalizePlayer),pairingPlayers);
 const decks=list(decklists),deckByPlayer=new Map();
 for(const d of decks){const pid=playerId(d);const pub=publicDeck(d);if(pid&&pub)deckByPlayer.set(String(pid),pub)}
 const data={id,details,players,pairings:pairs,deckByPlayer:Object.fromEntries(deckByPlayer),fetchedAt:new Date().toISOString(),source:'Limitless public API'};
 return writeCache(id,data);
}
function rounds(data){return [...new Set((data?.pairings||[]).map(x=>x.round).filter(x=>x!==null&&x!==undefined))].sort((a,b)=>Number(a)-Number(b))}
function tables(data,round){return [...new Set((data?.pairings||[]).filter(x=>String(x.round)===String(round)).map(x=>x.table).filter(x=>x!==null&&x!==undefined))]}
function resolveTable(data,round,table){
 const p=(data?.pairings||[]).find(x=>String(x.round)===String(round)&&String(x.table)===String(table));if(!p)return null;
 const byId=new Map((data.players||[]).filter(x=>x.id).map(x=>[String(x.id),x]));
 const A=byId.get(String(p.playerAId))||p.playerA||{id:p.playerAId,name:'Unknown Player'};
 const B=byId.get(String(p.playerBId))||p.playerB||{id:p.playerBId,name:'Unknown Player'};
 return {tournamentId:data.id,tournamentName:data.details?.name||data.details?.title||'Limitless Tournament',round:p.round,table:p.table,score:p.score,playerA:{...A,decklist:data.deckByPlayer?.[String(A.id)]||null},playerB:{...B,decklist:data.deckByPlayer?.[String(B.id)]||null},fetchedAt:data.fetchedAt};
}
window.PPCLimitlessLiveTable={version:'8.72.2',tournamentId,fetchTournament,rounds,tables,resolveTable,refresh:id=>fetchTournament(id,{force:true}),cacheMs:TTL,publicOnly:true};
})();