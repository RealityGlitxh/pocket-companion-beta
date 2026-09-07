/* PocketNexus V8.64.2 — global player search integration */
(function(){
  if(window.PPCGlobalPlayerSearch)return;

  const originalOpen=window.openGlobalSearch;
  const originalRender=window.globalSearchRender;
  let requestToken=0;

  function escText(v){
    try{return typeof esc==='function'?esc(String(v??'')):String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]))}catch{return String(v??'')}
  }

  function playerResultHtml(r){
    const name=r.display_name||r.username||'Pocket Player';
    const user=r.username?`@${r.username}`:'Public player';
    const team=r.team_tag?` • [${r.team_tag}] ${r.team_name||''}`:'';
    const rank=r.current_rank||'Rank not shared';
    const rp=Number.isFinite(Number(r.current_rp))?` • ${Number(r.current_rp)} RP`:'';
    const initial=String(name).trim().charAt(0).toUpperCase()||'P';
    return `<button class="globalSearchResult globalPlayerSearchResult" type="button" onclick="PPCGlobalPlayerSearch.openPlayer('${escText(r.public_id)}')"><span class="globalSearchResultIcon globalPlayerSearchAvatar">${escText(initial)}</span><span class="globalSearchResultText"><strong>${escText(name)}</strong><small>${escText(user+team+' • '+rank+rp)}</small></span><span class="globalSearchCategory">Player</span></button>`;
  }

  async function appendPlayers(){
    const input=document.getElementById('globalSearchInput');
    const root=document.getElementById('globalSearchResults');
    if(!input||!root)return;
    const q=String(input.value||'').trim();
    const token=++requestToken;
    root.querySelector('.globalPlayerSearchSection')?.remove();
    if(q.length<2)return;

    const loading=document.createElement('div');
    loading.className='globalPlayerSearchSection';
    loading.innerHTML='<div class="globalSearchSectionLabel">Players</div><div class="globalPlayerSearchStatus">Searching public profiles…</div>';
    root.appendChild(loading);

    try{
      if(typeof ensurePublicClient!=='function')throw new Error('Public profile service unavailable');
      const c=await ensurePublicClient();
      if(!c)throw new Error('Public profile service unavailable');
      const {data,error}=await c.rpc('search_public_profiles',{p_query:q,p_limit:8});
      if(error)throw error;
      if(token!==requestToken||document.getElementById('globalSearchInput')?.value?.trim()!==q)return;
      const rows=Array.isArray(data)?data:[];
      const section=root.querySelector('.globalPlayerSearchSection');
      if(!section)return;
      if(rows.length){
        root.querySelector('.globalSearchEmpty')?.remove();
        section.innerHTML=`<div class="globalSearchSectionLabel">Players</div>${rows.map(playerResultHtml).join('')}`;
      }else{
        section.innerHTML='<div class="globalSearchSectionLabel">Players</div><div class="globalPlayerSearchStatus">No public players matched this search.</div>';
      }
    }catch(e){
      if(token!==requestToken)return;
      const section=root.querySelector('.globalPlayerSearchSection');
      if(section)section.innerHTML='<div class="globalSearchSectionLabel">Players</div><div class="globalPlayerSearchStatus">Player search is temporarily unavailable.</div>';
    }
  }

  if(typeof originalOpen==='function'){
    window.openGlobalSearch=function(prefill=''){
      originalOpen(prefill);
      const hint=document.querySelector('.globalSearchHint');
      if(hint)hint.textContent='Pages · tools · decks · cards · archetypes · matchups · sessions · public players';
      appendPlayers();
    };
  }

  if(typeof originalRender==='function'){
    window.globalSearchRender=function(){
      originalRender();
      appendPlayers();
    };
  }

  if(typeof window.profileSearchPanel==='function'){
    window.profileSearchPanel=function(){return ''};
  }

  window.PPCGlobalPlayerSearch={
    version:'8.64.2',
    openPlayer(publicId){
      if(!publicId)return;
      try{globalSearchSaveRecent?.(document.getElementById('globalSearchInput')?.value||'Player');}catch{}
      try{closeGlobalSearch?.();}catch{}
      if(typeof openPublicProfileByPublicId==='function')openPublicProfileByPublicId(publicId);
    }
  };
})();
