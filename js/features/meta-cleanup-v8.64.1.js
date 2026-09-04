/* PocketNexus V8.64.1 — Meta Center cleanup */
(function(){
  'use strict';
  const originalMetaIntelPage=window.metaIntelPage;
  let metaWindowSwitching=false;

  function ensurePrefs(){
    state.metaIntel=state.metaIntel||{};
    if(!state.metaIntel.primaryView)state.metaIntel.primaryView='tiers';
  }
  window.setMetaPrimaryView=function(view){
    ensurePrefs();
    state.metaIntel.primaryView=view==='matchups'?'matchups':'tiers';
    save?.();
    render?.();
  };

  function setWindowUi(w,busy){
    document.querySelectorAll('.metaCompactWindows button').forEach(btn=>{
      const value=Number(btn.dataset.windowHours||0);
      btn.classList.toggle('active',value===Number(w));
      btn.disabled=!!busy;
    });
    const status=document.querySelector('.metaCompactLive');
    if(status&&busy)status.innerHTML='<i></i>LOADING';
  }

  // Window changes used to trigger an immediate full Meta render, then another fetch/render
  // cycle. On a large Meta payload that could lock the tab. Switch the data first and
  // render only once when the selected window is ready.
  window.setMetaWindow=async function(w){
    ensurePrefs();
    w=Number(w);
    if(![24,168,336,720].includes(w))w=168;
    if(metaWindowSwitching)return;
    const current=Number(state.metaIntel.windowHours||168);
    if(current===w && window.PPCMetaService?.getWindow?.()===w)return;

    metaWindowSwitching=true;
    state.metaIntel.windowHours=w;
    save?.();
    setWindowUi(w,true);

    try{
      if(window.PPCMetaService){
        PPCMetaService.setWindow(w);
        await PPCMetaService.fetchWindow(w,{force:false});
      }
    }catch(e){
      console.warn('Meta window switch failed',e);
    }finally{
      metaWindowSwitching=false;
      if(state.page==='meta')render?.();
    }
  };

  function topStatus(o,snap,st,w,ageText){
    return `<section class="metaCompactTop panel">
      <div class="metaCompactTitle"><div><span class="eyebrow">META</span><h1>Competitive Meta</h1><p class="muted">See what is defining the field, then open deeper data only when you need it.</p></div><button class="secondary" onclick="refreshMetaLive()">Refresh</button></div>
      <div class="metaCompactWindows">${[[24,'24H'],[168,'7D'],[336,'14D'],[720,'30D']].map(([v,n])=>`<button data-window-hours="${v}" class="secondary ${w===v?'active':''}" onclick="setMetaWindow(${v})">${n}</button>`).join('')}</div>
      <div class="metaCompactStatus">
        <span class="metaCompactLive"><i class="${st.source==='live'?'isLive':''}"></i>${esc(metaSourceBadge())}</span>
        <span>Updated ${esc(ageText)}</span>
        <span>${metaFmt(snap?.matches??o.matches)} matches</span>
        <span>${snap?.matchMappingRate==null?'Coverage unavailable':metaPct(snap.matchMappingRate)+' coverage'}</span>
      </div>
    </section>`;
  }

  function tierView(){
    const rows=metaFiltered();
    return `<section class="panel metaCompactMain">
      <div class="between"><div><h2>Tier List</h2><p class="muted">Current archetypes ordered by competitive rank. Open a deck for its full intelligence page.</p></div><span class="badge">${rows.length} decks</span></div>
      <div class="metaCompactSearch"><input type="search" placeholder="Search archetypes, Pokémon, or cards…" value="${esc(state.metaIntel.query||'')}" oninput="state.metaIntel.query=this.value;render()"></div>
      <div class="metaIntelGrid">${rows.map(metaIntelCard).join('')||'<div class="notice">No archetypes match your search.</div>'}</div>
    </section>`;
  }

  function moreData(o,wat){
    return `<details class="panel metaMoreData">
      <summary><div><strong>More Data</strong><small>Coverage, field signals, preparation, watchlist, filters, and comparisons</small></div><span>⌄</span></summary>
      <div class="metaMoreDataBody">
        ${metaPreparationPanel()}
        ${metaQualityPanel()}
        ${metaIntelligencePanel()}
        ${wat.length?`<div class="panel"><h2>My Meta Watchlist</h2><div class="metaIntelGrid">${wat.map(metaIntelCard).join('')}</div></div>`:''}
        <div class="panel metaAdvancedFilters"><div class="between"><div><h2>Advanced Filters</h2><p class="muted">Narrow the Tier List when you need a more specific read.</p></div></div><div class="metaIntelFilters"><select onchange="state.metaIntel.type=this.value;save();render()"><option value="">All Types</option>${[...new Set(MetaService.getArchetypes().map(a=>a.type).filter(Boolean))].sort().map(x=>`<option ${state.metaIntel.type===x?'selected':''}>${esc(x)}</option>`).join('')}</select><select onchange="state.metaIntel.confidence=this.value;save();render()"><option value="">All Confidence</option>${['High','Medium','Limited'].map(x=>`<option ${state.metaIntel.confidence===x?'selected':''}>${x}</option>`).join('')}</select><select onchange="state.metaIntel.hasSample=this.value;save();render()"><option value="">Any Sample</option><option value="yes" ${state.metaIntel.hasSample==='yes'?'selected':''}>Has 20-card sample</option></select><button class="secondary" onclick="state.metaIntel.type='';state.metaIntel.confidence='';state.metaIntel.hasSample='';save();render()">Clear Filters</button></div></div>
        ${metaComparePanel()}
      </div>
    </details>`;
  }

  function compactMetaIntelPage(){
    ensurePrefs();
    metaEnsureLive();
    if(state.metaIntel.detailId && typeof originalMetaIntelPage==='function')return originalMetaIntelPage();

    const o=MetaService.getMetaOverview();
    const wat=MetaService.getArchetypes().filter(a=>(state.metaIntel.watchlist||[]).includes(a.id));
    const p=metaLiveSnapshot(),snap=p?.snapshot;
    const st=window.PPCMetaService?PPCMetaService.getStatus():{source:'fallback',loading:false,error:''};
    const w=Number(state.metaIntel.windowHours||168);
    const generated=snap?.generatedAt?new Date(snap.generatedAt):null;
    const ageText=generated?`${Math.max(0,Math.round((Date.now()-generated.getTime())/60000))} min ago`:'Bundled snapshot';
    const view=state.metaIntel.primaryView==='matchups'?'matchups':'tiers';

    document.getElementById('app').innerHTML=`<div class="metaCompactPage">
      ${topStatus(o,snap,st,w,ageText)}
      ${st.error?`<div class="notice">Live Meta refresh failed. Showing ${esc(st.source)} data.</div>`:''}
      <div class="metaPrimaryTabs" role="tablist" aria-label="Meta view">
        <button class="secondary ${view==='tiers'?'active':''}" onclick="setMetaPrimaryView('tiers')">Tier List</button>
        <button class="secondary ${view==='matchups'?'active':''}" onclick="setMetaPrimaryView('matchups')">Matchup Matrix</button>
      </div>
      ${view==='tiers'?tierView():metaMatchupPanel()}
      ${moreData(o,wat)}
      <div class="bottomnote">Competitive data compiled from publicly available tournament information. PocketNexus is an independent third-party companion.</div>
    </div>`;
  }

  window.metaIntelPage=compactMetaIntelPage;
  window.metaPage=compactMetaIntelPage;

  const style=document.createElement('style');
  style.id='meta-cleanup-v8641';
  style.textContent=`
    .metaCompactPage{max-width:1500px;margin:0 auto;display:grid;gap:14px}
    .metaCompactTop{padding:18px 20px;display:grid;gap:14px}
    .metaCompactTitle{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.metaCompactTitle h1{margin:3px 0 6px;font-size:clamp(2rem,4vw,3.4rem)}.metaCompactTitle p{margin:0;max-width:700px}
    .metaCompactWindows{display:flex;gap:6px;flex-wrap:wrap}.metaCompactWindows button{min-height:36px;padding:7px 12px}.metaCompactWindows button:disabled{opacity:.7;cursor:wait}
    .metaCompactStatus{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.metaCompactStatus>span{padding:6px 9px;border:1px solid var(--line);border-radius:999px;background:#0c151f;color:var(--muted);font-size:.75rem}.metaCompactLive{color:var(--text)!important;font-weight:800}.metaCompactLive i{display:inline-block;width:7px;height:7px;border-radius:50%;background:#8a96a4;margin-right:6px}.metaCompactLive i.isLive{background:#52d18a;box-shadow:0 0 0 4px rgba(82,209,138,.1)}
    .metaPrimaryTabs{display:flex;gap:6px;padding:4px;border:1px solid var(--line);border-radius:14px;background:#0b121b;width:max-content}.metaPrimaryTabs button{min-width:150px;box-shadow:none}
    .metaCompactMain{display:grid;gap:14px}.metaCompactSearch{max-width:520px}.metaCompactSearch input{min-height:42px}
    .metaMoreData{padding:0;overflow:hidden}.metaMoreData>summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:16px 18px}.metaMoreData>summary::-webkit-details-marker{display:none}.metaMoreData>summary div{display:grid;gap:3px}.metaMoreData>summary strong{font-size:1rem}.metaMoreData>summary small{color:var(--muted)}.metaMoreData>summary>span{font-size:1.2rem;transition:transform .15s}.metaMoreData[open]>summary>span{transform:rotate(180deg)}.metaMoreDataBody{display:grid;gap:12px;padding:0 12px 12px}.metaMoreDataBody>.panel{margin:0}.metaAdvancedFilters .metaIntelFilters{margin-top:12px}
    @media(max-width:700px){.metaCompactTitle{display:grid}.metaCompactTitle>button{width:100%}.metaPrimaryTabs{width:100%}.metaPrimaryTabs button{flex:1;min-width:0}.metaCompactStatus{display:grid;grid-template-columns:1fr 1fr}.metaCompactStatus>span{text-align:center}.metaMoreDataBody{padding:0 8px 8px}}
  `;
  document.head.appendChild(style);
})();