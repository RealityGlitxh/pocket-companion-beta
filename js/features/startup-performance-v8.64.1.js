/* PocketNexus V8.64.1 — Startup Performance Pass 1 */
(function(){
  'use strict';

  const perf={startedAt:performance.now(),longTasks:[],marks:[]};
  window.__ppcPerformance=perf;

  function mark(name){
    try{perf.marks.push({name,at:Math.round(performance.now())});performance.mark(`ppc:${name}`)}catch(_){ }
  }
  window.PPCPerformance={mark,getSnapshot:()=>({
    elapsedMs:Math.round(performance.now()-perf.startedAt),
    marks:perf.marks.slice(),
    longTasks:perf.longTasks.slice(-20),
    resources:performance.getEntriesByType?.('resource')?.length||0
  })};

  mark('startup-performance-loaded');

  // A Meta request during global startup used to fetch data and emit UI updates before the
  // user even opened Meta. Skip only that first automatic ensure call. Manual Refresh and
  // later explicit Meta requests continue to use the real service unchanged.
  const svc=window.PPCMetaService;
  if(svc?.ensure && !svc.__startupEnsureGuardInstalled){
    svc.__startupEnsureGuardInstalled=true;
    const realEnsure=svc.ensure.bind(svc);
    let firstAutomaticEnsureSkipped=false;
    svc.ensure=function(w){
      if(!firstAutomaticEnsureSkipped){
        firstAutomaticEnsureSkipped=true;
        mark('meta-startup-fetch-skipped');
        return svc.getPayload?.()||null;
      }
      return realEnsure(w);
    };
  }

  // Collect browser long-task diagnostics without changing application behavior.
  try{
    if('PerformanceObserver' in window){
      const observer=new PerformanceObserver(list=>{
        for(const entry of list.getEntries()){
          perf.longTasks.push({start:Math.round(entry.startTime),duration:Math.round(entry.duration)});
          if(perf.longTasks.length>50)perf.longTasks.shift();
        }
      });
      observer.observe({entryTypes:['longtask']});
    }
  }catch(_){ }

  window.addEventListener('load',()=>mark('window-load'),{once:true});
})();
