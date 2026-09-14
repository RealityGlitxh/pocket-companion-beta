/* PocketNexus V8.74.1 Competitive Hub — lightweight UI layer over existing routes. */
(()=>{
 const VERSION='8.74.1', ROOT='pnCompetitiveHub';
 const tools=[
  ['meta','◆','Meta','meta'],['tournaments','♜','Tournaments','tournaments'],['battle','◉','Battle','matches'],
  ['decks','▣','Decks','decks'],['compare','⇆','Compare','optimizer'],['leaderboard','↗','Leaderboard','profile'],
  ['streamer','▤','Streamer','streamer'],['coach','✦','Coach','coach'],['profile','◉','Profile','profile']
 ];
 const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
 const signedIn=()=>!!(window.state?.user||window.cloudSession?.user);
 function route(page){close();if(typeof window.headerNavigate==='function')window.headerNavigate(page);else if(typeof window.goPage==='function')window.goPage(page)}
 function activeDeck(){
  const s=window.state||{}, decks=s.decks||s.savedDecks||[];
  const id=s.activeDeckId||s.selectedDeckId;
  return decks.find?.(d=>String(d.id)===String(id))||decks[0]||null;
 }
 function context(){return {route:window.state?.page||'',activeDeck:activeDeck(),streamerMode:window.PPCStreamerOBSRemote?.readState?.()?.activeMode||null};}
 function body(key){
  const c=context(), d=c.activeDeck;
  const open=(label,page)=>`<button class="pnHubAction" data-hub-route="${page}">${label}</button>`;
  if(key==='meta')return `<p>Scout the current field, archetypes, decklists, and verified matchup information.</p>${open('Open Meta Center','meta')}${open('Compare decks','optimizer')}${open('Ask Pocket Coach','coach')}`;
  if(key==='tournaments')return `<p>Open live and recent tournament information, standings, decklists, and Streamer tournament tools.</p>${open('Open Tournaments','tournaments')}${open('Connect in Streamer','streamer')}`;
  if(key==='battle')return `<p>Record a result with the existing Battle Tracker so statistics, rank, and session systems stay unified.</p>${open('Record Win / Loss','matches')}${open('View Performance','stats')}`;
  if(key==='decks')return `<div class="pnHubStatus"><span>Active deck</span><strong>${esc(d?.name||d?.title||'No deck selected')}</strong></div>${open('My Decks','decks')}${open('Deck Builder','decks')}${open('View Stats','stats')}`;
  if(key==='compare')return `<p>Compare your decks and competitive options without creating a second deck database.</p>${open('Open Comparison Tools','optimizer')}${open('Ask Coach about matchup','coach')}`;
  if(key==='leaderboard')return `<p>Jump into public player, ranked, tournament, and team competitive views.</p>${open('Player Search / Profiles','profile')}${open('Rank','rank')}${open('Team Ranked','teamwars')}`;
  if(key==='streamer')return `<div class="pnHubStatus"><span>Mode</span><strong>${esc(c.streamerMode||'Open Streamer to connect')}</strong></div><p>Control the existing OBS overlay, presets, tournament state, and Browser Source from the Stream Control Center.</p>${open('Open Stream Control Center','streamer')}`;
  if(key==='coach')return `<p>Pocket Coach opens with your current PocketNexus data. Competitive Hub context: <strong>${esc(c.route||'Home')}</strong>${d?` · <strong>${esc(d.name||d.title||'Selected deck')}</strong>`:''}.</p>${open('Open Pocket Coach','coach')}`;
  return `<p>View your public competitive identity, rank, achievements, sessions, and deck showcase.</p>${open('Open Profiles','profile')}<button class="pnHubAction" data-hub-search>Search players</button>`;
 }
 function open(key){
  const item=tools.find(x=>x[0]===key)||tools[0]; close();
  document.body.insertAdjacentHTML('beforeend',`<div class="pnHubBackdrop" id="${ROOT}"><section class="pnHubPanel" role="dialog" aria-modal="true" aria-labelledby="pnHubTitle"><div class="pnHubPanelHead"><div><span class="pnHubEyebrow">COMPETITIVE HUB</span><h2 id="pnHubTitle">${item[1]} ${esc(item[2])}</h2></div><button class="pnHubClose" type="button" aria-label="Close Competitive Hub">×</button></div><div class="pnHubPanelBody">${body(key)}</div></section></div>`);
  const root=document.getElementById(ROOT);root.addEventListener('click',e=>{if(e.target===root||e.target.closest('.pnHubClose'))close();const r=e.target.closest('[data-hub-route]');if(r)route(r.dataset.hubRoute);if(e.target.closest('[data-hub-search]')){close();window.openGlobalSearch?.();}});root.querySelector('.pnHubClose')?.focus();
 }
 function close(){document.getElementById(ROOT)?.remove()}
 function render(){
  const header=document.querySelector('.appHeader');
  if(!header||!signedIn()){document.getElementById('pnCompetitiveBar')?.remove();return}
  let bar=document.getElementById('pnCompetitiveBar');
  if(!bar){
    bar=document.createElement('div');
    bar.id='pnCompetitiveBar';
    bar.className='pnCompetitiveBar';
    bar.setAttribute('aria-label','Competitive Hub');
    header.appendChild(bar);
  }
  bar.innerHTML=`<span class="pnCompetitiveLabel">COMPETITIVE HUB</span><div class="pnCompetitiveTools">${tools.map(([k,i,l])=>`<button type="button" class="pnHubTool" data-hub-tool="${k}" title="${l}"><span>${i}</span><small>${l}</small></button>`).join('')}</div>`;
  bar.onclick=e=>{const b=e.target.closest('[data-hub-tool]');if(b)open(b.dataset.hubTool)};
 }
 document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
 const obs=new MutationObserver(()=>{if(!document.getElementById('pnCompetitiveBar'))render()});
 function boot(){render();const h=document.querySelector('.appHeaderBar');if(h)obs.observe(h,{childList:true,subtree:true})}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
 window.PocketNexusCompetitiveHub={version:VERSION,open,close,render,context};
})();