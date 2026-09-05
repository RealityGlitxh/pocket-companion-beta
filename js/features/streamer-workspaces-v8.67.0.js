/* PocketNexus V8.67.1 — Streamer workspace split
   UI-only refinement around the existing Streamer renderer. Existing match, session,
   RP, OBS, tournament journey, sharing and overlay handlers remain untouched. */
(function(){
  if(window.PPCStreamerWorkspaces)return;

  const MODE_COPY={
    ranked:{title:'Ranked',eyebrow:'RANKED STREAM',desc:'Rank grind tools, live match logging, RP, sessions and your ranked OBS overlay.'},
    tournament:{title:'Tournament',eyebrow:'TOURNAMENT PLAY',desc:'Event setup, tournament journey controls, private deck sharing and tournament OBS tools.'},
    caster:{title:'Tournament Caster',eyebrow:'CASTER DESK',desc:'Player names, scores, caster scenes and broadcast-focused OBS controls.'}
  };

  function ensureStyles(){
    if(document.querySelector('link[data-streamer-workspaces]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='css/streamer-workspaces-v8.67.0.css?v=867102';
    link.dataset.streamerWorkspaces='true';
    document.head.appendChild(link);
  }

  function workspacePanels(app){
    const all=[...app.querySelectorAll('.panel')];
    return all.filter(panel=>!panel.closest('.rankedControlGrid,.rankedSecondaryGrid,.rankedOverlayStudio,.rankedCollapsibleBody'));
  }
  function panelTitle(panel){return (panel.querySelector('h1,h2,h3')?.textContent||'').trim();}
  function hasText(panel,needle){return (panel.textContent||'').toLowerCase().includes(needle.toLowerCase());}

  function classify(panel){
    if(panel.id==='streamMatchupPanel')return 'matchup-panel';
    const t=(panelTitle(panel)+' '+(panel.textContent||'')).toLowerCase();
    if(t.includes('overlay mode'))return 'mode';
    if(t.includes('live session'))return 'live-session';
    if(t.includes('quick match'))return 'quick-match';
    if(t.includes('session performance'))return 'session-performance';
    if(t.includes('current rank'))return 'current-rank';
    if(t.includes('recent matches'))return 'recent-matches';
    if(t.includes('competitive creator expansion'))return 'creator-expansion';
    if(t.includes('scene rotation'))return 'scene-rotation';
    if(t.includes('overlay settings'))return 'overlay-settings';
    if(t.includes('streamer diagnostics'))return 'diagnostics';
    if(/^obs\b/.test(t.trim())||t.includes('copy obs source')||t.includes('waiting for overlay'))return 'obs';
    return 'shared';
  }

  function allowed(mode,type){
    if(type==='mode'||type==='shared'||type==='obs'||type==='overlay-settings'||type==='diagnostics')return true;
    if(mode==='ranked')return ['live-session','quick-match','session-performance','current-rank','recent-matches','matchup-panel'].includes(type);
    if(mode==='tournament')return ['creator-expansion','scene-rotation'].includes(type);
    if(mode==='caster')return ['scene-rotation'].includes(type);
    return true;
  }

  function workspaceTabs(mode){
    const wrap=document.createElement('div');
    wrap.className='streamerWorkspaceTabs';
    wrap.setAttribute('role','tablist');
    [
      ['ranked','Ranked','Track RP, sessions and ranked matches','▥'],
      ['tournament','Tournament','Manage your tournament run','♛'],
      ['caster','Tournament Caster','Control scores and broadcast scenes','◉']
    ].forEach(([key,label,sub,icon])=>{
      const b=document.createElement('button');
      b.type='button';
      b.className='streamerWorkspaceTab'+(mode===key?' active':'');
      b.setAttribute('role','tab');
      b.setAttribute('aria-selected',mode===key?'true':'false');
      b.setAttribute('aria-label',label+' workspace');
      b.innerHTML=`<span class="streamerWorkspaceIcon" aria-hidden="true">${icon}</span><span class="streamerWorkspaceCopy"><strong>${label}</strong><small>${sub}</small></span>`;
      b.onclick=()=>window.streamerMode?.(key);
      wrap.appendChild(b);
    });
    return wrap;
  }

  function workspaceIntro(mode){
    const c=MODE_COPY[mode]||MODE_COPY.ranked;
    const box=document.createElement('section');
    box.className='streamerWorkspaceIntro';
    box.innerHTML=`<div><span class="streamerWorkspaceEyebrow">${c.eyebrow}</span><h2>${c.title} workspace</h2><p>${c.desc}</p></div>`;
    return box;
  }

  function refineModePanel(panel,mode){
    if(!panel)return;
    panel.classList.add('streamerModeSetup');
    const segmented=panel.querySelector('.segmented');
    if(segmented)segmented.classList.add('streamerLegacyModeSwitch');
    const eyebrow=[...panel.querySelectorAll('span')].find(x=>(x.textContent||'').trim().toUpperCase()==='OVERLAY MODE');
    if(eyebrow)eyebrow.textContent=mode==='ranked'?'RANKED OVERLAY':mode==='tournament'?'TOURNAMENT OVERLAY':'CASTER OVERLAY';
    const heading=panel.querySelector('h2');
    if(heading)heading.textContent=mode==='ranked'?'Ranked Overlay':mode==='tournament'?'Tournament Setup':'Tournament Caster Setup';
    if(mode==='ranked' && !hasText(panel,'event') && !hasText(panel,'player a'))panel.classList.add('streamerModeSetupCompact');
  }

  function apply(){
    ensureStyles();
    let page=''; try{page=state?.page||''}catch{}
    if(page!=='streamer')return;
    const app=document.getElementById('app');
    if(!app||!app.querySelector('h1'))return;
    const mode=(state?.streamer?.overlayMode||'ranked');
    app.classList.add('streamerWorkspacePage');
    app.dataset.streamerWorkspace=mode;

    const first=app.firstElementChild;
    if(first?.classList?.contains('between')){
      first.classList.add('streamerWorkspaceHeader');
      const h1=first.querySelector('h1'); if(h1)h1.textContent='Streamer Control Center';
      const p=first.querySelector('p'); if(p)p.textContent='Three focused workspaces for ranked streams, tournament play and tournament casting.';
    }

    app.querySelector('.streamerWorkspaceTabs')?.remove();
    app.querySelector('.streamerWorkspaceIntro')?.remove();
    const anchor=first||app.firstElementChild;
    anchor?.after(workspaceTabs(mode));
    app.querySelector('.streamerWorkspaceTabs')?.after(workspaceIntro(mode));

    const panels=workspacePanels(app);
    for(const panel of panels){
      const type=classify(panel);
      panel.dataset.streamerSection=type;
      panel.hidden=!allowed(mode,type);
      panel.classList.toggle('streamerWorkspaceShared',['shared','obs','overlay-settings','diagnostics'].includes(type));
      if(type==='mode')refineModePanel(panel,mode);
    }

    const modePanel=panels.find(p=>p.dataset.streamerSection==='mode');
    if(modePanel && mode==='ranked')modePanel.classList.add('streamerRankedModePanel');
    window.PPCAccessibilityRepair?.repair?.();
  }

  function install(){
    if(typeof window.streamerPage!=='function'||window.streamerPage.__workspaceSplit)return false;
    const base=window.streamerPage;
    function wrapped(){const out=base.apply(this,arguments);requestAnimationFrame(apply);return out;}
    wrapped.__workspaceSplit=true;
    wrapped.__base=base;
    window.streamerPage=wrapped;
    requestAnimationFrame(apply);
    return true;
  }

  ensureStyles();
  if(!install()){
    let tries=0;
    const timer=setInterval(()=>{if(install()||++tries>200)clearInterval(timer)},50);
  }
  window.PPCStreamerWorkspaces={version:'8.67.1',apply,install};
})();