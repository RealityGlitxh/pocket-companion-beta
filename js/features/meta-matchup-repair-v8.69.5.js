/* PocketNexus V8.69.5 — Matchup Matrix cache-safe repair
   Keeps Meta window/tab changes network-free. Only the explicit Refresh action fetches live data. */
(function(){
'use strict';

function escLocal(v){
  if(typeof window.esc==='function')return window.esc(v);
  return String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
}
function fmt(v){
  if(typeof window.metaFmt==='function')return window.metaFmt(v);
  const n=Number(v);return Number.isFinite(n)?n.toLocaleString():'—';
}
function pct(v){
  if(typeof window.metaPct==='function')return window.metaPct(v);
  const n=Number(v);return Number.isFinite(n)?`${n.toFixed(1)}%`:'—';
}
function windowLabel(w){
  const n=Number(w||168);
  return n===24?'24H':n===168?'7D':n===336?'14D':'30D';
}
function cachedRowsForWindow(w){
  try{
    const row=JSON.parse(localStorage.getItem(`ppc_meta_live_${Number(w||168)}`)||'null');
    return Array.isArray(row?.payload?.matchups)?row.payload.matchups:[];
  }catch{return []}
}
function currentRows(){
  const service=window.PPCMetaService;
  const w=Number(window.state?.metaIntel?.windowHours||service?.getWindow?.()||168);
  let rows=[];
  try{rows=service?.getMatchups?.()||[]}catch{}
  // Defensive recovery: if the service is temporarily sitting on bundled fallback
  // but this exact window already has a successful local cache, use that cache.
  if(!rows.length)rows=cachedRowsForWindow(w);
  return {rows,w,status:service?.getStatus?.()||{source:'fallback',loading:false,error:''}};
}

window.metaMatchupPanel=function(){
  const {rows,w,status}=currentRows();
  const label=windowLabel(w);
  if(status.loading&&!rows.length){
    return `<div class="panel metaMatchupEmpty"><div class="between"><div><h2>Matchup Matrix</h2><p class="muted">Loading ${label} matchup data…</p></div><span class="badge">LOADING</span></div></div>`;
  }
  if(!rows.length){
    const failed=Boolean(status.error);
    return `<div class="panel metaMatchupEmpty">
      <div class="between"><div><h2>Matchup Matrix</h2><p class="muted">${failed?`The last Meta refresh failed, so ${label} matchup rows are not available in cache yet.`:`${label} matchup data has not been loaded into this browser cache yet.`}</p></div><span class="badge">${failed?'REFRESH FAILED':'NOT LOADED'}</span></div>
      <div class="metaMatchupEmptyActions">
        <p class="muted tiny">Window and tab changes remain cache-only for stability. Use Refresh when you want PocketNexus to load the current ${label} matchup snapshot.</p>
        <button onclick="refreshMetaLive()">${failed?'Retry Meta Refresh':'Load Matchup Data'}</button>
      </div>
      ${failed?`<div class="notice">${escLocal(status.error)}</div>`:''}
    </div>`;
  }
  return `<div class="panel metaMatchupPanelFixed">
    <div class="between"><div><h2>Matchup Matrix</h2><p class="muted">Top mapped archetype matchups for ${label}. Draws are shown separately.</p></div><div class="row"><span class="badge">${rows.length} matchups</span><span class="badge">${escLocal(String(status.source||'cached').toUpperCase())}</span></div></div>
    <div class="metaMatchupScroll"><table class="metaLiveTable"><thead><tr><th>Archetype A</th><th>Archetype B</th><th>Record</th><th>A Win %</th><th>Matches</th><th>Confidence</th></tr></thead><tbody>${rows.slice(0,80).map(m=>`<tr><td>${escLocal(m.archetypeA||'Unknown')}</td><td>${escLocal(m.archetypeB||'Unknown')}</td><td>${fmt(m.aWins)}-${fmt(m.bWins)}-${fmt(m.draws)}</td><td>${m.aWinRate==null?'—':pct(m.aWinRate)}</td><td>${fmt(m.matches)}</td><td>${escLocal(m.confidence||'Limited')}</td></tr>`).join('')}</tbody></table></div>
  </div>`;
};

const style=document.createElement('style');
style.id='meta-matchup-repair-v8695';
style.textContent=`
.metaMatchupEmpty{display:grid;gap:14px}.metaMatchupEmptyActions{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-top:4px}.metaMatchupEmptyActions p{margin:0;max-width:820px}.metaMatchupPanelFixed{display:grid;gap:14px}.metaMatchupPanelFixed .metaMatchupScroll{overflow:auto;max-height:min(68vh,760px)}.metaMatchupPanelFixed .metaLiveTable{min-width:820px;width:100%}.metaMatchupPanelFixed .metaLiveTable th{position:sticky;top:0;z-index:1;background:var(--panel,#111923)}
@media(max-width:760px){.metaMatchupEmptyActions{align-items:stretch;display:grid}.metaMatchupEmptyActions button{width:100%}}
`;
document.head.appendChild(style);
})();
