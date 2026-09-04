/* PocketNexus v8.65.2 — Performance Pass 3B-2 Decks Refinement */
(function(){
 function safeDeckRows(){try{return filteredDecksByCollection()}catch(_){return (state.decks||[]).map(d=>({d}))}}
 function statusCounts(rows){
  let ready=0,building=0,favorites=0;
  for(const row of rows){const d=row.d||row;try{if(isDeckLegal(d))ready++;else building++}catch(_){building++}try{if(deckIsFavorite(d.id))favorites++}catch(_){}}
  return {ready,building,favorites};
 }
 function deckCard(d){
  const count=typeof deckCount==='function'?deckCount(d):0;
  const legal=typeof isDeckLegal==='function'?isDeckLegal(d):count===20;
  const c=typeof deckCollectionStatus==='function'?deckCollectionStatus(d):{pct:0,missing:0,collectionKnown:false};
  const x=typeof deckIntelStats==='function'?deckIntelStats(d):{record:'—',winRate:'—'};
  const fav=typeof deckIsFavorite==='function'?deckIsFavorite(d.id):false;
  const structure=typeof analyze==='function'?analyze(d):0;
  return `<article class="deck3bCard ${legal?'ready':'building'}" onclick="openDeck('${d.id}')">
    <div class="deck3bArt">${typeof ppcDeckArtFan==='function'?ppcDeckArtFan(d):''}<span class="deck3bState ${legal?'ready':'building'}">${legal?'READY':'BUILDING'}</span><button class="deckFavoriteBtn ${fav?'active':''}" aria-label="${fav?'Remove from favorites':'Add to favorites'}" onclick="event.stopPropagation();toggleDeckFavorite('${d.id}')">${fav?'★':'☆'}</button></div>
    <div class="deck3bBody">
      <div class="deck3bIdentity"><div><h3>${esc(d.name||'Untitled Deck')}</h3><p>${count}/20 cards${d.energy?` • ${esc(d.energy)}`:''}</p></div><span class="deck3bStructure">${structure}/100</span></div>
      <div class="deck3bMetrics"><div><b>${x.record||'—'}</b><span>Record</span></div><div><b>${x.winRate||'—'}</b><span>Win rate</span></div><div><b>${c.collectionKnown?`${c.pct}%`:'—'}</b><span>Owned</span></div></div>
      <div class="deck3bCollection ${c.collectionKnown?(c.missing?'needs':'ready'):'unknown'}"><span>${c.collectionKnown?(c.missing?`${c.missing} card${c.missing===1?'':'s'} missing`:'Collection ready'):'Collection not tracked'}</span><small>${legal?'Playable 20-card list':'Finish the list to make it battle-ready'}</small></div>
      <div class="deck3bActions"><button class="secondary" onclick="event.stopPropagation();renameDeckById('${d.id}')">Rename</button><button onclick="event.stopPropagation();openDeck('${d.id}')">Open Deck</button></div>
    </div>
  </article>`;
 }
 window.decks=function(){
  const rows=safeDeckRows(),q=String(state.deckPrefs?.query||''),all=state.decks||[],counts=statusCounts(all.map(d=>({d})));
  const filter=typeof deckBuildFilter!=='undefined'?deckBuildFilter:'all';
  const sort=typeof deckBuildSort!=='undefined'?deckBuildSort:'completion';
  const cardReady=window.cardLoadMode==='online'?`${Number(window.CARDS?.length||0).toLocaleString()} cards loaded`:'Card library ready';
  document.getElementById('app').innerHTML=`<div class="deck3bPage">
    <section class="deck3bHero">
      <div><span class="eyebrow">BUILD • 20-CARD FORMAT</span><h1>Your deck box</h1><p>Find the list you want to play, see whether it is complete, and jump straight into editing.</p></div>
      <div class="deck3bHeroActions"><button class="secondary" onclick="goPage('collection')">Collection</button><button onclick="newDeck()">＋ New Deck</button></div>
    </section>

    <section class="deck3bSummary" aria-label="Deck summary">
      <div><b>${all.length}</b><span>Saved decks</span></div><div><b>${counts.ready}</b><span>Ready to play</span></div><div><b>${counts.building}</b><span>Still building</span></div><div><b>${counts.favorites}</b><span>Favorites</span></div>
    </section>

    <section class="deck3bControls">
      <label class="deck3bSearch"><span>Find a deck</span><input type="search" value="${esc(q)}" placeholder="Search by deck name…" oninput="state.deckPrefs=state.deckPrefs||{};state.deckPrefs.query=this.value;safeStorageSet(STORE,JSON.stringify(state));decks()"></label>
      <div class="deck3bFilters"><span>Show</span><div>${[['all','All'],['favorites','★ Favorites'],['ready','Ready'],['almost','Almost'],['missing','Missing']].map(([k,n])=>`<button class="secondary ${filter===k?'active':''}" onclick="setDeckBuildFilter('${k}')">${n}</button>`).join('')}</div></div>
      <label class="deck3bSort"><span>Sort</span><select onchange="setDeckBuildSort(this.value)"><option value="completion" ${sort==='completion'?'selected':''}>Completion</option><option value="fewest" ${sort==='fewest'?'selected':''}>Fewest missing</option><option value="name" ${sort==='name'?'selected':''}>Name</option></select></label>
    </section>

    <div class="deck3bMeta"><span>${rows.length} shown of ${all.length}</span><span>${cardReady}</span></div>

    <section class="deck3bGrid">${rows.length?rows.map(({d})=>deckCard(d)).join(''):`<div class="deck3bEmpty"><span class="eyebrow">DECK BOX</span><h2>${all.length?'No decks match these filters.':'Build your first 20-card deck'}</h2><p>${all.length?'Try clearing the search or changing the current filter.':'Once you save a deck, it becomes available across Battle, Performance, Collection, and competitive tools.'}</p><div>${all.length?`<button class="secondary" onclick="state.deckPrefs.query='';setDeckBuildFilter('all')">Clear filters</button>`:`<button onclick="newDeck()">＋ New Deck</button>`}</div></div>`}</section>

    <details class="deck3bImport panel"><summary><div><span class="eyebrow">IMPORT</span><strong>Paste a 20-card deck list</strong><small>Add an existing list without rebuilding it card by card.</small></div><span>＋</span></summary><div class="deck3bImportBody"><textarea id="imp" placeholder="2 Card Name&#10;2 Trainer Name"></textarea><button onclick="importDeck()">Import to New Deck</button></div></details>
  </div>`;
 };
 window.PPCDecksRefinement={version:'8.65.2'};
})();
