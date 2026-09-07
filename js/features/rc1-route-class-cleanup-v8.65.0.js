/* PocketNexus V8.65 RC1 — route-scoped app class cleanup.
   Fixes proven cross-route layout leakage without changing individual page renderers.
   QA trigger only: rerun RC1 baseline after Draft Mode restore validation.
   QA trigger only: run fixed cross-browser proxy after local WebKit Meta fallback filtering. */
(function(){
  if(window.PPCRouteClassCleanup)return;
  const routeClasses=['competitiveMetaPage','streamerWorkspacePage','rankedStreamControlCenter'];
  function clearRouteClasses(){
    const app=document.getElementById('app');
    if(!app)return;
    app.classList.remove(...routeClasses);
    delete app.dataset.streamerWorkspace;
  }
  const baseRender=window.render;
  if(typeof baseRender==='function'){
    window.render=function(){
      clearRouteClasses();
      return baseRender.apply(this,arguments);
    };
  }
  window.PPCRouteClassCleanup={version:'8.65.0-rc1',clear:clearRouteClasses};
})();
