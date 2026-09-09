/* V8.71.1 — AI Weakness-Cover Pairing Lab
   Data-grounded partner selection. Confirmed coverage requires observed matchup evidence;
   unknown matchups remain unknown. Pocket Coach is used only for optional explanation. */
(function(){
  const aiState={baseId:'',results:[],explanation:'',loading:false,error:'',explaining:false};
  window.PPCPairingAIState=aiState;

  function decks(){try{return gymSelectableDecks?.()||[]}catch(e){return[]}}
  function byId(id){return decks().find(d=>String(d.id)===String(id))||null}
  function pct(n){return Number.isFinite(Number(n))?Number(n):0}
  function evidenceLabel(n){return n>=8?'High':n>=4?'Medium':n>=1?'Low':'Unknown'}
  function escText(v){return typeof esc==='function'?esc(String(v??'')):String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]))}

  function baseWeaknesses(deck){
    if(!deck)return[];
    const p=gymDeckProfile(deck);
    return (p.cells||[])
      .filter(c=>Number(c.n||0)>0&&Number(c.wr||0)<50)
      .map(c=>({name:c.name,wr:Number(c.wr||0),n:Number(c.n||0),usage:Number(c.usage||0),confidence:c.confidence||evidenceLabel(c.n)}))
      .sort((a,b)=>(b.usage-a.usage)||(a.wr-b.wr)||(b.n-a.n));
  }

  function scorePartner(base,partner){
    const baseProfile=gymDeckProfile(base),partnerProfile=gymDeckProfile(partner),weak=baseWeaknesses(base);
    const rows=weak.map(w=>{
      const pc=gymMatchupCellForTarget(partnerProfile,w.name);
      const covered=Number(pc.n||0)>0&&Number(pc.wr||0)>=50;
      const sharedBad=Number(pc.n||0)>0&&Number(pc.wr||0)<50;
      const unknown=!Number(pc.n||0);
      const weight=w.usage>0?w.usage:1;
      return {...w,partnerWr:Number(pc.wr||0),partnerN:Number(pc.n||0),covered,sharedBad,unknown,weight};
    });
    const totalWeight=rows.reduce((s,r)=>s+r.weight,0)||0;
    const coveredWeight=rows.filter(r=>r.covered).reduce((s,r)=>s+r.weight,0);
    const sharedBadWeight=rows.filter(r=>r.sharedBad).reduce((s,r)=>s+r.weight,0);
    const coverage=totalWeight?coveredWeight/totalWeight*100:0;
    const sharedBad=totalWeight?sharedBadWeight/totalWeight*100:0;
    const known=rows.filter(r=>!r.unknown).length;
    const sample=rows.reduce((s,r)=>s+r.partnerN+r.n,0);
    const fallback=gymPairAnalysis(base,partner,'antiMeta');
    const confidence=Math.min(100,(sample/24)*100);
    const complementScore=rows.length
      ?Math.round(Math.max(0,Math.min(100,coverage*.62+(100-sharedBad)*.23+fallback.score*.15)))
      :Math.round(fallback.score);
    return {base,partner,rows,weaknessCount:rows.length,covered:rows.filter(r=>r.covered),shared:rows.filter(r=>r.sharedBad),unknown:rows.filter(r=>r.unknown),coverage,sharedBad,known,confidence,score:complementScore,fallback};
  }

  function recommend(baseId){
    const ds=decks(),base=byId(baseId)||ds[0]||null;
    aiState.baseId=base?.id||'';aiState.explanation='';aiState.error='';
    if(!base){aiState.results=[];return[]}
    aiState.results=ds.filter(d=>String(d.id)!==String(base.id)).map(d=>scorePartner(base,d)).sort((a,b)=>b.score-a.score||b.coverage-a.coverage||b.confidence-a.confidence).slice(0,5);
    return aiState.results;
  }
  window.pairingAIRecommend=recommend;

  function selectBase(id){aiState.baseId=String(id||'');recommend(aiState.baseId);try{gymBattlePage()}catch(e){}}
  window.pairingAISelectBase=selectBase;

  async function explain(index=0){
    const r=aiState.results[index];if(!r||aiState.explaining)return;
    const client=window.getPPCCloudClient?.(),session=window.getPPCCloudSession?.();
    if(!client||!session?.user){aiState.error='Sign in to get the Pocket Coach explanation. Pair recommendations still work locally.';try{gymBattlePage()}catch(e){};return}
    aiState.explaining=true;aiState.error='';aiState.explanation='';try{gymBattlePage()}catch(e){}
    const evidence={base:r.base.name,partner:r.partner.name,score:r.score,coveragePct:Number(r.coverage.toFixed(1)),sharedWeaknessPct:Number(r.sharedBad.toFixed(1)),confirmedCovered:r.covered.map(x=>({opponent:x.name,baseWinRate:Number(x.wr.toFixed(1)),baseGames:x.n,partnerWinRate:Number(x.partnerWr.toFixed(1)),partnerGames:x.partnerN})),sharedBad:r.shared.map(x=>({opponent:x.name,baseWinRate:Number(x.wr.toFixed(1)),partnerWinRate:Number(x.partnerWr.toFixed(1))})),unknown:r.unknown.map(x=>x.name)};
    const message='Inside PocketNexus Deck Pairing Lab, explain why these two decks complement each other. Use ONLY the supplied evidence. Do not invent matchup advantages. Distinguish confirmed coverage from unknown matchups. Keep it to 3-5 concise sentences. Evidence: '+JSON.stringify(evidence);
    try{
      const {data,error}=await client.functions.invoke('pocket-coach',{body:{message,conversationId:null}});
      if(error)throw error;if(data?.error)throw new Error(data.error);
      aiState.explanation=String(data?.answer||'').trim()||'No explanation returned.';
    }catch(e){aiState.error=e?.message||'Pocket Coach could not explain this pair.'}
    aiState.explaining=false;try{gymBattlePage()}catch(e){}
  }
  window.pairingAIExplain=explain;

  function optionHtml(selected){return decks().map(d=>`<option value="${escText(d.id)}" ${String(d.id)===String(selected)?'selected':''}>${escText(d.name)}</option>`).join('')}
  function rowHtml(r,i,playerIndex){
    const covered=r.covered.slice(0,4).map(x=>`<span class="pairAIChip good">✓ ${escText(x.name)}</span>`).join('');
    const shared=r.shared.slice(0,3).map(x=>`<span class="pairAIChip bad">! ${escText(x.name)}</span>`).join('');
    const unknown=r.unknown.length?`<span class="pairAIChip unknown">${r.unknown.length} unknown</span>`:'';
    const evidence=r.weaknessCount?`${r.covered.length}/${r.weaknessCount} known weaknesses covered`:'Not enough personal weakness evidence — anti-meta fallback';
    return `<article class="pairAIResult ${i===0?'best':''}"><div class="pairAIRank">#${i+1}</div><div class="pairAIBody"><div class="between"><div><span class="eyebrow">${i===0?'BEST WEAKNESS COVER':'ALTERNATIVE COVER'}</span><h3>${escText(r.base.name)} <span>+</span> ${escText(r.partner.name)}</h3></div><span class="badge">${r.score}/100</span></div><div class="pairAIMetrics"><div><strong>${r.coverage.toFixed(0)}%</strong><small>Weakness Coverage</small></div><div><strong>${r.sharedBad.toFixed(0)}%</strong><small>Shared Bad Matchups</small></div><div><strong>${evidenceLabel(Math.round(r.confidence/12))}</strong><small>Evidence</small></div></div><p class="muted tiny">${escText(evidence)}</p><div class="pairAIChips">${covered}${shared}${unknown}</div>${i===0&&aiState.explanation?`<div class="pairAIExplanation"><strong>Pocket Coach</strong><p>${escText(aiState.explanation)}</p></div>`:''}</div><div class="pairAIActions"><button onclick="gymAssignPair(${playerIndex},'${escText(r.base.id)}','${escText(r.partner.id)}')">Use Pair</button>${i===0?`<button class="secondary" onclick="pairingAIExplain(0)" ${aiState.explaining?'disabled':''}>${aiState.explaining?'Thinking…':'Explain with AI'}</button>`:''}</div></article>`;
  }

  function panel(playerIndex){
    const ds=decks();if(ds.length<2)return'';
    if(!aiState.baseId||!byId(aiState.baseId))aiState.baseId=ds[0].id;
    if(!aiState.results.length||String(aiState.results[0]?.base?.id)!==String(aiState.baseId))recommend(aiState.baseId);
    const base=byId(aiState.baseId),weak=baseWeaknesses(base);
    const weakHtml=weak.length?weak.slice(0,5).map(w=>`<span class="pairAIChip bad">${escText(w.name)} • ${w.wr.toFixed(0)}% (${w.n})</span>`).join(''):`<span class="pairAIChip unknown">No confirmed bad matchup sample yet</span>`;
    return `<section class="panel pairAIPanel"><div class="between"><div><span class="eyebrow">AI WEAKNESS COVER</span><h2>Find a deck that covers this deck's bad matchups</h2><p class="muted">PocketNexus compares your Battle Tracker evidence against every available saved and Meta deck. Unknown matchups stay unknown.</p></div><span class="pill">DATA-GROUNDED</span></div><div class="pairAIControls"><label>Start with deck<select onchange="pairingAISelectBase(this.value)">${optionHtml(aiState.baseId)}</select></label><button onclick="pairingAIRecommend(document.querySelector('.pairAIControls select')?.value);gymBattlePage()">Find Best Cover</button></div><div class="pairAIWeakness"><strong>Known weaknesses</strong><div class="pairAIChips">${weakHtml}</div></div>${aiState.error?`<div class="notice"><strong>${escText(aiState.error)}</strong></div>`:''}<div class="pairAIList">${aiState.results.slice(0,3).map((r,i)=>rowHtml(r,i,playerIndex)).join('')}</div></section>`;
  }
  window.pairingAIHtml=panel;

  function injectStyles(){if(document.getElementById('pairAIStyles'))return;const s=document.createElement('style');s.id='pairAIStyles';s.textContent=`.pairAIPanel{margin:16px 0}.pairAIControls{display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin:14px 0}.pairAIControls label{display:grid;gap:6px;min-width:min(360px,100%);flex:1}.pairAIWeakness{display:grid;gap:8px;padding:12px;border:1px solid rgba(148,163,184,.14);border-radius:12px;margin-bottom:12px}.pairAIChips{display:flex;gap:6px;flex-wrap:wrap}.pairAIChip{font-size:11px;border-radius:999px;padding:5px 8px;background:rgba(148,163,184,.11);border:1px solid rgba(148,163,184,.16)}.pairAIChip.good{color:#86efac;background:rgba(34,197,94,.1)}.pairAIChip.bad{color:#fca5a5;background:rgba(239,68,68,.1)}.pairAIChip.unknown{color:#cbd5e1}.pairAIList{display:grid;gap:10px}.pairAIResult{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:start;padding:14px;border:1px solid rgba(148,163,184,.16);border-radius:14px;background:rgba(15,23,42,.34)}.pairAIResult.best{border-color:rgba(96,165,250,.45);box-shadow:inset 0 0 0 1px rgba(96,165,250,.08)}.pairAIRank{font-weight:900;font-size:18px;opacity:.72}.pairAIBody h3{margin:3px 0 8px}.pairAIMetrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:8px 0}.pairAIMetrics>div{padding:8px;border-radius:10px;background:rgba(2,6,23,.28)}.pairAIMetrics strong,.pairAIMetrics small{display:block}.pairAIMetrics small{font-size:10px;color:var(--muted,#94a3b8)}.pairAIActions{display:grid;gap:7px;min-width:110px}.pairAIExplanation{margin-top:10px;padding:10px;border-radius:10px;background:rgba(59,130,246,.08);border:1px solid rgba(96,165,250,.18)}.pairAIExplanation p{margin:5px 0 0;font-size:12px;line-height:1.45}@media(max-width:720px){.pairAIResult{grid-template-columns:auto 1fr}.pairAIActions{grid-column:2;display:flex;flex-wrap:wrap}.pairAIMetrics{grid-template-columns:1fr 1fr 1fr}}@media(max-width:480px){.pairAIMetrics{grid-template-columns:1fr}.pairAIResult{grid-template-columns:1fr}.pairAIRank{display:none}.pairAIActions{grid-column:1}}`;document.head.appendChild(s)}
  injectStyles();

  // Wrap the existing Pairing Lab without changing its proven scoring/runtime.
  const original=window.gymPairingPage;
  if(typeof original==='function'){
    window.gymPairingPage=function(){
      const html=original();
      const g=gymState(),i=Number(g.pairingPlayer||0),ai=panel(i);
      if(!ai)return html;
      const marker=pairingLiveIntelHtml();
      if(marker&&html.includes(marker))return html.replace(marker,ai+marker);
      const list='<div class="gymPairList">';
      return html.includes(list)?html.replace(list,ai+list):html.replace('</div>',ai+'</div>');
    };
  }
})();
