/* PocketNexus V8.73.2 — force Tournament Auto Link UI after every Streamer render. */
(function(){
'use strict';
if(window.PPCStreamerTournamentAutoLinkRenderHotfix)return;
const api=window.PPCStreamerTournamentAutoLink;
const base=window.streamerPage;
function patchNow(){
  if(!window.PPCStreamerTournamentAutoLink)return;
  try{ window.PPCStreamerTournamentAutoLink.patch?.(); }catch(e){ console.warn('Tournament auto-link render patch failed',e); }
}
if(typeof base==='function'&&!base.__pnTournamentAutoWrapped){
  function wrappedStreamerPage(){
    const out=base.apply(this,arguments);
    patchNow();
    requestAnimationFrame(()=>patchNow());
    setTimeout(()=>patchNow(),0);
    return out;
  }
  wrappedStreamerPage.__pnTournamentAutoWrapped=true;
  wrappedStreamerPage.__pnTournamentAutoBase=base;
  window.streamerPage=wrappedStreamerPage;
}
patchNow();
requestAnimationFrame(()=>patchNow());
window.PPCStreamerTournamentAutoLinkRenderHotfix={version:'8.73.2',patch:patchNow};
})();
