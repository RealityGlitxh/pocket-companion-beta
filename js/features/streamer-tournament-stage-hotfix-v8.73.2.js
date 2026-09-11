/* PocketNexus V8.73.3 — Tournament overlay state normalization hotfix.
   Keeps the V8.73.1 one-link tournament connection intact while ensuring
   tournament stage, round and record are safe display strings before OBS publish. */
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
function normalizeRecord(v){
  if(v&&typeof v==='object'){
    const wins=Number(v.wins??v.w??v.win),losses=Number(v.losses??v.l??v.loss),ties=Number(v.ties??v.draws??v.t??v.d??0);
    if(Number.isFinite(wins)&&Number.isFinite(losses))return `${wins}-${losses}${Number.isFinite(ties)&&ties>0?`-${ties}`:''}`;
  }
  const s=String(v??'').trim();
  return !s||s==='[object Object]'?'—':s;
}
function normalizeRound(v){
  if(v&&typeof v==='object')v=v.round??v.number??v.roundNumber??v.name??v.label??'';
  const s=String(v??'').trim();
  if(!s)return '—';
  if(/^\d+$/.test(s))return `Round ${s}`;
  if(/^round\s+\d+$/i.test(s)||/^(swiss|top\s*\d+|quarterfinals?|semifinals?|finals?|registration)$/i.test(s))return s;
  if(/^round\s+\D/i.test(s))return '—';
  return s;
}
function repair(){
  try{
    const s=window.state?.streamer,k=s?.tournamentConnection;
    if(!s||!k?.connected)return false;
    const fixedRound=normalizeRound(k.round??s.tournamentRound);
    const fixedRecord=normalizeRecord(k.record??s.tournamentRecord);
    const fixedStage=normalizeStage(s.tournamentStage,k.status,fixedRound);
    let changed=false;
    if(fixedRound&&fixedRound!==s.tournamentRound){s.tournamentRound=fixedRound;changed=true}
    if(fixedRound&&fixedRound!==k.round){k.round=fixedRound;changed=true}
    if(fixedRecord&&fixedRecord!==s.tournamentRecord){s.tournamentRecord=fixedRecord;changed=true}
    if(fixedRecord&&fixedRecord!==k.record){k.record=fixedRecord;changed=true}
    if(fixedStage&&fixedStage!==s.tournamentStage){s.tournamentStage=fixedStage;changed=true}
    if(fixedStage&&fixedStage!==k.stage){k.stage=fixedStage;changed=true}
    if(!changed)return false;
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
  if(api._test){
    api._test.inferStage=(details,round)=>normalizeStage('',details?.status??details?.stage??details?.phase??details?.currentStage??details?.currentPhase??'',round);
    api._test.normalizeRecord=normalizeRecord;
    api._test.normalizeRound=normalizeRound;
  }
  api.__stageHotfix=true;repair();return true;
}
let attempts=0;const boot=setInterval(()=>{if(install()||++attempts>200)clearInterval(boot)},50);
const guard=setInterval(()=>{if(window.state?.page==='streamer'&&window.state?.streamer?.overlayMode==='tournament')repair()},5000);
window.addEventListener?.('beforeunload',()=>clearInterval(guard),{once:true});
window.PPCStreamerTournamentStageHotfix={version:'8.73.3',normalizeStage,normalizeRecord,normalizeRound,repair,install};
})();
