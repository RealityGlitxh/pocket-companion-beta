/* PocketNexus V8.68.3 — bridge public Limitless live-table data into OBS 2.0 payloads. */
(function(){
'use strict';
if(window.PPCStreamerLiveTableOverlayBridge)return;
const MODES=['ranked','tournament','caster'],STORE='ppc_stream_overlay_v868_',CHANNEL='ppc-stream-v868-';
const safe=(fn,f=null)=>{try{return fn()}catch{return f}};
function publicDeckUrl(tournamentId,player){
 if(!tournamentId||!player?.id||!player?.decklist?.cards)return '';
 try{const u=new URL('deck-public.html',location.href);u.searchParams.set('tournament',tournamentId);u.searchParams.set('player',player.id);return u.href}catch{return ''}
}
function patch(mode,data){if(!data||mode==='ranked')return data;const live=safe(()=>state.streamer.liveTable,null);if(!live)return data;const next={...data,liveTable:{...live}};next.liveTable.playerA={...(live.playerA||{}),publicDeckUrl:publicDeckUrl(live.tournamentId,live.playerA)};next.liveTable.playerB={...(live.playerB||{}),publicDeckUrl:publicDeckUrl(live.tournamentId,live.playerB)};return next}
function broadcast(mode,data){safe(()=>localStorage.setItem(STORE+mode,JSON.stringify(data)));safe(()=>{const ch=new BroadcastChannel(CHANNEL+mode);ch.postMessage({type:'state',data,at:Date.now()});ch.close()})}
function republish(){for(const mode of MODES){const raw=safe(()=>JSON.parse(localStorage.getItem(STORE+mode)||'null'),null);if(raw)broadcast(mode,patch(mode,raw))}}
function install(){const obs=window.PPCStreamerOBS2;if(!obs||obs.publishAll.__liveTableBridge)return false;const base=obs.publishAll.bind(obs);const wrapped=function(){const out=base();for(const mode of MODES)if(out?.[mode]){out[mode]=patch(mode,out[mode]);broadcast(mode,out[mode])}return out};wrapped.__liveTableBridge=true;obs.publishAll=wrapped;republish();return true}
let tries=0,t=setInterval(()=>{if(install()||++tries>120)clearInterval(t)},50);
window.PPCStreamerLiveTableOverlayBridge={version:'8.68.3',install,republish,publicDeckUrl};
})();