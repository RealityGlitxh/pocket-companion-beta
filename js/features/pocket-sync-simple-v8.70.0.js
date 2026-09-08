/* PocketNexus V8.70.0 — player-first Pocket Sync surface.
   Keeps the V8.59 sync/adapter/conflict infrastructure intact and moves it behind Advanced Tools. */
(function(){
  if(window.PPCPocketSyncSimple)return;
  const advancedPage=window.pocketSyncPage;
  if(typeof advancedPage!=='function')return;

  function signedIn(){try{return !!(window.getPPCCloudSession?.()||window.cloudSession)?.user}catch{return false}}
  function recentFor(domain){
    const runs=window.pocketSyncState?.runs||[];
    return runs.find(r=>Number(r?.imported_counts?.[domain]||0)>0)||null;
  }
  function statusRow(icon,title,description,domain,page){
    const run=recentFor(domain);
    const status=run?'Synced':'Ready';
    const detail=run&&run.started_at?`Last updated ${new Date(run.started_at).toLocaleString()}`:description;
    return `<article class="panel" style="padding:16px;display:flex;gap:14px;align-items:center;justify-content:space-between"><div style="display:flex;gap:12px;align-items:center;min-width:0"><span aria-hidden="true" style="font-size:1.35rem">${icon}</span><div><strong>${title}</strong><div class="muted" style="margin-top:3px;font-size:.9rem">${detail}</div></div></div><div class="row" style="flex:0 0 auto"><span class="badge ok">${status}</span><button class="secondary" onclick="goPage('${page}')">Open</button></div></article>`;
  }

  function simplePage(initial=true){
    const root=document.getElementById('app');if(!root)return;
    const account=signedIn();
    root.innerHTML=`<section class="pocketSyncPage" style="max-width:1080px;margin:0 auto">
      <section class="panel" style="padding:clamp(20px,4vw,34px);margin-bottom:14px">
        <span class="eyebrow">POCKET SYNC</span>
        <div class="between" style="gap:18px;align-items:flex-start;flex-wrap:wrap"><div style="max-width:720px"><h1 style="margin:.35rem 0 .55rem">Keep your PocketNexus data together</h1><p class="muted" style="font-size:1rem;margin:0">Collection, Battle History and Rank History stay in one place. No technical setup is required.</p></div><span class="badge ${account?'ok':'muted'}">${account?'SIGNED IN':'LOCAL MODE'}</span></div>
        <div class="row wrap" style="margin-top:18px"><button onclick="refreshPocketSync()">Refresh Sync Status</button>${account?'':'<button class="secondary" onclick="goPage(\'account\')">Sign in for cloud features</button>'}<button class="secondary" onclick="goPage('account')">Backup & Restore</button></div>
      </section>

      <section class="panel" style="padding:18px;margin-bottom:14px"><div class="between" style="gap:12px;flex-wrap:wrap"><div><span class="eyebrow">YOUR DATA</span><h2 style="margin:.3rem 0 0">Sync status</h2></div><span class="pill">${account?'Cloud account connected':'Saved on this device'}</span></div><div style="display:grid;gap:10px;margin-top:14px">
        ${statusRow('◇','Collection','Ready in PocketNexus','collection','collection')}
        ${statusRow('◉','Battle History','Ready in Battle Tracker','battle_history','matches')}
        ${statusRow('↗','Rank History','Ready in Rank Intelligence','rank_history','rank')}
      </div></section>

      <section class="panel" style="padding:18px;margin-bottom:14px"><div class="between" style="gap:14px;align-items:center;flex-wrap:wrap"><div><span class="eyebrow">POKÉMON TCG POCKET</span><h2 style="margin:.3rem 0 .35rem">Automatic game import</h2><p class="muted" style="margin:0;max-width:720px">Not available yet. PocketNexus will only add this when a legitimate, read-only connection can be verified. We will not ask for your Nintendo/Pokémon password, browser cookies, or reusable game-session credentials.</p></div><span class="badge warn">COMING LATER</span></div></section>

      <details class="panel" style="padding:16px"><summary style="cursor:pointer;font-weight:800">Advanced / Developer Tools</summary><p class="muted" style="margin:10px 0 12px">Adapter testing, import diagnostics, conflict review, scheduling and audit tools are intended for development and troubleshooting.</p><button class="secondary" onclick="PPCPocketSyncSimple.openAdvanced()">Open Advanced Tools</button></details>
    </section>`;
    if(initial&&!window.pocketSyncState?.loaded&&!window.pocketSyncState?.loading){window.loadPocketSyncState?.().then(()=>{try{if(state.page==='sync')simplePage(false)}catch{}})}
  }

  window.PPCPocketSyncSimple={openAdvanced(){advancedPage(false)},advancedPage,simplePage};
  window.pocketSyncPage=simplePage;
})();