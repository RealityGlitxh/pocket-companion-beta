function collectionStats(){
 const total=Array.isArray(CARDS)?CARDS.length:0;
 let unique=0,totalOwned=0,dupes=0,wanted=0,tradeable=0;
 (Array.isArray(CARDS)?CARDS:[]).forEach(c=>{
   const r=collectionRead(c.id);
   const owned=Math.max(0,Number(r.owned||0));
   const want=Math.max(0,Number(r.wanted||0));
   const trade=Math.max(0,Number(r.tradeable||0));
   if(owned>0)unique++;
   totalOwned+=owned;
   dupes+=Math.max(0,owned-1);
   wanted+=want;
   tradeable+=Math.min(trade,owned);
 });
 return {total,unique,totalOwned,dupes,wanted,tradeable,pct:total?unique/total*100:0};
}
function collectionPage(){
 const s=collectionStats();
 document.getElementById("app").innerHTML=`<div class="between"><div><h1>Collection</h1><p class="muted">Track owned, wanted, and tradeable Pocket cards.</p></div><div class="row"><button class="secondary ${state.collectionPrefs.quickEdit?'active':''}" onclick="toggleCollectionQuickEdit()">${state.collectionPrefs.quickEdit?'✓ Quick Edit On':'Quick Edit'}</button><span id="collectionCloudStatus" class="badge">${collectionCloudStatusLabel().text}</span><span class="badge">${s.unique}/${s.total} unique</span></div></div>
 <div class="metricgrid"><div class="metric"><div class="l">Owned</div><div class="n">${s.totalOwned}</div></div><div class="metric"><div class="l">Completion</div><div class="n">${s.pct.toFixed(1)}%</div></div><div class="metric"><div class="l">Duplicates</div><div class="n">${s.dupes}</div></div><div class="metric"><div class="l">Wishlist</div><div class="n">${s.wanted}</div></div><div class="metric"><div class="l">Tradeable</div><div class="n">${s.tradeable}</div></div></div>
 <div class="collectionModes">${[["all","All Cards"],["owned","Owned"],["missing","Missing"],["wishlist","Wishlist"],["trade","Trade Binder"]].map(([k,n])=>`<button class="${collectionMode===k?"active secondary":"secondary"}" onclick="setCollectionMode('${k}')">${n}</button>`).join("")}</div>
 <div class="panel"><div class="filtergrid"><input id="cq" placeholder="Search collection..." oninput="collectionPageIndex=0;renderCollectionGrid()"><select id="cset" onchange="collectionPageIndex=0;renderCollectionGrid();renderCollectionBulkToolbar()"><option value="">All sets</option>${availableSets().map(x=>`<option>${esc(x)}</option>`).join("")}</select><select id="crarity" onchange="collectionPageIndex=0;renderCollectionGrid();renderCollectionBulkToolbar()"><option value="">All rarities</option>${rarityOptionsHtml()}</select><select id="ckind" onchange="collectionPageIndex=0;renderCollectionGrid()"><option value="">Pokémon + Trainers</option><option>Pokémon</option><option>Trainer</option></select><select id="cstage" onchange="collectionPageIndex=0;renderCollectionGrid()"><option value="">All stages</option><option>Basic</option><option>Stage 1</option><option>Stage 2</option></select><select id="csort" onchange="renderCollectionGrid()"><option value="name">Name</option><option value="set">Set</option><option value="number">Card number</option><option value="rarity">Rarity</option><option value="owned">Owned quantity</option></select></div><div id="collectionBulkTools">${collectionBulkToolbarHtml()}</div><div id="collectionGrid"></div></div>
 ${collectionDeckSuggestions()}<div class="panel"><h2>Set Completion</h2>${setCompletionHtml()}</div>`;
 renderCollectionGrid();renderCollectionCloudStatus();
}
function renderCollectionGrid(){
 const root=document.getElementById("collectionGrid");if(!root)return;
 const all=collectionFiltered(),pages=Math.max(1,Math.ceil(all.length/COLLECTION_PAGE_SIZE));collectionPageIndex=Math.min(collectionPageIndex,pages-1);
 const start=collectionPageIndex*COLLECTION_PAGE_SIZE,shown=all.slice(start,start+COLLECTION_PAGE_SIZE);
 root.innerHTML=`<p class="muted">${all.length.toLocaleString()} matching cards • page ${collectionPageIndex+1}/${pages}</p><div class="collectionBrowserGrid">${shown.map(c=>collectionCardHtml(c)).join("")}</div><div class="pager"><button class="secondary" ${collectionPageIndex===0?"disabled":""} onclick="collectionPageIndex--;renderCollectionGrid()">← Previous</button><span class="muted">${shown.length?start+1:0}-${start+shown.length} of ${all.length}</span><button class="secondary" ${collectionPageIndex>=pages-1?"disabled":""} onclick="collectionPageIndex++;renderCollectionGrid()">Next →</button></div>`;
}
function collectionCardHtml(c){
 const r=collectionRead(c.id),flags=[r.owned?`Owned ×${r.owned}`:"",r.wanted?`Want ×${r.wanted}`:"",r.tradeable?`Trade ×${r.tradeable}`:""].filter(Boolean),selected=collectionSelected.has(c.id);
 const action=collectionBulkMode?`toggleCollectionCardSelection('${esc(c.id)}')`:`openCollectionCard('${esc(c.id)}')`;
 const core=`<div class="cardimgwrap">${imageTag(c,"thumb")}${collectionBulkMode?`<span class="collectionSelectCheck">${selected?'✓':'+'}</span>`:''}</div><div class="collectionBrowseBody"><strong>${esc(c.name)}</strong><span>${esc(c.setCode)} #${esc(c.number)} ${c.rarity?`• ${rarityBadge(c.rarity)} ${esc(pocketRarityInfo(c.rarity).label)}`:""}</span><div class="collectionBrowseFlags">${flags.length?flags.map(x=>`<em>${x}</em>`).join(""):`<em class="muted">Not owned</em>`}</div></div>`;
 if(state.collectionPrefs.quickEdit&&!collectionBulkMode){
   return `<article class="collectionBrowseCard collectionQuickCard"><button class="collectionQuickOpen" onclick="${action}" aria-label="Open ${esc(c.name)} details">${core}</button><div class="collectionQuickControls"><div><span>Owned</span><button class="secondary" onclick="quickCollectionAdjust('${esc(c.id)}','owned',-1,event)" aria-label="Remove one owned ${esc(c.name)}">−</button><b>${r.owned}</b><button onclick="quickCollectionAdjust('${esc(c.id)}','owned',1,event)" aria-label="Add one owned ${esc(c.name)}">+</button></div><div class="collectionQuickSecondary"><button class="secondary" ${r.wanted<1?'disabled':''} onclick="quickCollectionAdjust('${esc(c.id)}','wanted',-1,event)">− Want</button><button class="secondary" onclick="quickCollectionAdjust('${esc(c.id)}','wanted',1,event)">+ Want${r.wanted?` (${r.wanted})`:''}</button><button class="secondary" ${r.tradeable<1?'disabled':''} onclick="quickCollectionAdjust('${esc(c.id)}','tradeable',-1,event)">− Trade</button><button class="secondary" ${r.owned<1||r.tradeable>=r.owned?'disabled':''} onclick="quickCollectionAdjust('${esc(c.id)}','tradeable',1,event)">+ Trade${r.tradeable?` (${r.tradeable})`:''}</button></div></div></article>`;
 }
 return `<button class="collectionBrowseCard ${selected?'bulkSelected':''} ${collectionBulkMode?'selectable':''}" onclick="${action}" aria-pressed="${selected?'true':'false'}">${core}</button>`;
}
function openCollectionCard(id){
 const c=card(id);if(!c)return;const r=colRec(id);
 document.getElementById("cardModalBody").innerHTML=`<div class="between"><div><h2>${esc(c.name)}</h2><div class="muted">${esc(c.setName||c.setCode)} • #${esc(c.number)} • ${c.rarity?`${rarityBadge(c.rarity)} ${esc(pocketRarityInfo(c.rarity).label)}`:"—"}</div></div><button class="secondary" onclick="closeCardModal()">Close</button></div><div class="modalgrid v822CardDetail" style="margin-top:14px"><div>${imageTag(c,"full")}</div><div><div class="metricgrid"><div class="metric"><div class="l">Owned</div><div class="n">${r.owned}</div></div><div class="metric"><div class="l">Wishlist</div><div class="n">${r.wanted}</div></div><div class="metric"><div class="l">Trade Binder</div><div class="n">${r.tradeable}</div></div></div><p>${esc(cardKind(c))} ${c.stage?`• ${esc(c.stage)}`:""}</p><div class="quantityEditor"><strong>Owned</strong><button class="secondary" onclick="changeCollectionModal('${esc(id)}','owned',-1)">−</button><span>${r.owned}</span><button onclick="changeCollectionModal('${esc(id)}','owned',1)">+</button></div><div class="quantityEditor"><strong>Wishlist</strong><button class="secondary" onclick="changeCollectionModal('${esc(id)}','wanted',-1)">−</button><span>${r.wanted}</span><button onclick="changeCollectionModal('${esc(id)}','wanted',1)">+</button></div><div class="quantityEditor"><strong>Trade Binder</strong><button class="secondary" onclick="changeCollectionModal('${esc(id)}','tradeable',-1)">−</button><span>${r.tradeable}</span><button onclick="changeCollectionModal('${esc(id)}','tradeable',1)">+</button></div></div></div>`;
 document.getElementById("cardModal").style.display="flex";
}
function changeCollectionModal(id,key,delta){const r=colRec(id);r[key]=Math.max(0,Math.floor(Number(r[key]||0)+Number(delta||0)));normalizeCollectionRecord(r);save();openCollectionCard(id)}
function setCompletionHtml(){
 const sets={};CARDS.forEach(c=>{if(!sets[c.setCode])sets[c.setCode]={total:0,owned:0};sets[c.setCode].total++;if(collectionRead(c.id).owned>0)sets[c.setCode].owned++});
 return Object.entries(sets).map(([set,v])=>{const p=v.total?v.owned/v.total*100:0;return `<div class="setProgress"><div class="between"><strong>${esc(set)}</strong><span>${v.owned}/${v.total} • ${p.toFixed(1)}%</span></div><div class="simbar"><span style="width:${p}%"></span></div></div>`}).join("");
}



const MetaSnapshotService={
 getDecks(){return BTM_META_SNAPSHOT.decks||[]},
 getDeck(key){return this.getDecks().find(d=>d.key===key)||null},
 getByArchetypeId(id){const a=ArchetypeService.getArchetype(id);return a?.btmKey?this.getDeck(a.btmKey):null},
 getMatchups(){return BTM_META_SNAPSHOT.matchups||[]},
 getMatchup(sourceKey,targetKey){return this.getMatchups().find(x=>x.sourceKey===sourceKey&&x.targetKey===targetKey)||null},
 getTournaments(){
   const map=new Map();
   this.getDecks().forEach(d=>(d.bestFinishes||[]).forEach(f=>{
     const k=`${f.dateLabel}|${f.tournamentName}`;
     const old=map.get(k)||{name:f.tournamentName,date:f.dateLabel,players:f.players,bestPlace:f.place,decks:new Set(),finishers:[]};
     old.players=Math.max(old.players||0,f.players||0);old.bestPlace=Math.min(old.bestPlace||999,f.place||999);old.decks.add(d.name);
     const finisherKey=`${String(f.player||"").toLowerCase()}|${d.key}`;
     if(!old.finishers.some(x=>x._key===finisherKey))old.finishers.push({_key:finisherKey,deck:d.name,deckKey:d.key,player:f.player,place:f.place,placeLabel:f.placeLabel,listUrl:f.listUrl||""});
     map.set(k,old);
   }));
   return [...map.values()].map(x=>({...x,decks:[...x.decks],finishers:x.finishers.sort((a,b)=>a.place-b.place||String(a.player).localeCompare(String(b.player)))})).sort((a,b)=>String(b.date).localeCompare(String(a.date))||b.players-a.players);
 },
 getOverview(){
   const ds=this.getDecks(),most=[...ds].sort((a,b)=>b.topCutShare-a.topCutShare)[0],best=[...ds].filter(d=>d.record.matches>=50).sort((a,b)=>b.winRate-a.winRate)[0];
   const tiers={};ds.forEach(d=>tiers[d.tier]=(tiers[d.tier]||0)+1);
   const topTier=Object.entries(tiers).sort((a,b)=>b[1]-a[1])[0]?.[0]||"—";
   return {tracked:ds.length,mostPlayed:most,highestWinRate:best,mostCommonTier:topTier,totalMatches:ds.reduce((s,d)=>s+d.record.matches,0),totalSamples:ds.reduce((s,d)=>s+d.samples.selected,0)};
 },
 rankMovement(d){const p=parseInt(String(d.previousRank||"").replace(/\D/g,""),10);if(!Number.isFinite(p))return {delta:null,label:"—"};const delta=p-d.rank;return {delta,label:delta>0?`↑ ${delta}`:delta<0?`↓ ${Math.abs(delta)}`:"—"}},
 normalizeDeckName(n){return String(n||"").toLowerCase().replace(/\bex\b/g,"").replace(/[^a-z0-9]+/g," ").trim()},
 personalRecord(deckName){
   const target=this.normalizeDeckName(deckName), ms=completedMatches().filter(m=>{
     const o=this.normalizeDeckName(m.opponentArchetype);
     return o===target || (o&&target&&(o.includes(target)||target.includes(o)));
   });
   return wl(ms);
 }
};
function setMetaV73Tab(tab){state.metaV73.tab=tab;save();metaPage()}
function pct1(v){return v==null?"—":(Number(v)*100).toFixed(1)+"%"}
function rankMovementHtml(d){const x=MetaSnapshotService.rankMovement(d);return x.delta>0?`<span class="good">${x.label}</span>`:x.delta<0?`<span class="bad">${x.label}</span>`:`<span class="muted">—</span>`}
function metaOverviewV73(){
 const o=MetaSnapshotService.getOverview(),ds=MetaSnapshotService.getDecks();
 return `<div class="metricgrid">
  <div class="metric"><div class="l">Most Played</div><div class="n" style="font-size:16px">${esc(o.mostPlayed?.name||"—")}</div><div class="muted">${pct1(o.mostPlayed?.topCutShare)}</div></div>
  <div class="metric"><div class="l">Highest Win Rate</div><div class="n" style="font-size:16px">${esc(o.highestWinRate?.name||"—")}</div><div class="muted">${pct1(o.highestWinRate?.winRate)}</div></div>
  <div class="metric"><div class="l">Archetypes Tracked</div><div class="n">${o.tracked}</div></div>
  <div class="metric"><div class="l">Matches in Snapshot</div><div class="n">${o.totalMatches.toLocaleString()}</div></div>
  <div class="metric"><div class="l">Deck Samples</div><div class="n">${o.totalSamples.toLocaleString()}</div></div><div class="metric"><div class="l">Verified 20-Card Lists</div><div class="n">30/30</div></div>
 </div>
 <div class="panel" style="margin-top:14px"><div class="between"><h2>Meta Share</h2><span class="muted tiny">Top Cut Share</span></div>
 ${ds.map(d=>`<div class="metaShareV73"><span><strong>#${d.rank}</strong> ${esc(d.name)}</span><div class="simbar"><span style="width:${Math.min(100,d.topCutShare*100)}%"></span></div><strong>${pct1(d.topCutShare)}</strong></div>`).join("")}</div>
 <div class="panel"><h2>Rank Movement</h2><div class="metaRankGrid">${ds.map(d=>`<button class="metaRankCard" onclick="openArchetypeByBtmKey('${d.key}')"><span class="rankNo">#${d.rank}</span><span><strong>${esc(d.name)}</strong><small>${esc(d.tier)} • ${pct1(d.winRate)} WR</small></span>${rankMovementHtml(d)}</button>`).join("")}</div></div>`;
}
function metaTierListV73(){
 const ds=MetaSnapshotService.getDecks(),tiers=[...new Set(ds.map(d=>d.tier))];
 return `<div class="panel"><h2>Tier List</h2><p class="muted">Battle Tower Meta snapshot tier labels; not live rankings.</p>${tiers.map(t=>`<div class="tierRow"><div class="tierLabel">${esc(t)}</div><div class="tierDecks">${ds.filter(d=>d.tier===t).map(d=>`<button onclick="openArchetypeByBtmKey('${d.key}')">#${d.rank} ${esc(d.name)}</button>`).join("")}</div></div>`).join("")}</div>`;
}
function metaMatchupsV73(){
 const ds=MetaSnapshotService.getDecks(),min=Number(state.metaV73.matchupMin||10);
 return `<div class="panel"><div class="between"><div><h2>Matchup Matrix</h2><p class="muted">Global snapshot record between the 12 tracked archetypes.</p></div><select style="width:auto" onchange="state.metaV73.matchupMin=Number(this.value);save();metaPage()">${[5,10,20,30,50].map(x=>`<option value="${x}" ${x===min?"selected":""}>Min ${x}</option>`).join("")}</select></div>
 <div class="matrixWrap"><table class="matrix metaMatrix"><tr><th>Deck</th>${ds.map(d=>`<th>#${d.rank}<br>${esc(d.name)}</th>`).join("")}</tr>
 ${ds.map(s=>`<tr><th>#${s.rank} ${esc(s.name)}</th>${ds.map(t=>{if(s.key===t.key)return `<td class="selfCell">—</td>`;const m=MetaSnapshotService.getMatchup(s.key,t.key);if(!m||m.total<min)return `<td>—</td>`;const wr=m.winRate*100,cls=wr>=55?"favored":wr<=45?"unfavored":"even";return `<td class="${cls}" onclick="showMatchupDetail('${s.key}','${t.key}')"><strong>${wr.toFixed(1)}%</strong><br><span class="tiny">${m.wins}-${m.losses}-${m.draws}<br>${m.total} games</span></td>`}).join("")}</tr>`).join("")}</table></div></div><div id="matchupDetailV73"></div>`;
}
function showMatchupDetail(a,b){
 const s=MetaSnapshotService.getDeck(a),t=MetaSnapshotService.getDeck(b),m=MetaSnapshotService.getMatchup(a,b),root=document.getElementById("matchupDetailV73");if(!s||!t||!m||!root)return;
 root.innerHTML=`<div class="panel"><div class="between"><div><h2>${esc(s.name)} vs ${esc(t.name)}</h2><p class="muted">${m.total} recorded matchup games in the snapshot.</p></div><span class="badge">${(m.winRate*100).toFixed(1)}%</span></div><div class="metricgrid"><div class="metric"><div class="l">Wins</div><div class="n good">${m.wins}</div></div><div class="metric"><div class="l">Losses</div><div class="n bad">${m.losses}</div></div><div class="metric"><div class="l">Draws</div><div class="n">${m.draws}</div></div><div class="metric"><div class="l">Win Rate</div><div class="n">${(m.winRate*100).toFixed(1)}%</div></div></div></div>`;
}
function metaCardsV73(){
 const ds=MetaSnapshotService.getDecks();let key=state.metaV73.cardDeckKey||ds[0]?.key||"";if(!ds.some(d=>d.key===key))key=ds[0]?.key||"";state.metaV73.cardDeckKey=key;
 const d=MetaSnapshotService.getDeck(key),cards=[...(d?.cardTable||[])].sort((a,b)=>b.inclusionPct-a.inclusionPct||b.avgCopies-a.avgCopies);
 return `<div class="panel"><div class="between"><div><h2>Card Usage</h2><p class="muted">How frequently cards appear within samples of a selected archetype.</p></div><select style="max-width:360px" onchange="state.metaV73.cardDeckKey=this.value;save();metaPage()">${ds.map(x=>`<option value="${x.key}" ${x.key===key?"selected":""}>#${x.rank} ${esc(x.name)}</option>`).join("")}</select></div>
 <div class="cardUsageList">${cards.map(c=>{const card=findCardBySetNumber(c.set,c.number)||getCardByName(c.name);return `<div class="cardUsageRow"><div class="usageThumb">${card?imageTag(card,"thumb"):`<div class="cardplaceholder">${esc(c.name)}</div>`}</div><div><strong>${esc(c.name)}</strong><div class="muted tiny">${esc(c.code)} • ${esc(c.category)}</div></div><div><span class="muted tiny">Inclusion</span><strong>${Number(c.inclusionPct).toFixed(1)}%</strong></div><div><span class="muted tiny">Avg Copies</span><strong>${Number(c.avgCopies).toFixed(2)}</strong></div><div class="copySplit"><span>1× ${Number(c.oneCopyPct).toFixed(0)}%</span><span>2× ${Number(c.twoCopyPct).toFixed(0)}%</span></div></div>`}).join("")}</div></div>`;
}
function metaTournamentsV73(){
 const ts=MetaSnapshotService.getTournaments();
 return `<div class="panel"><h2>Tournament Snapshot</h2><p class="muted">Best finishes represented in the supplied Battle Tower Meta creator pack.</p>${ts.slice(0,40).map(t=>`<div class="tourneyCard"><div class="between"><div><strong>${esc(t.name)}</strong><div class="muted tiny">${esc(t.date)} • ${t.players} players • ${t.decks.length} tracked archetypes represented</div></div><span class="badge">Best: #${t.bestPlace}</span></div><div class="row tiny" style="margin-top:8px">${t.finishers.slice(0,5).map(f=>`<span class="pill">#${f.place} ${esc(f.player)} — ${esc(f.deck)}</span>`).join("")}</div></div>`).join("")}</div>`;
}
function metaPersonalV73(){
 const ds=MetaSnapshotService.getDecks();
 return `<div class="panel"><h2>Global vs My Results</h2><p class="muted">Global = Battle Tower Meta snapshot. My Results = your Advanced Battle Tracker.</p><div class="personalMetaList">${ds.map(d=>{const p=MetaSnapshotService.personalRecord(d.name);return `<button class="personalMetaRow" onclick="openArchetypeByBtmKey('${d.key}')"><span><strong>#${d.rank} ${esc(d.name)}</strong><small>${pct1(d.topCutShare)} share • ${pct1(d.winRate)} global WR</small></span><span><strong>${p.n?p.w+"-"+p.l:"—"}</strong><small>${p.n?p.wr.toFixed(1)+"% my WR":p.n+" matches"}</small></span></button>`}).join("")}</div></div>`;
}
function openArchetypeByBtmKey(key){const a=ArchetypeService.getArchetypes().find(x=>x.btmKey===key);if(a)openArchetype(a.id)}
function metaArchetypesV73(){
 const types=[...new Set(ArchetypeService.getArchetypes().map(a=>a.type))].sort(),tiers=[...new Set(ArchetypeService.getArchetypes().map(a=>a.tier))].sort();
 return `<div class="panel"><div class="archetypeControls"><input id="archSearch" placeholder="Search archetypes or Pokémon…" value="${esc(state.archetypePrefs.query||"")}" oninput="renderArchetypeBrowser()"><select id="archType" onchange="renderArchetypeBrowser()"><option value="">All types</option>${types.map(x=>`<option ${state.archetypePrefs.type===x?"selected":""}>${esc(x)}</option>`).join("")}</select><select id="archTier" onchange="renderArchetypeBrowser()"><option value="">All tiers</option>${tiers.map(x=>`<option ${state.archetypePrefs.tier===x?"selected":""}>${esc(x)}</option>`).join("")}</select><select id="archSort" onchange="renderArchetypeBrowser()"><option value="name">Name</option><option value="usage" ${state.archetypePrefs.sort==="usage"?"selected":""}>Usage</option><option value="winRate" ${state.archetypePrefs.sort==="winRate"?"selected":""}>Win Rate</option><option value="tier" ${state.archetypePrefs.sort==="tier"?"selected":""}>Tier</option></select><div class="row"><button class="secondary" onclick="setArchView('grid')">Grid</button><button class="secondary" onclick="setArchView('list')">List</button></div></div></div><div id="archetypeResults"></div>`;
}

const MetaAdapter={
 base:"https://play.limitlesstcg.com/api",
 cacheKey:"pptcg_v6_meta_cache",
 ttl:1000*60*60*4,
 async fetchRecentTournaments(){
   // Public tournament API is designed to be adapter-backed. In file:// mode CORS may block it.
   const urls=[`${this.base}/tournaments?game=POCKET&limit=50`,`${this.base}/tournaments?game=pocket&limit=50`];
   let lastErr=null;
   for(const u of urls){try{const r=await fetch(u,{mode:"cors"});if(!r.ok)throw new Error("HTTP "+r.status);const data=await r.json();return Array.isArray(data)?data:(data.tournaments||data.data||[])}catch(e){lastErr=e}}
   throw lastErr||new Error("Unable to reach Limitless");
 },
 normalizeTournament(t){return {id:t.id||t.tournamentId||"",name:t.name||t.title||"Tournament",date:t.date||t.startTime||t.start||"",players:t.players||t.playerCount||t.participants||0,format:t.format||t.game||"Pokémon TCG Pocket",raw:t}},
 normalizeArchetypeName(name){return (name||"Unknown").replace(/\s*\+\s*/g," / ").replace(/\s*\/\s*/g," / ").trim()},
 async refresh(){
   const tournaments=(await this.fetchRecentTournaments()).map(x=>this.normalizeTournament(x));
   const payload={tournaments,archetypes:[],decklists:0,updated:Date.now(),source:"live-list"};
   localStorage.setItem(this.cacheKey,JSON.stringify(payload));return payload;
 },
 cached(){try{const x=JSON.parse(localStorage.getItem(this.cacheKey)||"null");return x}catch(e){return null}}
};
async function ensureMetaLoaded(force=false){
 if(state.meta.status==="loading")return;
 const cached=MetaAdapter.cached();
 if(!force&&cached&&Date.now()-cached.updated<MetaAdapter.ttl){state.meta.cache=cached;state.meta.lastUpdated=cached.updated;state.meta.status="cached";save();return}
 state.meta.status="loading";state.meta.error="";save();metaPage();
 try{const data=await MetaAdapter.refresh();state.meta.cache=data;state.meta.lastUpdated=data.updated;state.meta.status="live";save()}
 catch(e){state.meta.error=e.message||"Unable to reach Limitless";if(cached){state.meta.cache=cached;state.meta.lastUpdated=cached.updated;state.meta.status="cached"}else state.meta.status="unavailable";save()}
 metaPage();
}
function metaTabsHtml(){return [["overview","Overview"],["archetypes","Archetypes"],["decks","Top Decks"],["tournaments","Tournaments"],["matchups","Matchups"],["mine","My Results"]].map(([k,n])=>`<button class="secondary ${state.meta.tab===k?"active":""}" onclick="state.meta.tab='${k}';save();metaPage()">${n}</button>`).join("")}
function metaBody(){
 const c=state.meta.cache;
 if(state.meta.status==="loading")return `<div class="panel"><h2>Loading tournaments…</h2><p class="muted">Fetching competitive data only because Meta Center is open.</p></div>`;
 if(!c)return `<div class="panel"><h2>Meta data unavailable</h2><p class="muted">${state.meta.error?"Unable to reach Limitless. ":""}Local file:// browser security can block direct API requests. The rest of the app remains usable.</p><button onclick="ensureMetaLoaded(true)">Try Again</button></div>`;
 if(state.meta.tab==="tournaments")return `<div class="panel"><h2>Recent Tournaments</h2>${c.tournaments.length?c.tournaments.slice(0,30).map(t=>`<div class="tourneyCard"><div class="between"><strong>${esc(t.name)}</strong><span class="pill">${esc(String(t.players||"—"))} players</span></div><div class="muted">${t.date?new Date(t.date).toLocaleDateString():"Date unavailable"} • ${esc(t.format||"Pocket")}</div></div>`).join(""):`<p class="muted">No tournament list returned.</p>`}</div>`;
 if(state.meta.tab==="mine"){const by={};state.matches.forEach(m=>{let n=MetaAdapter.normalizeArchetypeName(m.opponent||"Unknown");by[n]=by[n]||{w:0,l:0};by[n][m.result==="win"?"w":"l"]++});return `<div class="panel"><h2>My Results vs Archetypes (Battle Tracker)</h2>${Object.entries(by).length?Object.entries(by).map(([n,v])=>`<div class="between deckrow"><strong>${esc(n)}</strong><span>${v.w}-${v.l} • ${(v.w/(v.w+v.l)*100).toFixed(1)}%</span></div>`).join(""):`<p class="muted">Record matches to compare your personal results.</p>`}</div>`}
 if(["archetypes","decks","matchups"].includes(state.meta.tab))return `<div class="panel"><h2>${state.meta.tab==="archetypes"?"Archetypes":state.meta.tab==="decks"?"Top Decks":"Matchups"}</h2><p class="muted">The adapter is ready, but this local browser build does not fabricate archetype, decklist, or match percentages when the API response does not provide them directly. These become live after the production backend fetches tournament standings/decklists/matches and aggregates them.</p></div>`;
 return `<div class="metricgrid"><div class="metric"><div class="l">Tournaments</div><div class="n">${c.tournaments.length}</div></div><div class="metric"><div class="l">Decklists analyzed</div><div class="n">${c.decklists||0}</div></div><div class="metric"><div class="l">Archetypes</div><div class="n">${c.archetypes?.length||0}</div></div></div><div class="panel" style="margin-top:14px"><h2>Competitive Meta Overview</h2><p class="muted">Tournament listing is available through the adapter. Archetype share, win rate, conversion, and trends are intentionally left blank until standings/decklists/matches are successfully retrieved and normalized—no made-up percentages.</p></div>`;
}


function copyCurrentDeckList(){
 const d=state.decks.find(x=>x.id===state.selected);if(!d)return ppcNotice("Select a deck first.");
 copyTextSafe(exportUserDeckText(d),"Deck list copied.");
}

const SIM_LAB_LOCAL_KEY="pptcg_simulation_runs_v85115";
const simulationLabState={deckId:"",result:null,history:[],historyDeckId:"",loading:false,cloudState:"idle",message:""};
function simulationCloud(){return {client:window.getPPCCloudClient?.()||null,session:window.getPPCCloudSession?.()||null}}
function simulationLocalHistory(){try{return JSON.parse(localStorage.getItem(SIM_LAB_LOCAL_KEY)||"[]")||[]}catch(e){return []}}
function saveSimulationLocal(row){const rows=simulationLocalHistory();rows.unshift(row);try{localStorage.setItem(SIM_LAB_LOCAL_KEY,JSON.stringify(rows.slice(0,60)))}catch(e){}return rows}
async function loadSimulationHistory(deckId,force=false){
 if(!deckId||simulationLabState.loading)return;
 if(!force&&simulationLabState.historyDeckId===deckId)return;
 simulationLabState.loading=true;simulationLabState.historyDeckId=deckId;
 const local=simulationLocalHistory().filter(x=>x.deck_local_id===deckId).slice(0,8);
 simulationLabState.history=local;
 const {client,session}=simulationCloud();
 if(!client||!session?.user){simulationLabState.cloudState="local";simulationLabState.loading=false;return}
 try{
  const {data,error}=await client.from("simulation_runs").select("id,deck_local_id,deck_name,runs,sample_size,basic_rate,pokemon_rate,distinct3_rate,trainer_heavy_rate,created_at").eq("user_id",session.user.id).eq("deck_local_id",deckId).order("created_at",{ascending:false}).limit(8);
  if(error)throw error;
  simulationLabState.history=(data||[]).map(x=>({...x,cloud:true}));simulationLabState.cloudState="connected";
 }catch(e){simulationLabState.cloudState="error";simulationLabState.message=e?.message||String(e)}
 simulationLabState.loading=false;
 if(state.page==="optimizer"&&state.simDeck===deckId)optimizerPage(true);
}
async function persistSimulationRun(d,sim){
 const now=new Date().toISOString();
 const localRow={id:`local-${Date.now()}`,deck_local_id:d.id,deck_name:d.name,runs:sim.runs,sample_size:sim.sampleSize,basic_rate:Number(sim.basic.toFixed(3)),pokemon_rate:Number(sim.pokemon.toFixed(3)),distinct3_rate:Number(sim.distinct3.toFixed(3)),trainer_heavy_rate:Number(sim.trainerHeavy.toFixed(3)),created_at:now};
 saveSimulationLocal(localRow);simulationLabState.history=[localRow,...simulationLabState.history.filter(x=>x.id!==localRow.id)].slice(0,8);
 const {client,session}=simulationCloud();
 if(!client||!session?.user){simulationLabState.cloudState="local";simulationLabState.message="Saved locally. Sign in to sync simulation history.";optimizerPage(true);return}
 simulationLabState.cloudState="saving";simulationLabState.message="Saving simulation to cloud…";optimizerPage(true);
 const snapshot={id:d.id,name:d.name,energy:d.energy||null,cards:d.cards||[],updatedAt:d.updatedAt||d.updated_at||null};
 try{
  const {error}=await client.from("simulation_runs").insert({user_id:session.user.id,deck_local_id:d.id,deck_name:d.name,deck_snapshot:snapshot,simulation_type:"opening_hand",runs:sim.runs,sample_size:sim.sampleSize,basic_rate:localRow.basic_rate,pokemon_rate:localRow.pokemon_rate,distinct3_rate:localRow.distinct3_rate,trainer_heavy_rate:localRow.trainer_heavy_rate,metrics:{basic:sim.basic,pokemon:sim.pokemon,distinct3:sim.distinct3,trainerHeavy:sim.trainerHeavy}});
  if(error)throw error;
  simulationLabState.cloudState="connected";simulationLabState.message="Simulation saved to your account.";await loadSimulationHistory(d.id,true);
 }catch(e){simulationLabState.cloudState="error";simulationLabState.message=`Cloud save failed: ${e?.message||String(e)}`;optimizerPage(true)}
}
function runSimulationLab(deckId){
 const d=state.decks.find(x=>x.id===deckId);if(!d)return ppcNotice("Select a deck first.");
 const m=deckMetrics(d);if(m.total<5)return ppcNotice("Deck needs at least 5 cards before sampling.");
 const sim=sampleConsistency(d,5000,5);if(!sim)return;
 simulationLabState.deckId=d.id;simulationLabState.result=sim;simulationLabState.message="5,000 opening-hand samples completed.";
 optimizerPage(true);persistSimulationRun(d,sim);
}
function clearSimulationDeck(deckId){simulationLabState.deckId="";simulationLabState.result=null;simulationLabState.historyDeckId="";simulationLabState.history=[];state.simDeck=deckId;save();optimizerPage()}
function simulationHistoryHtml(deckId){
 const rows=simulationLabState.history||[];
 if(simulationLabState.loading)return `<p class="muted">Loading simulation history…</p>`;
 if(!rows.length)return `<p class="muted">No saved simulation runs for this deck yet.</p>`;
 return `<div class="simHistoryList">${rows.slice(0,5).map(r=>`<div class="simHistoryRow"><div><strong>${Number(r.basic_rate??0).toFixed(1)}%</strong><span>Basic in hand</span></div><div><strong>${Number(r.pokemon_rate??0).toFixed(1)}%</strong><span>Any Pokémon</span></div><div><strong>${Number(r.distinct3_rate??0).toFixed(1)}%</strong><span>3+ names</span></div><div><strong>${Number(r.trainer_heavy_rate??0).toFixed(1)}%</strong><span>4+ Trainers</span></div><small>${new Date(r.created_at).toLocaleString()}${r.cloud?" • Cloud":" • Local"}</small></div>`).join("")}</div>`;
}

const simAdvancedState={mode:"deck_vs_deck",opponentId:"",result:null,replay:null,saving:false};
function simulationDeckPool(){
 const own=(state.decks||[]).map(d=>({...d,simSource:"saved"}));
 const meta=(window.ArchetypeService?.getArchetypes?.()||[]).filter(a=>Array.isArray(a.sampleDeck)&&a.sampleDeck.length).map(metaDeckFromArchetype);
 return [...own,...meta].filter(Boolean);
}
function simOpponentOptions(currentId){return simulationDeckPool().filter(x=>x.id!==currentId).map(x=>`<option value="${esc(x.id)}" ${simAdvancedState.opponentId===x.id?"selected":""}>${x.isMetaDeck?"Meta • ":""}${esc(x.name)}</option>`).join("")}
function simDeckEvidence(d,opp){
 const all=completedMatches();
 const mine=all.filter(m=>m.deckId===d.id||String(m.deckName||"").toLowerCase()===String(d.name||"").toLowerCase());
 const direct=mine.filter(m=>String(m.opponentArchetype||"").toLowerCase()===String(opp.name||"").toLowerCase());
 const wins=direct.filter(m=>m.result==="win").length;
 const personal=direct.length?wins/direct.length:null;
 const arch=window.MetaService?.getArchetypes?.().find(a=>String(a.name).toLowerCase()===String(opp.name).toLowerCase());
 const fieldWr=arch?.stats?.winRate==null?null:Number(arch.stats.winRate)/100;
 return {mine,direct,wins,personal,fieldWr};
}
function runAdvancedSimulation(){
 const d=state.decks.find(x=>x.id===state.simDeck);const opp=simulationDeckPool().find(x=>x.id===simAdvancedState.opponentId);
 if(!d||!opp)return ppcNotice("Choose both decks first.");
 const a=sampleConsistency(d,3000,5),b=sampleConsistency(opp,3000,5);if(!a||!b)return ppcNotice("Both decks need at least 5 mapped cards.");
 const ev=simDeckEvidence(d,opp),consA=(a.basic+a.distinct3)/200,consB=(b.basic+b.distinct3)/200;
 let estimate=.5,signals=[];
 if(ev.personal!=null){estimate+=Math.max(-.18,Math.min(.18,(ev.personal-.5)*.36));signals.push(`${ev.direct.length} personal matchup game${ev.direct.length===1?'':'s'}`)}
 if(ev.fieldWr!=null){estimate+=Math.max(-.10,Math.min(.10,(.5-ev.fieldWr)*.20));signals.push("current Meta evidence")}
 estimate+=Math.max(-.08,Math.min(.08,(consA-consB)*.16));signals.push("opening-hand consistency");
 estimate=Math.max(.15,Math.min(.85,estimate));
 const confidence=ev.direct.length>=10?"High":ev.direct.length>=4?"Medium":ev.direct.length||ev.fieldWr!=null?"Limited":"Exploratory";
 const turns=[
  {turn:0,title:"Model setup",text:`${d.name} vs ${opp.name}. This is an evidence model, not a rules-engine battle.`},
  {turn:1,title:"Opening consistency",text:`${d.name}: ${a.basic.toFixed(1)}% Basic / ${a.distinct3.toFixed(1)}% 3+ names. ${opp.name}: ${b.basic.toFixed(1)}% / ${b.distinct3.toFixed(1)}%.`},
  {turn:2,title:"Competitive evidence",text:ev.personal!=null?`Your recorded matchup: ${ev.wins}-${ev.direct.length-ev.wins}.`:(ev.fieldWr!=null?`No personal matchup sample; current Meta evidence is used as a secondary signal.`:`No direct personal or Meta win-rate evidence is available.`)},
  {turn:3,title:"Result",text:`Estimated matchup lean: ${(estimate*100).toFixed(1)}% for ${d.name}. Confidence: ${confidence}.`}
 ];
 simAdvancedState.result={deckA:d,deckB:opp,estimate,confidence,signals,a,b,ev};simAdvancedState.replay=turns;optimizerPage(true);persistAdvancedSimulation();
}
async function persistAdvancedSimulation(){
 const r=simAdvancedState.result,{client,session}=simulationCloud();if(!r||!client||!session?.user)return;
 simAdvancedState.saving=true;
 try{const {data,error}=await client.from("simulation_matchups").insert({user_id:session.user.id,mode:simAdvancedState.mode,deck_a_name:r.deckA.name,deck_b_name:r.deckB.name,deck_a_snapshot:{id:r.deckA.id,name:r.deckA.name,cards:r.deckA.cards||[]},deck_b_snapshot:{id:r.deckB.id,name:r.deckB.name,cards:r.deckB.cards||[],meta:!!r.deckB.isMetaDeck},sample_size:3000,confidence:r.confidence==="High"?90:r.confidence==="Medium"?70:r.confidence==="Limited"?45:25,assumptions:{type:"evidence_blend",not_rules_engine:true},result:{estimated_win_rate:Number((r.estimate*100).toFixed(2)),confidence:r.confidence,signals:r.signals}}).select("id").single();if(error)throw error;if(data?.id&&simAdvancedState.replay){await client.from("simulation_replays").insert({user_id:session.user.id,matchup_id:data.id,deck_name:r.deckA.name,opponent_name:r.deckB.name,turns:simAdvancedState.replay,summary:{estimated_win_rate:Number((r.estimate*100).toFixed(2)),confidence:r.confidence}})}}catch(e){console.warn("Advanced simulation cloud save failed",e)}finally{simAdvancedState.saving=false}
}
function advancedSimulationHtml(d){
 const opts=simOpponentOptions(d.id);if(!simAdvancedState.opponentId||!simulationDeckPool().some(x=>x.id===simAdvancedState.opponentId&&x.id!==d.id)){const first=simulationDeckPool().find(x=>x.id!==d.id);simAdvancedState.opponentId=first?.id||""}
 const r=simAdvancedState.result, replay=simAdvancedState.replay;
 return `<div class="panel simAdvancedPanel"><div class="between"><div><span class="eyebrow">MATCHUP LAB</span><h2>Deck vs. Deck + Meta Matchup Testing</h2><p class="muted">Compare your deck with saved or verified Meta decks. Results blend opening consistency with your recorded matches and available Meta evidence.</p></div><span class="pill">LIVE • GROUNDED</span></div><div class="simMatchControls"><select onchange="simAdvancedState.opponentId=this.value;simAdvancedState.result=null;simAdvancedState.replay=null;optimizerPage(true)"><option value="">Choose opponent…</option>${simOpponentOptions(d.id)}</select><select onchange="simAdvancedState.mode=this.value"><option value="deck_vs_deck" ${simAdvancedState.mode==='deck_vs_deck'?'selected':''}>Deck vs. Deck</option><option value="meta_matchup" ${simAdvancedState.mode==='meta_matchup'?'selected':''}>Meta Matchup</option></select><button onclick="runAdvancedSimulation()">Run Matchup Test</button></div>${r?`<div class="simMatchResult"><div><span>Estimated lean</span><strong>${(r.estimate*100).toFixed(1)}%</strong><small>${esc(r.deckA.name)}</small></div><div><span>Confidence</span><strong>${esc(r.confidence)}</strong><small>${r.ev.direct.length} direct personal games</small></div><div><span>Opponent</span><strong>${esc(r.deckB.name)}</strong><small>${r.deckB.isMetaDeck?'Verified Meta sample':'Saved deck'}</small></div></div><div class="notice"><strong>Evidence model:</strong> This does not invent turn-by-turn Pokémon TCG Pocket gameplay. It estimates a matchup lean only from data the app actually has.</div>`:''}</div>${replay?`<div class="panel simReplayPanel"><div class="between"><div><span class="eyebrow">REPLAY TIMELINE</span><h2>Why the model reached this result</h2></div><span class="pill">LIVE</span></div><div class="simTimeline">${replay.map(x=>`<div class="simTimelineItem"><b>${x.turn}</b><div><strong>${esc(x.title)}</strong><p>${esc(x.text)}</p></div></div>`).join('')}</div></div>`:''}`
}

function optimizerPage(skipHistoryLoad=false){
 if(!state.decks.length){document.getElementById("app").innerHTML=`<h1>Simulation Lab</h1><div class="panel"><h2>No saved decks yet</h2><p class="muted">Build and save a deck first.</p><button onclick="state.page='decks';render()">Go to Deck Lab</button></div>`;return}
 const chosen=state.simDeck||state.decks[0].id,d=state.decks.find(x=>x.id===chosen)||state.decks[0];state.simDeck=d.id;save();
 const m=deckMetrics(d),sim=simulationLabState.deckId===d.id?simulationLabState.result:null,empirical=empiricalMatchup(d),ready=m.total===20&&m.basics>0&&m.maxCopies<=2&&!!d.energy&&m.idsReady,exportTxt=deckGymExport(d);
 const {client,session}=simulationCloud(),signedIn=!!(client&&session?.user),cloudLabel=simulationLabState.cloudState==="saving"?"Saving…":signedIn?"Cloud connected":"Local mode";
 document.getElementById("app").innerHTML=`
 <div class="between simLabHero"><div><span class="eyebrow">IMPROVE • SIMULATION</span><h1>Simulation Lab</h1><p class="muted">Test opening-hand consistency, keep simulation history, and compare it with your recorded performance.</p></div><div class="row"><span class="badge"><span class="statusdot ${signedIn?"good":""}"></span>${cloudLabel}</span><span class="badge"><span class="statusdot ${ready?"good":"bad"}"></span>${ready?"Simulation-ready":"Deck needs setup"}</span></div></div>
 <div class="panel simDeckPicker"><label>Deck<select onchange="clearSimulationDeck(this.value)">${state.decks.map(x=>`<option value="${x.id}" ${x.id===d.id?"selected":""}>${esc(x.name)}</option>`).join("")}</select></label></div>
 <div class="metricgrid simMetricGrid"><div class="metric"><div class="l">Cards</div><div class="n">${m.total}/20</div></div><div class="metric"><div class="l">Basic Pokémon</div><div class="n">${m.basics}</div></div><div class="metric"><div class="l">Trainers</div><div class="n">${m.trainers}</div></div><div class="metric"><div class="l">Unique Names</div><div class="n">${m.unique}</div></div><div class="metric"><div class="l">Energy</div><div class="n" style="font-size:18px">${esc(d.energy||"Not set")}</div></div></div>
 ${simulationLabState.message?`<div class="${simulationLabState.cloudState==="error"?"dangerBox":simulationLabState.cloudState==="connected"?"successBox":"notice"}">${esc(simulationLabState.message)}</div>`:""}
 <div class="twoCol simPrimaryGrid" style="margin-top:16px"><div class="panel"><div class="between"><div><span class="eyebrow">OPENING HAND</span><h2>5-Card Sample Consistency</h2></div><button onclick="runSimulationLab('${d.id}')" ${m.total<5?"disabled":""}>${sim?"Run Again":"Run 5,000 Samples"}</button></div>${sim?`<p class="muted">5,000 randomized samples from your deck. This tests draw consistency only; it does not invent battle outcomes.</p><div class="simResultGrid"><div><span>Contains a Basic Pokémon</span><strong>${sim.basic.toFixed(1)}%</strong><div class="simbar"><span style="width:${sim.basic}%"></span></div></div><div><span>Contains any Pokémon</span><strong>${sim.pokemon.toFixed(1)}%</strong><div class="simbar"><span style="width:${sim.pokemon}%"></span></div></div><div><span>At least 3 distinct card names</span><strong>${sim.distinct3.toFixed(1)}%</strong><div class="simbar"><span style="width:${sim.distinct3}%"></span></div></div><div><span>4+ Trainers in sample</span><strong>${sim.trainerHeavy.toFixed(1)}%</strong><div class="simbar"><span style="width:${sim.trainerHeavy}%"></span></div></div></div>`:`<div class="simEmpty"><strong>${m.total<5?"Add at least 5 cards to begin.":"Ready to sample."}</strong><span>${m.total<5?"Open Deck Lab and finish the deck first.":"Run the simulator to calculate opening-hand consistency."}</span></div>`}</div>
 <div class="panel"><span class="eyebrow">REAL MATCHES</span><h2>Observed Performance</h2>${empirical?`<div class="resultbig">${empirical.wr.toFixed(1)}%</div><p class="muted">${empirical.w}-${empirical.n-empirical.w} over ${empirical.n} recorded matches</p><p>Approx. 95% interval: <strong>${empirical.low.toFixed(1)}%–${empirical.high.toFixed(1)}%</strong></p><p class="muted">Based only on your Battle Tracker results, never simulated win rate.</p>`:`<p class="muted">No recorded matches for this deck yet.</p><button onclick="state.page='matches';render()">Record Match</button>`}</div></div>
 <div class="panel simHistoryPanel"><div class="between"><div><span class="eyebrow">HISTORY</span><h2>Saved Simulation Runs</h2><p class="muted">${signedIn?"Synced to your Supabase account when signed in.":"Stored in this browser. Sign in to sync future runs across devices."}</p></div>${signedIn?`<span class="pill">SUPABASE</span>`:`<span class="pill">LOCAL</span>`}</div>${simulationHistoryHtml(d.id)}</div>
 ${advancedSimulationHtml(d)}
 <div class="grid"><div class="panel"><h2>Deck List Export</h2><p class="muted">Copy a clean deck-list format for compatible tools and future integrations.</p>${!d.energy?`<p class="bad">Set an energy type in Deck Lab first.</p>`:""}${!m.idsReady?`<p class="bad">Some cards are fallback/local records and do not have simulation-ready set IDs.</p>`:""}<div class="codebox">${esc(exportTxt||"No export available")}</div><div class="row" style="margin-top:10px"><button onclick="copyDeckGym('${d.id}')">Copy Export</button><button class="secondary" onclick="state.selected='${d.id}';state.page='decks';editor()">Edit Deck</button></div></div><div class="panel"><h2>Simulation Roadmap</h2><div class="switch"><span>Cloud simulation history</span><span class="pill">LIVE</span></div><div class="switch"><span>Deck vs. deck testing</span><span class="pill">LIVE</span></div><div class="switch"><span>Meta matchup testing</span><span class="pill">LIVE</span></div><div class="switch"><span>Replay timeline</span><span class="pill">LIVE</span></div><p class="muted">All roadmap tools are live. Matchup testing is evidence-based and clearly separated from a future full game-rules engine.</p></div></div>`;
 if(!skipHistoryLoad)setTimeout(()=>loadSimulationHistory(d.id),0);
}


function normalizeTimestampValue(value,...fallbacks){
 for(const v of [value,...fallbacks]){
   if(v==null||v==="")continue;
   const n=Number(v);if(Number.isFinite(n)&&n>0)return n;
   const p=Date.parse(v);if(Number.isFinite(p))return p;
 }
 return Date.now();
}
function normalizeResultValue(v){
 const r=String(v||"").trim().toLowerCase();
 if(["win","w","won","victory"].includes(r))return "win";
 if(["loss","l","lost","defeat"].includes(r))return "loss";
 return "unknown";
}
function normalizeMatch(m){
 if(!m||typeof m!=="object")return null;
 const timestamp=normalizeTimestampValue(m.timestamp,m.date,m.playedAt,m.createdAt);
 const deckId=m.deckId||m.deck_id||"";
 const deckName=m.deckName||m.deck||m.deck_name||state.decks.find(d=>d.id===deckId)?.name||"Unknown Deck";
 const opp=m.opponentArchetype||m.opponent||m.opponentDeck||m.opponent_deck||"Unknown";
 const result=normalizeResultValue(m.result);
 const turnRaw=(m.turnOrder||m.firstSecond||m.went_first||"unknown").toString().toLowerCase();
 const turnOrder=turnRaw.includes("second")?"second":turnRaw.includes("first")||turnRaw==="true"?"first":"unknown";
 const gameMode=m.gameMode||m.mode||(m.ranked?"ranked":"other");
 const rb=m.rankBefore&&typeof m.rankBefore==="object"?m.rankBefore:{tier:m.rankBeforeTier||"",points:m.rankBeforePoints??null};
 const ra=m.rankAfter&&typeof m.rankAfter==="object"?m.rankAfter:{tier:m.rankAfterTier||"",points:m.rankAfterPoints??m.rankPoints??null};
 const rankBefore={tier:rb.tier||"",points:rb.points===""||rb.points==null?null:Number(rb.points)};
 const rankAfter={tier:ra.tier||"",points:ra.points===""||ra.points==null?null:Number(ra.points)};
 const rankChange=Number.isFinite(Number(m.rankChange))?Number(m.rankChange):(Number.isFinite(rankAfter.points)&&Number.isFinite(rankBefore.points)?rankAfter.points-rankBefore.points:0);
 return {
   id:m.id||stableLegacyMatchId(m,timestamp,deckName,opp),timestamp,deckId,deckName,
   deckArchetype:m.deckArchetype||"",
   opponentArchetype:MetaAdapter?.normalizeArchetypeName?MetaAdapter.normalizeArchetypeName(opp):opp,
   opponentName:m.opponentName||"",
   result,
   turnOrder,gameMode,
   rankBefore,rankAfter,rankChange,
   sessionId:m.sessionId||null,tournament:m.tournament||"",
   durationMinutes:m.durationMinutes==null||m.durationMinutes===""?null:(Number.isFinite(Number(m.durationMinutes))?Number(m.durationMinutes):null),
   notes:m.notes||"",tags:Array.isArray(m.tags)?m.tags:(typeof m.tags==="string"?m.tags.split(",").map(x=>x.trim()).filter(Boolean):[]),
   legacy:!m.timestamp||!m.opponentArchetype||!m.rankBefore
 };
}
function normalizedMatches(){return (state.matches||[]).map(normalizeMatch).filter(Boolean)}
function migrateMatchesInMemory(){state.matches=normalizedMatches();save()}
function completedMatches(list=normalizedMatches()){return list.filter(m=>m.result==="win"||m.result==="loss"||m.result==="tie")}
function wl(list){const c=completedMatches(list),w=c.filter(m=>m.result==="win").length,l=c.filter(m=>m.result==="loss").length,t=c.filter(m=>m.result==="tie").length;return {n:c.length,w,l,t,wr:c.length?w/c.length*100:0}}
function streakInfo(list=completedMatches()){
 const a=[...list].sort((a,b)=>a.timestamp-b.timestamp);let bestWin=0,bestLoss=0,curW=0,curL=0;
 a.forEach(m=>{if(m.result==="win"){curW++;curL=0;bestWin=Math.max(bestWin,curW)}else if(m.result==="loss"){curL++;curW=0;bestLoss=Math.max(bestLoss,curL)}else{curW=0;curL=0}});
 let type="none",count=0;if(a.length&&a[a.length-1].result!=="tie"){type=a[a.length-1].result;for(let i=a.length-1;i>=0&&a[i].result===type;i--)count++}
 return {type,count,bestWin,bestLoss};
}

function battleArchetypeOptions(selected=""){
 const names=sharedArchetypeNames();
 return `<option value="">Select opponent archetype…</option>${names.map(n=>`<option value="${esc(n)}" ${selected===n?"selected":""}>${esc(n)}</option>`).join("")}<option value="__other__" ${selected==="__other__"?"selected":""}>Other / Not Listed</option>`;
}
function toggleOtherOpponent(){
 const sel=document.getElementById("btOpponentSelect"),wrap=document.getElementById("btOpponentOtherWrap");
 if(wrap)wrap.style.display=sel?.value==="__other__"?"block":"none";
}
function getBattleOpponentValue(){
 const sel=document.getElementById("btOpponentSelect");
 if(!sel)return "";
 if(sel.value==="__other__")return (document.getElementById("btOpponentOther")?.value||"").trim();
 return (sel.value||"").trim();
}

function recentArchetypes(){
 const seen=[];[...normalizedMatches()].sort((a,b)=>b.timestamp-a.timestamp).forEach(m=>{if(m.opponentArchetype&&m.opponentArchetype!=="Unknown"&&!seen.includes(m.opponentArchetype))seen.push(m.opponentArchetype)});
 return seen.slice(0,12);
}
function currentRankObj(){
 const r=state.rank||{};return {tier:r.tier||"Unranked",points:Number(r.points||0)};
}
function metaDeckId(a){return `meta:${a.id}`}
function metaDeckFromArchetype(a){
 if(!a)return null;
 return {id:metaDeckId(a),name:a.name,archetype:a.name,energy:a.type||"",cards:(a.sampleDeck||[]).map(c=>({id:c.cardId||c.code||c.name,name:c.name,qty:Number(c.quantity||1),quantity:Number(c.quantity||1),code:c.code||"",set:c.set||"",number:c.number||""})),source:"meta",metaArchetypeId:a.id,isMetaDeck:true};
}
function selectableMetaDecks(){
 const rows=(typeof ARCHETYPE_DATA!=="undefined"&&Array.isArray(ARCHETYPE_DATA)?ARCHETYPE_DATA:[]).filter(a=>a&&a.id&&a.name);
 return rows.slice().sort((a,b)=>(Number(a.stats?.rank)||999)-(Number(b.stats?.rank)||999)||String(a.name).localeCompare(String(b.name)));
}
function resolveSelectableDeck(id){
 if(!id)return null;
 const saved=(state.decks||[]).find(d=>String(d.id)===String(id));if(saved)return saved;
 if(String(id).startsWith("meta:")){const aid=String(id).slice(5);return metaDeckFromArchetype(selectableMetaDecks().find(a=>String(a.id)===aid));}
 return null;
}
function matchDeckOptions(selected=""){
 const mine=(state.decks||[]).map(d=>`<option value="${d.id}" ${String(d.id)===String(selected)?"selected":""}>${esc(d.name)}${d.energy?" • "+esc(d.energy):""}</option>`).join("");
 const meta=selectableMetaDecks().map(a=>`<option value="${metaDeckId(a)}" ${metaDeckId(a)===String(selected)?"selected":""}>${esc(a.name)}${a.stats?.rank?` • Meta #${a.stats.rank}`:""}</option>`).join("");
 return `${mine?`<optgroup label="My Decks">${mine}</optgroup>`:""}${meta?`<optgroup label="Meta Decks — ready to use">${meta}</optgroup>`:""}`;
}
let battleDraft={result:"",turnOrder:"unknown"};
let battleSaveNotice=null;
function setBattleResult(v){battleDraft.result=v;matches()}
function setTurnOrder(v){battleDraft.turnOrder=v;matches()}
function setBattleMode(v){state.battlePrefs.mode=v;save();matches()}
function battleFormHtml(){
 const pref=state.battlePrefs||{},rank=currentRankObj(),mode=pref.mode||"quick",lastDeck=pref.lastDeckId||state.decks[0]?.id||"";
 const recents=recentArchetypes().slice(0,6),lastTurn=pref.lastTurnOrder||battleDraft.turnOrder||"unknown";battleDraft.turnOrder=lastTurn;
 return `<div class="panel quickRecordPanel"><div class="between"><div><h2>Quick Record</h2><p class="muted">Pick a deck and opponent, then record the result.</p></div><div class="segmented"><button class="${mode==="quick"?"active":""}" onclick="setBattleMode('quick')">Quick</button><button class="${mode==="detailed"?"active":""}" onclick="setBattleMode('detailed')">Detailed</button></div></div>
 <label for="btDeck">My Deck</label><select id="btDeck">${matchDeckOptions(lastDeck)}</select>
 <label for="btQuickMode">Match Type</label><select id="btQuickMode" onchange="state.battlePrefs.quickGameMode=this.value;save()"><option value="ranked" ${(state.battlePrefs.quickGameMode||"ranked")==="ranked"?"selected":""}>Ranked (track result + streak)</option><option value="casual" ${state.battlePrefs.quickGameMode==="casual"?"selected":""}>Casual (no RP)</option></select>
 <label for="btOpponentSelect">Opponent Archetype</label>
 <select id="btOpponentSelect" onchange="toggleOtherOpponent()">${battleArchetypeOptions("")}</select>
 <div id="btOpponentOtherWrap" style="display:none;margin-top:8px"><label for="btOpponentOther" class="muted tiny">Other Archetype</label><input id="btOpponentOther" placeholder="Type opponent archetype name"></div>
 ${recents.length?`<div class="recentOpponentBlock"><span class="muted tiny">RECENT OPPONENTS</span><div class="recentOpponentChips">${recents.map(n=>`<button type="button" class="recentOpponentChip" onclick="chooseRecentOpponent('${esc(n).replace(/'/g,"&#39;")}')">${esc(n)}</button>`).join("")}</div></div>`:""}
 <label style="margin-top:12px">Turn Order</label><div class="segmented"><button class="${battleDraft.turnOrder==="first"?"active":""}" onclick="setQuickTurnOrder('first',this)">Went First</button><button class="${battleDraft.turnOrder==="second"?"active":""}" onclick="setQuickTurnOrder('second',this)">Went Second</button><button class="${battleDraft.turnOrder==="unknown"?"active":""}" onclick="setQuickTurnOrder('unknown',this)">Unknown</button></div>
 <div class="${mode==="detailed"?"":"hidden"}" id="detailedFields">
  <div class="form2" style="margin-top:12px"><div><label>Game Mode</label><select id="btMode"><option value="ranked">Ranked</option><option value="casual">Casual</option><option value="tournament">Tournament</option><option value="private">Private</option><option value="other">Other</option></select></div><div><label>Opponent Name</label><input id="btOpponentName" placeholder="Optional"></div></div>
  <div class="form2"><div><label>RP Before</label><input id="btRankBeforePoints" type="number" value="${rank.points}"><input id="btRankBeforeTier" type="hidden" value="${esc(rank.tier)}"></div><div><label>RP After</label><input id="btRankAfterPoints" type="number" placeholder="Optional"><input id="btRankAfterTier" type="hidden" value="${esc(rank.tier)}"></div></div>
  <div class="battleDetailMetaGrid"><div class="battleDateField"><label>Date/Time</label><input id="btDate" type="datetime-local"></div><div class="battleDurationField"><label>Duration (min)</label><input id="btDuration" type="number" min="0" placeholder="Optional"></div><div class="battleEventField"><label>Tournament/Event</label><input id="btTournament" placeholder="Optional"></div></div>
  <label>Tags</label><input id="btTags" placeholder="Misplay, Testing, Close Game"><label>Notes</label><textarea id="btNotes" placeholder="Optional match notes"></textarea>
 </div>
 <div id="battleValidation"></div><div class="quickResultActions"><button class="quickWin" onclick="quickRecordResult('win')">✓ WIN</button><button class="secondary" onclick="quickRecordResult('tie')">— TIE</button><button class="quickLoss" onclick="quickRecordResult('loss')">✕ LOSS</button></div></div>`;
}
function chooseRecentOpponent(name){const sel=document.getElementById("btOpponentSelect");if(!sel)return;const opt=[...sel.options].find(o=>o.value===name);if(opt){sel.value=name;toggleOtherOpponent()}else{sel.value="__other__";toggleOtherOpponent();const x=document.getElementById("btOpponentOther");if(x)x.value=name}}
function setQuickTurnOrder(v,btn){battleDraft.turnOrder=v;state.battlePrefs.lastTurnOrder=v;save();btn?.parentElement?.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===btn))}
function quickRecordResult(result){battleDraft.result=result;saveBattleMatch()}
function pocketRankTierFromRP(points){
 if(typeof rankTierFromPoints==="function")return rankTierFromPoints(points);
 const rp=Math.max(0,Math.floor(Number(points)||0));
 const rows=[
  [0,"Beginner 1"],[20,"Beginner 2"],[50,"Beginner 3"],[80,"Beginner 4"],
  [110,"Poké Ball 1"],[140,"Poké Ball 2"],[170,"Poké Ball 3"],[210,"Poké Ball 4"],
  [250,"Great Ball 1"],[290,"Great Ball 2"],[330,"Great Ball 3"],[380,"Great Ball 4"],
  [440,"Ultra Ball 1"],[510,"Ultra Ball 2"],[590,"Ultra Ball 3"],[690,"Ultra Ball 4"],[810,"Master Ball"]
 ];
 let tier=rows[0][1];for(const [min,name] of rows){if(rp>=min)tier=name;else break}return tier;
}
function pocketRankFamily(tier){const t=String(tier||"");if(t.startsWith("Beginner"))return "beginner";if(t.startsWith("Poké Ball")||t.startsWith("Poke Ball"))return "poke";if(t.startsWith("Great Ball"))return "great";if(t.startsWith("Ultra Ball"))return "ultra";if(t.startsWith("Master Ball"))return "master";return "beginner"}
function pocketRankFloorRP(tier){const family=pocketRankFamily(tier);return {beginner:0,poke:110,great:250,ultra:440,master:810}[family]??0}
function pocketLossRP(tier){return {beginner:0,poke:5,great:5,ultra:7,master:10}[pocketRankFamily(tier)]??0}
function masterBallLocalRP(result,currentStreak=0,tier="Beginner 1",beforeRP=0){
 const prev=Math.max(0,Number(currentStreak)||0),r=String(result||"").toLowerCase(),rp=Math.max(0,Math.floor(Number(beforeRP)||0));
 if(r==="win"){const next=prev+1,bonus=[0,0,3,6,9,12][Math.min(next,5)]||0;return {ok:true,previousStreak:prev,newStreak:next,streakBonus:bonus,rpChange:10+bonus}}
 if(r==="loss"){const loss=pocketLossRP(tier),floor=pocketRankFloorRP(tier),change=-Math.min(loss,Math.max(0,rp-floor));return {ok:true,previousStreak:prev,newStreak:0,streakBonus:0,rpChange:change}}
 if(r==="tie")return {ok:true,previousStreak:prev,newStreak:0,streakBonus:0,rpChange:0};
 return {ok:false,rpChange:0,previousStreak:prev,newStreak:prev,streakBonus:0};
}
async function applyRankedMatchRP(m){
 if(m.gameMode!=="ranked")return m;
 const beforeRP=Number.isFinite(Number(state.rank?.points))?Math.max(0,Math.floor(Number(state.rank.points))):0;
 const beforeStreak=Math.max(0,Number(state.rank?.streak)||0);
 const beforeTier=pocketRankTierFromRP(beforeRP);
 const calc=masterBallLocalRP(m.result,beforeStreak,beforeTier,beforeRP);
 const afterRP=Math.max(0,beforeRP+(Number(calc.rpChange)||0));
 const afterTier=pocketRankTierFromRP(afterRP);
 m.rankBefore={tier:beforeTier,points:beforeRP};
 m.rankAfter={tier:afterTier,points:afterRP};
 m.rankChange=afterRP-beforeRP;
 m.rankStreakBefore=beforeStreak;
 m.rankStreakAfter=Number(calc.newStreak)||0;
 m.streakBonusRP=Number(calc.streakBonus)||0;
 m.rankSync="auto";
 state.rank={...(state.rank||{}),tier:afterTier,points:afterRP,streak:m.rankStreakAfter};
 return m;
}
async function saveBattleMatch(){
 const deckId=document.getElementById("btDeck")?.value||"",opp=getBattleOpponentValue();
 const errors=[];if(!deckId)errors.push("Select a saved deck or a Meta deck.");if(!opp)errors.push("Select an opponent archetype, or choose Other and type one.");if(!["win","loss","tie"].includes(battleDraft.result))errors.push("Select WIN, LOSS, or TIE.");
 const mode=state.battlePrefs.mode||"quick";
 let rb=currentRankObj(),ra={tier:"",points:null},gm=(document.getElementById("btQuickMode")?.value||state.battlePrefs.quickGameMode||"ranked"),duration=null,tournament="",notes="",tags=[],opponentName="",timestamp=Date.now(),manualRankAfter=false;
 if(mode==="detailed"){
   gm=document.getElementById("btMode")?.value||"other";opponentName=(document.getElementById("btOpponentName")?.value||"").trim();
   const rbp=document.getElementById("btRankBeforePoints")?.value,rap=document.getElementById("btRankAfterPoints")?.value;
   rb={tier:(document.getElementById("btRankBeforeTier")?.value||"").trim(),points:rbp===""?null:Number(rbp)};
   ra={tier:(document.getElementById("btRankAfterTier")?.value||"").trim(),points:rap===""?null:Number(rap)};manualRankAfter=rap!=="";
   if(rbp!==""&&!Number.isFinite(rb.points))errors.push("Rank Before points must be numeric.");
   if(rap!==""&&!Number.isFinite(ra.points))errors.push("Rank After points must be numeric.");
   const dv=document.getElementById("btDuration")?.value;if(dv!==""){duration=Number(dv);if(!Number.isFinite(duration)||duration<0)errors.push("Duration must be a non-negative number.");}
   const dt=document.getElementById("btDate")?.value;if(dt){const parsed=Date.parse(dt);if(!Number.isFinite(parsed))errors.push("Enter a valid date/time.");else timestamp=parsed}
   tournament=(document.getElementById("btTournament")?.value||"").trim();notes=document.getElementById("btNotes")?.value||"";tags=(document.getElementById("btTags")?.value||"").split(",").map(x=>x.trim()).filter(Boolean);
 }
 if(errors.length){document.getElementById("battleValidation").innerHTML=`<div class="dangerBox" style="margin-top:12px">${errors.map(x=>`<div>• ${esc(x)}</div>`).join("")}</div>`;return}
 const deck=resolveSelectableDeck(deckId),rankChange=Number.isFinite(ra.points)&&Number.isFinite(rb.points)?ra.points-rb.points:0;
 const active=state.sessions.find(s=>!s.end);
 const m={id:makeId(),timestamp,deckId,deckName:deck?.name||"Unknown Deck",deckArchetype:deck?.archetype||"",opponentArchetype:MetaAdapter.normalizeArchetypeName(opp),opponentName,result:battleDraft.result,turnOrder:battleDraft.turnOrder,gameMode:gm,rankBefore:rb,rankAfter:ra,rankChange,sessionId:active?.id||null,tournament,durationMinutes:duration,notes,tags};
 if(gm==="ranked"&&!manualRankAfter)await applyRankedMatchRP(m);
 else if(gm==="ranked"&&manualRankAfter){const calc=masterBallLocalRP(m.result,state.rank?.streak||0,rb.tier||state.rank?.tier,rb.points??state.rank?.points);m.rankStreakBefore=calc.previousStreak;m.rankStreakAfter=calc.newStreak;m.streakBonusRP=calc.streakBonus;m.rankSync="manual";state.rank={...(state.rank||{}),tier:ra.tier||rb.tier||state.rank?.tier,points:ra.points,streak:calc.newStreak}}
 state.matches.push(m);state.battlePrefs.lastDeckId=deckId;state.battlePrefs.lastTurnOrder=m.turnOrder;state.battlePrefs.recentOpponent=m.opponentArchetype;state.battlePrefs.quickGameMode=gm;
 if(Number.isFinite(m.rankAfter?.points)){state.rank=state.rank||{};state.rank.tier=m.rankAfter.tier||m.rankBefore?.tier||state.rank.tier;state.rank.points=m.rankAfter.points;state.rank.streak=Number.isFinite(Number(m.rankStreakAfter))?Number(m.rankStreakAfter):state.rank.streak;upsertRankHistory(m)}
 save();
 battleDraft={result:"",turnOrder:"unknown"};
 battleSaveNotice={matchId:m.id,result:m.result,deckName:m.deckName,opponentArchetype:m.opponentArchetype,rankChange:m.rankChange,deckId:m.deckId,turnOrder:m.turnOrder,rankSync:m.rankSync||"",gameMode:m.gameMode,rankBeforePoints:m.rankBefore?.points,rankAfterPoints:m.rankAfter?.points,previousStreak:m.rankStreakBefore,currentStreak:m.rankStreakAfter,streakBonusRP:m.streakBonusRP};
 state.page="matches";
 render();
}
function renderBattleSaved(m){
 battleSaveNotice={matchId:m.id,result:m.result,deckName:m.deckName,opponentArchetype:m.opponentArchetype,rankChange:m.rankChange,deckId:m.deckId,turnOrder:m.turnOrder,rankSync:m.rankSync||"",gameMode:m.gameMode,rankBeforePoints:m.rankBefore?.points,rankAfterPoints:m.rankAfter?.points,previousStreak:m.rankStreakBefore,currentStreak:m.rankStreakAfter,streakBonusRP:m.streakBonusRP};
 state.page="matches";
 render();
}
function upsertRankHistory(m){
 state.rankHistory=state.rankHistory.filter(x=>x.matchId!==m.id);
 if(Number.isFinite(m.rankAfter?.points))state.rankHistory.push({id:makeId(),matchId:m.id,timestamp:m.timestamp,tier:m.rankAfter.tier||"",points:m.rankAfter.points,result:m.result,change:m.rankChange||0});
}
function deleteRankHistoryForMatch(id){state.rankHistory=state.rankHistory.filter(x=>x.matchId!==id)}
function battleFiltersHtml(){
 const rows=normalizedMatches(),decks=[...new Set(rows.map(m=>m.deckName).filter(Boolean))].sort(),opps=[...new Set(rows.map(m=>m.opponentArchetype).filter(Boolean))].sort();
 const sessions=(state.sessions||[]).map(s=>({s,count:rows.filter(m=>m.sessionId===s.id).length})).filter(x=>x.count>0).sort((a,b)=>(b.s.start||0)-(a.s.start||0));
 return `<div class="historyToolbar"><input id="bhSearch" placeholder="Search history..." oninput="state.battlePrefs.historyPage=0;renderBattleHistory()"><select id="bhDeck" onchange="state.battlePrefs.historyPage=0;renderBattleHistory()"><option value="">All decks</option>${decks.map(x=>`<option>${esc(x)}</option>`).join("")}</select><select id="bhOpp" onchange="state.battlePrefs.historyPage=0;renderBattleHistory()"><option value="">All opponents</option>${opps.map(x=>`<option>${esc(x)}</option>`).join("")}</select><select id="bhResult" onchange="state.battlePrefs.historyPage=0;renderBattleHistory()"><option value="">All results</option><option value="win">Wins</option><option value="loss">Losses</option><option value="tie">Ties</option></select><select id="bhTurn" onchange="state.battlePrefs.historyPage=0;renderBattleHistory()"><option value="">Any turn order</option><option value="first">Went First</option><option value="second">Went Second</option><option value="unknown">Unknown</option></select><select id="bhMode" onchange="state.battlePrefs.historyPage=0;renderBattleHistory()"><option value="">All modes</option><option value="ranked">Ranked</option><option value="casual">Casual</option><option value="tournament">Tournament</option><option value="private">Private</option><option value="other">Other</option></select><select id="bhSession" onchange="state.battlePrefs.historyPage=0;renderBattleHistory()"><option value="">All sessions</option><option value="__none__">No session</option>${sessions.map(({s,count})=>`<option value="${esc(s.id)}">${esc(s.name||"Battle Session")} · ${new Date(s.start).toLocaleDateString()} · ${count} match${count===1?"":"es"}</option>`).join("")}</select><input id="bhDate" type="date" aria-label="Filter by date" onchange="state.battlePrefs.historyPage=0;renderBattleHistory()"><select id="bhSort" onchange="renderBattleHistory()"><option value="new">Newest</option><option value="old">Oldest</option><option value="gain">RP gained</option><option value="lossrank">RP lost</option><option value="opp">Opponent</option><option value="deck">My deck</option></select></div>`;
}
function battleFiltered(){
 const q=(document.getElementById("bhSearch")?.value||"").toLowerCase(),deck=document.getElementById("bhDeck")?.value||"",opp=document.getElementById("bhOpp")?.value||"",res=document.getElementById("bhResult")?.value||"",turn=document.getElementById("bhTurn")?.value||"",mode=document.getElementById("bhMode")?.value||"",session=document.getElementById("bhSession")?.value||"",date=document.getElementById("bhDate")?.value||"",sort=document.getElementById("bhSort")?.value||"new";
 let a=normalizedMatches().filter(m=>(!q||[m.deckName,m.deckArchetype,m.opponentArchetype,m.opponentName,m.notes,m.tournament,...(m.tags||[])].join(" ").toLowerCase().includes(q))&&(!deck||m.deckName===deck)&&(!opp||m.opponentArchetype===opp)&&(!res||m.result===res)&&(!turn||m.turnOrder===turn)&&(!mode||m.gameMode===mode)&&(!session||(session==="__none__"?!m.sessionId:m.sessionId===session))&&(!date||new Date(m.timestamp).toISOString().slice(0,10)===date));
 a.sort((x,y)=>sort==="old"?x.timestamp-y.timestamp:sort==="gain"?(y.rankChange||0)-(x.rankChange||0):sort==="lossrank"?(x.rankChange||0)-(y.rankChange||0):sort==="opp"?x.opponentArchetype.localeCompare(y.opponentArchetype):sort==="deck"?x.deckName.localeCompare(y.deckName):y.timestamp-x.timestamp);return a;
}
function renderBattleHistory(){
 const root=document.getElementById("battleHistory");if(!root)return;
 const all=battleFiltered(),size=Number(state.battlePrefs.pageSize||25),pages=Math.max(1,Math.ceil(all.length/size));state.battlePrefs.historyPage=Math.min(state.battlePrefs.historyPage||0,pages-1);
 const start=state.battlePrefs.historyPage*size,shown=all.slice(start,start+size);
 root.innerHTML=`<div class="between"><span class="muted">${all.length} matches</span><select style="width:auto" onchange="state.battlePrefs.pageSize=Number(this.value);state.battlePrefs.historyPage=0;save();renderBattleHistory()"><option ${size===25?"selected":""}>25</option><option ${size===50?"selected":""}>50</option><option ${size===100?"selected":""}>100</option></select></div>${shown.map(matchCardHtml).join("")||`<p class="muted">No matching Battle Log records.</p>`}<div class="pager"><button class="secondary" ${state.battlePrefs.historyPage===0?"disabled":""} onclick="state.battlePrefs.historyPage--;renderBattleHistory()">← Previous</button><span>${start+1}-${Math.min(start+size,all.length)} of ${all.length}</span><button class="secondary" ${state.battlePrefs.historyPage>=pages-1?"disabled":""} onclick="state.battlePrefs.historyPage++;renderBattleHistory()">Next →</button></div>`;
 save();
}
function matchCardHtml(m){
 const session=(state.sessions||[]).find(s=>s.id===m.sessionId);
 return `<div class="matchCard" onclick="openMatchDetails('${m.id}')"><div class="between"><div><span class="resultPill ${m.result}">${m.result.toUpperCase()}</span> <strong>${esc(m.deckName)}</strong><div class="muted tiny">vs ${esc(m.opponentArchetype)} • ${m.turnOrder==="first"?"Went First":m.turnOrder==="second"?"Went Second":"Order Unknown"} • ${esc(m.gameMode)}${session?` • ${esc(session.name||"Session")}`:""}</div></div><div style="text-align:right"><strong>${m.rankChange>0?"+":""}${m.rankChange||0} RP</strong><div class="muted tiny">${new Date(m.timestamp).toLocaleString()}</div></div></div></div>`;
}
function openMatchDetails(id){
 const m=normalizedMatches().find(x=>x.id===id);if(!m)return;
 document.getElementById("cardModalBody").innerHTML=`<div class="between"><div><h2>${m.result.toUpperCase()} — ${esc(m.deckName)}</h2><div class="muted">vs ${esc(m.opponentArchetype)}</div></div><button class="secondary" onclick="closeCardModal()">Close</button></div><div class="grid" style="margin-top:14px"><div class="metric"><div class="l">Turn Order</div><div class="n" style="font-size:18px">${m.turnOrder}</div></div><div class="metric"><div class="l">Game Mode</div><div class="n" style="font-size:18px">${esc(m.gameMode)}</div></div><div class="metric"><div class="l">Rank Change</div><div class="n">${m.rankChange>0?"+":""}${m.rankChange}</div></div></div><p><strong>Date:</strong> ${new Date(m.timestamp).toLocaleString()}</p><p><strong>Opponent Name:</strong> ${esc(m.opponentName||"—")}</p><p><strong>Tournament:</strong> ${esc(m.tournament||"—")}</p><p><strong>Duration:</strong> ${m.durationMinutes??"—"} min</p><p><strong>Notes:</strong><br>${esc(m.notes||"—")}</p><p><strong>Tags:</strong> ${(m.tags||[]).map(t=>`<span class="pill">${esc(t)}</span>`).join(" ")||"—"}</p><div class="row"><button onclick="editMatch('${m.id}')">Edit Match</button><button class="secondary" onclick="duplicateMatch('${m.id}')">Duplicate Match</button><button class="danger" onclick="deleteMatch('${m.id}')">Delete Match</button></div>`;
 document.getElementById("cardModal").style.display="flex";
}
async function duplicateMatch(id){
 const m=normalizedMatches().find(x=>x.id===id);if(!m)return;
 const copy={...m,id:makeId(),timestamp:Date.now(),notes:(m.notes||"")+" [Duplicated]"};
 if(copy.gameMode==="ranked"){
  copy.rankBefore={tier:"",points:null};copy.rankAfter={tier:"",points:null};copy.rankChange=0;
  delete copy.rankStreakBefore;delete copy.rankStreakAfter;delete copy.streakBonusRP;delete copy.rankSync;
  await applyRankedMatchRP(copy);upsertRankHistory(copy);
 }
 state.matches.push(copy);save();closeCardModal();render();
}
function rollbackRankedMatchIfCurrent(m){
 if(!m||m.gameMode!=="ranked")return false;
 const after=Number(m.rankAfter?.points),before=Number(m.rankBefore?.points);
 if(!Number.isFinite(after)||!Number.isFinite(before)||Number(state.rank?.points)!==after)return false;
 const later=normalizedMatches().some(x=>x.id!==m.id&&x.gameMode==="ranked"&&Number(x.timestamp)>Number(m.timestamp));
 if(later)return false;
 state.rank={...(state.rank||{}),tier:pocketRankTierFromRP(before),points:before,streak:Number(m.rankStreakBefore||0)};
 return true;
}
function deleteMatch(id){
 const m=normalizedMatches().find(x=>x.id===id);if(!m)return;
 PPCUI.open({eyebrow:"BATTLE LOG",title:"Delete this match?",message:`${esc(m.deckName)} vs ${esc(m.opponentArchetype)} • ${esc(m.result.toUpperCase())}. This cannot be undone from the Battle Log.`,actions:[{label:"Cancel",className:"secondary",onclick:"PPCUI.close()"},{label:"Delete Match",className:"danger",onclick:`performDeleteMatch('${esc(id)}')`}]});
}
function performDeleteMatch(id){
 const existing=normalizedMatches().find(m=>m.id===id);
 rollbackRankedMatchIfCurrent(existing);
 state.matches=state.matches.filter(m=>m.id!==id);deleteRankHistoryForMatch(id);save();PPCUI.close();render();
}
function editMatch(id){
 const m=normalizedMatches().find(x=>x.id===id);if(!m)return;
 document.getElementById("cardModalBody").innerHTML=`<h2>Edit Match</h2><label>Result</label><select id="emResult"><option value="win" ${m.result==="win"?"selected":""}>Win</option><option value="loss" ${m.result==="loss"?"selected":""}>Loss</option><option value="tie" ${m.result==="tie"?"selected":""}>Tie</option></select><label>Deck</label><select id="emDeck">${matchDeckOptions(m.deckId)}</select><label>Opponent Archetype</label>
<select id="emOppSelect" onchange="toggleEditOtherOpponent()">${battleArchetypeOptions(sharedArchetypeNames().includes(m.opponentArchetype)?m.opponentArchetype:"__other__")}</select>
<div id="emOppOtherWrap" style="${sharedArchetypeNames().includes(m.opponentArchetype)?"display:none":"display:block"};margin-top:8px"><input id="emOppOther" value="${sharedArchetypeNames().includes(m.opponentArchetype)?"":esc(m.opponentArchetype)}" placeholder="Type opponent archetype"></div><label>Turn Order</label><select id="emTurn"><option value="first" ${m.turnOrder==="first"?"selected":""}>First</option><option value="second" ${m.turnOrder==="second"?"selected":""}>Second</option><option value="unknown" ${m.turnOrder==="unknown"?"selected":""}>Unknown</option></select><div class="form2"><div><label>Rank Before Points</label><input id="emRb" type="number" value="${m.rankBefore?.points??""}"></div><div><label>Rank After Points</label><input id="emRa" type="number" value="${m.rankAfter?.points??""}"></div></div><label>Notes</label><textarea id="emNotes">${esc(m.notes||"")}</textarea><label>Tags</label><input id="emTags" value="${esc((m.tags||[]).join(", "))}"><div class="row"><button onclick="saveEditedMatch('${m.id}')">Save Changes</button><button class="secondary" onclick="openMatchDetails('${m.id}')">Cancel</button></div>`;
}

function toggleEditOtherOpponent(){
 const sel=document.getElementById("emOppSelect"),wrap=document.getElementById("emOppOtherWrap");
 if(wrap)wrap.style.display=sel?.value==="__other__"?"block":"none";
}
function getEditedOpponentValue(){
 const sel=document.getElementById("emOppSelect");
 if(!sel)return "";
 return sel.value==="__other__"?(document.getElementById("emOppOther")?.value||"").trim():(sel.value||"").trim();
}

function saveEditedMatch(id){
 const idx=state.matches.findIndex(x=>x.id===id);if(idx<0)return;const original=normalizeMatch(state.matches[idx]);let m=normalizeMatch(state.matches[idx]),deckId=document.getElementById("emDeck").value,deck=state.decks.find(d=>d.id===deckId),rb=document.getElementById("emRb").value,ra=document.getElementById("emRa").value;
 m={...m,result:document.getElementById("emResult").value,deckId,deckName:deck?.name||m.deckName,opponentArchetype:MetaAdapter.normalizeArchetypeName(getEditedOpponentValue()),turnOrder:document.getElementById("emTurn").value,rankBefore:{...m.rankBefore,points:rb===""?null:Number(rb)},rankAfter:{...m.rankAfter,points:ra===""?null:Number(ra)},notes:document.getElementById("emNotes").value,tags:document.getElementById("emTags").value.split(",").map(x=>x.trim()).filter(Boolean)};
 if(Number.isFinite(m.rankBefore.points))m.rankBefore.tier=pocketRankTierFromRP(m.rankBefore.points);
 if(Number.isFinite(m.rankAfter.points))m.rankAfter.tier=pocketRankTierFromRP(m.rankAfter.points);
 // QA 8.50.5: if an auto-ranked result changes, recalculate RP/streak from the recorded pre-match state.
 if(m.gameMode==="ranked"&&original.rankSync==="auto"&&m.result!==original.result&&Number.isFinite(Number(m.rankBefore.points))){
  const calc=masterBallLocalRP(m.result,Number(original.rankStreakBefore||0),pocketRankTierFromRP(m.rankBefore.points),m.rankBefore.points);
  m.rankStreakBefore=Number(original.rankStreakBefore||0);m.rankStreakAfter=Number(calc.newStreak||0);m.streakBonusRP=Number(calc.streakBonus||0);
  m.rankAfter={tier:pocketRankTierFromRP(Number(m.rankBefore.points)+Number(calc.rpChange||0)),points:Math.max(0,Number(m.rankBefore.points)+Number(calc.rpChange||0))};m.rankSync="auto";
 }
 m.rankChange=Number.isFinite(m.rankAfter.points)&&Number.isFinite(m.rankBefore.points)?m.rankAfter.points-m.rankBefore.points:0;state.matches[idx]=m;upsertRankHistory(m);
 const laterRanked=normalizedMatches().some(x=>x.id!==m.id&&x.gameMode==="ranked"&&Number(x.timestamp)>Number(m.timestamp));
 if(m.gameMode==="ranked"&&!laterRanked&&Number.isFinite(m.rankAfter.points)){state.rank={...(state.rank||{}),tier:pocketRankTierFromRP(m.rankAfter.points),points:Number(m.rankAfter.points),streak:Number(m.rankStreakAfter??state.rank?.streak??0)}}
 save();openMatchDetails(id);
}
function statisticsSeasonStart(){
 try{
  const svc=window.PPCRankBorderService;
  const season=state.rankBorder?.season||"B4";
  const data=svc?.getData?.(season);
  const t=Date.parse(data?.season?.startsAt||"");
  if(Number.isFinite(t))return t;
 }catch(e){}
 return null;
}
function statisticsRangeLabel(range=state.battlePrefs?.statsRange||"all"){
 return range==="7d"?"Last 7 Days":range==="30d"?"Last 30 Days":range==="season"?"Current Season":"All Time";
}
function statisticsWindowMatches(range=state.battlePrefs?.statsRange||"all"){
 const a=completedMatches().slice().sort((x,y)=>(x.timestamp||0)-(y.timestamp||0));
 if(range==="all")return a;
 const now=Date.now();
 if(range==="7d")return a.filter(m=>now-Number(m.timestamp||0)<=7*86400000);
 if(range==="30d")return a.filter(m=>now-Number(m.timestamp||0)<=30*86400000);
 if(range==="season"){
  const start=statisticsSeasonStart();
  return start==null?a:a.filter(m=>Number(m.timestamp||0)>=start);
 }
 return a;
}
function statisticsRangeControls(){
 const selected=state.battlePrefs.statsRange||"all";
 return `<div class="statsRangeControl" role="group" aria-label="Statistics time range">${[["7d","7D"],["30d","30D"],["season","SEASON"],["all","ALL"]].map(([k,n])=>`<button class="secondary ${selected===k?"active":""}" onclick="state.battlePrefs.statsRange='${k}';save();statisticsPage()">${n}</button>`).join("")}</div>`;
}
const BattleAnalytics={
 overall(list=completedMatches()){return wl(list)},
 byDeck(list=completedMatches()){const o={};list.forEach(m=>{o[m.deckName]=o[m.deckName]||[];o[m.deckName].push(m)});return Object.entries(o).map(([name,a])=>({name,...wl(a)})).sort((a,b)=>b.n-a.n)},
 byOpponent(list=completedMatches()){const o={};list.forEach(m=>{o[m.opponentArchetype]=o[m.opponentArchetype]||[];o[m.opponentArchetype].push(m)});return Object.entries(o).map(([name,a])=>({name,...wl(a)})).sort((a,b)=>b.n-a.n)},
 turnOrder(list=completedMatches()){return {first:wl(list.filter(m=>m.turnOrder==="first")),second:wl(list.filter(m=>m.turnOrder==="second"))}},
 streaks(list=completedMatches()){const a=list.slice().sort((x,y)=>(x.timestamp||0)-(y.timestamp||0));let currentType="none",current=0,bestWin=0,bestLoss=0;for(const m of a){const t=m.result;if(t!=="win"&&t!=="loss")continue;if(t===currentType)current++;else{currentType=t;current=1}if(t==="win")bestWin=Math.max(bestWin,current);else bestLoss=Math.max(bestLoss,current)}return{type:currentType,count:a.length?current:0,bestWin,bestLoss}},
 rankProgress(list=completedMatches()){const ids=new Set(list.map(m=>m.id));return [...state.rankHistory].filter(x=>!x.matchId||ids.has(x.matchId)).sort((a,b)=>a.timestamp-b.timestamp)},
 trends(){const a=[...completedMatches()].sort((a,b)=>b.timestamp-a.timestamp);const calc=n=>wl(a.slice(0,n));const now=Date.now();return {last5:calc(5),last10:calc(10),last25:calc(25),last50:calc(50),all:wl(a),d7:wl(a.filter(m=>now-m.timestamp<=7*86400000)),d30:wl(a.filter(m=>now-m.timestamp<=30*86400000))}},
 sessions(){return state.sessions.map(s=>sessionSummary(s))}
};
function startSession(){
 if(state.sessions.some(s=>!s.end))return ppcNotice("A battle session is already active.");
 const d=state.battlePrefs.lastDeckId||state.decks[0]?.id||"",type=document.getElementById("sessionType")?.value||"Ranked Grind",custom=(document.getElementById("sessionName")?.value||"").trim();state.sessions.push({id:makeId(),start:Date.now(),end:null,deckId:d,type,name:custom||type});save();matches();
}
function endSession(){const s=state.sessions.find(s=>!s.end);if(!s)return;s.end=Date.now();save();matches()}
function sessionSummary(s){
 const ms=normalizedMatches().filter(m=>m.sessionId===s.id),r=wl(ms),rank=ms.reduce((n,m)=>n+(Number(m.rankChange)||0),0),st=streakInfo(ms),counts={};ms.forEach(m=>counts[m.opponentArchetype]=(counts[m.opponentArchetype]||0)+1);const common=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]||"—";
 const ranked=ms.filter(m=>m.gameMode==="ranked");
 const rpTracked=ranked.some(m=>Boolean(m.rankSync)||Number.isFinite(Number(m.rankBefore?.points))&&Number.isFinite(Number(m.rankAfter?.points))&&Number(m.rankAfter?.points)!==Number(m.rankBefore?.points));
 const groups={};ms.forEach(m=>(groups[m.opponentArchetype]=groups[m.opponentArchetype]||[]).push(m));const rated=Object.entries(groups).map(([name,a])=>({name,...wl(a)})).filter(x=>x.n>=2).sort((a,b)=>b.wr-a.wr);return {...s,matches:r.n,w:r.w,l:r.l,wr:r.wr,rankChange:rank,rankedMatches:ranked.length,rpTracked,durationMinutes:Math.round(((s.end||Date.now())-s.start)/60000),streak:st,mostCommon:common,bestMatchup:rated[0]?.name||"—",hardestMatchup:rated.at(-1)?.name||"—"};
}
function sessionRPLabel(x){
 if(!x.rankedMatches)return `<span class="sessionRpNeutral">Casual / no ranked RP</span>`;
 if(!x.rpTracked)return `<span class="sessionRpLegacy">Legacy • RP not tracked</span>`;
 return `<span class="${x.rankChange>=0?"sessionRpGood":"sessionRpBad"}">${x.rankChange>0?"+":""}${x.rankChange} RP</span>`;
}
function sessionCardHtml(s){
 const x=sessionSummary(s);return `<div class="sessionCard ${x.matches===0?"sessionEmpty":""}"><div class="between"><div><strong>${esc(s.name||"Battle Session")}</strong><div class="muted tiny">${new Date(s.start).toLocaleString()}</div></div><span class="pill">${s.end?"Ended":"Active"}</span></div><div class="sessionMetrics"><span>${x.w}-${x.l}</span><span>${x.matches?x.wr.toFixed(1)+"%":"—"}</span>${sessionRPLabel(x)}<span>${x.durationMinutes} min</span><span>${x.streak.type==="none"?"—":(x.streak.type==="win"?"W":"L")+x.streak.count} current</span></div><div class="muted tiny">Most faced: ${esc(x.mostCommon)} • Best: ${esc(x.bestMatchup)} • Hardest: ${esc(x.hardestMatchup)}</div></div>`;
}
function sessionHistoryHtml(){
 if(!state.sessions.length)return `<p class="muted">No battle sessions yet.</p>`;
 const ordered=[...state.sessions].sort((a,b)=>(b.start||0)-(a.start||0)),active=ordered.find(s=>!s.end)||null,past=ordered.filter(s=>s.end&&sessionSummary(s).matches>0),emptyCount=ordered.filter(s=>s.end&&sessionSummary(s).matches===0).length;
 return `${active?`<div class="sessionGroupLabel">ACTIVE SESSION</div>${sessionCardHtml(active)}`:""}${past.length?`<details class="pastSessions" ${active?"":"open"}><summary>Past Sessions <span class="pill">${past.length}</span></summary><div class="pastSessionsList">${past.map(sessionCardHtml).join("")}</div></details>`:`${active?"":`<p class="muted">No completed sessions with matches yet.</p>`}`}${emptyCount?`<p class="muted tiny sessionCleanupNote">${emptyCount} empty past session${emptyCount===1?" is":"s are"} hidden.</p>`:""}`;
}
function activeSessionBar(active){if(!active)return "";const x=sessionSummary(active);return `<div class="liveSessionBar"><div><span class="liveDot">●</span><strong>${esc(active.name||"Battle Session")}</strong></div><div class="liveSessionStats"><span>${x.matches} Matches</span><span>${x.w}-${x.l}</span><span>${x.matches?x.wr.toFixed(0)+"%":"—"}</span><span>${x.rankChange>0?"+":""}${x.rankChange} RP</span><span>${x.streak.type==="none"?"—":(x.streak.type==="win"?"W":"L")+x.streak.count}</span></div><div class="row"><button onclick="document.querySelector('.quickRecordPanel')?.scrollIntoView({behavior:'smooth'})">Record Match</button><button class="danger" onclick="endSession()">End Session</button></div></div>`}
function sessionStartControls(){return `<div class="sessionStart"><select id="sessionType"><option>Ranked Grind</option><option>Tournament Practice</option><option>Deck Testing</option><option>Casual</option><option>Custom</option></select><input id="sessionName" placeholder="Optional session name"><button class="secondary" onclick="startSession()">Start Session</button></div>`}
function rankChartSvg(list=completedMatches()){
 const a=BattleAnalytics.rankProgress(list);if(a.length<2)return `<p class="muted">Record at least two ranked matches with rank points to show progression.</p>`;
 const pts=a.map(x=>x.points),min=Math.min(...pts),max=Math.max(...pts),w=720,h=190,pad=20,range=Math.max(1,max-min);
 const coords=a.map((x,i)=>[pad+i*(w-2*pad)/Math.max(1,a.length-1),h-pad-(x.points-min)*(h-2*pad)/range]);
 const poly=coords.map(p=>p.join(",")).join(" ");
 return `<svg class="rankChart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Rank progression chart"><polyline fill="none" stroke="currentColor" stroke-width="3" points="${poly}"></polyline>${coords.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="4"><title>${a[i].points} points</title></circle>`).join("")}</svg>`;
}
function matchupMatrixHtml(list=completedMatches()){
 const decks=[...new Set(list.map(m=>m.deckName))],opps=[...new Set(list.map(m=>m.opponentArchetype))].slice(0,12),min=Number(state.battlePrefs.matrixMin||3);
 if(!decks.length||!opps.length)return `<p class="muted">Not enough Battle Log data yet.</p>`;
 return `<div class="between"><h3>Matchup Matrix</h3><select style="width:auto" onchange="state.battlePrefs.matrixMin=Number(this.value);save();statisticsPage()"><option value="1" ${min===1?"selected":""}>Min 1</option><option value="3" ${min===3?"selected":""}>Min 3</option><option value="5" ${min===5?"selected":""}>Min 5</option><option value="10" ${min===10?"selected":""}>Min 10</option></select></div><div class="matrixWrap"><table class="matrix"><tr><th>My Deck</th>${opps.map(o=>`<th>${esc(o)}</th>`).join("")}</tr>${decks.map(d=>`<tr><th>${esc(d)}</th>${opps.map(o=>{const r=wl(list.filter(m=>m.deckName===d&&m.opponentArchetype===o));return `<td>${r.n>=min?`${r.wr.toFixed(0)}%<br><span class="muted tiny">${r.w}-${r.l}</span>`:"—"}</td>`}).join("")}</tr>`).join("")}</table></div>`;
}

function winLossTrendSvg(list=completedMatches()){
 const rows=list.slice().sort((a,b)=>(a.timestamp||0)-(b.timestamp||0));
 if(!rows.length)return `<div class="winLossEmpty"><strong>No match graph yet</strong><span>Record wins and losses in Battle Tracker to build your trend.</span></div>`;
 const points=[];let wins=0,losses=0;
 rows.forEach((m,i)=>{if(m.result==="win")wins++;else if(m.result==="loss")losses++;points.push({i:i+1,wins,losses,result:m.result,date:m.timestamp?new Date(m.timestamp):null});});
 const w=760,h=270,padL=46,padR=24,padT=28,padB=42;
 const maxY=Math.max(1,wins,losses),plotW=w-padL-padR,plotH=h-padT-padB;
 const x=i=>padL+(points.length===1?plotW/2:(i/(points.length-1))*plotW);
 const y=v=>padT+plotH-(v/maxY)*plotH;
 const winPoly=points.map((p,i)=>`${x(i).toFixed(1)},${y(p.wins).toFixed(1)}`).join(' ');
 const lossPoly=points.map((p,i)=>`${x(i).toFixed(1)},${y(p.losses).toFixed(1)}`).join(' ');
 const ticks=4;
 const grid=Array.from({length:ticks+1},(_,i)=>{const v=Math.round(maxY*i/ticks),yy=y(v);return `<g><line x1="${padL}" y1="${yy}" x2="${w-padR}" y2="${yy}" class="wlGrid"/><text x="${padL-10}" y="${yy+4}" text-anchor="end" class="wlAxisText">${v}</text></g>`}).join('');
 const labels=[0,Math.floor((points.length-1)/2),points.length-1].filter((v,i,a)=>a.indexOf(v)===i).map(i=>`<text x="${x(i)}" y="${h-14}" text-anchor="middle" class="wlAxisText">Match ${i+1}</text>`).join('');
 const last=points[points.length-1],wr=(wins+losses)?wins/(wins+losses)*100:0;
 return `<div class="winLossChartCard"><div class="winLossChartHead"><div><h2>Win / Loss Trend</h2><p class="muted">Cumulative results across your recorded matches.</p></div><div class="winLossLegend"><span><i class="wlLegendWin"></i>Wins ${wins}</span><span><i class="wlLegendLoss"></i>Losses ${losses}</span><strong>${wr.toFixed(1)}% WR</strong></div></div><div class="winLossChartScroll"><svg class="winLossChart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Cumulative wins and losses graph">${grid}<polyline class="wlWinLine" points="${winPoly}"/><polyline class="wlLossLine" points="${lossPoly}"/>${points.map((p,i)=>`<circle class="${p.result==="win"?"wlWinDot":"wlLossDot"}" cx="${x(i)}" cy="${y(p.result==="win"?p.wins:p.losses)}" r="3.5"><title>Match ${i+1}: ${p.result==="win"?"Win":"Loss"} • ${p.wins}-${p.losses}${p.date?` • ${p.date.toLocaleDateString()}`:""}</title></circle>`).join('')}${labels}</svg></div><div class="winLossChartFoot"><span>Start</span><span>${points.length} total match${points.length===1?'':'es'}</span><span>${last.wins}-${last.losses}</span></div></div>`;
}

function winRateOverTimeSvg(list=completedMatches()){
 const rows=list.slice().sort((a,b)=>(a.timestamp||0)-(b.timestamp||0));
 if(!rows.length)return `<div class="winLossEmpty"><strong>No win-rate trend yet</strong><span>Record matches to see how your win rate changes over time.</span></div>`;
 let wins=0;const points=rows.map((m,i)=>{if(m.result==="win")wins++;return{i:i+1,wr:wins/(i+1)*100,result:m.result,date:m.timestamp?new Date(m.timestamp):null}});
 const w=760,h=270,padL=48,padR=24,padT=26,padB=42,plotW=w-padL-padR,plotH=h-padT-padB;
 const x=i=>padL+(points.length===1?plotW/2:(i/(points.length-1))*plotW),y=v=>padT+plotH-(v/100)*plotH;
 const poly=points.map((p,i)=>`${x(i).toFixed(1)},${y(p.wr).toFixed(1)}`).join(" ");
 const grid=[0,25,50,75,100].map(v=>`<g><line x1="${padL}" y1="${y(v)}" x2="${w-padR}" y2="${y(v)}" class="wlGrid"/><text x="${padL-10}" y="${y(v)+4}" text-anchor="end" class="wlAxisText">${v}%</text></g>`).join("");
 const labels=[0,Math.floor((points.length-1)/2),points.length-1].filter((v,i,a)=>a.indexOf(v)===i).map(i=>`<text x="${x(i)}" y="${h-14}" text-anchor="middle" class="wlAxisText">${points[i].date?points[i].date.toLocaleDateString():`Match ${i+1}`}</text>`).join("");
 const last=points[points.length-1];
 return `<div class="winLossChartCard winRateTrendCard"><div class="winLossChartHead"><div><h2>Win Rate Over Time</h2><p class="muted">Running win rate for ${esc(statisticsRangeLabel())}.</p></div><div class="winLossLegend"><strong>${last.wr.toFixed(1)}% current</strong><span>${rows.length} match${rows.length===1?"":"es"}</span></div></div><div class="winLossChartScroll"><svg class="winLossChart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Win rate over time graph">${grid}<line x1="${padL}" y1="${y(50)}" x2="${w-padR}" y2="${y(50)}" class="wrBaseline"/><polyline class="wrTrendLine" points="${poly}"/>${points.map((p,i)=>`<circle class="wrTrendDot" cx="${x(i)}" cy="${y(p.wr)}" r="3.5"><title>${p.date?p.date.toLocaleString():`Match ${i+1}`} • ${p.wr.toFixed(1)}% WR • ${p.result.toUpperCase()}</title></circle>`).join("")}${labels}</svg></div><div class="winLossChartFoot"><span>0%</span><span>50% reference</span><span>100%</span></div></div>`;
}
function analyticsRpSummary(list){
 const ranked=list.filter(m=>Number.isFinite(Number(m.rankChange))&&Number(m.rankChange)!==0);
 const net=ranked.reduce((n,m)=>n+Number(m.rankChange||0),0),gains=ranked.filter(m=>Number(m.rankChange)>0),losses=ranked.filter(m=>Number(m.rankChange)<0);
 return {net,n:ranked.length,avg:ranked.length?net/ranked.length:0,best:gains.length?Math.max(...gains.map(m=>Number(m.rankChange))):0,worst:losses.length?Math.min(...losses.map(m=>Number(m.rankChange))):0};
}
function analyticsDeckRp(list){
 const o={};list.forEach(m=>{const k=m.deckName||"Unknown Deck";o[k]=o[k]||[];o[k].push(m)});
 return Object.entries(o).map(([name,a])=>{const r=wl(a),rp=analyticsRpSummary(a);return{name,...r,rp:rp.net,rpMatches:rp.n,avgRp:rp.avg}}).sort((a,b)=>b.rp-a.rp||b.n-a.n);
}
function analyticsMatchupIntelligence(list){
 const min=Number(state.battlePrefs.matchupIntelMin||3),rows=BattleAnalytics.byOpponent(list).filter(x=>x.n>=min).map(x=>{const games=list.filter(m=>m.opponentArchetype===x.name),rp=analyticsRpSummary(games);return{...x,rp:rp.net,avgRp:rp.avg}});
 return {min,best:[...rows].sort((a,b)=>b.wr-a.wr||b.n-a.n).slice(0,5),worst:[...rows].filter(x=>x.wr<50||x.rp<0).sort((a,b)=>a.wr-b.wr||a.rp-b.rp||b.n-a.n).slice(0,5),rows:[...rows].sort((a,b)=>b.n-a.n)};
}
function rpProgressionSvg(list){
 const a=list.filter(m=>Number.isFinite(Number(m.rankBefore?.points))||Number.isFinite(Number(m.rankAfter?.points))).slice().sort((x,y)=>(x.timestamp||0)-(y.timestamp||0));
 if(!a.length)return `<div class="winLossEmpty"><strong>No RP graph yet</strong><span>Record Rank Before and Rank After in Battle Tracker.</span></div>`;
 const points=[];a.forEach((m,i)=>{const before=Number(m.rankBefore?.points),after=Number(m.rankAfter?.points);if(i===0&&Number.isFinite(before))points.push({v:before,label:"Start",m});if(Number.isFinite(after))points.push({v:after,label:`Match ${i+1}`,m});});
 if(points.length<2)return `<div class="winLossEmpty"><strong>Need more RP data</strong><span>Record at least two RP values to show progression.</span></div>`;
 const vals=points.map(p=>p.v),min=Math.min(...vals),max=Math.max(...vals),w=760,h=270,pL=54,pR=24,pT=28,pB=42,range=Math.max(20,max-min),lo=min-Math.max(10,range*.12),hi=max+Math.max(10,range*.12),plotW=w-pL-pR,plotH=h-pT-pB;
 const x=i=>pL+i*plotW/Math.max(1,points.length-1),y=v=>pT+plotH-(v-lo)/(hi-lo)*plotH,poly=points.map((p,i)=>`${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
 const grid=Array.from({length:5},(_,i)=>{const v=Math.round(lo+(hi-lo)*i/4),yy=y(v);return `<g><line x1="${pL}" y1="${yy}" x2="${w-pR}" y2="${yy}" class="wlGrid"/><text x="${pL-10}" y="${yy+4}" text-anchor="end" class="wlAxisText">${v}</text></g>`}).join('');
 return `<div class="winLossChartCard"><div class="winLossChartHead"><div><h2>RP Progression</h2><p class="muted">Your recorded ranked points across this time range.</p></div><strong class="${vals.at(-1)>=vals[0]?"good":"bad"}">${vals.at(-1)-vals[0]>=0?"+":""}${vals.at(-1)-vals[0]} RP</strong></div><div class="winLossChartScroll"><svg class="winLossChart" viewBox="0 0 ${w} ${h}" role="img" aria-label="RP progression graph">${grid}<polyline class="rpTrendLine" points="${poly}"/>${points.map((p,i)=>`<circle class="rpTrendDot" cx="${x(i)}" cy="${y(p.v)}" r="4"><title>${p.v} RP • ${p.label}</title></circle>`).join('')}</svg></div></div>`;
}
function competitiveInsights(list=completedMatches()){
 const rows=list.slice().sort((a,b)=>(a.timestamp||0)-(b.timestamp||0));
 const insights=[];
 const deckRows=analyticsDeckRp(rows).filter(x=>x.n>=3);
 if(deckRows.length){
  const best=deckRows.slice().sort((a,b)=>(b.wr-a.wr)||(b.n-a.n))[0];
  insights.push({kind:"positive",icon:"◆",title:"Strongest deck",text:`${best.name} is your strongest qualifying deck at ${best.wr.toFixed(1)}% (${best.w}-${best.l}).`,detail:best.rpMatches?`${best.rp>0?"+":""}${best.rp} net RP across ${best.rpMatches} ranked matches.`:`${best.n} matches recorded.`,sample:best.n});
 }
 const matchups=analyticsMatchupIntelligence(rows).rows.filter(x=>x.n>=3);
 if(matchups.length){
  const costly=matchups.slice().sort((a,b)=>(a.rp-b.rp)||(a.wr-b.wr))[0];
  const hasRp=matchups.some(x=>x.rp!==0);
  insights.push({kind:"warning",icon:"!",title:hasRp?"Biggest RP leak":"Hardest matchup",text:hasRp?`${costly.name} is costing you the most RP: ${costly.rp} net RP with a ${costly.wr.toFixed(1)}% win rate.`:`${costly.name} is your hardest qualifying matchup at ${costly.wr.toFixed(1)}% (${costly.w}-${costly.l}).`,detail:`Based on ${costly.n} matches.`,sample:costly.n});
 }
 const turn=BattleAnalytics.turnOrder(rows), first=turn.first, second=turn.second;
 if(first.n>=3&&second.n>=3){
  const diff=second.wr-first.wr,better=diff>=0?"second":"first",d=Math.abs(diff);
  insights.push({kind:d>=8?"positive":"neutral",icon:"↕",title:"Turn-order edge",text:`You perform better going ${better} by ${d.toFixed(1)} percentage points.`,detail:`First: ${first.wr.toFixed(1)}% (${first.n}) • Second: ${second.wr.toFixed(1)}% (${second.n}).`,sample:Math.min(first.n,second.n)});
 }
 if(rows.length>=10){
  const recent=wl(rows.slice(-10)), previous=rows.length>=20?wl(rows.slice(-20,-10)):null;
  if(previous&&previous.n){const d=recent.wr-previous.wr;insights.push({kind:d>=0?"positive":"warning",icon:d>=0?"↑":"↓",title:"Recent win-rate trend",text:`Your last 10 games are ${d>=0?"up":"down"} ${Math.abs(d).toFixed(1)} percentage points versus the previous 10.`,detail:`Last 10: ${recent.wr.toFixed(1)}% • Previous 10: ${previous.wr.toFixed(1)}%.`,sample:20});}
  else insights.push({kind:"neutral",icon:"•",title:"Last 10 form",text:`You are ${recent.w}-${recent.l} over your last 10 games (${recent.wr.toFixed(1)}%).`,detail:"Record 10 more matches to unlock a previous-10 comparison.",sample:10});
 }
 const rp=analyticsRpSummary(rows);
 if(rp.n>=3) insights.push({kind:rp.net>=0?"positive":"warning",icon:rp.net>=0?"+":"−",title:"Ranked efficiency",text:`You are ${rp.net>=0?"+":""}${rp.net} RP in this range, averaging ${rp.avg>=0?"+":""}${rp.avg.toFixed(1)} RP per ranked match.`,detail:`${rp.n} ranked matches include RP data.`,sample:rp.n});
 return insights;
}
function competitiveInsightsHtml(list=completedMatches()){
 const items=competitiveInsights(list);
 if(!items.length)return `<div class="panel insightEmpty"><h2>Competitive Insights</h2><p class="muted">Record at least 3 matches with consistent deck, matchup, and turn-order data to unlock personalized insights.</p></div>`;
 return `<div class="insightsHeader"><div><h2>Competitive Insights</h2><p class="muted">Automatic takeaways from your Battle Tracker data — no simulated results.</p></div><span class="pill">${items.length} insight${items.length===1?"":"s"}</span></div><div class="competitiveInsightGrid">${items.map(x=>`<article class="competitiveInsight ${x.kind}"><div class="insightIcon">${x.icon}</div><div><div class="insightTitle">${esc(x.title)}</div><p>${esc(x.text)}</p><div class="muted tiny">${esc(x.detail)} • Sample ${x.sample}</div></div></article>`).join("")}</div><div class="notice insightNotice"><strong>How to read this:</strong> Insights use only your recorded matches. Treat small samples as directional, not proof of a matchup or deck advantage.</div>`;
}

function actionableCoaching(list=completedMatches()){
 const rows=list.slice().sort((a,b)=>(a.timestamp||0)-(b.timestamp||0));
 const actions=[];
 const decks=analyticsDeckRp(rows).filter(x=>x.n>=3).sort((a,b)=>(b.wr-a.wr)||(b.n-a.n));
 if(decks.length){
  const best=decks[0];
  actions.push({priority:"high",icon:"◆",title:`Lean into ${best.name}`,why:`It is your strongest qualifying deck at ${best.wr.toFixed(1)}% over ${best.n} matches.`,focus:best.rpMatches?`Use it for your next ranked block and watch whether its ${best.rp>=0?"+":""}${best.rp} net RP holds up.`:"Use it for your next focused session and keep recording RP so we can measure climb efficiency.",action:"Battle Tracker",page:"matches"});
 }
 const intel=analyticsMatchupIntelligence(rows).rows.filter(x=>x.n>=3);
 if(intel.length){
  const hard=intel.slice().sort((a,b)=>(a.wr-b.wr)||(a.rp-b.rp))[0];
  if(hard.wr<50 || hard.rp<0) actions.push({priority:"high",icon:"!",title:`Practice the ${hard.name} matchup`,why:`You are ${hard.w}-${hard.l} (${hard.wr.toFixed(1)}%)${hard.rp?` and ${hard.rp>0?"+":""}${hard.rp} RP`:""} into this opponent.`,focus:"Review your losses for repeated problems, then play a short practice block focused only on this matchup.",action:"Matchup Report",tab:"intelligence"});
 }
 const turn=BattleAnalytics.turnOrder(rows);
 if(turn.first.n>=3&&turn.second.n>=3){
  const diff=turn.second.wr-turn.first.wr, weaker=diff>=0?"first":"second", weak=diff>=0?turn.first:turn.second, strong=diff>=0?turn.second:turn.first;
  if(Math.abs(diff)>=6) actions.push({priority:"medium",icon:"↕",title:`Improve games going ${weaker}`,why:`Your going-${weaker} win rate is ${weak.wr.toFixed(1)}%, versus ${strong.wr.toFixed(1)}% on the other turn order.`,focus:`During your next practice session, tag mistakes from games going ${weaker} and compare your opening decisions.`,action:"Turn Order",tab:"turn"});
 }
 if(rows.length>=10){
  const recent=wl(rows.slice(-10));
  if(rows.length>=20){
   const prev=wl(rows.slice(-20,-10)),d=recent.wr-prev.wr;
   actions.push({priority:d<0?"high":"low",icon:d<0?"↓":"↑",title:d<0?"Reset your recent form":"Keep the current approach",why:`Your last 10 are ${recent.w}-${recent.l} (${recent.wr.toFixed(1)}%), ${Math.abs(d).toFixed(1)} points ${d<0?"below":"above"} the previous 10.`,focus:d<0?"Use a shorter session, stick to your best-performing deck, and review the last few losses before another ranked block.":"Avoid unnecessary deck switching. Keep collecting matches so we can confirm the improvement is real.",action:"Trends",tab:"trends"});
  }
 }
 const rp=analyticsRpSummary(rows);
 if(rp.n>=3&&rp.net<0) actions.push({priority:"high",icon:"RP",title:"Protect your ranked points",why:`You are ${rp.net} RP across ${rp.n} ranked matches (${rp.avg.toFixed(1)} per match).`,focus:"Pause ranked after a short losing streak and switch to matchup practice until your recent form stabilizes.",action:"RP Progression",tab:"rank"});
 else if(rp.n>=3&&rp.net>0) actions.push({priority:"low",icon:"RP",title:"Your ranked process is working",why:`You are +${rp.net} RP across ${rp.n} ranked matches (+${rp.avg.toFixed(1)} per match).`,focus:"Keep the same deck/session structure and use the matchup report to protect the climb against your weakest opponent.",action:"RP Progression",tab:"rank"});
 if(!actions.length&&rows.length) actions.push({priority:"medium",icon:"+",title:"Build a stronger sample",why:`You have ${rows.length} recorded match${rows.length===1?"":"es"}, but not enough consistent data for a strong coaching recommendation yet.`,focus:"Record deck, opponent archetype, turn order, and RP before/after for each match.",action:"Record Match",page:"matches"});
 return actions;
}
function actionableCoachingHtml(list=completedMatches()){
 const actions=actionableCoaching(list);
 if(!actions.length)return `<div class="panel coachingEmpty"><h2>Actionable Coaching</h2><p class="muted">Record matches to unlock your personalized focus plan.</p><button onclick="state.page='matches';render()">Record Match</button></div>`;
 const order={high:0,medium:1,low:2}; actions.sort((a,b)=>order[a.priority]-order[b.priority]);
 return `<div class="coachingHero"><div><span class="badge">YOUR NEXT FOCUS</span><h2>Actionable Coaching</h2><p class="muted">Recommendations generated from your own Battle Tracker data. No simulated results.</p></div><div class="coachCount">${actions.length}<small>focus areas</small></div></div><div class="coachGrid">${actions.map((x,i)=>`<article class="coachCard ${x.priority}"><div class="coachTop"><span class="coachNumber">${i+1}</span><span class="coachPriority">${x.priority} priority</span></div><div class="coachIcon">${esc(x.icon)}</div><h3>${esc(x.title)}</h3><p><strong>Why:</strong> ${esc(x.why)}</p><div class="coachFocus"><strong>Focus next:</strong><br>${esc(x.focus)}</div><button class="secondary" onclick="${x.page?`state.page='${x.page}';render()`:`state.battlePrefs.statsTab='${x.tab}';save();statisticsPage()`}">${esc(x.action)} →</button></article>`).join("")}</div><div class="notice coachingNotice"><strong>Coaching guardrail:</strong> Recommendations use only your recorded matches and require minimum samples where possible. Treat them as practice priorities, not guarantees.</div>`;
}

// V8.14 — Personal Meta & Matchup Matrix
// Reuses saved decks, normalized Battle Tracker matches, RP changes, and current MetaService data.
function personalMetaKey(v){return String(v||'').toLowerCase().replace(/\bex\b/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
function personalMetaArchetypes(limit=8){
 let rows=[];try{rows=(MetaService?.getTopArchetypes?.()||[])}catch(e){}
 return rows.slice(0,limit).map((a,i)=>({id:a.id||a.key||String(i),name:a.name||a.shortName||'Unknown',shortName:a.shortName||a.name||'Unknown',rank:Number(a.stats?.rank||a.rank||i+1),usage:Number(a.stats?.usage??a.usage),raw:a}));
}
function personalMetaFindMatchup(intel,arch){
 const keys=[arch.name,arch.shortName].map(personalMetaKey).filter(Boolean);
 return (intel.matchups||[]).find(x=>{const k=personalMetaKey(x.name);return keys.some(a=>k===a||k.includes(a)||a.includes(k))})||null;
}
function personalMetaDeckRows(matches,meta){
 return (state.decks||[]).map(d=>{
   const all=matches.filter(m=>m.deckId===d.id||personalMetaKey(m.deckName)===personalMetaKey(d.name));
   const base=wl(all),cells=meta.map(a=>{const list=all.filter(m=>{const k=personalMetaKey(m.opponentArchetype);return [a.name,a.shortName].map(personalMetaKey).some(x=>x&&(k===x||k.includes(x)||x.includes(k))) });const r=wl(list),rp=list.reduce((n,m)=>n+(Number(m.rankChange)||0),0);return{arch:a,list,...r,rp}});
   const knownUsage=meta.reduce((n,a)=>n+(Number.isFinite(a.usage)?a.usage:0),0);
   const tested=cells.filter(c=>c.n>0&&Number.isFinite(c.arch.usage));
   const coveredUsage=tested.reduce((n,c)=>n+c.arch.usage,0);
   const weightedDen=tested.reduce((n,c)=>n+c.arch.usage,0);
   const weighted=weightedDen?tested.reduce((n,c)=>n+c.wr*c.arch.usage,0)/weightedDen:null;
   return{deck:d,all,base,cells,weighted,coverage:knownUsage?coveredUsage/knownUsage*100:null,tested:tested.length,rp:all.reduce((n,m)=>n+(Number(m.rankChange)||0),0)};
 }).sort((a,b)=>(b.weighted??-1)-(a.weighted??-1)||b.base.n-a.base.n);
}
function personalMetaMatrixHtml(matches){
 const meta=personalMetaArchetypes(8),rows=personalMetaDeckRows(matches,meta),qualified=rows.filter(r=>r.base.n>=3&&r.weighted!==null),best=qualified[0]||null;
 if(!state.decks?.length)return `<div class="panel"><h2>Personal Meta & Matchup Matrix</h2><p class="muted">Create a deck first, then record matches to build your personal meta matrix.</p><button onclick="goPage('decks')">Open Deck Lab</button></div>`;
 if(!meta.length)return `<div class="panel"><h2>Personal Meta & Matchup Matrix</h2><p class="muted">Current Meta data is not loaded yet. Your Battle Tracker data is safe; open Meta Center to load competitive archetypes.</p><button onclick="goPage('meta')">Open Meta Center</button></div>`;
 const head=meta.map(a=>`<th title="${esc(a.name)}"><span class="pmRank">#${a.rank}</span>${esc(a.shortName)}<small>${Number.isFinite(a.usage)?a.usage.toFixed(1)+'% meta':'Meta deck'}</small></th>`).join('');
 const body=rows.map(r=>`<tr><th class="pmDeck"><button class="textButton" onclick="openDeck('${r.deck.id}')">${esc(r.deck.name)}</button><small>${r.base.n?`${r.base.w}-${r.base.l} • ${r.base.wr.toFixed(0)}% WR`:'No matches'}</small></th>${r.cells.map(c=>`<td class="pmCell ${c.n?(c.wr>=55?'positive':c.wr<=45?'negative':'neutral'):'empty'}" title="${esc(r.deck.name)} vs ${esc(c.arch.name)}">${c.n?`<strong>${c.w}-${c.l}</strong><span>${c.wr.toFixed(0)}% WR</span><small class="${c.rp>0?'good':c.rp<0?'bad':''}">${c.rp>0?'+':''}${c.rp} RP</small>`:`<strong>—</strong><span>Not tested</span>`}</td>`).join('')}<td class="pmScore"><strong>${r.weighted!==null?r.weighted.toFixed(1)+'%':'—'}</strong><span>Meta score</span><small>${r.coverage!==null?r.coverage.toFixed(0)+'% coverage':'No usage data'}</small></td></tr>`).join('');
 const mobile=rows.map(r=>`<article class="pmMobileDeck"><div class="between"><div><button class="textButton" onclick="openDeck('${r.deck.id}')">${esc(r.deck.name)}</button><small>${r.base.n?`${r.base.w}-${r.base.l} • ${r.base.wr.toFixed(0)}% overall WR`:'No recorded matches'}</small></div><span class="pill">${r.weighted!==null?r.weighted.toFixed(1)+'% fit':'More data'}</span></div><div class="pmMobileMatchups">${r.cells.map(c=>`<div class="${c.n?(c.wr>=55?'positive':c.wr<=45?'negative':'neutral'):'empty'}"><span><b>#${c.arch.rank}</b> ${esc(c.arch.shortName||c.arch.name)}</span><strong>${c.n?`${c.w}-${c.l} • ${c.wr.toFixed(0)}%`:'Not tested'}</strong><small>${Number.isFinite(c.arch.usage)?c.arch.usage.toFixed(1)+'% meta share':''}${c.n?` • ${c.rp>0?'+':''}${c.rp} RP`:''}</small></div>`).join('')}</div></article>`).join('');
 const bestHtml=best?`<section class="panel pmBest"><span class="eyebrow">BEST INTO YOUR CURRENT META SAMPLE</span><h2>${esc(best.deck.name)}</h2><div class="metricgrid"><div class="metric"><div class="l">Weighted Meta Score</div><div class="n">${best.weighted.toFixed(1)}%</div></div><div class="metric"><div class="l">Meta Coverage</div><div class="n">${best.coverage!==null?best.coverage.toFixed(0)+'%':'—'}</div></div><div class="metric"><div class="l">Tracked Record</div><div class="n">${best.base.w}-${best.base.l}</div></div><div class="metric"><div class="l">Net RP</div><div class="n ${best.rp>0?'good':best.rp<0?'bad':''}">${best.rp>0?'+':''}${best.rp}</div></div></div><p class="muted">Score weights only matchups you have actually played by current Meta usage. Untested matchups are excluded, so check coverage before treating this as a strong recommendation.</p></section>`:`<section class="panel"><span class="eyebrow">CURRENT META FIT</span><h2>More games needed</h2><p class="muted">Record at least 3 completed games with a deck against current Meta archetypes before the app names a best-performing deck.</p></section>`;
 return `<div class="pmIntro"><div><span class="badge">PERSONAL META</span><h2>Personal Meta & Matchup Matrix</h2><p class="muted">Your decks × current Meta. Every result below comes from your existing Battle Tracker history; competitive usage comes from the existing Meta service.</p></div><button class="secondary" onclick="goPage('matches')">Record Match</button></div>${bestHtml}<div class="panel pmMatrixPanel"><div class="between"><div><h2>Deck × Archetype Matrix</h2><p class="muted">W-L, personal win rate, and tracked RP for each matchup.</p></div><span class="pill">Top ${meta.length} Meta decks</span></div><div class="tableScroll pmScroll pmDesktopMatrix"><table class="pmMatrix"><thead><tr><th>Your Deck</th>${head}<th>Meta Fit</th></tr></thead><tbody>${body}</tbody></table></div><div class="pmMobileMatrix">${mobile}</div><div class="pmLegend"><span><i class="pmDot positive"></i>55%+ personal WR</span><span><i class="pmDot neutral"></i>46–54%</span><span><i class="pmDot negative"></i>45% or lower</span><span>— = no recorded games</span></div></div>`;
}


// V8.15 — Tournament Prep Mode
// Builds a prep plan from saved decks + Battle Tracker + current Meta data. No duplicate statistics.
function tournamentPrepState(){
 state.battlePrefs.tournamentPrep=state.battlePrefs.tournamentPrep||{};
 const p=state.battlePrefs.tournamentPrep;
 if(!p.deckId||!(state.decks||[]).some(d=>d.id===p.deckId))p.deckId=state.battlePrefs.lastDeckId||state.decks?.[0]?.id||'';
 p.notes=String(p.notes||'');p.checks=p.checks&&typeof p.checks==='object'?p.checks:{};
 return p;
}
function tournamentPrepSaveNotes(v){const p=tournamentPrepState();p.notes=v;safeStorageSet(STORE,JSON.stringify(state));}
function tournamentPrepToggle(k,v){const p=tournamentPrepState();p.checks[k]=!!v;save();statisticsPage();}
function tournamentPrepSelectDeck(id){const p=tournamentPrepState();p.deckId=id;state.battlePrefs.lastDeckId=id;save();statisticsPage();}
function tournamentPrepHtml(matches){
 const p=tournamentPrepState(),deck=(state.decks||[]).find(d=>d.id===p.deckId)||state.decks?.[0];
 if(!deck)return `<div class="panel"><h2>Tournament Prep Mode</h2><p class="muted">Create a deck first, then Tournament Prep can build your practice plan.</p><button onclick="goPage('decks')">Open Deck Lab</button></div>`;
 const all=matches.filter(m=>m.deckId===deck.id||personalMetaKey(m.deckName)===personalMetaKey(deck.name));
 const overall=wl(all),rp=all.reduce((n,m)=>n+(Number(m.rankChange)||0),0),meta=personalMetaArchetypes(8);
 const cells=meta.map(a=>{const list=all.filter(m=>{const k=personalMetaKey(m.opponentArchetype);return [a.name,a.shortName].map(personalMetaKey).some(x=>x&&(k===x||k.includes(x)||x.includes(k)))});const r=wl(list),net=list.reduce((n,m)=>n+(Number(m.rankChange)||0),0);const usage=Number.isFinite(a.usage)?a.usage:null;const risk=usage===null?0:usage*(r.n?(100-r.wr)/100:0.55);return{a,list,...r,rp:net,usage,risk}});
 const priorities=cells.slice().sort((a,b)=>b.risk-a.risk).slice(0,4);
 const recent=all.slice().sort((a,b)=>b.timestamp-a.timestamp).slice(0,10),recentWL=wl(recent);
 const expected=meta.length?cells.map(c=>`<tr><td><strong>#${c.a.rank} ${esc(c.a.shortName)}</strong></td><td>${c.usage!==null?c.usage.toFixed(1)+'%':'—'}</td><td>${c.n?`${c.w}-${c.l}`:'—'}</td><td class="${c.n?(c.wr>=55?'good':c.wr<=45?'bad':''):''}">${c.n?c.wr.toFixed(0)+'%':'Not tested'}</td><td class="${c.rp>0?'good':c.rp<0?'bad':''}">${c.n?(c.rp>0?'+':'')+c.rp:'—'}</td></tr>`).join(''):`<tr><td colspan="5" class="muted">Open Meta Center to load current expected archetypes.</td></tr>`;
 const priorityHtml=priorities.length?priorities.map((c,i)=>`<article class="tpPriority ${c.n&&c.wr<=45?'dangerZone':!c.n?'unknownZone':''}"><span class="tpPriorityNum">${i+1}</span><div><strong>${esc(c.a.shortName)}</strong><p>${c.n?`${c.w}-${c.l} • ${c.wr.toFixed(0)}% personal WR${c.rp?` • ${c.rp>0?'+':''}${c.rp} RP`:''}`:'No personal games recorded yet'}${c.usage!==null?` • ${c.usage.toFixed(1)}% current meta`:''}</p><small>${!c.n?'Practice this matchup to remove a major information gap.':c.wr<50?'Priority: improve your plan into this matchup.':c.wr<55?'Priority: tighten this close matchup.':'Maintain reps; your recorded results are currently positive.'}</small></div></article>`).join(''):`<p class="muted">Current Meta data is needed to rank practice priorities.</p>`;
 const checks=[['deck','Deck list finalized and validated'],['reps','Practice priority matchups reviewed'],['turn','Going-first / going-second plan reviewed'],['notes','Matchup notes reviewed'],['setup','Device, charger, account, and game setup ready'],['time','Tournament time / check-in confirmed'],['focus','Mental reset and between-round routine ready']];
 const done=checks.filter(([k])=>p.checks[k]).length;
 return `<div class="tpHero"><div><span class="eyebrow">TOURNAMENT PREP</span><h2>Tournament Prep Mode</h2><p class="muted">Turn your existing deck, Battle Tracker, RP, and current Meta data into one preparation plan.</p></div><div class="tpDeckSelect"><label>Deck you're bringing</label><select onchange="tournamentPrepSelectDeck(this.value)">${(state.decks||[]).map(d=>`<option value="${d.id}" ${d.id===deck.id?'selected':''}>${esc(d.name)}</option>`).join('')}</select></div></div>
 <div class="tpMetrics"><div class="metric"><div class="l">Deck Record</div><div class="n">${overall.n?overall.w+'-'+overall.l:'—'}</div><small>${overall.n?overall.wr.toFixed(1)+'% win rate':'No matches yet'}</small></div><div class="metric"><div class="l">Recent Form</div><div class="n">${recentWL.n?recentWL.w+'-'+recentWL.l:'—'}</div><small>Last ${recentWL.n||0} games</small></div><div class="metric"><div class="l">Tracked RP</div><div class="n ${rp>=0?'good':'bad'}">${all.length?(rp>0?'+':'')+rp:'—'}</div><small>With this deck</small></div><div class="metric"><div class="l">Prep Checklist</div><div class="n">${done}/${checks.length}</div><small>${Math.round(done/checks.length*100)}% ready</small></div></div>
 <div class="tpGrid"><section class="panel"><div class="between"><div><h2>Expected Matchups</h2><p class="muted">Current Meta frequency beside your personal results.</p></div><button class="secondary" onclick="goPage('meta')">Meta Center</button></div><div class="tableScroll"><table><tr><th>Archetype</th><th>Meta</th><th>Your Record</th><th>Your WR</th><th>RP</th></tr>${expected}</table></div></section><section class="panel"><h2>Practice Priorities</h2><p class="muted">Higher-meta weak or untested matchups rise to the top.</p><div class="tpPriorityList">${priorityHtml}</div><button class="secondary" onclick="state.page='stats';state.battlePrefs.statsTab='personalmeta';save();render()">Open Personal Meta →</button></section></div>
 <div class="tpGrid"><section class="panel"><div class="between"><div><h2>Tournament Notes</h2><p class="muted">Keep matchup plans, reminders, tech choices, and round notes here.</p></div><span class="pill">Saved locally</span></div><textarea class="tpNotes" placeholder="Example: vs ___ — protect ___, prioritize ___, watch for ___..." oninput="tournamentPrepSaveNotes(this.value)">${esc(p.notes)}</textarea></section><section class="panel"><div class="between"><div><h2>Checklist</h2><p class="muted">A simple pre-event readiness list.</p></div><strong>${done}/${checks.length}</strong></div><div class="tpChecklist">${checks.map(([k,label])=>`<label><input type="checkbox" ${p.checks[k]?'checked':''} onchange="tournamentPrepToggle('${k}',this.checked)"><span>${esc(label)}</span></label>`).join('')}</div></section></div>
 <div class="notice"><strong>Data note:</strong> Expected matchups use the current Meta service. Performance and RP use only your recorded Battle Tracker matches. Untested matchups are shown as untested instead of receiving invented win rates.</div>`;
}

