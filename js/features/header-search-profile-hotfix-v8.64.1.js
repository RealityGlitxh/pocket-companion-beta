/* PocketNexus V8.64.1 — header utilities + public-player global search */
(function(){
  'use strict';
  const oldNav=window.nav;
  function utilityMarkup(){return `<details class="headerUtilityMenu"><summary aria-label="Open settings and utilities" title="Settings & utilities">⚙</summary><div class="headerUtilityDropdown"><button onclick="openGlobalSearch()"><span>⌕</span><div><strong>Search</strong><small>Pages, cards, decks, and players</small></div></button><button onclick="headerNavigate('sync')"><span>↻</span><div><strong>Pocket Sync</strong><small>Import and sync tools</small></div></button><button onclick="headerNavigate('account')"><span>◉</span><div><strong>Account & Cloud</strong><small>Sign-in, backup, and security</small></div></button><button onclick="headerNavigate('about')"><span>ⓘ</span><div><strong>About & Privacy</strong><small>Project and privacy information</small></div></button><button onclick="headerNavigate('more')"><span>⚙</span><div><strong>Settings</strong><small>Backup and advanced tools</small></div></button></div></details>`}
  window.nav=function(){
    oldNav?.();
    const user=document.getElementById('user'),util=document.getElementById('headerUtility');
    if(!user?.children.length){if(util)util.innerHTML='';return}
    if(util)util.innerHTML=utilityMarkup();
    const chip=user.querySelector('.userChip');
    if(chip){chip.classList.add('profileHeaderButton');chip.setAttribute('onclick',"headerNavigate('profile')");chip.title='Open Profiles';const text=chip.querySelector('.userChipText');if(text)text.textContent='Profiles'}
    document.querySelectorAll('.navCategoryItem').forEach(btn=>{const title=btn.querySelector('strong')?.textContent?.trim();if(['Search Everything','Pocket Sync','Account & Cloud','About & Privacy','Settings'].includes(title))btn.remove()});
  };
  let playerRows=[],playerQuery='',timer=0,requestSeq=0;
  const baseDynamic=window.globalSearchDynamicItems,baseInput=window.globalSearchInputChanged,baseIcon=window.globalSearchIcon,baseExecute=window.globalSearchExecute;
  function norm(q){return window.globalSearchNormalize?.(q)||String(q||'').toLowerCase().trim()}
  function playerItems(q){const n=norm(q);if(n.length<2||playerQuery!==n)return[];return playerRows.map(r=>({title:r.display_name||r.username||'Pocket Player',category:'Players',description:[r.username?'@'+r.username:'Public profile',r.team_tag?'['+r.team_tag+'] '+(r.team_name||''):'',r.current_rank||''].filter(Boolean).join(' • '),keywords:[r.display_name,r.username,r.team_tag,r.team_name,r.current_rank,'player profile user competitor'].filter(Boolean).join(' '),action:'publicPlayer',id:r.public_id}))}
  window.globalSearchDynamicItems=function(q){return [...(baseDynamic?.(q)||[]),...playerItems(q)]};
  window.globalSearchIcon=function(category){return category==='Players'?'◉':(baseIcon?.(category)||'•')};
  async function loadPlayers(q){const n=norm(q);if(n.length<2){playerRows=[];playerQuery='';window.globalSearchRender?.();return}const seq=++requestSeq;try{const client=typeof window.ensurePublicClient==='function'?await window.ensurePublicClient():(window.cloudClient||null);if(!client?.rpc)return;const {data,error}=await client.rpc('search_public_profiles',{p_query:q.trim(),p_limit:8});if(seq!==requestSeq)return;if(error)throw error;playerRows=Array.isArray(data)?data:[];playerQuery=n;if(document.getElementById('globalSearchInput'))window.globalSearchRender?.()}catch(e){if(seq===requestSeq){playerRows=[];playerQuery=n;console.warn('Global player search',e)}}}
  window.globalSearchInputChanged=function(){baseInput?.();const q=document.getElementById('globalSearchInput')?.value||'';clearTimeout(timer);timer=setTimeout(()=>loadPlayers(q),180)};
  window.globalSearchExecute=function(index){const input=document.getElementById('globalSearchInput'),q=input?.value||'',item=window.globalSearchResults?.(q)?.[Number(index)];if(item?.action==='publicPlayer'){window.globalSearchSaveRecent?.(q||item.title);window.closeGlobalSearch?.();if(typeof window.openPublicProfileByPublicId==='function')return window.openPublicProfileByPublicId(item.id);state.page='profile';window.save?.();window.render?.();setTimeout(()=>{const el=document.getElementById('profileSearchInput');if(el){el.value=item.title;window.searchPublicProfiles?.()}},100);return}return baseExecute?.(index)};
  const oldOpen=window.openGlobalSearch;
  window.openGlobalSearch=function(prefill=''){oldOpen?.(prefill);const panel=document.querySelector('#globalSearchOverlay .globalSearchPanel'),input=document.getElementById('globalSearchInput');if(panel)panel.setAttribute('aria-label','Search PocketNexus');if(input)input.placeholder='Search pages, cards, decks, or players…';const hint=panel?.querySelector('.globalSearchHint');if(hint)hint.textContent='Pages · tools · decks · cards · archetypes · players';if(String(prefill).trim().length>=2)loadPlayers(String(prefill))};
  document.addEventListener('click',e=>{const menu=document.querySelector('.headerUtilityMenu[open]');if(menu&&!e.target.closest('.headerUtilityMenu'))menu.removeAttribute('open')});
  try{window.nav()}catch(e){console.warn('Header refinement',e)}
})();
