/* PocketNexus V8.78.3 — stale hidden tournament input hotfix.
   Keeps the legacy Limitless source control synchronized with the authoritative auto-link tournament. */
(function(){
'use strict';
if(window.PPCStreamerTournamentHiddenInputHotfix)return;
const VERSION='8.78.3';
const safe=(fn,f=null)=>{try{return fn()}catch{return f}};
function activeTournament(){return String(safe(()=>state.streamer?.limitlessLive?.tournament,'')||safe(()=>state.streamer?.tournamentConnection?.url,'')||'').trim()}
function syncHiddenTournamentInput(){
  const input=document.getElementById('pnLiveTournament'),wanted=activeTournament();
  if(input&&wanted&&input.value!==wanted){input.value=wanted;input.dataset.pnSyncedTournament='true'}
  return wanted;
}
function publishNow(){
  safe(()=>window.publishStreamerOverlayState?.());
  safe(()=>window.PPCStreamerOBS2?.publishAll?.());
  safe(()=>window.PPCStreamerOBSRemote?.publish?.(true));
  safe(()=>window.PPCStreamerOBS2?.refreshPreview?.('tournament'));
}
function install(){
  const api=window.PPCStreamerLimitlessLiveTable;
  if(!api||api.__hiddenTournamentInputHotfix783)return false;
  api.__hiddenTournamentInputHotfix783=true;
  const baseLoad=api.load?.bind(api);
  if(baseLoad){
    api.load=async function(){
      syncHiddenTournamentInput();
      const out=await baseLoad(...arguments);
      syncHiddenTournamentInput();
      publishNow();
      return out;
    };
  }
  const auto=window.PPCStreamerTournamentAutoLink;
  if(auto&&!auto.__hiddenTournamentInputHotfix783){
    auto.__hiddenTournamentInputHotfix783=true;
    for(const key of ['load','refresh','selectPlayer']){
      const base=auto[key]?.bind(auto);if(!base)continue;
      auto[key]=async function(){
        syncHiddenTournamentInput();
        const out=await base(...arguments);
        syncHiddenTournamentInput();
        publishNow();
        return out;
      };
    }
  }
  window.PPCStreamerTournamentHiddenInputHotfix={version:VERSION,syncHiddenTournamentInput,publishNow};
  syncHiddenTournamentInput();
  return true;
}
let tries=0,t=setInterval(()=>{if(install()||++tries>120)clearInterval(t)},50);
const observer=new MutationObserver(()=>{if(safe(()=>state.page,'')==='streamer')syncHiddenTournamentInput()});
observer.observe(document.documentElement,{childList:true,subtree:true});
install();
})();
