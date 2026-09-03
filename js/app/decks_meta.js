function decks(){
 const status=window.cardLoadMode==="loading"?"Loading the full card database…":window.cardLoadMode==="online"?`${CARDS.length.toLocaleString()} card records available.`:window.cardLoadMode==="fallback"?`Card database unavailable: ${esc(window.cardLoadError||"using starter catalog")}`:"Using the bundled starter catalog.";
 const rows=filteredDecksByCollection(),query=String(state.deckPrefs?.query||"");
 document.getElementById("app").innerHTML=`<div class="deckManagerPage"><div class="deckManagerHeader"><div><span class="eyebrow">DECK MANAGER</span><h1>My Decks</h1><p class="muted">Build, organize, test, and track your Pocket decks.</p></div><div class="row">${window.cardLoadMode==="fallback"?`<button class="secondary" onclick="retryCardDatabase()">Retry Card Database</button>`:""}<button onclick="newDeck()">+ New Deck</button></div></div>
 <div class="panel deckManagerToolbar deckManagerToolbarV828"><label class="deckSearchField"><span>Search decks</span><input type="search" value="${esc(query)}" placeholder="Search saved decks…" oninput="state.deckPrefs.query=this.value;safeStorageSet(STORE,JSON.stringify(state));decks()"></label><div class="deckFilterGroup"><strong>Show</strong><div class="row">${[["all","All Decks"],["favorites","★ Favorites"],["ready","Ready"],["almost","Almost Ready"],["missing","Missing Cards"]].map(([k,n])=>`<button class="secondary ${deckBuildFilter===k?'active':''}" onclick="setDeckBuildFilter('${k}')">${n}</button>`).join('')}</div></div><div class="deckSortGroup"><label>Sort by</label><select onchange="setDeckBuildSort(this.value)"><option value="completion" ${deckBuildSort==='completion'?'selected':''}>Completion %</option><option value="fewest" ${deckBuildSort==='fewest'?'selected':''}>Fewest Missing</option><option value="most" ${deckBuildSort==='most'?'selected':''}>Most Missing</option><option value="name" ${deckBuildSort==='name'?'selected':''}>Deck Name</option></select></div></div>
 <div class="deckManagerMeta"><span>${state.decks.length} saved deck${state.decks.length===1?'':'s'}${query?` • ${rows.length} matching`:""}</span><span>${status}</span></div>
 <div class="deckManagerGrid">${rows.length?rows.map(({d})=>{const c=deckCollectionStatus(d),intel=deckIntelStats(d),fav=deckIsFavorite(d.id);return `<article class="deckManagerCard ${fav?'isFavorite':''}" onclick="openDeck('${d.id}')"><div class="deckManagerCardTop"><div><h3>${esc(d.name)}</h3><p>${deckCount(d)}/20 cards • ${isDeckLegal(d)?"Ready to Play":"Needs work"}</p></div><button class="deckFavoriteBtn ${fav?'active':''}" title="${fav?'Remove from favorites':'Add to favorites'}" aria-label="${fav?'Remove from favorites':'Add to favorites'}" onclick="event.stopPropagation();toggleDeckFavorite('${d.id}')">${fav?'★':'☆'}</button></div><div class="deckManagerMetrics"><span><b>${intel.record||"—"}</b><small>Record</small></span><span><b>${intel.winRate||"—"}</b><small>Win rate</small></span><span><b>${intel.rankedRp||"—"}</b><small>Ranked RP</small></span></div><div class="deckManagerFooter"><span class="deckOwned ${c.missing?'needs':'ready'}">${c.missing?`${c.owned}/${c.required} owned • ${c.missing} missing`:`${c.required}/${c.required} owned • Collection ready`}</span><div class="row deckManagerQuickActions"><button class="secondary" onclick="event.stopPropagation();renameDeckById('${d.id}')">Rename</button><button onclick="event.stopPropagation();openDeck('${d.id}')">Open</button></div></div></article>`}).join(""):`<div class="panel deckManagerEmpty"><h2>${state.decks.length?'No decks match your search/filter.':'No decks yet'}</h2><p class="muted">${state.decks.length?'Clear the search or choose another filter.':'Create your first deck and start building.'}</p>${state.decks.length?`<button class="secondary" onclick="state.deckPrefs.query='';deckBuildFilter='all';save();decks()">Clear Filters</button>`:`<button onclick="newDeck()">+ New Deck</button>`}</div>`}</div>
 <details class="panel deckImportPanel"><summary>Import a deck list</summary><p class="muted">Paste a full 20-card list. Supports plain names, set/card codes, and common exported deck-list formats, including Limitless-style text.</p><textarea id="imp" placeholder="# Butterfree / Mega Sceptile ex&#10;2 Caterpie [B3b-1]&#10;2 Metapod [B3b-2]&#10;2 Butterfree [B3b-3]&#10;2 Professor's Research"></textarea><div class="row"><button onclick="importDeck()">Import to New Deck</button><button class="secondary" onclick="document.getElementById('imp').value=document.getElementById('importDeckText')?.value||document.getElementById('imp').value">Use Parsed List</button></div></details></div>`;
}

function uniqueDeckName(base="New Deck"){
 let name=base,n=2;const names=new Set((state.decks||[]).map(d=>String(d.name||"").toLowerCase()));
 while(names.has(name.toLowerCase()))name=`${base} ${n++}`;return name;
}
function newDeck(){
 const d={id:makeId(),name:uniqueDeckName("New Deck"),cards:{},energy:""};
 state.decks.push(d);state.selected=d.id;save();renderEditorShell(d);
}

function openDeck(id){
 const d=state.decks.find(x=>x.id===id);
 if(!d) return;
 state.selected=id;state.page="decks";save();renderEditorShell(d);
}

function editor(){
 const d=state.decks.find(x=>x.id===state.selected);
 if(!d){state.page="decks";render();return;}
 renderEditorShell(d);
}




function normalizeMatchResult(value){
 const v=String(value==null?"":value).trim().toLowerCase();
 if(v==="win"||v==="w"||v==="won"||v==="victory")return "win";
 if(v==="loss"||v==="l"||v==="lost"||v==="lose"||v==="defeat")return "loss";
 return v;
}

function metaNum(v){return Number.isFinite(Number(v))?Number(v):null}
function metaFmt(v){const n=metaNum(v);return n==null?"—":n.toLocaleString()}

function metaRankMovement(a){
  const rank = Number(a?.stats?.rank);
  const prevRaw = String(a?.stats?.previousRank ?? "").replace("#","").trim();
  const previous = Number(prevRaw);

  if(!Number.isFinite(rank) || !Number.isFinite(previous) || rank <= 0 || previous <= 0){
    return {label:"—",delta:null,direction:"unknown"};
  }

  const delta = previous - rank;

  if(delta > 0){
    return {label:`↑ ${previous} → ${rank}`,delta,direction:"up"};
  }
  if(delta < 0){
    return {label:`↓ ${previous} → ${rank}`,delta,direction:"down"};
  }
  return {label:`→ #${rank}`,delta:0,direction:"stable"};
}

function metaPct(v){const n=metaNum(v);return n==null?"—":`${n.toFixed(1)}%`}
function metaValid(){return (ARCHETYPE_DATA||[]).filter(a=>a&&a.id&&a.name&&Array.isArray(a.pokemon))}
function metaSampleTotal(a){return (a?.sampleDeck||[]).reduce((s,x)=>s+(Number(x.quantity)||0),0)}
function metaConfidence(a){if(a?.liveConfidence)return a.liveConfidence;if(a?.stats?.confidence)return a.stats.confidence;const s=metaNum(a?.stats?.samples)||0,m=metaNum(a?.stats?.matches)||0,u=metaNum(a?.stats?.usage)!=null,w=metaNum(a?.stats?.winRate)!=null,d=metaSampleTotal(a)===20;if(d&&s>=50&&m>=250&&u&&w)return"High";if(d&&(s>=15||m>=75)&&(u||w))return"Medium";return"Limited"}
function metaMove(a){const r=metaNum(a?.stats?.rank),p=Number(String(a?.stats?.previousRank||"").replace("#",""));if(!r||!Number.isFinite(p))return{label:"—",delta:null};const d=p-r;return{label:d>0?`↑ +${d}`:d<0?`↓ ${d}`:"→ Stable",delta:d}}
function personalVs(name){const rows=(state.matches||[]).filter(m=>String(m.opponentArchetype||m.opponent||"").trim()===String(name||"").trim()),wins=rows.filter(m=>normalizeMatchResult(m.result??m.outcome??m.winLoss??m.status)==="win").length,losses=rows.filter(m=>normalizeMatchResult(m.result??m.outcome??m.winLoss??m.status)==="loss").length,first=rows.filter(m=>/first/i.test(m.turnOrder||m.turn||"")),second=rows.filter(m=>/second/i.test(m.turnOrder||m.turn||"")),wl=x=>({w:x.filter(m=>normalizeMatchResult(m.result??m.outcome??m.winLoss??m.status)==="win").length,l:x.filter(m=>normalizeMatchResult(m.result??m.outcome??m.winLoss??m.status)==="loss").length});return{matches:rows.length,wins,losses,wr:rows.length?wins/rows.length*100:null,first:wl(first),second:wl(second)}}
function metaKeys(a){const o=META_CONTENT_OVERRIDES[a.id];if(o?.keyCards)return o.keyCards;const arr=[...(a.pokemon||[]),...(a.sampleDeck||[]).sort((x,y)=>(y.quantity||0)-(x.quantity||0)).map(x=>x.name)],out=[];for(const n of arr){if(n&&!out.some(x=>normalizedCardName(x)===normalizedCardName(n)))out.push(n);if(out.length>=4)break}return out}
function metaOverviewText(a){return a.description||META_CONTENT_OVERRIDES[a.id]?.overview||`${(a.pokemon||[]).join(" / ")||a.name} is a ${a.type||"multi-type"} Pokémon TCG Pocket archetype represented in the current curated competitive snapshot.`}
function metaStrategyText(a){return a.strategy||META_CONTENT_OVERRIDES[a.id]?.strategy||"Use the sample list and key-card package to identify the main attacker, setup pieces, and Trainer engine. Detailed matchup-specific guidance is limited when card-role data is incomplete."}
function metaStrengths(a){return a.strengths?.length?a.strengths:(META_CONTENT_OVERRIDES[a.id]?.strengths||[metaNum(a.stats?.winRate)>=52?"Above-average snapshot win rate":"Defined competitive game plan",metaSampleTotal(a)===20?"Verified 20-card sample available":"Core archetype identified"])}
function metaWeaknesses(a){return a.weaknesses?.length?a.weaknesses:(META_CONTENT_OVERRIDES[a.id]?.weaknesses||["Matchup-specific weaknesses require sufficient tournament data.","Performance can vary by list variant, sequencing, and opening setup."])}
function metaHow(a){return META_CONTENT_OVERRIDES[a.id]?.howToBeat||["Identify the deck's main attacker and pressure its setup before it becomes efficient.","Avoid giving easy Bench targets when the list can exploit them.","Preserve switching and recovery options for the mid-to-late game."]}
const MetaService={
 getArchetypes(){return window.PPCMetaService?PPCMetaService.getArchetypes():metaValid()},
 getArchetype(id){return window.PPCMetaService?PPCMetaService.getArchetype(id):(metaValid().find(a=>a.id===id)||null)},
 getTopArchetypes(){return this.getArchetypes().slice().sort((a,b)=>(metaNum(a.stats?.rank)||999)-(metaNum(b.stats?.rank)||999))},
 getMetaOverview(){
  const a=this.getArchetypes(),p=window.PPCMetaService?PPCMetaService.getPayload():null;
  const r=this.getTopArchetypes(),u=a.filter(x=>metaNum(x.stats?.usage)!=null).sort((x,y)=>metaNum(y.stats.usage)-metaNum(x.stats.usage));
  const wr=a.filter(x=>metaNum(x.stats?.winRate)!=null&&Number(x.stats?.matches||0)>=5).sort((x,y)=>metaNum(y.stats.winRate)-metaNum(x.stats.winRate));
  const rise=a.map(x=>({a:x,m:metaMove(x)})).filter(x=>x.m.delta!=null&&x.m.delta>0).sort((x,y)=>y.m.delta-x.m.delta);
  return{top:r[0]||null,mostPlayed:u[0]||null,highestWr:wr[0]||null,fastestRiser:rise[0]?.a||null,archetypes:a.length,matches:p?.snapshot?.matches??a.reduce((sum,x)=>sum+(metaNum(x.stats?.matches)||0),0)}
 },
 searchMeta(q){const k=normalizedCardName(q);if(!k)return this.getArchetypes();return this.getArchetypes().filter(a=>normalizedCardName([a.name,a.shortName,...(a.pokemon||[]),...metaKeys(a),...(a.sampleDeck||[]).map(x=>x.name),a.sampleSource?.player,a.sampleSource?.tournamentName].filter(Boolean).join(" ")).includes(k))}
};
function metaWindowLabel(w){return Number(w)===24?"24 HOURS":Number(w)===168?"7 DAYS":Number(w)===336?"14 DAYS":"30 DAYS"}
function metaSourceBadge(){const st=window.PPCMetaService?PPCMetaService.getStatus():{source:"fallback"};return st.source==="live"?"LIVE":st.source==="cached"?"CACHED":st.source==="stale"?"STALE":"FALLBACK SNAPSHOT"}
function setMetaWindow(w){state.metaIntel.windowHours=Number(w);save();if(window.PPCMetaService){PPCMetaService.setWindow(Number(w));PPCMetaService.ensure(Number(w));}render()}
async function refreshMetaLive(){if(!window.PPCMetaService)return;await PPCMetaService.refresh();if(state.page==="meta"||state.page==="dashboard")render()}
function metaEnsureLive(){if(!window.PPCMetaService)return;PPCMetaService.ensure(state.metaIntel.windowHours||168)}
function metaLiveSnapshot(){return window.PPCMetaService?PPCMetaService.getPayload():null}
function metaMatchupRowsFor(id){if(!window.PPCMetaService)return[];return PPCMetaService.getMatchups().filter(m=>m.archetypeAId===id||m.archetypeBId===id).map(m=>{const asA=m.archetypeAId===id;const wins=asA?Number(m.aWins||0):Number(m.bWins||0),losses=asA?Number(m.bWins||0):Number(m.aWins||0),draws=Number(m.draws||0),matches=Number(m.matches||0),wr=wins+losses?wins/(wins+losses)*100:null;return{opponent:asA?m.archetypeB:m.archetypeA,wins,losses,draws,matches,wr,confidence:m.confidence||"Limited"}}).sort((a,b)=>b.matches-a.matches)}
function metaMatchupPanel(){
 const rows=window.PPCMetaService?PPCMetaService.getMatchups():[];
 if(!rows.length)return`<div class="panel"><h2>Matchup Matrix</h2><p class="muted">Live matchup data is unavailable in the current fallback snapshot.</p></div>`;
 return`<div class="panel"><div class="between"><div><h2>Matchup Matrix</h2><p class="muted">Top mapped archetype matchups. Draws are shown separately.</p></div><span class="badge">${rows.length} matchups</span></div><div class="metaMatchupScroll"><table class="metaLiveTable"><thead><tr><th>Archetype A</th><th>Archetype B</th><th>Record</th><th>A Win %</th><th>Matches</th><th>Confidence</th></tr></thead><tbody>${rows.slice(0,40).map(m=>`<tr><td>${esc(m.archetypeA)}</td><td>${esc(m.archetypeB)}</td><td>${metaFmt(m.aWins)}-${metaFmt(m.bWins)}-${metaFmt(m.draws)}</td><td>${m.aWinRate==null?"—":metaPct(m.aWinRate)}</td><td>${metaFmt(m.matches)}</td><td><span class="badge ${String(m.confidence).toLowerCase()==="limited"?"metaLimited":""}">${esc(m.confidence||"Limited")}</span></td></tr>`).join("")}</tbody></table></div></div>`
}
function metaQualityPanel(){const p=metaLiveSnapshot(),s=p?.snapshot;if(!s)return"";const unPct=s.validDecks?Number(s.unclassifiedDecks||0)/Number(s.validDecks)*100:0;return`<div class="panel metaQuality"><div class="between"><div><h2>Data Quality</h2><p class="muted">Some tournament decklists are not yet mapped to a known archetype. Meta statistics use classified decklists and mapped matchups only.</p></div><span class="badge">${esc(metaSourceBadge())}</span></div><div class="metricgrid"><div class="metric"><div class="l">Classified</div><div class="n">${metaFmt(s.classifiedDecks)} / ${metaFmt(s.validDecks)}</div><small>${s.classificationRate==null?"—":metaPct(s.classificationRate)}</small></div><div class="metric"><div class="l">Unclassified</div><div class="n">${metaFmt(s.unclassifiedDecks)}</div><small>${metaPct(unPct)}</small></div><div class="metric"><div class="l">Match Coverage</div><div class="n">${s.matchMappingRate==null?"—":metaPct(s.matchMappingRate)}</div><small>${metaFmt(s.matches)} total matches</small></div></div></div>`}
function metaIntelligenceSignals(){
 const all=MetaService.getArchetypes().filter(a=>metaNum(a.stats?.usage)!=null);
 const byUsage=[...all].sort((a,b)=>(metaNum(b.stats?.usage)||0)-(metaNum(a.stats?.usage)||0));
 const top3=byUsage.slice(0,3),top3Share=top3.reduce((n,a)=>n+(metaNum(a.stats?.usage)||0),0);
 const reliable=all.filter(a=>(metaNum(a.stats?.matches)||0)>=10&&metaNum(a.stats?.winRate)!=null);
 const bestWr=[...reliable].sort((a,b)=>(metaNum(b.stats?.winRate)||0)-(metaNum(a.stats?.winRate)||0))[0]||null;
 const sleeper=[...reliable].filter(a=>(metaNum(a.stats?.usage)||0)<8&&(metaNum(a.stats?.winRate)||0)>=50).sort((a,b)=>(metaNum(b.stats?.winRate)||0)-(metaNum(a.stats?.winRate)||0))[0]||null;
 const movers=all.map(a=>({a,d:metaMove(a).delta||0}));
 const riser=[...movers].filter(x=>x.d>0).sort((x,y)=>y.d-x.d)[0]||null;
 const faller=[...movers].filter(x=>x.d<0).sort((x,y)=>x.d-y.d)[0]||null;
 const snap=metaLiveSnapshot()?.snapshot||{};
 const classification=metaNum(snap.classificationRate),mapping=metaNum(snap.matchMappingRate);
 const quality=Math.min(classification==null?100:classification,mapping==null?100:mapping);
 return {top3,top3Share,bestWr,sleeper,riser,faller,quality,classification,mapping};
}
function metaIntelligencePanel(){
 const x=metaIntelligenceSignals(),cards=[];
 if(x.top3.length)cards.push({tone:x.top3Share>=45?'warn':'good',k:'Meta concentration',v:`${x.top3Share.toFixed(1)}%`,d:`Top 3 share: ${x.top3.map(a=>a.shortName||a.name).join(', ')}. ${x.top3Share>=45?'The field is concentrated; prepare specifically for the leaders.':'The field is relatively open, so broad matchup coverage matters.'}`});
 if(x.bestWr)cards.push({tone:'good',k:'Proven performer',v:x.bestWr.shortName||x.bestWr.name,d:`${metaPct(x.bestWr.stats?.winRate)} win rate across ${metaFmt(x.bestWr.stats?.matches)} mapped matches.`,id:x.bestWr.id});
 if(x.sleeper)cards.push({tone:'info',k:'Underplayed signal',v:x.sleeper.shortName||x.sleeper.name,d:`${metaPct(x.sleeper.stats?.winRate)} WR at only ${metaPct(x.sleeper.stats?.usage)} usage. Worth monitoring, but sample size still matters.`,id:x.sleeper.id});
 if(x.riser)cards.push({tone:'good',k:'Rising deck',v:x.riser.a.shortName||x.riser.a.name,d:`Moved up ${x.riser.d} rank${x.riser.d===1?'':'s'} versus the previous snapshot.`,id:x.riser.a.id});
 if(x.faller)cards.push({tone:'warn',k:'Falling deck',v:x.faller.a.shortName||x.faller.a.name,d:`Moved down ${Math.abs(x.faller.d)} rank${Math.abs(x.faller.d)===1?'':'s'} versus the previous snapshot.`,id:x.faller.a.id});
 if(x.quality<80)cards.push({tone:'warn',k:'Coverage caution',v:`${x.quality.toFixed(1)}%`,d:'Some results are unmapped or unclassified. Treat close win-rate differences as directional rather than definitive.'});
 return `<div class="panel metaIntel2Panel"><div class="between"><div><h2>Meta Signals</h2><p class="muted">Automatic takeaways from the selected tournament window. Signals use real snapshot statistics and avoid treating small samples as certainty.</p></div><span class="badge">${metaWindowLabel(Number(state.metaIntel.windowHours||168))}</span></div><div class="metaSignalGrid">${cards.slice(0,6).map(c=>`<${c.id?'button':'div'} class="metaSignalCard ${c.tone}" ${c.id?`onclick="openMetaIntelDetail('${c.id}')"`:''}><span>${esc(c.k)}</span><strong>${esc(c.v)}</strong><small>${esc(c.d)}</small></${c.id?'button':'div'}>`).join('')}</div></div>`;
}
function metaPreparationPanel(){
 const top=MetaService.getArchetypes().filter(a=>metaNum(a.stats?.usage)!=null).sort((a,b)=>(metaNum(b.stats?.usage)||0)-(metaNum(a.stats?.usage)||0)).slice(0,5);
 if(!top.length)return '';
 return `<div class="panel metaPrepPanel"><div class="between"><div><h2>What You'll Face</h2><p class="muted">The five decks you are most likely to encounter, with your own results beside them.</p></div><button class="secondary" onclick="state.page='stats';state.battlePrefs.statsTab='coaching';save();render()">Open Coaching</button></div><div class="metaPrepList">${top.map((a,i)=>{const p=personalVs(a.name),wr=p.matches?p.wins/p.matches*100:null;return `<button onclick="openMetaIntelDetail('${a.id}')"><b>${i+1}</b><div><strong>${esc(a.shortName||a.name)}</strong><small>${metaPct(a.stats?.usage)} meta share • ${metaFmt(a.stats?.matches)} matches</small></div><div class="metaPrepPersonal"><span>${p.matches?`${p.wins}-${p.losses}`:'No games'}</span><small>${wr==null?'Your matchup':metaPct(wr)+' personal WR'}</small></div></button>`}).join('')}</div></div>`;
}

function openMetaIntelDetail(id){
 const a=MetaService.getArchetype(id);
 if(!a)return;
 state.metaIntel.detailId=id;
 save();
 render();
}
function useArchetypeDeck(id){
 const live=MetaService.getArchetype(id);
 const bundled=ArchetypeService.getArchetype(id);
 if(!bundled){
   ppcNotice(live?"This live archetype does not have a bundled 20-card sample yet.":"Archetype not found.");
   return;
 }
 return copyArchetypeDeck(id);
}
function metaWatchToggle(id){const s=new Set(state.metaIntel.watchlist||[]);s.has(id)?s.delete(id):s.add(id);state.metaIntel.watchlist=[...s];save();render()}
function metaCompareToggle(id){const a=[...(state.metaIntel.compareIds||[])],i=a.indexOf(id);if(i>=0)a.splice(i,1);else if(a.length<3)a.push(id);state.metaIntel.compareIds=a;save();render()}
function metaFiltered(){let a=MetaService.searchMeta(state.metaIntel.query||"");if(state.metaIntel.type)a=a.filter(x=>x.type===state.metaIntel.type);if(state.metaIntel.confidence)a=a.filter(x=>metaConfidence(x)===state.metaIntel.confidence);if(state.metaIntel.hasSample==="yes")a=a.filter(x=>metaSampleTotal(x)===20);return a.sort((x,y)=>(metaNum(x.stats?.rank)||999)-(metaNum(y.stats?.rank)||999))}
function metaIntelArtwork(a){const names=metaKeys(a).slice(0,2),cards=names.map(n=>({name:n,card:getCardByName(n)}));return `<div class="metaIntelArtwork">${cards.map(({name,card})=>{if(!card)return `<div class="metaIntelArtPlaceholder">${esc(name)}</div>`;const img=card.thumbnailUrl||card.image||card.fullImageUrl||"";return `<button class="metaIntelArtButton" title="${esc(name)}" onclick="event.stopPropagation();openCardModal('${card.id}')">${img?`<img loading="lazy" decoding="async" src="${esc(img)}" alt="${esc(name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"><span class="metaIntelArtPlaceholder" style="display:none">${esc(name)}</span>`:`<span class="metaIntelArtPlaceholder">${esc(name)}</span>`}</button>`}).join("")}</div>`}
function metaIntelCard(a){const p=personalVs(a.name),wat=(state.metaIntel.watchlist||[]).includes(a.id),mv=metaMove(a),confidence=metaConfidence(a);return`<article class="metaIntelCard metaIntelCardVisual"><div class="metaIntelCardTop"><div class="metaIntelBadges"><span class="metaTierBadge">${esc(a.tier||"—")}</span><span class="metaConfidenceBadge">${esc(confidence)} confidence</span></div><button class="metaWatchButton ${wat?"active":""}" onclick="metaWatchToggle('${a.id}')">${wat?"★ Watching":"☆ Watch"}</button></div>${metaIntelArtwork(a)}<div class="metaIntelCardBody"><h3>${esc(a.name)}</h3><p class="metaIntelSub">${esc(a.type||"Unknown")} <span>•</span> ${esc(mv.label)}</p><div class="metaIntelStats"><div><span>Usage</span><strong>${metaPct(a.stats?.usage)}</strong></div><div><span>Win rate</span><strong>${metaPct(a.stats?.winRate)}</strong></div><div><span>Your record</span><strong>${p.matches?`${p.wins}-${p.losses}`:"—"}</strong></div></div><div class="metaIntelActions"><button onclick="state.metaIntel.detailId='${a.id}';save();render()">View Intelligence</button><button class="secondary" onclick="metaCompareToggle('${a.id}')">${(state.metaIntel.compareIds||[]).includes(a.id)?"Remove Compare":"Compare"}</button></div></div></article>`}
function metaKeyCard(name){const c=getCardByName(name);if(!c)return`<div class="metaKeyCard"><div class="cardplaceholder">${esc(name)}</div><strong>${esc(name)}</strong></div>`;const img=c.thumbnailUrl||c.image||c.fullImageUrl||"";return`<button class="metaKeyCard" onclick="openCardModal('${c.id}')"><div class="metaKeyArt">${img?`<img loading="lazy" decoding="async" src="${esc(img)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="cardplaceholder" style="display:none">${esc(name)}</div>`:`<div class="cardplaceholder">${esc(name)}</div>`}</div><strong>${esc(name)}</strong></button>`}
function metaComparePanel(){const a=(state.metaIntel.compareIds||[]).map(id=>MetaService.getArchetype(id)).filter(Boolean);if(!a.length)return"";return`<div class="panel"><div class="between"><h2>Compare Decks</h2><span class="badge">${a.length}/3 selected</span></div><div class="metaCompareGrid">${a.map(x=>`<div class="metaCompareCard"><h3>${esc(x.name)}</h3><p><strong>Tier:</strong> ${esc(x.tier||"—")}</p><p><strong>Type:</strong> ${esc(x.type||"—")}</p><p><strong>Usage:</strong> ${metaPct(x.stats?.usage)}</p><p><strong>Win Rate:</strong> ${metaPct(x.stats?.winRate)}</p><p><strong>Samples:</strong> ${metaFmt(x.stats?.samples)}</p><p><strong>Matches:</strong> ${metaFmt(x.stats?.matches)}</p><p><strong>Key Cards:</strong> ${metaKeys(x).map(esc).join(", ")}</p><button class="secondary" onclick="metaCompareToggle('${x.id}')">Remove</button></div>`).join("")}</div></div>`}
function metaDetail(a){const p=personalVs(a.name),s=a.sampleSource||{};return`<div class="between"><div><button class="secondary" onclick="state.metaIntel.detailId='';save();render()">← Back</button><h1>${esc(a.name)}</h1><p class="muted">${esc(a.type||"")} • Tier ${esc(a.tier||"—")}</p></div><button class="secondary" onclick="metaWatchToggle('${a.id}')">${(state.metaIntel.watchlist||[]).includes(a.id)?"★ Watching":"☆ Watch"}</button></div><div class="metaDualStats"><div class="panel"><h2>Competitive Meta</h2><div class="metricgrid"><div class="metric"><div class="l">Rank</div><div class="n">${metaFmt(a.stats?.rank)}</div></div><div class="metric"><div class="l">Usage</div><div class="n">${metaPct(a.stats?.usage)}</div></div><div class="metric"><div class="l">Tournament WR</div><div class="n">${metaPct(a.stats?.winRate)}</div></div><div class="metric"><div class="l">Confidence</div><div class="n">${metaConfidence(a)}</div></div></div><p class="muted tiny">${metaFmt(a.stats?.samples)} samples • ${metaFmt(a.stats?.matches)} matches</p></div><div class="panel"><h2>Your Results</h2><div class="metricgrid"><div class="metric"><div class="l">Record</div><div class="n">${p.matches?`${p.wins}-${p.losses}`:"—"}</div></div><div class="metric"><div class="l">Win Rate</div><div class="n">${metaPct(p.wr)}</div></div><div class="metric"><div class="l">Went First</div><div class="n">${p.first.w+p.first.l?`${p.first.w}-${p.first.l}`:"—"}</div></div><div class="metric"><div class="l">Went Second</div><div class="n">${p.second.w+p.second.l?`${p.second.w}-${p.second.l}`:"—"}</div></div></div></div></div><div class="twoCol"><div><div class="panel"><h2>Overview</h2><p>${esc(metaOverviewText(a))}</p><h3>Game Plan</h3><p>${esc(metaStrategyText(a))}</p></div><div class="panel"><h2>How to Beat It</h2><ul>${metaHow(a).map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div></div><div><div class="panel"><h2>Strengths</h2><ul>${metaStrengths(a).map(x=>`<li>${esc(x)}</li>`).join("")}</ul><h2>Weaknesses</h2><ul>${metaWeaknesses(a).map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div></div></div><div class="panel"><h2>Key Cards</h2><div class="metaKeyGrid">${metaKeys(a).map(metaKeyCard).join("")}</div></div><div class="panel"><div class="between"><div><h2>Sample Deck</h2><p class="muted">${metaSampleTotal(a)===20?"20-card competitive sample":"Sample unavailable or incomplete"}</p></div><div class="row">${metaSampleTotal(a)===20?`<button onclick="copyArchetypeDeckList('${a.id}')">Copy Deck</button><button class="secondary" onclick="useArchetypeDeck('${a.id}')">Open in Deck Lab</button>`:""}</div></div>${a.sampleDeck?.length?sampleDeckHtml(a):`<div class="notice">Sample deck coming soon.</div>`}${s.tournamentName?`<div class="notice"><strong>Sample source:</strong> ${esc(s.player||"Unknown player")} • ${esc(s.placement||"")} • ${esc(s.tournamentName||"")} ${s.record?`• ${esc(s.record)}`:""}</div>`:""}</div>`}
function metaIntelPage(){
 metaEnsureLive();
 if(state.metaIntel.detailId){
  const a=MetaService.getArchetype(state.metaIntel.detailId);
  if(a){
   if(!cardsRequested)loadCards();
   const base=metaDetail(a),rows=metaMatchupRowsFor(a.id),extra=rows.length?`<div class="panel"><h2>Live Matchups</h2><p class="muted">Best and worst results are most useful with 5+ mapped matches.</p><div class="metaMatchupScroll"><table class="metaLiveTable"><thead><tr><th>Opponent</th><th>Record</th><th>Win %</th><th>Matches</th><th>Confidence</th></tr></thead><tbody>${rows.slice(0,24).map(m=>`<tr><td>${esc(m.opponent)}</td><td>${m.wins}-${m.losses}-${m.draws}</td><td>${m.wr==null?"—":metaPct(m.wr)}</td><td>${m.matches}</td><td><span class="badge ${m.matches<5?"metaLimited":""}">${m.matches<5?"Limited":esc(m.confidence)}</span></td></tr>`).join("")}</tbody></table></div></div>`:"";
   document.getElementById("app").innerHTML=base+extra;return;
  }
  state.metaIntel.detailId="";
 }
 const o=MetaService.getMetaOverview(),wat=MetaService.getArchetypes().filter(a=>(state.metaIntel.watchlist||[]).includes(a.id)),p=metaLiveSnapshot(),snap=p?.snapshot,st=window.PPCMetaService?PPCMetaService.getStatus():{source:"fallback",loading:false,error:""},w=Number(state.metaIntel.windowHours||168),generated=snap?.generatedAt?new Date(snap.generatedAt):null;
 const ageText=generated?`${Math.max(0,Math.round((Date.now()-generated.getTime())/60000))} min ago`:"Bundled snapshot";
 const riser=o.fastestRiser&&metaMove(o.fastestRiser).delta>0?o.fastestRiser:null;
 document.getElementById("app").innerHTML=`<section class="metaHero">
 <div class="metaHeroGlow"></div>
 <div class="metaHeroMain">
  <div class="metaHeroEyebrow"><span class="metaLiveDot ${st.source==='live'?'isLive':''}"></span> ${esc(metaSourceBadge())}</div>
  <h1>What are you likely to face?</h1>
  <p>See the decks defining the current field first, then dig into matchups, decklists, and deeper competitive data.</p>
  <div class="metaWindowTabs">${[[24,"24H"],[168,"7D"],[336,"14D"],[720,"30D"]].map(([v,n])=>`<button class="secondary ${w===v?'active':''}" onclick="setMetaWindow(${v})">${n}</button>`).join("")}</div>
  <div class="metaHeroTags"><span>${metaFmt(snap?.tournaments)} tournaments</span><span>${metaFmt(snap?.decklists)} decklists</span><span>${metaFmt(snap?.matches)} matches</span><span>${snap?.classificationRate==null?'Coverage unavailable':metaPct(snap.classificationRate)+' classified'}</span></div>
 </div>
 <div class="metaSnapshotCard">
  <span class="metaSnapshotLabel">${metaWindowLabel(w)}</span>
  <strong>${esc(metaSourceBadge())}</strong>
  <small>${st.loading?'Refreshing live data…':`Updated ${ageText}`}</small>
  <div class="metaSnapshotStatus"><span></span> ${snap?.matchMappingRate==null?'Fallback data':metaPct(snap.matchMappingRate)+' match coverage'}</div>
  <button class="secondary" style="margin-top:10px" onclick="refreshMetaLive()">Refresh Meta</button>
 </div>
</section>
${st.error?`<div class="notice">⚠ Live Meta refresh failed. Showing ${esc(st.source)} data. ${esc(st.error)}</div>`:""}
<section class="metaHeadlineGrid ppcMetaSummaryGrid">
 <button class="ppcMetaSummaryCard ppcMetaSummaryCardPrimary" onclick="${o.top?`openMetaIntelDetail('${o.top.id}')`:"void 0"}"><div class="metaStatTop"><span class="metaStatIcon">#1</span><span class="metaStatLabel">Most Likely Matchup</span></div><strong>${esc(o.top?.shortName||o.top?.name||"—")}</strong><small>${o.top?`${metaPct(o.top.stats?.usage)} usage • ${metaPct(o.top.stats?.winRate)} WR • ${metaConfidence(o.top)}`:"No ranked data"}</small></button>
 <button class="ppcMetaSummaryCard" onclick="${o.mostPlayed?`openMetaIntelDetail('${o.mostPlayed.id}')`:"void 0"}"><div class="metaStatTop"><span class="metaStatIcon">◉</span><span class="metaStatLabel">Field Share Leader</span></div><strong>${esc(o.mostPlayed?.shortName||"—")}</strong><small>${o.mostPlayed?`${metaFmt(o.mostPlayed.stats?.deckCount||o.mostPlayed.stats?.samples)} decks • ${metaPct(o.mostPlayed.stats?.usage)} usage`:"Usage unavailable"}</small></button>
 <button class="ppcMetaSummaryCard" onclick="${o.highestWr?`openMetaIntelDetail('${o.highestWr.id}')`:"void 0"}"><div class="metaStatTop"><span class="metaStatIcon">↗</span><span class="metaStatLabel">Best Performer</span></div><strong>${esc(o.highestWr?.shortName||"—")}</strong><small>${o.highestWr?`${metaPct(o.highestWr.stats?.winRate)} • ${metaFmt(o.highestWr.stats?.matches)} matches • ${metaConfidence(o.highestWr)}`:"Win rate unavailable"}</small></button>
</section>
<section class="metaSupportGrid ppcMetaSupportGrid"><button class="ppcMetaSupportCard" onclick="${riser?`openMetaIntelDetail('${riser.id}')`:"void 0"}"><span class="metaSupportIcon">↑</span><div><span>Fastest Riser</span><strong>${esc(riser?.shortName||"No major riser yet")}</strong><small>${riser?esc(metaRankMovement(riser).label):"No positive rank movement in this snapshot"}</small></div></button><div class="ppcMetaSupportCard"><span class="metaSupportIcon">◆</span><div><span>Archetypes</span><strong>${o.archetypes}</strong><small>represented in this window</small></div></div><div class="ppcMetaSupportCard"><span class="metaSupportIcon">≋</span><div><span>Matches</span><strong>${metaFmt(snap?.matches??o.matches)}</strong><small>${snap?.matchMappingRate==null?'fallback snapshot':metaPct(snap.matchMappingRate)+' mapped'}</small></div></div></section>
${metaPreparationPanel()}
${metaQualityPanel()}
${metaIntelligencePanel()}
${wat.length?`<div class="panel"><h2>My Meta Watchlist</h2><div class="metaIntelGrid">${wat.map(metaIntelCard).join("")}</div></div>`:""}
<div class="panel metaTopDecksPanel"><div class="between"><div><h2>Top Decks</h2><p class="muted">Scan the field by usage first. Open a deck for its list, matchup results, key cards, and your personal record.</p></div><span class="badge">${metaFiltered().length} results</span></div><div class="metaIntelFilters"><input placeholder="Search archetypes, Pokémon, cards…" value="${esc(state.metaIntel.query||"")}" oninput="state.metaIntel.query=this.value;render()"><select onchange="state.metaIntel.type=this.value;save();render()"><option value="">All Types</option>${[...new Set(MetaService.getArchetypes().map(a=>a.type).filter(Boolean))].sort().map(x=>`<option ${state.metaIntel.type===x?"selected":""}>${esc(x)}</option>`).join("")}</select><select onchange="state.metaIntel.confidence=this.value;save();render()"><option value="">All Confidence</option>${["High","Medium","Limited"].map(x=>`<option ${state.metaIntel.confidence===x?"selected":""}>${x}</option>`).join("")}</select><select onchange="state.metaIntel.hasSample=this.value;save();render()"><option value="">Any Sample</option><option value="yes" ${state.metaIntel.hasSample==="yes"?"selected":""}>Has 20-card sample</option></select></div><div class="metaIntelGrid">${metaFiltered().map(metaIntelCard).join("")||`<div class="notice">No archetypes match those filters.</div>`}</div></div>
${metaMatchupPanel()}${metaComparePanel()}<div class="bottomnote">Competitive data compiled from publicly available tournament information. PocketNexus is an independent third-party companion and is not affiliated with The Pokémon Company or Limitless TCG.</div>`;
}
function metaDiagnostics(){const a=MetaService.getArchetypes(),bad=[];for(const x of a){const issues=[];if(!x.id)issues.push("missing id");if(!x.name)issues.push("missing name");if(!Array.isArray(x.sampleDeck))issues.push("sampleDeck not array");if(x.sampleDeck?.length&&metaSampleTotal(x)!==20)issues.push(`sample total ${metaSampleTotal(x)}`);const c={};for(const y of x.sampleDeck||[]){const k=normalizedCardName(y.name);c[k]=(c[k]||0)+(Number(y.quantity)||0)}if(Object.values(c).some(q=>q>2))issues.push("copy limit");if(issues.length)bad.push({name:x.name,issues})}return{count:a.length,samples:a.filter(x=>metaSampleTotal(x)===20).length,usage:a.filter(x=>metaNum(x.stats?.usage)!=null).length,wr:a.filter(x=>metaNum(x.stats?.winRate)!=null).length,bad}}
function runMetaDiagnostics(){const d=metaDiagnostics();ppcNotice(`META DIAGNOSTICS\n\nArchetypes: ${d.count}\n20-card samples: ${d.samples}\nWith usage: ${d.usage}\nWith win rate: ${d.wr}\nInvalid records: ${d.bad.length}`+(d.bad.length?`\n\n${d.bad.map(x=>`${x.name}: ${x.issues.join(", ")}`).join("\n")}`:""))}

function metaPage(){return metaIntelPage()}
function legacyMetaPage(){
 const tab=state.metaV73.tab||"overview",tabs=[["overview","Overview"],["tiers","Tier List"],["archetypes","Archetypes"],["matchups","Matchups"],["cards","Card Usage"],["tournaments","Tournaments"],["mine","My Results"]];
 const body=tab==="tiers"?metaTierListV73():tab==="archetypes"?metaArchetypesV73():tab==="matchups"?metaMatchupsV73():tab==="cards"?metaCardsV73():tab==="tournaments"?metaTournamentsV73():tab==="mine"?metaPersonalV73():metaOverviewV73();
 document.getElementById("app").innerHTML=`<div class="between"><div><h1>Meta Center</h1><p class="muted">Competitive snapshot analytics, verified sample decks, matchups, card usage, tournament finishes, and your personal results.</p></div><div><span class="badge">Battle Tower Meta Snapshot</span><div class="muted tiny" style="margin-top:6px">Generated ${new Date(BTM_META_SNAPSHOT.generatedAt).toLocaleString()}</div></div></div><div class="metaTabsV73">${tabs.map(([k,n])=>`<button class="secondary ${tab===k?"active":""}" onclick="setMetaV73Tab('${k}')">${n}</button>`).join("")}</div>${body}<div class="panel sourcePanel"><strong>Data source</strong><p class="muted">Competitive snapshot data was imported from the Battle Tower Meta creator pack supplied for this project. It is a frozen curated snapshot, not a live feed, and this application is not affiliated with Battle Tower Meta or Limitless TCG.</p></div>`;
 if(tab==="archetypes")renderArchetypeBrowser();
}

function cardKind(c){
 if(c?.missing)return "Unknown";
 const raw=c?.raw||{};
 const parts=[
   c?.category,c?.stage,
   raw.type,raw.category,raw.card_type,raw.cardType,
   raw.trainer_type,raw.trainerType,
   raw.subtype,raw.subType,
   ...(Array.isArray(raw.subtypes)?raw.subtypes:[])
 ].filter(Boolean).join(" ").toLowerCase();

 if(/trainer|item|supporter|tool|stadium|fossil/.test(parts))return "Trainer";
 if(/pokemon|pokémon|basic|stage\s*1|stage\s*2|mega|ex\b/.test(parts))return "Pokémon";

 // Known Trainer names from imported/meta decks are a safe last-resort classifier.
 const trainerNames=new Set([
   "professor's research","professor’s research","poké ball","poke ball","x speed",
   "sabrina","cyrus","copycat","erika","lillie","misty","irida","lisia","clemont",
   "professor turo","professor sada","penny","korrina","wallace","juliana",
   "pokémon center lady","pokemon center lady","rare candy","lucky ice pop",
   "lucky egg","leaf cape","giant cape","elegant cape","heavy helmet","rocky helmet",
   "protective poncho","ancient booster energy capsule","quick-grow extract",
   "deceptive needle","field blower","repel","flame patch","clemont's backpack",
   "clemont’s backpack","starting plains","arena of antiquity","rainbow cave",
   "fragrant forest","soothing shore","hiking trail"
 ]);
 if(trainerNames.has(importNameKey(c?.name)))return "Trainer";
 return "Pokémon";
}
function cardPokemonType(c){return c.raw?.pokemonType||c.raw?.energyType||c.raw?.element||c.raw?.color||""}
function availableSets(){return [...new Set(CARDS.map(c=>c.setCode).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}))}
const POCKET_RARITIES=[
 {key:"diamond1",label:"One Diamond",symbol:"◇",short:"◇",order:10,aliases:["c","common","one diamond","1 diamond","diamond 1","diamond1","◇","◊","♢"]},
 {key:"diamond2",label:"Two Diamond",symbol:"◇◇",short:"◇◇",order:20,aliases:["u","uncommon","two diamond","2 diamond","diamond 2","diamond2","◇◇","◊◊","♢♢"]},
 {key:"diamond3",label:"Three Diamond",symbol:"◇◇◇",short:"◇◇◇",order:30,aliases:["r","rare","three diamond","3 diamond","diamond 3","diamond3","◇◇◇","◊◊◊","♢♢♢"]},
 {key:"diamond4",label:"Four Diamond",symbol:"◇◇◇◇",short:"◇◇◇◇",order:40,aliases:["rr","double rare","four diamond","4 diamond","diamond 4","diamond4","◇◇◇◇","◊◊◊◊","♢♢♢♢","double rare"]},
 {key:"star1",label:"One Star",symbol:"☆",short:"☆",order:50,aliases:["ar","art rare","one star","1 star","star 1","star1","☆","art rare"]},
 {key:"star2-sr",label:"Super Rare",symbol:"☆☆",short:"☆☆",order:60,aliases:["sr","super rare"]},
 {key:"star2-sar",label:"Special Art Rare",symbol:"☆☆",short:"☆☆",order:61,aliases:["sar","special art rare"]},
 {key:"star3",label:"Three Star",symbol:"☆☆☆",short:"☆☆☆",order:70,aliases:["im","immersive rare","three star","3 star","star 3","star3","☆☆☆","immersive rare"]},
 {key:"shiny1",label:"Shiny",symbol:"✵",short:"✵",order:80,aliases:["s","shiny","one shiny","1 shiny","shiny 1","✵"]},
 {key:"shiny2",label:"Shiny Super Rare",symbol:"✵✵",short:"✵✵",order:90,aliases:["ssr","shiny super rare","two shiny","2 shiny","shiny 2","✵✵"]},
 {key:"crown",label:"Crown Rare",symbol:"♕",short:"♕",order:100,aliases:["ur","crown","crown rare","ultra rare","♕","crown rare (gold)"]},
 {key:"promo",label:"Promo",symbol:"PROMO",short:"Promo",order:110,aliases:["promo","promotion","promotional"]}
];
function raritySearchText(value){return String(value||"").trim().toLowerCase().replace(/\s+/g," ")}
function pocketRarityInfo(value){
 const raw=String(value||"").trim(),t=raritySearchText(raw),compact=raw.replace(/\s/g,"");
 if(!raw)return {key:"unknown",label:"Unknown",symbol:"—",short:"—",order:999,raw};
 // The live card dataset uses compact rarity codes (C, U, R, RR, AR, SR, SAR, IM, UR, S, SSR).
 // Convert those codes into the Pocket-facing symbols and names users actually recognize.
 const codeMap={
   C:"diamond1",U:"diamond2",R:"diamond3",RR:"diamond4",
   AR:"star1",SR:"star2-sr",SAR:"star2-sar",IM:"star3",
   S:"shiny1",SSR:"shiny2",UR:"crown"
 };
 const code=compact.toUpperCase();
 if(codeMap[code])return POCKET_RARITIES.find(x=>x.key===codeMap[code]);
 // Exact Pocket symbols.
 if(/^[◇◊♢]{1,4}$/.test(compact)){
   const keys=["diamond1","diamond2","diamond3","diamond4"];
   return POCKET_RARITIES.find(x=>x.key===keys[compact.length-1]);
 }
 if(/^☆{1,3}$/.test(compact)){
   if(compact.length===1)return POCKET_RARITIES.find(x=>x.key==="star1");
   if(compact.length===2)return POCKET_RARITIES.find(x=>x.key==="star2-sr");
   return POCKET_RARITIES.find(x=>x.key==="star3");
 }
 if(/^✵{1,2}$/.test(compact))return POCKET_RARITIES.find(x=>x.key===`shiny${compact.length}`);
 if(compact==="♕")return POCKET_RARITIES.find(x=>x.key==="crown");
 for(const info of POCKET_RARITIES){if(info.aliases.some(a=>t===raritySearchText(a)))return info}
 // Common written variants.
 let m=t.match(/(?:diamond|diamonds)\D*([1-4])|([1-4])\D*(?:diamond|diamonds)/);if(m){const n=Number(m[1]||m[2]);return POCKET_RARITIES.find(x=>x.key===`diamond${n}`)}
 m=t.match(/(?:star|stars)\D*([1-3])|([1-3])\D*(?:star|stars)/);if(m){const n=Number(m[1]||m[2]);return POCKET_RARITIES.find(x=>x.key===n===1?"star1":n===3?"star3":"star2-sr")}
 if(t.includes("shiny")&&/(super|2|two)/.test(t))return POCKET_RARITIES.find(x=>x.key==="shiny2");
 if(t.includes("shiny"))return POCKET_RARITIES.find(x=>x.key==="shiny1");
 if(t.includes("crown"))return POCKET_RARITIES.find(x=>x.key==="crown");
 if(t.includes("promo"))return POCKET_RARITIES.find(x=>x.key==="promo");
 // RRR is not defined by the current Pocket rarity metadata source. Keep it visible but clearly marked,
 // rather than pretending it is an official Pocket tier.
 if(code==="RRR")return {key:"raw:rrr",label:"RRR (unmapped)",symbol:"",short:"RRR",order:850,raw};
 return {key:`raw:${t}`,label:raw,symbol:"",short:raw,order:900,raw};
}
function rarityKey(value){return pocketRarityInfo(value).key}
function rarityDisplay(value){const r=pocketRarityInfo(value);return [r.symbol,r.label].filter(Boolean).join(" ")}
function rarityBadge(value){const r=pocketRarityInfo(value);return `<span class="rarityBadge rarity-${esc(r.key)}" title="${esc(r.label)}">${esc(r.symbol)}</span>`}
function availableRarities(){
 const found=new Map();CARDS.forEach(c=>{if(!c.rarity)return;const r=pocketRarityInfo(c.rarity);if(!found.has(r.key))found.set(r.key,r)});
 return [...found.values()].sort((a,b)=>a.order-b.order||a.label.localeCompare(b.label));
}
function rarityOptionsHtml(){return availableRarities().map(r=>`<option value="${esc(r.key)}">${esc([r.symbol,r.label].filter(Boolean).join(" "))}</option>`).join("")}
function raritySortValue(value){return pocketRarityInfo(value).order}
function availablePokemonTypes(){return [...new Set(CARDS.map(cardPokemonType).filter(Boolean))].sort()}
function visualDeckItems(d,kind){return deckItems(d).filter(x=>cardKind(x.card)===kind)}
function deckCompletion(d){return Math.min(100,Math.round(deckCount(d)/20*100))}
function validationDetails(d){
 const out=[],total=deckCount(d),it=deckItems(d);
 const stageKnown=it.some(x=>String(x.card.stage||"").trim());
 const basics=it.filter(x=>cardKind(x.card)==="Pokémon"&&/basic/i.test(x.card.stage||"")).reduce((n,x)=>n+x.qty,0);
 if(total<20)out.push(`Add ${20-total} more card${20-total===1?"":"s"} to reach 20.`);
 if(total>20)out.push(`Remove ${total-20} card${total-20===1?"":"s"}; a Pocket deck must have 20 cards.`);
 if(stageKnown&&basics<1)out.push("Add at least one Basic Pokémon.");
 const missing=it.filter(x=>x.card?.missing);if(missing.length)out.push(`${missing.length} saved card reference${missing.length===1?" is":"s are"} unresolved; reload/retry the Card Database before editing this deck.`);
 const byName={};it.forEach(x=>{const k=normalizedCardName(x.card.name);byName[k]=byName[k]||{name:x.card.name,q:0};byName[k].q+=x.qty});
 Object.values(byName).filter(x=>x.q>2).forEach(x=>out.push(`${x.name} has ${x.q} copies across alternate prints; maximum is 2.`));
 return out;
}
function isDeckLegal(d){return validationDetails(d).length===0}
function duplicateDeck(id){
 const d=state.decks.find(x=>x.id===id);if(!d)return;
 const copy={...d,id:makeId(),name:uniqueDeckName((d.name||"Deck")+" Copy"),cards:{...(d.cards||{})},createdAt:Date.now(),updatedAt:Date.now()};
 state.decks.push(copy);state.selected=copy.id;save();renderEditorShell(copy);
}
function deleteDeckConfirmed(id){
 const d=state.decks.find(x=>x.id===id);if(!d)return;
 const modal=document.getElementById("cardModal"),body=document.getElementById("cardModalBody");if(!modal||!body)return;
 body.innerHTML=`<h2>Delete deck?</h2><p>You are about to delete <strong>${esc(d.name)}</strong>.</p><div class="warningBox">This cannot be undone from the deck manager. When signed in, the deletion is synced as a tombstone so the deck does not reappear on another device.</div><div class="row" style="margin-top:14px"><button class="danger" onclick="performDeckDelete('${esc(id)}')">Delete Deck</button><button class="secondary" onclick="closeCardModal()">Cancel</button></div>`;modal.style.display="flex";
}
function performDeckDelete(id){
 state.decks=state.decks.filter(x=>x.id!==id);if(state.selected===id)state.selected=null;if(state.simDeck===id)state.simDeck=null;save();closeCardModal();state.page="decks";render();
}
function openRenameDeckModal(id){
 const d=state.decks.find(x=>x.id===id);if(!d)return;const modal=document.getElementById("cardModal"),body=document.getElementById("cardModalBody");if(!modal||!body)return;
 body.innerHTML=`<div class="between"><div><h2>Rename Deck</h2><p class="muted">The deck keeps the same ID, so cloud sync updates the existing deck.</p></div><button class="secondary" onclick="closeCardModal()">Close</button></div><label for="renameDeckInput">Deck name</label><input id="renameDeckInput" maxlength="80" value="${esc(d.name||'')}" autocomplete="off"><div class="row" style="margin-top:14px"><button onclick="commitDeckRename('${esc(id)}')">Save Name</button><button class="secondary" onclick="closeCardModal()">Cancel</button></div>`;modal.style.display="flex";setTimeout(()=>{const el=document.getElementById('renameDeckInput');el?.focus();el?.select()},0);
}
function commitDeckRename(id){const d=state.decks.find(x=>x.id===id);const el=document.getElementById("renameDeckInput");const name=(el?.value||"").trim();if(!d||!name)return;if(state.decks.some(x=>x.id!==id&&String(x.name||"").toLowerCase()===name.toLowerCase())){el.insertAdjacentHTML("afterend",`<div class="dangerBox" style="margin-top:8px">A deck with that name already exists.</div>`);return}d.name=name;save();closeCardModal();if(state.selected===id&&state.page==="decks")renderEditorShell(d);else render()}
function renameSelectedDeck(){if(state.selected)openRenameDeckModal(state.selected)}
function renameDeckById(id){openRenameDeckModal(id)}

function exportDeckText(d){
 const lines=[];if(d.energy)lines.push(`Energy: ${d.energy}`);
 deckItems(d).sort((a,b)=>a.card.name.localeCompare(b.card.name)).forEach(x=>lines.push(`${x.qty} ${x.card.name}`));
 return lines.join("\n");
}
function exportSelectedDeck(){
 const d=state.decks.find(x=>x.id===state.selected);if(!d)return;
 const blob=new Blob([exportDeckText(d)],{type:"text/plain"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=(d.name||"deck").replace(/[^a-z0-9_-]+/gi,"_")+".txt";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function deckTileHtml(x){
 const c=x.card;
 if(c?.missing)return `<div class="decktile"><div class="cardplaceholder">${esc(c.name)}<br><span class="bad">Reference missing</span></div><div class="deckqty">×${x.qty}</div><div class="deckactions"><button class="secondary smallbtn" onclick="removeCard('${esc(x.id)}')">Remove</button></div></div>`;
 const owned=collectionOwnedByName(c.name),enough=owned>=Number(x.qty||0);
 return `<div class="decktile ${enough?'collectionOwned':'collectionMissing'}">${imageTag(c,"thumb")}<div class="deckqty">×${x.qty}</div><div class="deckOwnBadge ${enough?'good':'bad'}">${enough?'Owned':`${Math.min(owned,x.qty)}/${x.qty} owned`}</div><div class="deckactions"><button class="secondary smallbtn" onclick="removeCard('${esc(x.id)}')">−</button><button class="secondary smallbtn" onclick="openCardModal('${esc(c.id)}')">View</button><button class="smallbtn" onclick="addCard('${esc(c.id)}')">+</button></div></div>`;
}

function deckWorkspaceNotice(message,type="info"){
 let el=document.getElementById("deckWorkspaceNotice");if(!el)return;
 el.className=`deckWorkspaceNotice ${type}`;el.textContent=message;el.hidden=false;
 clearTimeout(window.__deckNoticeTimer);window.__deckNoticeTimer=setTimeout(()=>{if(el)el.hidden=true},2600);
}
function deckAddButton(c,d){
 const full=deckCount(d)>=20,limit=nameCount(d,c.name)>=2;
 if(full)return `<button class="secondary" disabled title="Remove a card before adding another">Deck Full</button>`;
 if(limit)return `<button class="secondary" disabled title="Maximum two copies by card name">2/2</button>`;
 return `<button onclick="addCard('${esc(c.id)}')">Add</button>`;
}
function renderEditorShell(d){
 state.selected=d.id;save();
 const probs=validationDetails(d),pokemon=visualDeckItems(d,"Pokémon"),trainers=visualDeckItems(d,"Trainer"),unknown=visualDeckItems(d,"Unknown"),pct=deckCompletion(d),count=deckCount(d),needed=Math.max(0,20-count),ready=!probs.length;
 document.getElementById("app").innerHTML=`<div class="builderWorkspacePage"><div class="builderTopbar"><div class="builderIdentity"><button class="secondary" onclick="state.page='decks';render()">← My Decks</button><div><h1>${esc(d.name)}</h1><p class="muted">${count}/20 cards • ${ready?"Ready to Play":`${needed} card${needed===1?'':'s'} needed`} • Auto-saved</p></div></div><div class="builderActions"><button onclick="state.battlePrefs.experienceMode='standard';state.page='matches';save();render()">Record Battle</button><button class="secondary" onclick="state.simDeck='${d.id}';state.page='optimizer';render()">Playtest</button><details class="builderTools"><summary>Tools ▾</summary><div><button class="secondary" onclick="renameSelectedDeck()">Rename</button><button class="secondary" onclick="duplicateDeck('${d.id}')">Duplicate</button><button class="secondary" onclick="exportSelectedDeck()">Export</button><button class="danger" onclick="deleteDeckConfirmed('${d.id}')">Delete</button></div></details></div></div>
 <div id="deckWorkspaceNotice" class="deckWorkspaceNotice" hidden></div>
 <div class="builderStatusBar ${ready?'ready':'needs'}"><div><strong>${ready?'✓ Ready to Play':`${needed} card${needed===1?'':'s'} needed`}</strong><span>${ready?'This deck passes Pocket deck validation.':'Finish the deck and resolve validation items below.'}</span></div><b>${count}/20</b></div>
 <div class="builderSplit"><section class="builderDeckPane deckDropZone" id="deckDropZone" ondragover="deckDragOver(event)" ondragleave="deckDragLeave(event)" ondrop="deckDrop(event)"><div class="builderPaneHeader"><div><span class="eyebrow">DECK</span><h2>Your Deck</h2></div><div class="builderViewMeta"><span>${pokemon.reduce((n,x)=>n+x.qty,0)} Pokémon</span><span>${trainers.reduce((n,x)=>n+x.qty,0)} Trainers</span></div></div><div class="builderEnergy"><label>Energy Type</label><select onchange="setDeckEnergy(this.value)"><option value="">Not set</option>${["Grass","Fire","Water","Lightning","Psychic","Fighting","Darkness","Metal","Dragon","Colorless"].map(e=>`<option ${d.energy===e?"selected":""}>${e}</option>`).join("")}</select></div><div class="decksection"><h3><span>Pokémon</span><span class="pill">${pokemon.reduce((n,x)=>n+x.qty,0)}</span></h3><div class="deckcards builderDeckCards">${pokemon.length?pokemon.map(x=>deckTileHtml(x)).join(""):`<p class="muted builderEmptySlot">No Pokémon added yet.</p>`}</div></div><div class="decksection"><h3><span>Trainers</span><span class="pill">${trainers.reduce((n,x)=>n+x.qty,0)}</span></h3><div class="deckcards builderDeckCards">${trainers.length?trainers.map(x=>deckTileHtml(x)).join(""):`<p class="muted builderEmptySlot">No Trainers added yet.</p>`}</div></div>${unknown.length?`<div class="decksection"><h3><span class="bad">Unresolved</span><span class="pill">${unknown.reduce((n,x)=>n+x.qty,0)}</span></h3><div class="deckcards builderDeckCards">${unknown.map(x=>deckTileHtml(x)).join("")}</div></div>`:""}<div class="validationBox builderValidation"><div class="between"><h3>Deck Validation</h3><span class="${probs.length?"bad":"good"}">${probs.length?"Needs fixes":"Ready"}</span></div>${probs.length?`<ul>${probs.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:`<p class="good">✓ 20 cards, at least one Basic Pokémon, and no card name exceeds two copies.</p>`}</div></section>
 <aside class="builderSearchPane"><div class="builderPaneHeader"><div><span class="eyebrow">CARD SEARCH</span><h2>Find Cards</h2></div><span class="pill">${CARDS.length.toLocaleString()} cards</span></div><input id="q" class="builderSearchInput" placeholder="Search card name..." oninput="filterCards()"><div class="builderFilterRow"><select id="setFilter" onchange="filterCards()"><option value="">All sets</option>${availableSets().map(x=>`<option>${esc(x)}</option>`).join("")}</select><select id="rarityFilter" onchange="filterCards()"><option value="">All rarities</option>${rarityOptionsHtml()}</select><select id="typeFilter" onchange="filterCards()"><option value="">All cards</option><option>Pokémon</option><option>Trainer</option></select><select id="pokemonTypeFilter" onchange="filterCards()"><option value="">All Pokémon types</option>${availablePokemonTypes().map(x=>`<option>${esc(x)}</option>`).join("")}</select><select id="stageFilter" onchange="filterCards()"><option value="">All stages</option><option>Basic</option><option>Stage 1</option><option>Stage 2</option></select><select id="sortFilter" onchange="filterCards()"><option value="name">Name</option><option value="set">Set</option><option value="rarity">Rarity</option></select></div><div id="catalogInfo" class="muted tiny"></div><div id="cards" class="cards builderCatalog"></div><div id="moreWrap"></div></aside></div>
 <div class="builderLowerPanels">${deckCollectionPanel(d)}${deckIntelligencePanel(d)}<div class="panel"><div class="between"><div><h2>Share / Import</h2><p class="muted">Copy this deck as text or paste a list from another source.</p></div><div class="row"><button onclick="copyCurrentDeckList()">Copy Deck List</button><button class="secondary" onclick="importDeckModal()">Paste / Import Deck</button></div></div></div></div></div>`;
 filterCards();
}

function setOptions(){let vals=[...new Set(CARDS.map(c=>c.setCode).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));return `<option value="">All sets</option>`+vals.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("")}
function filtered(){
 let q=(document.getElementById("q")?.value||"").toLowerCase(),set=document.getElementById("setFilter")?.value||"",rarity=document.getElementById("rarityFilter")?.value||"",type=document.getElementById("typeFilter")?.value||"",ptype=document.getElementById("pokemonTypeFilter")?.value||"",stage=document.getElementById("stageFilter")?.value||"",sort=document.getElementById("sortFilter")?.value||"name";
 let arr=CARDS.filter(c=>(!q||c.name.toLowerCase().includes(q))&&(!set||c.setCode===set)&&(!rarity||rarityKey(c.rarity)===rarity)&&(!type||cardKind(c)===type)&&(!ptype||cardPokemonType(c)===ptype)&&(!stage||new RegExp(stage,"i").test(c.stage||"")));
 arr.sort((a,b)=>sort==="set"?(a.setCode||"").localeCompare(b.setCode||"",undefined,{numeric:true})||a.name.localeCompare(b.name):sort==="rarity"?(raritySortValue(a.rarity)-raritySortValue(b.rarity)||a.name.localeCompare(b.name)):a.name.localeCompare(b.name));
 return arr;
}
function filterCards(){cardPage=0;renderCatalog()}
function renderCatalog(){
 let all=filtered(),shown=all.slice(cardPage*CARD_PAGE_SIZE,cardPage*CARD_PAGE_SIZE+CARD_PAGE_SIZE);
 const totalPages=Math.max(1,Math.ceil(all.length/CARD_PAGE_SIZE));
 if(cardPage>=totalPages){cardPage=totalPages-1;shown=all.slice(cardPage*CARD_PAGE_SIZE,cardPage*CARD_PAGE_SIZE+CARD_PAGE_SIZE)}
 const start=cardPage*CARD_PAGE_SIZE;
 document.getElementById("catalogInfo").textContent=`${all.length.toLocaleString()} matching card records • page ${cardPage+1} of ${totalPages}`;
 document.getElementById("cards").innerHTML=shown.map(c=>`<div class="card builderDraggableCard" draggable="true" data-card-id="${esc(c.id)}" ondragstart="deckDragStart(event,'${esc(c.id)}')" ondragend="deckDragEnd(event)"><div class="cardimgwrap" onclick="openCardModal('${esc(c.id)}')" style="cursor:pointer">${imageTag(c,"thumb")}</div><div class="cardbody"><h4>${esc(c.name)}</h4><div class="muted tiny">${esc(c.setCode)} #${esc(c.number)} ${c.rarity?`• ${rarityBadge(c.rarity)} ${esc(pocketRarityInfo(c.rarity).label)}`:""}</div><div class="muted tiny">${esc(c.category)} ${c.stage?`• ${esc(c.stage)}`:""}</div><div class="row" style="margin-top:8px">${deckAddButton(c,state.decks.find(x=>x.id===state.selected))}<button class="secondary" onclick="openCardModal('${esc(c.id)}')">View</button></div></div></div>`).join("");
 document.getElementById("moreWrap").innerHTML=`<div class="pager"><button class="secondary" ${cardPage<=0?"disabled":""} onclick="if(cardPage>0){cardPage--;renderCatalog()}">← Previous</button><span class="muted">Showing ${shown.length?start+1:0}-${start+shown.length} of ${all.length.toLocaleString()}</span><button class="secondary" ${cardPage>=totalPages-1?"disabled":""} onclick="if(cardPage<${totalPages-1}){cardPage++;renderCatalog()}">Next →</button></div>`;
}
function openCardModal(id){
 const c=card(id);if(!c)return;const d=state.decks.find(x=>x.id===state.selected),qty=d?nameCount(d,c.name):0,r=colRec(c.id);
 document.getElementById("cardModalBody").innerHTML=`<div class="between"><div><h2>${esc(c.name)}</h2><div class="muted">${esc(c.setName||c.setCode)} • #${esc(c.number)} ${c.rarity?`• ${esc(c.rarity)}`:""}</div></div><button class="secondary" onclick="closeCardModal()">Close</button></div><div class="modalgrid v822CardDetail" style="margin-top:14px"><div>${imageTag(c,"full")}</div><div><div class="metricgrid"><div class="metric"><div class="l">Kind</div><div class="n" style="font-size:18px">${esc(cardKind(c))}</div></div><div class="metric"><div class="l">Stage</div><div class="n" style="font-size:18px">${esc(c.stage||"—")}</div></div><div class="metric"><div class="l">Set</div><div class="n" style="font-size:18px">${esc(c.setCode||"—")}</div></div><div class="metric"><div class="l">Rarity</div><div class="n rarityMetric" style="font-size:18px">${c.rarity?`${rarityBadge(c.rarity)} ${esc(pocketRarityInfo(c.rarity).label)}`:"—"}</div></div></div><div class="cardmeta"><span class="pill">${qty} ${qty===1?'copy':'copies'} in deck • max 2</span><span class="pill">Owned for deck ×${collectionOwnedByName(c.name)}</span><span class="pill">This print ×${r.owned||0}</span>${cardPokemonType(c)?`<span class="pill">${esc(cardPokemonType(c))}</span>`:""}</div><div class="row" style="margin-top:14px">${d?deckAddButton(c,d):''}<button class="secondary" ${qty?"":"disabled"} onclick="removeCard('${esc(c.id)}');closeCardModal()">− Remove</button></div><div class="collectionQuickEdit"><strong>Collection</strong><div class="row"><button class="secondary" onclick="changeCollectionInline('${esc(id)}','owned',1)">+ Owned</button><button class="secondary" onclick="changeCollectionInline('${esc(id)}','wanted',1)">+ Wishlist</button><button class="secondary" onclick="changeCollectionInline('${esc(id)}','tradeable',1)">+ Trade</button></div></div></div></div>`;
 document.getElementById("cardModal").style.display="flex";
}
function changeCollectionInline(id,key,delta){const r=colRec(id);r[key]=Math.max(0,(r[key]||0)+delta);if(key==="tradeable"&&r.tradeable>r.owned)r.tradeable=r.owned;save();openCardModal(id)}
function closeCardModal(){document.getElementById("cardModal").style.display="none"}
function deckDragStart(event,id){
 if(!event?.dataTransfer)return;
 event.dataTransfer.effectAllowed="copy";
 event.dataTransfer.setData("text/plain",id);
 event.currentTarget?.classList.add("dragging");
 document.getElementById("deckDropZone")?.classList.add("dragReady");
}
function deckDragOver(event){
 event.preventDefault();
 if(event.dataTransfer)event.dataTransfer.dropEffect="copy";
 event.currentTarget?.classList.add("dragOver");
}
function deckDragLeave(event){
 if(event.currentTarget===event.target||!event.currentTarget.contains(event.relatedTarget))event.currentTarget?.classList.remove("dragOver");
}
function deckDragEnd(event){
 event.currentTarget?.classList.remove("dragging");
 const z=document.getElementById("deckDropZone");z?.classList.remove("dragReady","dragOver");
}
function deckDrop(event){
 event.preventDefault();
 const id=event.dataTransfer?.getData("text/plain");
 event.currentTarget?.classList.remove("dragReady","dragOver");
 if(!id)return;
 addCard(id);
}
function addCard(id){
 const d=state.decks.find(x=>x.id===state.selected),c=card(id);if(!d||!c)return;
 if(nameCount(d,c.name)>=2){deckWorkspaceNotice(`Maximum 2 copies of ${c.name} across all prints.`,"warn");return;}
 if(deckCount(d)>=20){deckWorkspaceNotice("Deck full — remove a card before adding another.","warn");return;}
 d.cards[id]=(d.cards[id]||0)+1;save();renderEditorShell(d);
}
function removeCard(id){
 const d=state.decks.find(x=>x.id===state.selected);if(!d)return;
 d.cards[id]=(d.cards[id]||0)-1;if(d.cards[id]<=0)delete d.cards[id];save();renderEditorShell(d);
}
function setDeckEnergy(v){let d=state.decks.find(x=>x.id===state.selected);if(d){d.energy=v;save()}}
function renameDeck(v){let d=state.decks.find(x=>x.id===state.selected);d.name=v.trim()||"Untitled Deck";save()}
async function importDeck(){
 const txt=(document.getElementById("imp")?.value||"").trim();
 if(!txt)return ppcNotice("Paste a deck list first.");
 const ready=await ensureCardDatabaseReady();
 if(!ready)return ppcNotice("The full Card Database is unavailable. Retry it before importing so card names and set numbers can be matched safely.");

 // Use the same robust parser as Paste / Import.
 const analysis=analyzeImportedDeck(txt);

 if(analysis.unresolved.length || analysis.copyViolations.length || analysis.total!==20){
   let parts=[];
   if(analysis.total!==20)parts.push(`Resolved ${analysis.total}/20 cards.`);
   if(analysis.unresolved.length)parts.push(`Could not match:\n${analysis.unresolved.join("\n")}`);
   if(analysis.copyViolations.length)parts.push(`Copy-limit problems:\n${analysis.copyViolations.map(x=>`${x.name} ×${x.q}`).join("\n")}`);
   parts.push("No changes were made to your current deck.");
   ppcNotice(parts.join("\n\n"));
   return;
 }

 // Read optional Energy: line separately.
 let energy="";
 txt.split(/\r?\n/).forEach(line=>{
   const m=String(line).trim().match(/^Energy:\s*(.+)$/i);
   if(m)energy=m[1].trim();
 });

 let base="Imported Deck",name=base,n=1;
 const titleLine=txt.split(/\r?\n/).find(x=>/^#\s+[^:]+/.test(x.trim()));
 if(titleLine)base=titleLine.replace(/^#\s*/,"").trim()||base;
 name=base;
 while(state.decks.some(d=>String(d.name||"").toLowerCase()===name.toLowerCase())){name=`${base} Copy${n>1?" "+n:""}`;n++}

 const d={id:makeId(),name,cards:analysis.cards,energy,importedFrom:"paste"};
 state.decks.push(d);
 state.selected=d.id;
 save();
 renderEditorShell(d);
}

function deckMetrics(d){
 const it=deckItems(d);
 const pokemon=it.filter(x=>/pokémon|pokemon/i.test(x.card.category));
 const trainers=it.filter(x=>/trainer|item|supporter|tool|stadium/i.test((x.card.category||"")+" "+(x.card.stage||"")));
 const basics=pokemon.filter(x=>/basic/i.test(x.card.stage)).reduce((n,x)=>n+x.qty,0);
 const stage1=pokemon.filter(x=>/stage 1/i.test(x.card.stage)).reduce((n,x)=>n+x.qty,0);
 const stage2=pokemon.filter(x=>/stage 2/i.test(x.card.stage)).reduce((n,x)=>n+x.qty,0);
 const unique=new Set(it.map(x=>x.card.name)).size;
 const maxCopies=Math.max(0,...it.map(x=>nameCount(d,x.card.name)));
 const idsReady=it.every(x=>x.card.setCode&&x.card.number&&x.card.setCode!=="Starter"&&x.card.setCode!=="Fallback");
 return {total:deckCount(d),pokemon:pokemon.reduce((n,x)=>n+x.qty,0),trainers:trainers.reduce((n,x)=>n+x.qty,0),basics,stage1,stage2,unique,maxCopies,idsReady};
}
function deckGymExport(d){
 const lines=[];
 if(d.energy) lines.push(`Energy: ${d.energy}`,"");
 const grouped={};
 deckItems(d).forEach(x=>{
   const key=`${x.card.setCode}|${String(x.card.number).padStart(3,"0")}`;
   grouped[key]=(grouped[key]||0)+x.qty;
 });
 Object.entries(grouped).forEach(([key,qty])=>{
   const [set,num]=key.split("|");
   lines.push(`${qty} ${set} ${num}`);
 });
 return lines.join("\n");
}
function copyDeckGym(id){
 const d=state.decks.find(x=>x.id===id);if(!d)return;
 const txt=deckGymExport(d);
 if(navigator.clipboard&&window.isSecureContext){
   navigator.clipboard.writeText(txt).then(()=>ppcNotice("DeckGym-format deck copied."));
 } else {
   const ta=document.createElement("textarea");ta.value=txt;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();ppcNotice("DeckGym-format deck copied.");
 }
}
function sampleConsistency(d, runs=5000, sampleSize=5){
 const pool=[];
 deckItems(d).forEach(x=>{for(let i=0;i<x.qty;i++)pool.push(x.card)});
 if(pool.length<sampleSize)return null;
 let withBasic=0, withPokemon=0, trainerHeavy=0, distinct3=0;
 for(let r=0;r<runs;r++){
   const idx=pool.map((_,i)=>i);
   for(let i=idx.length-1;i>idx.length-1-sampleSize;i--){
      const j=Math.floor(Math.random()*(i+1));[idx[i],idx[j]]=[idx[j],idx[i]];
   }
   const hand=idx.slice(-sampleSize).map(i=>pool[i]);
   const p=hand.filter(c=>/pokémon|pokemon/i.test(c.category));
   const b=hand.filter(c=>/basic/i.test(c.stage));
   const t=hand.filter(c=>/trainer|item|supporter|tool|stadium/i.test((c.category||"")+" "+(c.stage||"")));
   if(b.length)withBasic++;
   if(p.length)withPokemon++;
   if(t.length>=4)trainerHeavy++;
   if(new Set(hand.map(c=>c.name)).size>=3)distinct3++;
 }
 return {runs,sampleSize,basic:withBasic/runs*100,pokemon:withPokemon/runs*100,trainerHeavy:trainerHeavy/runs*100,distinct3:distinct3/runs*100};
}
function empiricalMatchup(d){
 const ms=state.matches.filter(m=>m.deckId===d.id);
 if(!ms.length)return null;
 const w=ms.filter(m=>m.result==="win").length,n=ms.length,p=w/n;
 const z=1.96,den=1+z*z/n,center=(p+z*z/(2*n))/den,half=z*Math.sqrt((p*(1-p)+z*z/(4*n))/n)/den;
 return {n,w,wr:p*100,low:Math.max(0,(center-half)*100),high:Math.min(100,(center+half)*100)};
}

const COLLECTION_PAGE_SIZE=48;
let collectionPageIndex=0, collectionMode="all", collectionBulkMode=false;
const collectionSelected=new Set();
function toggleCollectionQuickEdit(){
 state.collectionPrefs.quickEdit=!state.collectionPrefs.quickEdit;
 safeStorageSet(STORE,JSON.stringify(state));
 collectionPage();
}
function normalizeCollectionRecord(r){
 r.owned=Math.max(0,Math.floor(Number(r.owned||0)));
 r.wanted=Math.max(0,Math.floor(Number(r.wanted||0)));
 r.tradeable=Math.max(0,Math.min(Math.floor(Number(r.tradeable||0)),r.owned));
 return r;
}
function collectionRead(id){
 const r=state.collection?.[id];
 return r?{owned:Math.max(0,Math.floor(Number(r.owned||0))),wanted:Math.max(0,Math.floor(Number(r.wanted||0))),tradeable:Math.max(0,Math.min(Math.floor(Number(r.tradeable||0)),Math.max(0,Math.floor(Number(r.owned||0)))))}:{owned:0,wanted:0,tradeable:0};
}
function quickCollectionAdjust(id,key,delta,event){
 event?.stopPropagation?.();
 const r=colRec(id);r[key]=Math.max(0,Math.floor(Number(r[key]||0)+Number(delta||0)));
 normalizeCollectionRecord(r);
 save();renderCollectionGrid();renderCollectionCloudStatus();
}

function colRec(id){
 if(!state.collection[id]) state.collection[id]={owned:0,wanted:0,tradeable:0};
 return normalizeCollectionRecord(state.collection[id]);
}
function changeCollection(id,key,delta){
 const r=colRec(id);r[key]=Math.max(0,Math.floor(Number(r[key]||0)+Number(delta||0)));
 normalizeCollectionRecord(r);
 save();collectionPage();
}
function setCollectionMode(mode){collectionMode=mode;collectionPageIndex=0;collectionPage()}
function collectionFiltered(){
 let q=(document.getElementById("cq")?.value||"").trim().toLowerCase();
 let set=document.getElementById("cset")?.value||"", rarity=document.getElementById("crarity")?.value||"";
 let kind=document.getElementById("ckind")?.value||"", stage=document.getElementById("cstage")?.value||"", sort=document.getElementById("csort")?.value||"name";
 let arr=(Array.isArray(CARDS)?CARDS:[]).filter(c=>{
   const r=collectionRead(c.id),owned=Number(r.owned||0),wanted=Number(r.wanted||0),trade=Number(r.tradeable||0);
   const modeOk=collectionMode==="owned"?owned>0:collectionMode==="missing"?owned<1:collectionMode==="wishlist"?wanted>0:collectionMode==="trade"?trade>0:true;
   return modeOk&&(!q||String(c.name||"").toLowerCase().includes(q))&&(!set||c.setCode===set)&&(!rarity||rarityKey(c.rarity)===rarity)&&(!kind||cardKind(c)===kind)&&(!stage||String(c.stage||"").trim().toLowerCase()===String(stage).trim().toLowerCase());
 });
 arr.sort((a,b)=>{
   if(sort==="set")return String(a.setCode||"").localeCompare(String(b.setCode||""),undefined,{numeric:true})||String(a.number||"").localeCompare(String(b.number||""),undefined,{numeric:true});
   if(sort==="number")return String(a.number||"").localeCompare(String(b.number||""),undefined,{numeric:true})||String(a.name||"").localeCompare(String(b.name||""));
   if(sort==="rarity")return raritySortValue(a.rarity)-raritySortValue(b.rarity)||String(a.name||"").localeCompare(String(b.name||""));
   if(sort==="owned")return Number(collectionRead(b.id).owned||0)-Number(collectionRead(a.id).owned||0)||String(a.name||"").localeCompare(String(b.name||""));
   return String(a.name||"").localeCompare(String(b.name||""));
 });
 return arr;
}
function collectionBulkToolbarHtml(){
 const set=document.getElementById("cset")?.value||"",rarity=document.getElementById("crarity")?.value||"";
 const count=collectionSelected.size,rarityInfo=rarity?availableRarities().find(x=>x.key===rarity):null;
 return `<div class="collectionBulkBar ${collectionBulkMode?'active':''}"><div><strong>${collectionBulkMode?`${count} selected`:'Bulk collection tools'}</strong><small>${collectionBulkMode?'Click cards to add/remove them from your selection.':'Select multiple cards, claim a whole set, or claim one rarity across the library.'}</small></div><div class="row"><button class="secondary ${collectionBulkMode?'active':''}" onclick="toggleCollectionBulkMode()">${collectionBulkMode?'Done Selecting':'Multi-Select'}</button>${collectionBulkMode?`<button ${count?'':'disabled'} onclick="claimSelectedCards()">Claim Selected${count?` (${count})`:''}</button><button class="secondary" ${count?'':'disabled'} onclick="clearCollectionSelection()">Clear</button>`:''}<button class="secondary" ${set?'':'disabled'} onclick="claimCurrentSet()">${set?`Claim All ${esc(set)}`:'Choose a Set to Claim All'}</button><button class="secondary" ${rarityInfo?'':'disabled'} onclick="claimCurrentRarity()">${rarityInfo?`Claim All ${esc(rarityInfo.symbol)} ${esc(rarityInfo.label)}`:'Choose a Rarity to Claim All'}</button></div></div><div id="collectionBulkStatus" class="collectionBulkStatus" aria-live="polite"></div>`;
}
function renderCollectionBulkToolbar(){const el=document.getElementById("collectionBulkTools");if(el)el.innerHTML=collectionBulkToolbarHtml()}
function setCollectionBulkStatus(message,type="good"){const el=document.getElementById("collectionBulkStatus");if(el){el.className=`collectionBulkStatus ${type}`;el.textContent=message||""}}
function toggleCollectionBulkMode(){collectionBulkMode=!collectionBulkMode;collectionSelected.clear();renderCollectionGrid();renderCollectionBulkToolbar()}
function clearCollectionSelection(){collectionSelected.clear();renderCollectionGrid();renderCollectionBulkToolbar()}
function toggleCollectionCardSelection(id){if(collectionSelected.has(id))collectionSelected.delete(id);else collectionSelected.add(id);renderCollectionGrid();renderCollectionBulkToolbar()}
function claimSelectedCards(){
 if(!collectionSelected.size)return;
 const count=collectionSelected.size;
 PPCUI.open({eyebrow:"COLLECTION",title:`Claim ${count} selected card${count===1?'':'s'}?`,message:"Selected cards will be marked as owned. Existing owned, wishlist, and trade quantities will never be reduced.",actions:[{label:"Cancel",className:"secondary",onclick:"PPCUI.close()"},{label:"Claim Selected",onclick:"PPCUI.close();performClaimSelectedCards()"}]});
}
function performClaimSelectedCards(){
 if(!collectionSelected.size)return;
 let claimed=0,already=0;
 collectionSelected.forEach(id=>{const r=colRec(id);if(Number(r.owned||0)>0)already++;else{r.owned=1;normalizeCollectionRecord(r);claimed++}});
 save();collectionSelected.clear();collectionBulkMode=false;collectionPage();
 setCollectionBulkStatus(`${claimed} card${claimed===1?'':'s'} claimed${already?` • ${already} already owned`:''}.`);
}
function claimCurrentSet(){
 const set=document.getElementById("cset")?.value||"";
 if(!set){setCollectionBulkStatus("Choose a set first.","warn");return}
 const cards=CARDS.filter(c=>c.setCode===set);
 if(!cards.length){setCollectionBulkStatus("No cards found for that set.","warn");return}
 PPCUI.open({eyebrow:"COLLECTION",title:`Claim all ${esc(set)} cards?`,message:`Mark all ${cards.length} cards in this set as owned. Existing quantities will never be reduced.`,actions:[{label:"Cancel",className:"secondary",onclick:"PPCUI.close()"},{label:"Claim Set",onclick:`PPCUI.close();performClaimCurrentSet('${esc(set)}')`}]});
}
function performClaimCurrentSet(set){
 const cards=CARDS.filter(c=>c.setCode===set);let claimed=0;cards.forEach(c=>{const r=colRec(c.id);if(Number(r.owned||0)<1){r.owned=1;claimed++}});
 save();collectionBulkMode=false;collectionSelected.clear();collectionPage();
 const sel=document.getElementById("cset");if(sel){sel.value=set;renderCollectionGrid();renderCollectionBulkToolbar()}
 setCollectionBulkStatus(`${set}: ${claimed} newly claimed • ${cards.length} total cards now marked owned.`);
}
function claimCurrentRarity(){
 const key=document.getElementById("crarity")?.value||"";
 if(!key){setCollectionBulkStatus("Choose a rarity first.","warn");return}
 const info=availableRarities().find(x=>x.key===key),cards=CARDS.filter(c=>rarityKey(c.rarity)===key);
 if(!info||!cards.length){setCollectionBulkStatus("No cards found for that rarity.","warn");return}
 PPCUI.open({eyebrow:"COLLECTION",title:`Claim all ${esc(info.label)} cards?`,message:`Mark all ${cards.length} ${esc(info.symbol)} ${esc(info.label)} cards as owned. Existing quantities will never be reduced.`,actions:[{label:"Cancel",className:"secondary",onclick:"PPCUI.close()"},{label:"Claim Rarity",onclick:`PPCUI.close();performClaimCurrentRarity('${esc(key)}')`}]});
}
function performClaimCurrentRarity(key){
 const info=availableRarities().find(x=>x.key===key),cards=CARDS.filter(c=>rarityKey(c.rarity)===key);if(!info)return;
 let claimed=0;cards.forEach(c=>{const r=colRec(c.id);if(Number(r.owned||0)<1){r.owned=1;claimed++}});
 save();collectionBulkMode=false;collectionSelected.clear();collectionPage();
 const sel=document.getElementById("crarity");if(sel){sel.value=key;renderCollectionGrid();renderCollectionBulkToolbar()}
 setCollectionBulkStatus(`${info.symbol} ${info.label}: ${claimed} newly claimed • ${cards.length} total cards now marked owned.`);
}

// V8.47 / V8.64.1 — Combined Competitive Meta Center.
// The public UI intentionally presents one aggregated competitive sample and does not
// expose provider/source labels. The legacy event ID is retained only for older pairing RPCs.
const CompetitiveMeta847={events:[],meta:[],matrix:[],eventId:"",days:30,view:"list",loading:false,error:"",loaded:false};
window.CompetitiveMeta847=CompetitiveMeta847;
async function loadCompetitiveMeta847(force=false){
 if(CompetitiveMeta847.loading||(!force&&CompetitiveMeta847.loaded))return;
 const client=window.getPPCCloudClient?.();if(!client)return;
 CompetitiveMeta847.loading=true;CompetitiveMeta847.error="";
 try{
  state.metaIntel=state.metaIntel||{};
  const savedDays=Number(state.metaIntel.combinedDays||30);
  CompetitiveMeta847.days=[7,14,30,60,90].includes(savedDays)?savedDays:30;
  CompetitiveMeta847.view=state.metaIntel.combinedView==="matrix"?"matrix":"list";
  // Keep event metadata available for older tools that still use event-scoped matchup RPCs.
  const ev=await client.rpc("get_competitive_events");
  CompetitiveMeta847.events=ev.error?[]:(Array.isArray(ev.data)?ev.data:[]);
  const savedEvent=state.metaIntel?.competitiveEventId||"";
  if(!CompetitiveMeta847.eventId&&CompetitiveMeta847.events.some(e=>e.id===savedEvent))CompetitiveMeta847.eventId=savedEvent;
  if(!CompetitiveMeta847.eventId&&CompetitiveMeta847.events[0])CompetitiveMeta847.eventId=CompetitiveMeta847.events[0].id;
  const [mt,mx]=await Promise.all([
   client.rpc("get_combined_competitive_meta",{p_days:CompetitiveMeta847.days,p_limit:100}),
   client.rpc("get_combined_matchup_matrix",{p_days:CompetitiveMeta847.days,p_top:12})
  ]);
  if(mt.error)throw mt.error;
  if(mx.error)throw mx.error;
  CompetitiveMeta847.meta=Array.isArray(mt.data)?mt.data:[];
  CompetitiveMeta847.matrix=Array.isArray(mx.data)?mx.data:[];
  CompetitiveMeta847.loaded=true;
 }catch(e){CompetitiveMeta847.error=e?.message||String(e)}finally{CompetitiveMeta847.loading=false;if(state.page==='meta')render()}
}
async function setCompetitiveEvent847(id){CompetitiveMeta847.eventId=id||"";state.metaIntel=state.metaIntel||{};state.metaIntel.competitiveEventId=CompetitiveMeta847.eventId;save();pairingLiveIntel=null;pairingLiveIntelError=""}
async function setCompetitiveRange847(days){
 const n=Number(days)||30;CompetitiveMeta847.days=n;state.metaIntel=state.metaIntel||{};state.metaIntel.combinedDays=n;save();CompetitiveMeta847.loaded=false;await loadCompetitiveMeta847(true)
}
function setCompetitiveView847(view){
 CompetitiveMeta847.view=view==="matrix"?"matrix":"list";state.metaIntel=state.metaIntel||{};state.metaIntel.combinedView=CompetitiveMeta847.view;save();if(state.page==='meta')render()
}

function bigBossCompetitivePanel8506(){
 const lib=window.PPCArchetypeLibrary;
 if(lib&&!lib.loaded&&!lib.loading)setTimeout(()=>lib.load?.().then(()=>{if(state.page==='meta')render()}),0);
 const rows=(lib?.featured?.()||[]).slice(0,6);
 if(!rows.length)return '';
 const cardFor=(id,name)=>{if(id){const direct=(CARDS||[]).find(c=>String(c.id)===String(id));if(direct)return direct}return name?getCardByName(name):null};
 const cardsHtml=(r)=>{const specs=[[r.hero_card_id,r.primary_pokemon],[r.secondary_card_id,r.secondary_pokemon]].filter(x=>x[0]||x[1]);return specs.slice(0,2).map(([id,name])=>{const c=cardFor(id,name);if(c)return `<button class="bigBossArtButton" onclick="openCardModal('${esc(c.id)}')" aria-label="Open ${esc(c.name)}">${imageTag(c,'thumb')}</button>`;return `<div class="cardplaceholder">${esc(name||'Artwork unavailable')}</div>`}).join('')};
 return `<section class="panel"><div class="between"><div><span class="eyebrow">BIG BOSS CARDS</span><h2>Featured competitive archetypes</h2><p class="muted">Core Pokémon from the shared archetype library. Tap artwork for card details.</p></div><span class="badge">${rows.length} FEATURED</span></div><div class="bigBossGrid">${rows.map(r=>`<article class="bigBossCard"><div class="bigBossArt">${cardsHtml(r)}</div><h3>${esc(r.display_name||r.canonical_name)}</h3><p class="muted tiny">${esc([r.primary_type,r.secondary_type,r.deck_style].filter(Boolean).join(' • '))}</p></article>`).join('')}</div></section>`;
}

function competitivePanel847(){
 const c=CompetitiveMeta847;if(!c.loaded&&!c.loading)setTimeout(()=>loadCompetitiveMeta847(),0);
 const sampleGames=Number(c.meta?.[0]?.sample_games||0);
 const appearances=(c.meta||[]).reduce((sum,a)=>sum+Number(a.appearances||0),0);
 const tournaments=(c.meta||[]).reduce((set,a)=>{if(Number(a.tournament_count||0))set.add(String(a.archetype));return set},new Set()).size;
 const rows=(c.meta||[]).slice(0,24).map((a,i)=>`<tr><td><strong>#${i+1} ${esc(a.archetype)}</strong></td><td>${Number(a.meta_share||0).toFixed(1)}%</td><td>${Number(a.appearances||0).toLocaleString()}</td><td>${a.wins}-${a.losses}${a.ties?`-${a.ties}`:''}</td><td>${a.win_rate==null?'—':Number(a.win_rate).toFixed(1)+'%'}</td><td>${Number(a.games||0).toLocaleString()}</td><td><span class="badge">${esc(a.confidence_label||'LOW')}</span></td></tr>`).join('');
 const names=(c.meta||[]).slice(0,12).map(x=>x.archetype);
 const key=n=>String(n||'').trim().toLowerCase().replace(/\s+/g,' ');
 const mm=new Map((c.matrix||[]).map(r=>[`${key(r.archetype)}|${key(r.opponent)}`,r]));
 const matrixHead=names.map(n=>`<th title="${esc(n)}">${esc(n.split(' / ')[0].replace('Mega ','M. ').slice(0,14))}</th>`).join('');
 const matrixRows=names.map(a=>`<tr><th>${esc(a)}</th>${names.map(b=>{const r=mm.get(`${key(a)}|${key(b)}`);if(!r)return '<td class="metaMatrixEmpty">—</td>';const wr=Number(r.win_rate),g=Number(r.games||0),low=g<10;const tone=low?'lowSample':wr>=55?'favored':wr<=45?'unfavored':'even';return `<td class="metaMatrixCell ${tone}" title="${esc(a)} vs ${esc(b)} • ${g} games${low?' • low sample':''}"><strong>${Number.isFinite(wr)?wr.toFixed(0)+'%':'—'}</strong><small>${g}${low?' • low':''}</small></td>`}).join('')}</tr>`).join('');
 const list=`<div class="tableScroll"><table class="metaLiveTable"><thead><tr><th>Archetype</th><th>Meta Share</th><th>Decks</th><th>Record</th><th>Win %</th><th>Games</th><th>Confidence</th></tr></thead><tbody>${rows||'<tr><td colspan="7">No mapped competitive games are available yet.</td></tr>'}</tbody></table></div>`;
 const matrix=`<div class="metaMatrixLegend"><span><i class="favored"></i>55%+</span><span><i class="even"></i>46–54%</span><span><i class="unfavored"></i>45% or lower</span><span><i class="lowSample"></i>Low sample (&lt;10)</span><small>Cell = win rate • small number = games</small></div><div class="metaMatrixScroll"><table class="metaMatrixTable"><thead><tr><th>Archetype</th>${matrixHead}</tr></thead><tbody>${matrixRows||'<tr><td>No matchup data yet.</td></tr>'}</tbody></table></div>`;
 return `<section class="panel v847Competitive combinedMetaPanel"><div class="between"><div><span class="eyebrow">COMPETITIVE META INTELLIGENCE</span><h2>Combined Competitive Meta</h2><p class="muted">A larger competitive sample is aggregated into one field view so individual events do not distort the read. Low-volume matchups are labeled instead of being presented with the same confidence as large samples.</p></div><div class="combinedMetaControls"><select onchange="setCompetitiveRange847(this.value)" aria-label="Competitive sample window"><option value="7" ${c.days===7?'selected':''}>Last 7 days</option><option value="14" ${c.days===14?'selected':''}>Last 14 days</option><option value="30" ${c.days===30?'selected':''}>Last 30 days</option><option value="60" ${c.days===60?'selected':''}>Last 60 days</option><option value="90" ${c.days===90?'selected':''}>Last 90 days</option></select><div class="metaViewToggle"><button class="secondary ${c.view==='list'?'active':''}" onclick="setCompetitiveView847('list')">List</button><button class="secondary ${c.view==='matrix'?'active':''}" onclick="setCompetitiveView847('matrix')">Matrix</button></div></div></div><div class="metaHeroTags combinedMetaTags"><span>${Number(appearances).toLocaleString()} deck entries</span><span>${Number(sampleGames).toLocaleString()} game-side records</span><span>${c.meta.length} mapped archetypes</span><span>${c.days}-day window</span></div>${c.loading?'<p class="muted">Refreshing competitive sample…</p>':c.error?`<div class="notice">Competitive meta data unavailable: ${esc(c.error)}</div>`:(c.view==='matrix'?matrix:list)}</section>${bigBossCompetitivePanel8506()}`;
}
const metaIntelPagePre847=metaIntelPage;
metaIntelPage=function(){metaIntelPagePre847();const app=document.getElementById('app');if(!app)return;const panel=document.createElement('div');panel.innerHTML=competitivePanel847();const hero=app.querySelector('.metaHero');if(hero&&hero.nextSibling)app.insertBefore(panel.firstElementChild,hero.nextSibling);else app.prepend(panel.firstElementChild)};
