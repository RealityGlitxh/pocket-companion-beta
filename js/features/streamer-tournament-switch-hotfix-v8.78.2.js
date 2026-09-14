/* PocketNexus V8.78.2 — authoritative tournament switch hotfix.
   Prevents a previous Limitless event from surviving after a new tournament is loaded. */
(function(){
'use strict';
if(window.PPCStreamerTournamentSwitchHotfix)return;

const VERSION='8.78.2';
const safe=(fn,f=null)=>{try{return fn()}catch{return f}};
const tournamentId=input=>{
  const raw=String(input??'').trim();
  if(!raw)return '';
  const service=safe(()=>window.PPCLimitlessLiveTable?.tournamentId?.(raw),'');
  if(service)return String(service);
  const m=raw.match(/(?:tournament|tournaments)\/([a-zA-Z0-9_-]+)/i);
  return m?m[1]:raw.replace(/^\/+|\/+$/g,'').split('/')[0];
};
function streamer(){state.streamer=state.streamer&&typeof state.streamer==='object'?state.streamer:{};return state.streamer}
function live(){const s=streamer();s.limitlessLive=s.limitlessLive&&typeof s.limitlessLive==='object'?s.limitlessLive:{};s.limitlessLive.playerByTournament=s.limitlessLive.playerByTournament||{};return s.limitlessLive}
function connection(){const s=streamer();s.tournamentConnection=s.tournamentConnection&&typeof s.tournamentConnection==='object'?s.tournamentConnection:{};return s.tournamentConnection}
function requestedInput(args){
  const explicit=args?.[0];
  if(typeof explicit==='string'&&explicit.trim())return explicit.trim();
  return String(document.getElementById('pnTournamentAutoUrl')?.value||live().tournament||connection().url||'').trim();
}
function clearDerivedTournamentState(raw,id){
  const s=streamer(),c=live(),remembered=c.playerByTournament||{};
  s.tournamentConnection={connected:false,tournamentId:id||'',url:raw||'',lastUpdated:Date.now()};
  c.tournament=raw||'';
  c.followPlayerId='';
  c.followPlayerName='';
  c.round='';
  c.table='';
  c.followTable='';
  c.playerByTournament=remembered;
  s.tournamentName='';
  s.tournamentRound='';
  s.tournamentRecord='';
  s.tournamentStage='';
  s.tournamentPlayerName='';
  s.tournamentOpponentName='';
  s.tournamentPublicDeck=null;
  s.liveTable=null;
  s.tournamentFollowSide='';
  s.controlOpponent='';
  safe(()=>save());
}
function publishNow(){
  safe(()=>window.publishStreamerOverlayState?.());
  safe(()=>window.PPCStreamerOBS2?.publishAll?.());
  safe(()=>window.PPCStreamerOBSRemote?.publish?.(true));
  safe(()=>window.PPCStreamerOBS2?.refreshPreview?.('tournament'));
}
function install(){
  const api=window.PPCStreamerTournamentAutoLink;
  if(!api||api.__switchHotfix782)return false;
  api.__switchHotfix782=true;
  const baseLoad=api.load?.bind(api);
  const baseChange=api.changeTournament?.bind(api);
  if(baseLoad){
    api.load=async function(){
      const raw=requestedInput(arguments),nextId=tournamentId(raw),currentId=String(connection().tournamentId||tournamentId(live().tournament||connection().url)||'');
      if(nextId&&currentId&&nextId!==currentId){
        clearDerivedTournamentState(raw,nextId);
        publishNow();
      }
      const ok=await baseLoad(...arguments);
      if(ok){
        const activeId=String(connection().tournamentId||'');
        if(nextId&&activeId&&nextId!==activeId){
          console.warn('PocketNexus tournament switch mismatch',{requested:nextId,active:activeId});
          return false;
        }
        publishNow();
      }
      return ok;
    };
  }
  if(baseChange){
    api.changeTournament=function(){
      clearDerivedTournamentState('','');
      const out=baseChange(...arguments);
      publishNow();
      return out;
    };
  }
  window.PPCStreamerTournamentSwitchHotfix={version:VERSION,clearDerivedTournamentState,publishNow,tournamentId};
  return true;
}
let tries=0,t=setInterval(()=>{if(install()||++tries>100)clearInterval(t)},50);
install();
})();
