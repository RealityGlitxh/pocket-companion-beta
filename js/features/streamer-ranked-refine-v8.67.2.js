/* PocketNexus V8.67.5 — Ranked Stream Control Center
   UI-only refinement layered on the existing Streamer renderer/workspace split.
   Existing session, match, RP, OBS, persistence and workspace handlers are reused. */
(function(){
  'use strict';
  if(window.PPCStreamerRankedRefine)return;

  function safe(fn,fallback=null){try{return fn()}catch{return fallback}}
  function section(app,type){return app.querySelector(`[data-streamer-section="${type}"]`)}
  function ensureStyles(){
    if(document.querySelector('link[data-streamer-ranked-refine]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='css/streamer-ranked-refine-v8.67.2.css?v=867505';
    link.dataset.streamerRankedRefine='true';
    document.head.appendChild(link);
  }

  function statusHero(app){
    const intro=app.querySelector('.streamerWorkspaceIntro');
    if(!intro)return;
    intro.classList.add('rankedControlHero');
    let tray=intro.querySelector('.rankedStatusTray');
    if(!tray){tray=document.createElement('div');tray.className='rankedStatusTray';intro.appendChild(tray)}
    const active=safe(()=>activeStreamerSession(),null);
    const rank=safe(()=>currentRankObj(),{})||{};
    tray.innerHTML=`
      <span class="rankedStatusChip ${active?'live':''}"><small>SESSION</small><strong>${active?'LIVE':'INACTIVE'}</strong></span>
      <span class="rankedStatusChip"><small>RANK</small><strong>${esc?.(rank.tier||'Beginner 1')||rank.tier||'Beginner 1'}</strong></span>
      <span class="rankedStatusChip"><small>RP</small><strong>${Number(rank.points||0)}</strong></span>`;
  }

  function buildPrimaryGrid(app){
    let grid=app.querySelector('.rankedControlGrid');
    if(!grid){grid=document.createElement('div');grid.className='rankedControlGrid'}
    const live=section(app,'live-session'),quick=section(app,'quick-match'),rank=section(app,'current-rank'),perf=section(app,'session-performance');
    if(!live||!quick||!rank||!perf)return;
    live.classList.add('rankedLiveCard');quick.classList.add('rankedQuickCard');rank.classList.add('rankedRankCard');perf.classList.add('rankedPerformanceCard');
    const intro=app.querySelector('.streamerWorkspaceIntro');
    if(!grid.isConnected)intro?.after(grid);
    [quick,live,rank,perf].forEach(p=>grid.appendChild(p));
  }

  function rankVisual(app){
    const panel=section(app,'current-rank');if(!panel)return;
    let visual=panel.querySelector('.rankedRankVisual');
    const rank=safe(()=>currentRankObj(),{})||{};
    const progress=safe(()=>rankProgressFromPoints?.(Number(rank.points||0)),null);
    if(!visual){visual=document.createElement('div');visual.className='rankedRankVisual';const h=panel.querySelector('h2,h3');h?.insertAdjacentElement('afterend',visual)}
    const next=progress?.nextTier||'';
    const pct=next?Math.max(0,Math.min(100,Number(progress?.pct??progress?.progressPct??0))):100;
    const remaining=Number(progress?.toNext??0);
    visual.innerHTML=`<div class="rankedRankHeadline"><strong>${esc?.(rank.tier||'Beginner 1')||rank.tier||'Beginner 1'}</strong><span>${Number(rank.points||0)} RP</span></div>
      <div class="rankedRankProgress"><i style="width:${Number.isFinite(pct)?pct:0}%"></i></div>
      <small>${next?`${remaining} RP to ${esc?.(next)||next}`:'Master Ball reached'}</small>`;
  }

  function performanceEmpty(app){
    const panel=section(app,'session-performance');if(!panel)return;
    if(panel.querySelector('.rankedPerformanceMetrics'))return;
    const active=safe(()=>activeStreamerSession(),null),ss=safe(()=>streamerSessionStats(),null);
    if(active&&ss)return;
    const text=(panel.textContent||'').toLowerCase();
    if(!text.includes('start a session'))return;
    const metrics=document.createElement('div');metrics.className='rankedPerformanceMetrics';
    metrics.innerHTML='<div><strong>0</strong><small>Games</small></div><div><strong>0-0</strong><small>Record</small></div><div><strong>—</strong><small>Win Rate</small></div><div><strong>0</strong><small>RP Change</small></div>';
    const p=panel.querySelector('p');p?.before(metrics);
  }

  function buildSecondaryGrid(app){
    let grid=app.querySelector('.rankedSecondaryGrid');
    if(!grid){grid=document.createElement('div');grid.className='rankedSecondaryGrid'}
    const recent=section(app,'recent-matches');
    if(!recent)return;
    recent.classList.add('rankedRecentCard');
    const primary=app.querySelector('.rankedControlGrid');
    if(!grid.isConnected)primary?.after(grid);
    grid.append(recent);
  }

  function buildOverlayStudio(app){
    const obs=section(app,'obs'),settings=section(app,'overlay-settings');
    if(!obs||!settings)return;
    obs.classList.add('rankedObsCard');
    settings.classList.add('rankedOverlaySettingsCard');

    let studio=app.querySelector('.rankedOverlayStudio');
    if(!studio){
      studio=document.createElement('section');
      studio.className='rankedOverlayStudio';
      studio.innerHTML='<div class="rankedOverlayStudioHeader"><div><span>LIVE OVERLAY EDITOR</span><h2>OBS Preview & Settings</h2><p>Change your overlay and see the result immediately — no workspace swapping required.</p></div><span class="rankedLiveEditBadge"><i></i>LIVE PREVIEW</span></div><div class="rankedOverlayStudioGrid"></div>';
    }
    const secondary=app.querySelector('.rankedSecondaryGrid');
    if(!studio.isConnected)secondary?.after(studio);
    studio.querySelector('.rankedOverlayStudioGrid')?.append(obs,settings);

    settings.classList.remove('rankedCollapsible');
    settings.dataset.rankedCollapsible='0';
    settings.querySelectorAll('.rankedCollapseToggle').forEach(x=>x.remove());
    const oldBody=settings.querySelector('.rankedCollapsibleBody');
    if(oldBody){
      oldBody.hidden=false;
      while(oldBody.firstChild)settings.appendChild(oldBody.firstChild);
      oldBody.remove();
    }
    if(!settings.querySelector('.rankedLivePreviewHint')){
      const hint=document.createElement('div');
      hint.className='rankedLivePreviewHint';
      hint.innerHTML='<span class="rankedHintDot"></span><div><strong>Live editing enabled</strong><small>Layout, theme, recent matches and visibility toggles update the preview instantly.</small></div>';
      const head=settings.querySelector('.between')||settings.querySelector('h2,h3');
      head?.insertAdjacentElement('afterend',hint);
    }

    const preview=obs.querySelector('#streamPreview,.streamPreview');
    if(preview)preview.classList.add('rankedObsPreview');
  }

  function makeCollapsible(panel,title){
    if(!panel||panel.dataset.rankedCollapsible==='1')return;
    panel.dataset.rankedCollapsible='1';
    panel.classList.add('rankedCollapsible');
    const children=[...panel.children];
    const head=children.find(el=>el.classList?.contains('between'))||children.find(el=>/^H[1-3]$/.test(el.tagName));
    const body=document.createElement('div');body.className='rankedCollapsibleBody';body.hidden=true;
    children.filter(el=>el!==head).forEach(el=>body.appendChild(el));
    const toggle=document.createElement('button');toggle.type='button';toggle.className='secondary rankedCollapseToggle';toggle.textContent='Configure';toggle.setAttribute('aria-expanded','false');
    toggle.onclick=()=>{const open=body.hidden;body.hidden=!open;toggle.setAttribute('aria-expanded',open?'true':'false');toggle.textContent=open?'Hide':'Configure'};
    if(head?.classList?.contains('between'))head.appendChild(toggle);else{
      const row=document.createElement('div');row.className='between rankedCollapseHeader';
      if(head)row.appendChild(head);else row.innerHTML=`<h2>${title}</h2>`;
      row.appendChild(toggle);panel.prepend(row);
    }
    panel.appendChild(body);
  }

  function apply(){
    ensureStyles();
    const app=document.getElementById('app');
    let page='',mode='';try{page=state?.page||'';mode=state?.streamer?.overlayMode||'ranked'}catch{}
    if(page!=='streamer'||mode!=='ranked'||!app?.classList.contains('streamerWorkspacePage'))return;
    app.classList.add('rankedStreamControlCenter');
    statusHero(app);
    buildPrimaryGrid(app);
    rankVisual(app);
    performanceEmpty(app);
    buildSecondaryGrid(app);
    buildOverlayStudio(app);
    makeCollapsible(section(app,'diagnostics'),'Advanced / Diagnostics');
    const diag=section(app,'diagnostics'),studio=app.querySelector('.rankedOverlayStudio');
    if(studio&&diag)studio.after(diag);
    window.PPCAccessibilityRepair?.repair?.();
  }

  function install(){
    if(typeof window.streamerPage!=='function'||window.streamerPage.__rankedControlCenter)return false;
    const base=window.streamerPage;
    function wrapped(){const out=base.apply(this,arguments);requestAnimationFrame(()=>requestAnimationFrame(apply));return out}
    wrapped.__rankedControlCenter=true;wrapped.__base=base;window.streamerPage=wrapped;requestAnimationFrame(()=>requestAnimationFrame(apply));return true;
  }

  ensureStyles();
  if(!install()){let tries=0;const t=setInterval(()=>{if(install()||++tries>200)clearInterval(t)},50)}
  window.PPCStreamerRankedRefine={version:'8.67.5',apply,install};
})();
