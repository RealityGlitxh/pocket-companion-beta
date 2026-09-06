/* PocketNexus V8.68.2 — bridge selected public Limitless table data into OBS payload fields. */
(function(){
'use strict';
if(window.PPCStreamerLimitlessOBSBridge)return;
const safe=(fn)=>{try{return fn()}catch{return null}};
function deckName(p){return p?.decklist?.archetype||p?.deck||''}
function decorate(name,deck){return deck?`${name||'Unknown Player'} • ${deck}`:(name||'Unknown Player')}
function install(){
 const api=window.PPCStreamerLimitlessLiveTable;if(!api||api.__obsBridge)return false;
 const baseCaster=api.sendCaster?.bind(api),baseTournament=api.sendTournament?.bind(api);
 if(baseCaster)api.sendCaster=function(){const out=baseCaster();const x=state.streamer?.liveTable;if(x){state.streamer.casterA=decorate(x.playerA?.name,deckName(x.playerA));state.streamer.casterB=decorate(x.playerB?.name,deckName(x.playerB));state.streamer.tournamentRound=`Round ${x.round} • Table ${x.table}`;safe(()=>save());safe(()=>PPCStreamerOBS2.publishAll());safe(()=>PPCStreamerOBS2.refreshPreview('caster'))}return out};
 if(baseTournament)api.sendTournament=function(side){const out=baseTournament(side);const x=state.streamer?.liveTable;if(x){const me=side==='B'?x.playerB:x.playerA,opp=side==='B'?x.playerA:x.playerB;state.streamer.tournamentName=`${x.tournamentName||'Limitless Tournament'}${me?.name?` • ${me.name}`:''}`;state.streamer.tournamentRound=`Round ${x.round} • Table ${x.table}`;state.streamer.controlOpponent=decorate(opp?.name,deckName(opp));safe(()=>save());safe(()=>PPCStreamerOBS2.publishAll());safe(()=>PPCStreamerOBS2.refreshPreview('tournament'))}return out};
 api.__obsBridge=true;return true;
}
let n=0,t=setInterval(()=>{if(install()||++n>120)clearInterval(t)},60);
window.PPCStreamerLimitlessOBSBridge={version:'8.68.2',install};
})();