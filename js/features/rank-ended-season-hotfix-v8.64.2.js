/* PocketNexus V8.64.2 — ended-season Rank presentation hotfix
   Keeps completed seasons historical and suppresses active climb guidance. */
(function(){
  if(window.PPCRankEndedSeasonHotfix)return;

  // This wrapper is loaded outside the lazy Rank bundle, so it must not depend
  // on lexical-only helpers declared inside rank_tools-v8.64.1.js.
  function fmt(n){return Number.isFinite(Number(n))?Number(n).toLocaleString():"—"}
  function label(rank){return rank===100?"Top 100":rank===1000?"Top 1K":rank===5000?"Top 5K":rank===10000?"Top 10K":`Top ${rank}`}
  function confidence(c){c=String(c||"").toLowerCase();return c?c.charAt(0).toUpperCase()+c.slice(1):"—"}
  function html(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}

  function install(){
    const current=window.rankBorderQuickSummary;
    if(typeof current!=="function"||current.__endedSeasonHotfix)return false;
    const base=current;
    function wrapped(border,seasonLife){
      if(seasonLife?.state!=="ended")return base.apply(this,arguments);
      if(!border)return base.apply(this,arguments);
      const rp=Number(window.state?.rank?.points||0);
      const target=Number(border.predictedFinalRP||0);
      const safe=Number(border.recommendedSafeRP||target||0);
      return `<section class="panel rankQuickSummary"><div class="between"><div><span class="eyebrow">YOUR CLIMB</span><h2>${html(label(border.targetRank))}</h2><p class="muted">This ranked season has ended. The values below are preserved as historical estimates, not an active climb target.</p></div><span class="confidence ${html(String(border.confidence||"low").toLowerCase())}">${html(confidence(border.confidence))} confidence</span></div><div class="rankQuickGrid"><div><span>Confirmed RP</span><strong>${fmt(rp)}</strong><small>Your last tracked RP for this completed season</small></div><div><span>Final estimate</span><strong>${fmt(target)}</strong><small>${html(label(border.targetRank))}</small></div><div><span>Estimated safe target</span><strong>${fmt(safe)}</strong><small>Historical completed-season estimate</small></div></div><div class="notice"><strong>Season ended.</strong> These estimates are retained for reference only. Check Pokémon TCG Pocket for your official final rank and RP.</div></section>`;
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
