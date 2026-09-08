import fs from 'node:fs/promises';

function replaceOnce(src,oldText,newText,label){
  if(src.includes(newText)) return src;
  if(!src.includes(oldText)) throw new Error(`Patch anchor missing: ${label}`);
  return src.replace(oldText,newText);
}

// Expose only the compact read-only matchup fields the browser needs to render the report.
const edgePath='supabase/functions/pocket-coach/index.ts';
let edge=await fs.readFile(edgePath,'utf8');
const edgeAnchor="matchupCardEvidenceRows:matchupCardEvidence.length})}catch(e)";
const compactReport="matchupCardEvidenceRows:matchupCardEvidence.length,matchupReport:matchupOptimizations.filter((x:any)=>x?.status==='matched').slice(0,4).map((x:any)=>({deckId:x.deckId,deckName:x.deckName,archetypeName:x.archetypeName,archetypeMatchConfidence:x.archetypeMatchConfidence,snapshotGeneratedAt:x.snapshotGeneratedAt,topThreats:(x.topMetaThreats||[]).slice(0,5).map((p:any)=>({opponentName:p.opponentName,winRate:p.winRate,opponentUsagePct:p.opponentUsagePct,matches:p.matches,decided:p.decided,evidence:p.evidence,band:p.band})),recommendations:(x.recommendations||[]).slice(0,6).map((r:any)=>({action:r.action,cardName:r.cardName,opponentArchetype:r.opponentArchetype,confidence:r.confidence,evidence:r.evidence,guardrail:r.guardrail}))}))})}catch(e)";
edge=replaceOnce(edge,edgeAnchor,compactReport,'compact matchup report response');
await fs.writeFile(edgePath,edge);

const uiPath='js/app/ai_coach.js';
let ui=await fs.readFile(uiPath,'utf8');
ui=replaceOnce(ui,
"const pocketCoachState={conversationId:null,messages:[],conversations:[],loading:false,error:'',loaded:false,providerChecked:false,providerConfigured:false,provider:'openai',model:'gpt-5.6-terra'};",
"const pocketCoachState={conversationId:null,messages:[],conversations:[],loading:false,error:'',loaded:false,providerChecked:false,providerConfigured:false,provider:'openai',model:'gpt-5.6-terra',matchupReport:[]};",
'coach state report');
ui=replaceOnce(ui,
"pocketCoachState.messages=data||[];pocketCoachState.error=error?.message||'';",
"pocketCoachState.messages=data||[];pocketCoachState.matchupReport=[];pocketCoachState.error=error?.message||'';",
'clear historical report');
ui=replaceOnce(ui,
"function coachNewChat(){pocketCoachState.conversationId=null;pocketCoachState.messages=[];pocketCoachState.error='';pocketCoachPage(true)}",
"function coachNewChat(){pocketCoachState.conversationId=null;pocketCoachState.messages=[];pocketCoachState.matchupReport=[];pocketCoachState.error='';pocketCoachPage(true)}",
'clear new-chat report');

const helperAnchor="function coachMessageHtml(m){";
const helpers=`function coachEnsureMatchupReportStyles(){if(document.getElementById('coachMatchupReportStyles'))return;const st=document.createElement('style');st.id='coachMatchupReportStyles';st.textContent=\`
.coachMatchupReport{margin-top:14px;border:1px solid rgba(148,163,184,.2);border-radius:16px;background:rgba(15,23,42,.58);overflow:hidden}.coachMatchupHeader{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:14px 15px;border-bottom:1px solid rgba(148,163,184,.14)}.coachMatchupHeader h3{margin:2px 0 0;font-size:15px}.coachMatchupHeader small{color:var(--muted,#94a3b8)}.coachMatchupDecks{display:grid;gap:12px;padding:12px}.coachMatchupDeck{border:1px solid rgba(148,163,184,.14);border-radius:13px;padding:12px;background:rgba(2,6,23,.28)}.coachMatchupDeckTop{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:9px}.coachMatchupDeckTop strong{font-size:14px}.coachMatchupDeckTop span{font-size:11px;color:var(--muted,#94a3b8)}.coachThreatGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:8px}.coachThreat{border:1px solid rgba(148,163,184,.14);border-radius:11px;padding:9px;background:rgba(15,23,42,.5)}.coachThreatName{font-weight:700;font-size:12px;margin-bottom:6px}.coachThreatStats{display:grid;grid-template-columns:repeat(2,1fr);gap:5px;font-size:11px;color:var(--muted,#94a3b8)}.coachThreatStats b{display:block;color:var(--text,#e5e7eb);font-size:12px}.coachMatchupBand{display:inline-flex;margin-top:7px;padding:3px 7px;border-radius:999px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;background:rgba(148,163,184,.12)}.coachMatchupBand.unfavorable,.coachMatchupBand.slightly-unfavorable{background:rgba(239,68,68,.14);color:#fca5a5}.coachMatchupBand.favorable,.coachMatchupBand.slightly-favorable{background:rgba(34,197,94,.14);color:#86efac}.coachMatchupBand.roughly-even{background:rgba(234,179,8,.14);color:#fde68a}.coachTechRows{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}.coachTechBox{border-radius:10px;padding:9px;background:rgba(15,23,42,.45)}.coachTechBox h4{margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.05em}.coachTechBox ul{margin:0;padding-left:16px;font-size:11px;color:var(--muted,#94a3b8)}.coachTechBox li+li{margin-top:4px}.coachTechBox.help h4{color:#86efac}.coachTechBox.review h4{color:#fcd34d}@media(max-width:640px){.coachTechRows{grid-template-columns:1fr}.coachThreatGrid{grid-template-columns:1fr 1fr}.coachMatchupHeader{align-items:flex-start;flex-direction:column}}@media(max-width:430px){.coachThreatGrid{grid-template-columns:1fr}}
\`;document.head.appendChild(st)}
function coachMatchupReportHtml(report){const decks=Array.isArray(report)?report:[];if(!decks.length)return'';coachEnsureMatchupReportStyles();return \`<section class="coachMatchupReport"><div class="coachMatchupHeader"><div><span class="eyebrow">MATCHUP REPORT</span><h3>Current competitive pressure</h3></div><small>Observed data • correlation ≠ causation</small></div><div class="coachMatchupDecks">\${decks.map(d=>{const threats=Array.isArray(d.topThreats)?d.topThreats:[];const recs=Array.isArray(d.recommendations)?d.recommendations:[];const helps=recs.filter(r=>r.action==='consider-matchup-tech').slice(0,4),reviews=recs.filter(r=>r.action==='review-for-matchup').slice(0,4);return \`<div class="coachMatchupDeck"><div class="coachMatchupDeckTop"><strong>\${esc(d.deckName||'Deck')} → \${esc(d.archetypeName||'Matched archetype')}</strong><span>Match confidence: \${esc(d.archetypeMatchConfidence||'unknown')}</span></div><div class="coachThreatGrid">\${threats.map(t=>\`<div class="coachThreat"><div class="coachThreatName">\${esc(t.opponentName||'Unknown')}</div><div class="coachThreatStats"><span><b>\${t.winRate==null?'—':Number(t.winRate).toFixed(1)+'%'}</b>Matchup WR</span><span><b>\${Number(t.opponentUsagePct||0).toFixed(1)}%</b>Meta share</span><span><b>\${Number(t.matches||0)}</b>Games</span><span><b>\${esc(t.evidence||'low')}</b>Confidence</span></div><span class="coachMatchupBand \${esc(t.band||'insufficient-evidence')}">\${esc(String(t.band||'insufficient evidence').replace(/-/g,' '))}</span></div>\`).join('')||'<div class="muted">No supported matchup rows available.</div>'}</div>\${helps.length||reviews.length?\`<div class="coachTechRows"><div class="coachTechBox help"><h4>Cards helping / test</h4><ul>\${helps.length?helps.map(r=>\`<li><strong>\${esc(r.cardName||'Card')}</strong> vs \${esc(r.opponentArchetype||'matchup')}\${r.evidence?.deltaWinRate!=null?\` • \${Number(r.evidence.deltaWinRate)>0?'+':''}\${Number(r.evidence.deltaWinRate).toFixed(1)} pts\`:''}</li>\`).join(''):'<li>No supported tech signal.</li>'}</ul></div><div class="coachTechBox review"><h4>Cards to review</h4><ul>\${reviews.length?reviews.map(r=>\`<li><strong>\${esc(r.cardName||'Card')}</strong> vs \${esc(r.opponentArchetype||'matchup')} • review only</li>\`).join(''):'<li>No supported review signal.</li>'}</ul></div></div>\`:''}</div>\`}).join('')}</div></section>\`}
`;
ui=replaceOnce(ui,helperAnchor,helpers+helperAnchor,'matchup report renderer');
ui=replaceOnce(ui,
"${sources.length?`<div class=\"coachSources\">${sources.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:''}</div></article>`;",
"${sources.length?`<div class=\"coachSources\">${sources.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:''}${assistant&&Array.isArray(m.matchupReport)&&m.matchupReport.length?coachMatchupReportHtml(m.matchupReport):''}</div></article>`;",
'message report placement');
ui=replaceOnce(ui,
"pocketCoachState.providerChecked=true;\n   pocketCoachState.messages.push({role:'assistant',content:data.answer,source_labels:data.sources||[],model_provider:data.provider,model_name:data.model});",
"pocketCoachState.providerChecked=true;\n   pocketCoachState.matchupReport=Array.isArray(data.matchupReport)?data.matchupReport:[];\n   pocketCoachState.messages.push({role:'assistant',content:data.answer,source_labels:data.sources||[],model_provider:data.provider,model_name:data.model,matchupReport:pocketCoachState.matchupReport});",
'attach live report');
await fs.writeFile(uiPath,ui);
console.log('POCKET_COACH_MATCHUP_REPORT_UI_PATCH_OK');
