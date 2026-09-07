/* PocketNexus V8.64.2 — ended-season Rank presentation hotfix
   Keeps completed seasons historical and suppresses active climb guidance. */
(function(){
  if(window.PPCRankEndedSeasonHotfix)return;

  function install(){
    const current=window.rankBorderQuickSummary;
    if(typeof current!=="function"||current.__endedSeasonHotfix)return false;
    const base=current;
    function wrapped(border,seasonLife){
      if(seasonLife?.state!=="ended")return base.apply(this,arguments);
      if(!border)return base.apply(this,arguments);
      const rp=Number(state.rank?.points||0);
      const target=Number(border.predictedFinalRP||0);
      const safe=Number(border.recommendedSafeRP||target||0);
      return `<section class="panel rankQuickSummary"><div class="between"><div><span class="eyebrow">YOUR CLIMB</span><h2>${esc(rankBorderLabel(border.targetRank))}</h2><p class="muted">This ranked season has ended. The values below are preserved as historical estimates, not an active climb target.</p></div><span class="confidence ${esc(String(border.confidence||"low").toLowerCase())}">${esc(rankBorderConfidence(border.confidence))} confidence</span></div><div class="rankQuickGrid"><div><span>Confirmed RP</span><strong>${rankBorderFmt(rp)}</strong><small>Your last tracked RP for this completed season</small></div><div><span>Final estimate</span><strong>${rankBorderFmt(target)}</strong><small>${esc(rankBorderLabel(border.targetRank))}</small></div><div><span>Estimated safe target</span><strong>${rankBorderFmt(safe)}</strong><small>Historical completed-season estimate</small></div></div><div class="notice"><strong>Season ended.</strong> These estimates are retained for reference only. Check Pokémon TCG Pocket for your official final rank and RP.</div></section>`;
    }
    wrapped.__endedSeasonHotfix=true;
    wrapped.__base=base;
    window.rankBorderQuickSummary=wrapped;
    return true;
  }

  if(!install()){
    let tries=0;
    const timer=setInterval(()=>{if(install()||++tries>240)clearInterval(timer)},50);
  }
  window.PPCRankEndedSeasonHotfix={version:"8.64.2",install};
})();
