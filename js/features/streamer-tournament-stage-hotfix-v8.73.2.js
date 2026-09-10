/* PocketNexus V8.73.2 — Tournament stage mapping hotfix.
   Keeps the V8.73.1 one-link tournament connection intact while correcting
   elimination-stage labels after every load/refresh/player selection. */
(function(){
'use strict';
if(window.PPCStreamerTournamentStageHotfix)return;
const norm=v=>String(v??'').trim().toLowerCase();
function normalizeStage(stage,status,round){
  const text=[status,stage,round].map(norm).filter(Boolean).join(' ');
  if(/complete|finished|ended|concluded/.test(text))return 'Completed';
  if(/registration|register|upcoming|scheduled|not.?started/.test(text))return 'Registration';
  if(/semi|top\s*4/.test(text))return 'Top 4';
  if(/quarter|top\s*8/.test(text))return 'Top 8';
  if(/\bfinals?\b/.test(text))return 'Finals';
  if(/top.?cut|playoff|elimination/.test(text))return 'Top Cut';
  if(/swiss|round/.test(text))return 'Swiss';
  return stage||'Registration';
}
function repair(){
  try{
    const s=window.state?.streamer,k=s?.tournamentConnection;
    if(!s||!k?.connected)return false;
    const fixed=normalizeStage(s.tournamentStage,k.status,k.round||s.tournamentRound);
    if(!fixed||fixed===s.tournamentStage&&fixed===k.stage)return false;
    s.tournamentStage=fixed;k.stage=fixed;
    try{window.save?.()}catch{}
    try{window.PPCStreamerOBS2?.publishAll?.()}catch{}
    try{window.publishStreamerOverlayState?.()}catch{}
    return true;
  }catch{return false}
}
function install(){
  const api=window.PPCStreamerTournamentAutoLink;if(!api||api.__stageHotfix)return false;
  for(const name of ['load','refresh','selectPlayer']){
    const base=api[name];if(typeof base!=='function')continue;
    api[name]=async function(){const out=await base.apply(this,arguments);repair();return out};
  }
  if(api._test)api._test.inferStage=(details,round)=>normalizeStage('',details?.status??details?.stage??details?.phase??details?.currentStage??details?.currentPhase??'',round);
  api.__stageHotfix=true;repair();return true;
}
let attempts=0;const boot=setInterval(()=>{if(install()||++attempts>200)clearInterval(boot)},50);
const guard=setInterval(()=>{if(window.state?.page==='streamer'&&window.state?.streamer?.overlayMode==='tournament')repair()},5000);
window.addEventListener?.('beforeunload',()=>clearInterval(guard),{once:true});
window.PPCStreamerTournamentStageHotfix={version:'8.73.2',normalizeStage,repair,install};
})();
