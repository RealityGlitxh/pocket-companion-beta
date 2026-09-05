/* PocketNexus V8.64.1 — route-level classic-script loader
   Performance Pass 2D: keep optional feature bundles out of the startup path.
   This preserves the existing global-script architecture and loads each bundle
   in dependency order the first time its page is opened. */
(function(){
  if(window.PPCFeatureLoader)return;

  const profileTeamScripts=[
    'js/app/profile_teamwars.js?v=864122',
    'js/features/teamwars-scouting-dropdown-v8.66.1.js?v=866301'
  ];
  const ROUTES={
    rank:{
      ready:()=>typeof window.rankBorderPage==='function',
      label:'Rank Intelligence',
      scripts:['js/app/rank_tools-v8.64.1.js?v=864124']
    },
    streamer:{
      ready:()=>typeof window.streamerPage==='function'&&!!window.PPCStreamerWorkspaces&&!!window.PPCStreamerRankedRefine,
      label:'Streamer Control Center',
      scripts:[
        'js/app/streamer_tools-v8.64.1.js?v=864125',
        'js/features/streamer-workspaces-v8.67.0.js?v=867102',
        'js/features/streamer-ranked-refine-v8.67.2.js?v=867505'
      ]
    },
    training:{
      ready:()=>typeof window.trainingPage==='function',
      label:'Brain Teasers',
      scripts:[
        'js/app/training.js?v=864121',
        'js/features/training-slide-hotfix-v8.64.1.js?v=864121',
        'js/features/training-cleanup-hotfix-v8.64.1.js?v=864121'
      ]
    },
    sync:{
      ready:()=>typeof window.pocketSyncPage==='function',
      label:'Pocket Sync',
      scripts:[
        'js/services/pocket-sync-adapter-service.js?v=864121',
        'js/services/pocket-sync-orchestrator-service.js?v=864121',
        'js/app/pocket_sync.js?v=864121'
      ]
    },
    profile:{
      ready:()=>typeof window.profilePage==='function',
      label:'Profiles',
      scripts:profileTeamScripts
    },
    teamwars:{
      ready:()=>typeof window.teamWarsPage==='function'&&!!window.PPCTeamWarsScoutingDropdown,
      label:'Team Wars',
      scripts:profileTeamScripts
    }
  };

  const inflight=new Map();
  const loadedScripts=new Set();
  const coreRender=window.render;

  function scriptAlreadyPresent(src){
    const wanted=src.split('?')[0];
    return [...document.scripts].some(s=>{
      try{return new URL(s.src,location.href).pathname.endsWith(wanted)}catch{return false}
    });
  }

  function loadScript(src){
    if(loadedScripts.has(src)||scriptAlreadyPresent(src)){
      loadedScripts.add(src);return Promise.resolve();
    }
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src=src;
      s.async=false;
      s.dataset.ppcLazy='true';
      s.onload=()=>{loadedScripts.add(src);resolve()};
      s.onerror=()=>reject(new Error(`Could not load ${src.split('?')[0]}`));
      document.head.appendChild(s);
    });
  }

  async function loadRoute(page){
    const cfg=ROUTES[page];
    if(!cfg||cfg.ready())return true;
    if(inflight.has(page))return inflight.get(page);
    const job=(async()=>{
      const started=performance.now?.()||Date.now();
      for(const src of cfg.scripts)await loadScript(src);
      if(!cfg.ready())throw new Error(`${cfg.label} loaded without registering its page.`);
      const elapsed=(performance.now?.()||Date.now())-started;
      window.PPCPerformance?.mark?.(`lazy:${page}`,{duration:Math.round(elapsed)});
      return true;
    })().finally(()=>inflight.delete(page));
    inflight.set(page,job);
    return job;
  }

  function loadingScreen(page){
    const cfg=ROUTES[page];
    const root=document.getElementById('app');
    if(!root||!cfg)return;
    root.innerHTML=`<div class="panel" style="max-width:760px;margin:30px auto"><span class="badge">LOADING</span><h1>${cfg.label}</h1><p class="muted">Loading this feature only when you need it…</p></div>`;
  }

  function loadError(page,error){
    console.error('PocketNexus lazy feature load failed',page,error);
    const cfg=ROUTES[page],root=document.getElementById('app');
    if(!root)return;
    root.innerHTML=`<div class="panel runtimeError" style="max-width:760px;margin:30px auto"><span class="badge">FEATURE LOAD</span><h1>${cfg?.label||'This feature'} could not load</h1><p class="muted">Your saved data was not changed. Check your connection and try again.</p><div class="dangerBox">${String(error?.message||error).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]))}</div><div class="row" style="margin-top:12px"><button onclick="render()">Retry</button><button class="secondary" onclick="state.page='dashboard';save();render()">Go Home</button></div></div>`;
  }

  function renderWithLazyRoute(){
    let page='';
    try{page=state?.page||''}catch{}
    const cfg=ROUTES[page];
    if(!cfg||cfg.ready())return coreRender.apply(this,arguments);
    loadingScreen(page);
    loadRoute(page).then(()=>{
      let current='';try{current=state?.page||''}catch{}
      if(current===page)coreRender();
    }).catch(e=>loadError(page,e));
  }

  window.PPCFeatureLoader={routes:ROUTES,loadRoute,isReady:page=>!ROUTES[page]||ROUTES[page].ready()};
  if(typeof coreRender==='function')window.render=renderWithLazyRoute;
})();
