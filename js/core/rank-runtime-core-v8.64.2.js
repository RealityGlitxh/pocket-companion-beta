/* PocketNexus V8.64.2 — lightweight eager Rank runtime
   Shared helpers used outside the lazy Rank route must exist before Home renders. */
(function(){
  if(window.PPCRankRuntimeCore)return;

  if(typeof window.rankBorderService!=="function"){
    window.rankBorderService=function(){return window.PPCRankBorderService||null};
  }
  if(typeof window.rankBorderFmt!=="function"){
    window.rankBorderFmt=function(n){return Number.isFinite(Number(n))?Number(n).toLocaleString():"—"};
  }
  if(typeof window.rankBorderLabel!=="function"){
    window.rankBorderLabel=function(rank){return rank===100?"Top 100":rank===1000?"Top 1K":rank===5000?"Top 5K":rank===10000?"Top 10K":`Top ${rank}`};
  }
  if(typeof window.rankBorderConfidence!=="function"){
    window.rankBorderConfidence=function(c){c=String(c||"").toLowerCase();return c?c.charAt(0).toUpperCase()+c.slice(1):"—"};
  }
  if(typeof window.rankSeasonLifecycle!=="function"){
    window.rankSeasonLifecycle=function(season){
      const now=Date.now();
      const start=season?.startsAt?new Date(season.startsAt).getTime():NaN;
      const end=season?.endsAt?new Date(season.endsAt).getTime():NaN;
      if(Number.isFinite(end)&&now>=end)return {state:"ended",label:"Season ended",live:false};
      if(Number.isFinite(start)&&now<start)return {state:"upcoming",label:`Starts ${new Date(start).toLocaleString()}`,live:false};
      const hrs=Number(season?.hoursRemaining);
      if(Number.isFinite(hrs)&&hrs>0)return {state:"active",label:`${window.rankBorderFmt(hrs)} hours remaining`,live:true};
      return {state:"active",label:"Active season",live:true};
    };
  }

  window.PPCRankRuntimeCore={version:"8.64.2"};
})();
