import fs from 'node:fs';

const idxPath='supabase/functions/pocket-coach/index.ts';
const uiPath='js/app/ai_coach.js';
let idx=fs.readFileSync(idxPath,'utf8');
let ui=fs.readFileSync(uiPath,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

if(!idx.includes("./personal-matchup-learning.js")){
  const anchor="import { buildDeckComparisonProposal } from './deck-comparison.js';";
  must(idx.includes(anchor),'index import anchor missing');
  idx=idx.replace(anchor,anchor+"\nimport { buildPersonalMatchupLearning } from './personal-matchup-learning.js';");
}
if(!idx.includes('personalMatchupLearning:true')){
  const anchor="matchupAwareOptimization:true});if(body?.action==='compare-deck-change')";
  must(idx.includes(anchor),'status anchor missing');
  idx=idx.replace(anchor,"matchupAwareOptimization:true,personalMatchupLearning:true});if(body?.action==='compare-deck-change')");
}
if(!idx.includes('const personalMatchups=buildPersonalMatchupLearning')){
  const anchor='const matchupOptimizations=buildMatchupAwareOptimizations({decks:decks.slice(0,16),metaAware:metaOptimizations,snapshot:snap||null,archetypes:metaArchetypes,snapshotMatchups,cardEvidence:matchupCardEvidence});';
  must(idx.includes(anchor),'personal learning integration anchor missing');
  idx=idx.replace(anchor,anchor+"const personalMatchups=buildPersonalMatchupLearning({matches,decks:decks.slice(0,16),matchupAware:matchupOptimizations});");
}
if(!idx.includes("personalMatchupVersion:'v1'")){
  const anchor="matchupAwareVersion:'v1',audits:deckAudits";
  must(idx.includes(anchor),'deck intelligence context anchor missing');
  idx=idx.replace(anchor,"matchupAwareVersion:'v1',personalMatchupVersion:'v1',audits:deckAudits");
  const contextAnchor='metaAware:metaOptimizations,matchupAware:matchupOptimizations}';
  must(idx.includes(contextAnchor),'personal matchup context anchor missing');
  idx=idx.replace(contextAnchor,'metaAware:metaOptimizations,matchupAware:matchupOptimizations,personalMatchup:personalMatchups}');
}
if(!idx.includes("sources.push('Personal Matchup Learning')")){
  const anchor="if(matchupCardEvidence.length)sources.push('Matchup Card Evidence');";
  must(idx.includes(anchor),'source anchor missing');
  idx=idx.replace(anchor,anchor+"if(personalMatchups.some((x:any)=>Number(x?.personalSamples||0)>0))sources.push('Personal Matchup Learning');");
}
if(!idx.includes('PERSONAL MATCHUP LEARNING is the signed-in user')){
  const anchor='Prefer practical, concise competitive answers.';
  must(idx.includes(anchor),'prompt anchor missing');
  const rule="PERSONAL MATCHUP LEARNING is the signed-in user's observed Battle Tracker evidence. Keep it explicitly separate from GLOBAL MATCHUP EVIDENCE. Never average the two into one score or silently replace global data with personal data. Fewer than 5 decided personal games is insufficient evidence. A personal/global gap is descriptive only and does not prove why the difference exists. When personal evidence is available, say 'Your Results' or 'Your Battle Tracker record'; when using the competitive matrix, say 'Global Meta' or 'Current matchup evidence'. If the two disagree, report both and the sample sizes rather than choosing one as truth.\\\n\\\n";
  idx=idx.replace(anchor,rule+anchor);
}
if(!idx.includes('personalMatchup:personalMatch')){
  const anchor="const matchupReport=matchupOptimizations.filter((x:any)=>x?.status==='matched').slice(0,4).map((x:any)=>{const deckSnapshot=";
  must(idx.includes(anchor),'matchup report anchor missing');
  idx=idx.replace(anchor,"const matchupReport=matchupOptimizations.filter((x:any)=>x?.status==='matched').slice(0,4).map((x:any)=>{const personalMatch=personalMatchups.find((p:any)=>String(p?.deckId||'')===String(x?.deckId||''))||null;const deckSnapshot=");
  const returnAnchor='return {deckId:x.deckId,deckName:x.deckName,archetypeName:x.archetypeName,archetypeMatchConfidence:x.archetypeMatchConfidence,snapshotGeneratedAt:x.snapshotGeneratedAt,deckSnapshot,';
  must(idx.includes(returnAnchor),'matchup report return anchor missing');
  idx=idx.replace(returnAnchor,'return {deckId:x.deckId,deckName:x.deckName,archetypeName:x.archetypeName,archetypeMatchConfidence:x.archetypeMatchConfidence,snapshotGeneratedAt:x.snapshotGeneratedAt,deckSnapshot,personalMatchup:personalMatch,');
}
if(!idx.includes('personalMatchupSampleCount:')){
  const anchor='matchupOptimizationCount:matchupOptimizations.length,metaBenchmarkDecklists:';
  must(idx.includes(anchor),'context summary anchor missing');
  idx=idx.replace(anchor,'matchupOptimizationCount:matchupOptimizations.length,personalMatchupSampleCount:personalMatchups.reduce((n:any,x:any)=>n+Number(x?.personalSamples||0),0),metaBenchmarkDecklists:');
}
if(!idx.includes('personalMatchupLearning:true,deckAuditCount')){
  const anchor='matchupAwareOptimization:true,deckAuditCount:';
  must(idx.includes(anchor),'response feature anchor missing');
  idx=idx.replace(anchor,'matchupAwareOptimization:true,personalMatchupLearning:true,deckAuditCount:');
  const countAnchor='matchupOptimizationCount:matchupOptimizations.length,metaBenchmarkDecklists:';
  if(idx.includes(countAnchor))idx=idx.replace(countAnchor,'matchupOptimizationCount:matchupOptimizations.length,personalMatchupSampleCount:personalMatchups.reduce((n:any,x:any)=>n+Number(x?.personalSamples||0),0),metaBenchmarkDecklists:');
}

const start=ui.indexOf('function coachMatchupReportHtml(report){');
const end=ui.indexOf('function coachMessageHtml(m){');
must(start>=0&&end>start,'coach matchup report function boundaries missing');
const replacement=`function coachPersonalResultHtml(d,t){
 const rows=Array.isArray(d?.personalMatchup?.matchedThreats)?d.personalMatchup.matchedThreats:[];
 const p=rows.find(x=>String(x?.opponentName||'')===String(t?.opponentName||''));
 if(!p)return '<div class="coachPersonalResult insufficient"><strong>Your Results</strong><span>No matching Battle Tracker sample.</span><small>Insufficient evidence</small></div>';
 const enough=p.evidence!=='insufficient';
 const wr=p.winRate==null?'—':Number(p.winRate).toFixed(1)+'%';
 const relation=String(p.comparison||'insufficient-evidence').replace(/-/g,' ');
 return '<div class="coachPersonalResult '+(enough?'':'insufficient')+'"><strong>Your Results</strong><span>'+wr+' • '+Number(p.decided||0)+' decided • '+esc(p.evidence||'insufficient')+'</span><small>'+esc(enough?relation:'Insufficient evidence — fewer than 5 decided games')+'</small></div>';
}
function coachMatchupReportHtml(report){
 const decks=Array.isArray(report)?report:[];
 if(!decks.length)return'';
 coachEnsureMatchupReportStyles();
 const deckHtml=decks.map(function(d){
  const threats=Array.isArray(d.topThreats)?d.topThreats:[];
  const recs=Array.isArray(d.recommendations)?d.recommendations:[];
  const helps=recs.filter(r=>r.action==='consider-matchup-tech').slice(0,4);
  const reviews=recs.filter(r=>r.action==='review-for-matchup').slice(0,4);
  const threatHtml=threats.map(function(t){
   const wr=t.winRate==null?'—':Number(t.winRate).toFixed(1)+'%';
   return '<div class="coachThreat"><div class="coachThreatName">'+esc(t.opponentName||'Unknown')+'</div><div class="coachThreatStats"><span><b>'+wr+'</b>Global WR</span><span><b>'+Number(t.opponentUsagePct||0).toFixed(1)+'%</b>Meta share</span><span><b>'+Number(t.matches||0)+'</b>Global games</span><span><b>'+esc(t.evidence||'low')+'</b>Global confidence</span></div><span class="coachMatchupBand '+esc(t.band||'insufficient-evidence')+'">'+esc(String(t.band||'insufficient evidence').replace(/-/g,' '))+'</span>'+coachPersonalResultHtml(d,t)+'</div>';
  }).join('')||'<div class="muted">No supported matchup rows available.</div>';
  const helpItems=helps.length?helps.map(function(r){const delta=r.evidence?.deltaWinRate;return '<li><strong>'+esc(r.cardName||'Card')+'</strong> vs '+esc(r.opponentArchetype||'matchup')+(delta!=null?' • '+(Number(delta)>0?'+':'')+Number(delta).toFixed(1)+' pts global association':'')+'</li>';}).join(''):'<li>No supported tech signal.</li>';
  const reviewItems=reviews.length?reviews.map(function(r){return '<li><strong>'+esc(r.cardName||'Card')+'</strong> vs '+esc(r.opponentArchetype||'matchup')+' • review only</li>';}).join(''):'<li>No supported review signal.</li>';
  const techHtml=(helps.length||reviews.length)?'<div class="coachTechRows"><div class="coachTechBox help"><h4>Cards helping / test</h4><ul>'+helpItems+'</ul></div><div class="coachTechBox review"><h4>Cards to review</h4><ul>'+reviewItems+'</ul></div></div>':'';
  return '<div class="coachMatchupDeck"><div class="coachMatchupDeckTop"><strong>'+esc(d.deckName||'Deck')+' → '+esc(d.archetypeName||'Matched archetype')+'</strong><span>Match confidence: '+esc(d.archetypeMatchConfidence||'unknown')+'</span></div><div class="coachEvidenceLegend"><span><b>Global Meta</b> competitive matrix</span><span><b>Your Results</b> Battle Tracker only</span></div><div class="coachThreatGrid">'+threatHtml+'</div>'+techHtml+'<p class="muted tiny coachPersonalGuardrail">Your Results are descriptive Battle Tracker history. They are never blended into the Global Meta percentage and do not prove why a matchup differs.</p></div>';
 }).join('');
 return '<section class="coachMatchupReport"><div class="coachMatchupHeader"><div><span class="eyebrow">MATCHUP REPORT</span><h3>Global Meta + Your Results</h3></div><small>Separate evidence layers • correlation ≠ causation</small></div><div class="coachMatchupDecks">'+deckHtml+'</div></section>';
}
`;
ui=ui.slice(0,start)+replacement+ui.slice(end);
if(!ui.includes('.coachPersonalResult{')){
  const media='@media(max-width:640px)';
  must(ui.includes(media),'style media anchor missing');
  const css='.coachEvidenceLegend{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 9px}.coachEvidenceLegend span{font-size:10px;color:var(--muted,#94a3b8);padding:4px 7px;border:1px solid rgba(148,163,184,.12);border-radius:999px}.coachEvidenceLegend b{color:var(--text,#e5e7eb)}.coachPersonalResult{margin-top:8px;padding-top:8px;border-top:1px solid rgba(148,163,184,.12);display:grid;gap:2px}.coachPersonalResult strong{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#93c5fd}.coachPersonalResult span{font-size:11px;color:var(--text,#e5e7eb)}.coachPersonalResult small{font-size:10px;color:var(--muted,#94a3b8)}.coachPersonalResult.insufficient strong{color:#cbd5e1}.coachPersonalGuardrail{margin:10px 0 0}';
  ui=ui.replace(media,css+media);
}

fs.writeFileSync(idxPath,idx);
fs.writeFileSync(uiPath,ui);
console.log('PERSONAL_MATCHUP_INTEGRATION_APPLIED');
