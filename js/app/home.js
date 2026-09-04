function dashboardMetaWidget(){metaEnsureLive();const t=MetaService.getTopArchetypes().slice(0,3),st=window.PPCMetaService?PPCMetaService.getStatus():{source:"fallback"},snap=metaLiveSnapshot()?.snapshot;return `<div class="panel"><div class="between"><div><h2>Meta Right Now</h2><p class="muted">${esc(metaSourceBadge())}${snap?.generatedAt?` • Updated ${new Date(snap.generatedAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}`:""}</p></div><button class="secondary" onclick="state.page='meta';render()">Open Meta Center</button></div><div class="metaMiniList">${t.map(a=>`<button onclick="state.page='meta';state.metaIntel.detailId='${a.id}';render()"><strong>#${metaFmt(a.stats?.rank)} ${esc(a.shortName||a.name)}</strong><span>${metaPct(a.stats?.usage)} usage • ${metaConfidence(a)}</span></button>`).join("")}</div>${st.error?`<p class="muted tiny">Live refresh issue: ${esc(st.error)}. Showing ${esc(st.source)} data.</p>`:""}</div>`}

let dashboardRankLoading=false;
function dashboardRankService(){return window.PPCRankBorderService||null}
function dashboardRankFmt(n){return Number.isFinite(Number(n))?Number(n).toLocaleString():"—"}
function dashboardRankLabel(rank){rank=Number(rank);return rank===100?"Top 100":rank===1000?"Top 1K":rank===5000?"Top 5K":rank===10000?"Top 10K":`Top ${dashboardRankFmt(rank)}`}
function dashboardRankLifecycle(season){
 const now=Date.now(),start=season?.startsAt?new Date(season.startsAt).getTime():NaN,end=season?.endsAt?new Date(season.endsAt).getTime():NaN;
 if(Number.isFinite(end)&&now>=end)return {live:false,label:"Season ended"};
 if(Number.isFinite(start)&&now<start)return {live:false,label:`Starts ${new Date(start).toLocaleString()}`};
 const hrs=Number(season?.hoursRemaining);if(Number.isFinite(hrs)&&hrs>0)return {live:true,label:`${dashboardRankFmt(hrs)} hours remaining`};
 return {live:true,label:"Active season"};
}
function dashboardEnsureRank(){
 const svc=dashboardRankService();
 if(!svc||svc.getData?.()||dashboardRankLoading)return;
 dashboardRankLoading=true;
 svc.fetchActive?.({force:false}).then(()=>{dashboardRankLoading=false;if(state.page==="dashboard")dashboard()}).catch(()=>{dashboardRankLoading=false});
}
function dashboardRankWidget(){
 dashboardEnsureRank();
 const svc=dashboardRankService(),data=svc?.getData?.(),borders=Array.isArray(data?.borders)?data.borders.filter(b=>b.available):[];
 const userRP=Number(state.rank?.points||0),target=borders.find(b=>b.targetRank===1000)||borders[0];
 if(!data||!target)return `<section class="panel commandCard rankCommand"><div class="commandCardHead"><div><span class="eyebrow">RANK INTELLIGENCE</span><h2>Your climb</h2></div><span class="statusDot">SYNCING</span></div><div class="commandEmpty">Rank border data is loading. Your tracked RP is <strong>${dashboardRankFmt(userRP)} RP</strong>.</div><button class="secondary commandLink" onclick="goPage('rank')">Open Rank Intelligence →</button></section>`;
 const safe=Number(target.recommendedSafeRP),pred=Number(target.predictedFinalRP),gap=Number.isFinite(safe)?userRP-safe:null;
 const life=dashboardRankLifecycle(data.season||{}),forecastLabel=life.live?"Forecast":"Final forecast",safeLabel=life.live?"Safe target":"Last safe target";
 return `<section class="panel commandCard rankCommand"><div class="commandCardHead"><div><span class="eyebrow">RANK INTELLIGENCE</span><h2>${esc(dashboardRankLabel(target.targetRank))} outlook</h2></div><span class="statusDot ${life.live?'live':''}">${life.live?'LIVE':'ENDED'}</span></div><div class="commandMetric"><strong>${dashboardRankFmt(userRP)}</strong><span>YOUR RP</span></div><div class="commandStatRow"><div><span>${forecastLabel}</span><b>${dashboardRankFmt(pred)}</b></div><div><span>${safeLabel}</span><b>${dashboardRankFmt(safe)}</b></div><div><span>Gap</span><b class="${gap>=0?'good':'bad'}">${gap>=0?'+':''}${dashboardRankFmt(gap)}</b></div></div><div class="progressTrack"><i style="width:${Math.max(4,Math.min(100,safe?userRP/safe*100:0))}%"></i></div><p class="muted tiny">${esc(data.season?.name||'Ranked season')} • ${esc(life.label)}</p><button class="secondary commandLink" onclick="goPage('rank')">Open Rank Intelligence →</button></section>`;
}
function dashboardCoachingWidget(){
 const actions=typeof actionableCoaching==="function"?actionableCoaching(completedMatches()):[];
 const a=actions[0];
 if(!a)return `<section class="panel commandCard"><div class="commandCardHead"><div><span class="eyebrow">COACHING</span><h2>Next focus</h2></div></div><div class="commandEmpty">Record more matches to unlock a personalized competitive focus.</div><button class="secondary commandLink" onclick="state.page='stats';state.battlePrefs.statsTab='coaching';render()">Open Coaching →</button></section>`;
 return `<section class="panel commandCard coachingCommand"><div class="commandCardHead"><div><span class="eyebrow">COACHING PRIORITY</span><h2>${esc(a.title)}</h2></div><span class="priorityTag ${esc(a.priority||'medium')}">${esc(String(a.priority||'medium').toUpperCase())}</span></div><p class="commandWhy">${esc(a.why)}</p><div class="focusBox"><span>FOCUS NEXT</span><strong>${esc(a.focus)}</strong></div><button class="secondary commandLink" onclick="state.page='stats';state.battlePrefs.statsTab='coaching';render()">View coaching plan →</button></section>`;
}
function dashboardMetaCommand(){
 metaEnsureLive();const top=MetaService.getTopArchetypes().slice(0,4),snap=metaLiveSnapshot()?.snapshot;
 return `<section class="panel commandCard metaCommand"><div class="commandCardHead"><div><span class="eyebrow">META SNAPSHOT</span><h2>What you're facing</h2></div><span class="statusDot live">LIVE</span></div><div class="commandMetaList">${top.map((a,i)=>`<button onclick="state.page='meta';state.metaIntel.detailId='${a.id}';render()"><span class="metaRank">${i+1}</span><strong>${esc(a.shortName||a.name)}</strong><b>${metaPct(a.stats?.usage)}</b></button>`).join('')}</div><div class="between tiny muted"><span>${snap?.generatedAt?'Updated '+new Date(snap.generatedAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'Latest available snapshot'}</span><button class="textButton" onclick="goPage('meta')">Full Meta →</button></div></section>`;
}
function dashboard(){
 const st=stats(),rank=state.rank||{tier:"Unranked",points:0,streak:0},completed=completedMatches().sort((a,b)=>b.timestamp-a.timestamp),todayKey=new Date().toDateString();
 const today=completed.filter(m=>new Date(m.timestamp).toDateString()===todayKey),tw=today.filter(m=>m.result==="win").length,tl=today.filter(m=>m.result==="loss").length;
 const todayRp=today.reduce((n,m)=>n+(Number.isFinite(Number(m.rankChange))?Number(m.rankChange):0),0);
 const recentDeck=state.decks.find(d=>d.id===completed[0]?.deckId)||state.decks.find(d=>d.id===state.selected)||state.decks[0]||null;
 document.getElementById("app").innerHTML=`
 <section class="foundationHero">
  <div class="foundationHeroCopy"><div class="pocketHeroKicker"><span class="pocketBallMark" aria-hidden="true"><i></i></span><span>YOUR COMPETITIVE POCKET</span></div><h1>What do you want to do right now?</h1><p>Start with the job in front of you. Everything else stays one level deeper.</p></div>
  <div class="foundationHeroSnapshot"><span>Today</span><strong>${tw}-${tl}</strong><small>${today.length?`${today.length} tracked matches • ${today.length?((tw/today.length)*100).toFixed(0):0}% WR`:'No matches yet'}</small></div>
 </section>
 <section class="foundationHubGrid" aria-label="Main destinations">
  <article class="foundationHubCard playHub"><div class="hubCardTop"><span class="hubGlyph">◉</span><span class="eyebrow">PLAY</span></div><h2>Battle & Rank</h2><p>Record a match, continue your ranked climb, or run a Gym Battle.</p><div class="hubActions"><button onclick="goPage('matches')">Record Battle</button><button class="secondary" onclick="goPage('rank')">Open Rank</button></div><div class="hubStat"><span>Current RP</span><strong>${dashboardRankFmt(rank.points)}</strong></div></article>
  <article class="foundationHubCard buildHub"><div class="hubCardTop"><span class="hubGlyph">▣</span><span class="eyebrow">BUILD</span></div><h2>Decks & Collection</h2><p>Build your 20-card list and see whether your collection can complete it.</p><div class="hubActions"><button onclick="goPage('decks')">Open Decks</button><button class="secondary" onclick="goPage('collection')">Collection</button></div><div class="hubStat"><span>Current deck</span><strong>${esc(recentDeck?.name||'None selected')}</strong></div></article>
  <article class="foundationHubCard competeHub"><div class="hubCardTop"><span class="hubGlyph">◆</span><span class="eyebrow">COMPETE</span></div><h2>Meta & Tournaments</h2><p>See what you're likely to face, review events, then prepare your pair.</p><div class="hubActions"><button onclick="goPage('meta')">Scout Meta</button><button class="secondary" onclick="goPage('tournaments')">Tournaments</button></div><div class="hubStat"><span>Preparation</span><strong>Field → Pairing</strong></div></article>
  <article class="foundationHubCard toolsHub"><div class="hubCardTop"><span class="hubGlyph">⌁</span><span class="eyebrow">IMPROVE</span></div><h2>Performance & Practice</h2><p>Turn your recorded games into coaching, matchup reads, and practice decisions.</p><div class="hubActions"><button onclick="goPage('stats')">Performance</button><button class="secondary" onclick="goPage('streamer')">Streamer</button></div><div class="hubStat"><span>All-time record</span><strong>${st.w}-${st.l}</strong></div></article>
 </section>
 <section class="foundationNowBar"><div><span class="eyebrow">QUICK START</span><strong>${recentDeck?esc(recentDeck.name):'Build your first deck'}</strong><small>${recentDeck?`${deckCount(recentDeck)}/20 cards • ${analyze(recentDeck)}/100 structure`:'A saved deck connects Battle, Performance, Pairing, and Collection.'}</small></div><div class="row"><button onclick="goPage('${recentDeck?'matches':'decks'}')">${recentDeck?'Play This Deck':'Build Deck'}</button><button class="secondary" onclick="window.PPCWhatsNew?.open?.()">What's New</button></div></section>
 <div class="foundationIntelGrid">${dashboardRankWidget()}${dashboardMetaCommand()}${dashboardCoachingWidget()}</div>
 <section class="panel foundationRecent"><div class="between"><div><span class="eyebrow">RECENT</span><h2>Your last battles</h2></div><button class="secondary" onclick="goPage('matches')">Battle Tracker →</button></div>${recentMatchesHtml(5)}</section>`;
}

function recentMatchesHtml(n){
 const ms=completedMatches().sort((a,b)=>b.timestamp-a.timestamp).slice(0,n);
 if(!ms.length)return `<p class="muted">No matches yet. Record a game in Battle Tracker.</p>`;
 return ms.map(m=>{const rc=m.result==="win"?"good":m.result==="loss"?"bad":"neutral";return `<div class="between deckrow"><div><strong class="${rc}">${String(m.result||"—").toUpperCase()}</strong> <span>${esc(m.deckName||"Deck")}</span><div class="muted tiny">vs ${esc(m.opponentArchetype||"Unknown")} ${m.gameMode==="ranked"?"• Ranked":""} ${m.turnOrder!=="unknown"?"• Went "+(m.turnOrder==="first"?"First":"Second"):""}</div></div><span class="muted tiny">${new Date(m.timestamp).toLocaleDateString()}</span></div>`}).join("");
}

function homeDecksHtml(){
 if(!state.decks.length) return `<p class="muted">No saved decks yet.</p><button onclick="state.page='decks';render()">Build Your First Deck</button>`;
 return state.decks.slice(0,5).map(d=>`<div class="between deckrow"><div><strong>${esc(d.name)}</strong><div class="muted tiny">${deckCount(d)}/20 cards • Structure ${analyze(d)}/100</div></div><button class="secondary" onclick="openDeck('${d.id}')">Open</button></div>`).join("");
}

// V8.13 Deck Intelligence 2.0 — derived entirely from existing Battle Tracker / Meta data.
function deckTrackedMatches(d){
 const name=String(d?.name||'').trim().toLowerCase();
 return completedMatches().filter(m=>m.deckId===d.id||(!m.deckId&&String(m.deckName||'').trim().toLowerCase()===name)||String(m.deckName||'').trim().toLowerCase()===name);
}
function deckIntel(d){
 const rows=deckTrackedMatches(d),base=wl(rows),first=wl(rows.filter(m=>m.turnOrder==='first')),second=wl(rows.filter(m=>m.turnOrder==='second'));
 const ranked=rows.filter(m=>m.gameMode==='ranked'),rp=ranked.reduce((n,m)=>n+(Number(m.rankChange)||0),0);
 const recent=[...rows].sort((a,b)=>b.timestamp-a.timestamp).slice(0,10),recentWL=wl(recent);
 const groups={};
 rows.forEach(m=>{const k=m.opponentArchetype||'Unknown';groups[k]=groups[k]||[];groups[k].push(m)});
 const matchups=Object.entries(groups).map(([name,list])=>({name,...wl(list),rp:list.reduce((n,m)=>n+(Number(m.rankChange)||0),0)})).sort((a,b)=>b.n-a.n||b.wr-a.wr);
 const qualified=matchups.filter(x=>x.n>=3),best=[...qualified].sort((a,b)=>b.wr-a.wr||b.n-a.n)[0]||null,worst=[...qualified].sort((a,b)=>a.wr-b.wr||b.n-a.n)[0]||null;
 let meta=[];try{meta=(MetaService?.getTopArchetypes?.()||[]).slice(0,5)}catch(e){}
 const prep=meta.map(a=>{const n=a.shortName||a.name||'Unknown',personal=matchups.find(x=>String(x.name).toLowerCase()===String(a.name||n).toLowerCase())||null;return{name:n,usage:a.stats?.usage,rank:a.stats?.rank,personal}});
 const tips=[];
 if(base.n<5)tips.push('Record at least 5 matches with this deck to strengthen its performance read.');
 if(worst)tips.push(`Practice the ${worst.name} matchup next — ${worst.w}-${worst.l} (${worst.wr.toFixed(0)}% WR).`);
 if(first.n>=3&&second.n>=3&&Math.abs(first.wr-second.wr)>=12)tips.push(`${first.wr>second.wr?'Going first':'Going second'} is currently stronger by ${Math.abs(first.wr-second.wr).toFixed(0)} points.`);
 if(recentWL.n>=5&&base.n>=10&&recentWL.wr+10<base.wr)tips.push('Recent form is below this deck’s overall rate; review the last 10 games before a long ranked session.');
 if(rp<0&&ranked.length>=3)tips.push(`This deck is ${rp} RP across tracked ranked games; prioritize consistency before grinding.`);
 if(!tips.length&&base.n)tips.push('No major leak stands out yet. Keep tracking games and focus practice on the most common meta opponents.');
 return{rows,base,first,second,ranked,rp,recentWL,matchups,best,worst,prep,tips};
}
function deckIntelStats(d){const x=deckIntel(d);return {record:x.base.n?`${x.base.w}-${x.base.l}`:"—",winRate:x.base.n?`${x.base.wr.toFixed(0)}%`:"—",rankedRp:x.ranked.length?`${x.rp>0?"+":""}${x.rp}`:"—"}}
function deckIntelSummary(d){const x=deckIntel(d);return `<div class="deckIntelMini"><span><b>${x.base.n?x.base.wr.toFixed(0)+'%':'—'}</b><small>Win rate</small></span><span><b>${x.base.n?x.base.w+'-'+x.base.l:'—'}</b><small>Record</small></span><span><b class="${x.rp>0?'good':x.rp<0?'bad':''}">${x.ranked.length?(x.rp>0?'+':'')+x.rp:'—'}</b><small>Ranked RP</small></span></div>`}
function deckIntelligencePanel(d){
 const x=deckIntel(d),rpLabel=x.ranked.length?`${x.rp>0?'+':''}${x.rp}`:'—';
 const matchupRows=x.matchups.slice(0,6).map(m=>`<div class="deckIntelMatch"><div><strong>${esc(m.name)}</strong><small>${m.n} games</small></div><span>${m.w}-${m.l}</span><b class="${m.wr>=55?'good':m.wr<=45?'bad':''}">${m.wr.toFixed(0)}%</b><span class="${m.rp>0?'good':m.rp<0?'bad':''}">${m.rp>0?'+':''}${m.rp} RP</span></div>`).join('');
 const prep=x.prep.map((m,i)=>`<div class="deckIntelPrep"><b>#${m.rank||i+1}</b><div><strong>${esc(m.name)}</strong><small>${Number.isFinite(Number(m.usage))?Number(m.usage).toFixed(1)+'% meta usage':'Current meta target'}</small></div><span>${m.personal?`${m.personal.w}-${m.personal.l} • ${m.personal.wr.toFixed(0)}%`:'Not tested'}</span></div>`).join('');
 return `<section class="panel deckIntelPanel"><div class="between"><div><span class="eyebrow">DECK INSIGHTS</span><h2>Competitive Read</h2><p class="muted">Built from this deck’s existing Battle Tracker, RP, turn-order, Coaching, and Meta data.</p></div><button onclick="state.battlePrefs.lastDeckId='${d.id}';save();state.page='matches';render()">Record Match</button></div>
 <div class="metricgrid deckIntelMetrics"><div class="metric"><div class="l">Record</div><div class="n">${x.base.n?`${x.base.w}-${x.base.l}`:'—'}</div></div><div class="metric"><div class="l">Win Rate</div><div class="n">${x.base.n?x.base.wr.toFixed(1)+'%':'—'}</div></div><div class="metric"><div class="l">Ranked RP</div><div class="n ${x.rp>0?'good':x.rp<0?'bad':''}">${rpLabel}</div></div><div class="metric"><div class="l">Last 10</div><div class="n">${x.recentWL.n?x.recentWL.w+'-'+x.recentWL.l:'—'}</div></div><div class="metric"><div class="l">Going First</div><div class="n">${x.first.n?x.first.wr.toFixed(0)+'%':'—'}</div></div><div class="metric"><div class="l">Going Second</div><div class="n">${x.second.n?x.second.wr.toFixed(0)+'%':'—'}</div></div></div>
 <div class="deckIntelGrid"><div><h3>Matchup Intelligence</h3>${matchupRows||'<p class="muted">Record matches against known archetypes to unlock matchup intelligence.</p>'}</div><div><h3>What to Focus on Next</h3><div class="deckIntelTips">${x.tips.map((t,i)=>`<div><b>${i+1}</b><span>${esc(t)}</span></div>`).join('')}</div></div></div>
 <div class="deckIntelGrid"><div><h3>Current Meta Preparation</h3>${prep||'<p class="muted">Open Meta Center once to load current meta targets.</p>'}</div><div><h3>Quick Read</h3><div class="deckIntelCallouts"><div><small>Best matchup (3+ games)</small><strong>${x.best?`${esc(x.best.name)} • ${x.best.wr.toFixed(0)}%`:'More data needed'}</strong></div><div><small>Hardest matchup (3+ games)</small><strong>${x.worst?`${esc(x.worst.name)} • ${x.worst.wr.toFixed(0)}%`:'More data needed'}</strong></div></div><button class="secondary" onclick="state.page='stats';state.battlePrefs.statsTab='coaching';save();render()">Open Full Coaching →</button></div></div></section>`;
}


// V8.16 — Collection + Deck Lab Integration
let deckBuildFilter="all", deckBuildSort="completion";
function setDeckSearch(v){state.deckPrefs.query=String(v||"");safeStorageSet(STORE,JSON.stringify(state));decks()}
function toggleDeckFavorite(id){const s=new Set(state.deckPrefs.favorites||[]);s.has(id)?s.delete(id):s.add(id);state.deckPrefs.favorites=[...s];save();decks()}
function deckIsFavorite(id){return (state.deckPrefs.favorites||[]).includes(id)}
function collectionLegacyValueByName(name,keyName){
 const wantedSlug=slug(name),knownIds=new Set(CARDS.map(c=>c.id));let n=0;
 Object.entries(state.collection||{}).forEach(([id,r])=>{
   if(knownIds.has(id))return;
   const legacy=String(id||"").toLowerCase();
   if(legacy===wantedSlug||legacy.endsWith("-"+wantedSlug))n+=Number(r?.[keyName]||0);
 });
 return n;
}
function collectionValueByName(name,keyName){
 const key=normalizedCardName(name);let n=0;
 CARDS.forEach(c=>{if(normalizedCardName(c.name)===key)n+=Number(state.collection?.[c.id]?.[keyName]||0)});
 // Older PocketNexus builds sometimes stored collection rows under a previous
 // card-id format. Only unmatched/legacy keys are considered here, so current
 // records are never double-counted. This keeps Deck ↔ Collection sync stable
 // across card-database normalization changes.
 return n+collectionLegacyValueByName(name,keyName);
}
function collectionOwnedByName(name){return collectionValueByName(name,"owned")}
function collectionWantedByName(name){return collectionValueByName(name,"wanted")}
function hasCollectionData(){return Object.values(state.collection||{}).some(r=>Number(r?.owned||0)>0||Number(r?.wanted||0)>0||Number(r?.tradeable||0)>0)}
function deckCollectionStatus(d){
 const req={};
 deckItems(d).forEach(x=>{const k=normalizedCardName(x.card.name);if(!req[k])req[k]={name:x.card.name,required:0,ids:[]};req[k].required+=Number(x.qty||0);req[k].ids.push(x.id)});
 const rows=Object.values(req).map(x=>{const owned=collectionOwnedByName(x.name),used=Math.min(x.required,owned),missing=Math.max(0,x.required-owned);return {...x,owned,used,missing}});
 const required=rows.reduce((n,x)=>n+x.required,0),owned=rows.reduce((n,x)=>n+x.used,0),missing=Math.max(0,required-owned),pct=required?Math.round(owned/required*100):0;
 const collectionKnown=hasCollectionData();
 const status=!collectionKnown?"NO COLLECTION DATA":pct===100?"READY TO BUILD":pct>=75?"ALMOST READY":"MISSING CARDS";
 return {rows,required,owned,missing,pct,status,collectionKnown};
}
function deckBuildStatusClass(x){return x.status==="READY TO BUILD"?"ready":x.status==="ALMOST READY"?"almost":x.status==="MISSING CARDS"?"missing":"unknown"}
function setDeckBuildFilter(v){deckBuildFilter=v;decks()}
function setDeckBuildSort(v){deckBuildSort=v;decks()}
function filteredDecksByCollection(){
 let arr=(state.decks||[]).map(d=>({d,c:deckCollectionStatus(d)}));
 const q=String(state.deckPrefs?.query||"").trim().toLowerCase();
 if(q)arr=arr.filter(x=>String(x.d.name||"").toLowerCase().includes(q));
 if(deckBuildFilter==="favorites")arr=arr.filter(x=>deckIsFavorite(x.d.id));
 if(deckBuildFilter==="ready")arr=arr.filter(x=>x.c.status==="READY TO BUILD");
 if(deckBuildFilter==="almost")arr=arr.filter(x=>x.c.status==="ALMOST READY");
 if(deckBuildFilter==="missing")arr=arr.filter(x=>x.c.status==="MISSING CARDS");
 arr.sort((a,b)=>{
   const fav=Number(deckIsFavorite(b.d.id))-Number(deckIsFavorite(a.d.id));if(fav)return fav;
   return deckBuildSort==="fewest"?a.c.missing-b.c.missing||b.c.pct-a.c.pct:deckBuildSort==="most"?b.c.missing-a.c.missing||a.c.pct-b.c.pct:deckBuildSort==="name"?String(a.d.name).localeCompare(String(b.d.name)):b.c.pct-a.c.pct||a.c.missing-b.c.missing;
 });
 return arr;
}
function deckCollectionMini(d){const c=deckCollectionStatus(d);return `<div class="deckCollectionMini ${deckBuildStatusClass(c)}"><div><strong>${c.status}</strong><small>${c.collectionKnown?`${c.owned}/${c.required} owned • ${c.pct}% complete`:"Add cards to Collection to calculate buildability"}</small></div>${c.collectionKnown?`<span>${c.missing?`${c.missing} missing`:"Complete"}</span>`:""}</div>`}
function openMissingCards(deckId){
 const d=state.decks.find(x=>x.id===deckId);if(!d)return;const c=deckCollectionStatus(d),missing=c.rows.filter(x=>x.missing>0);
 document.getElementById("cardModalBody").innerHTML=`<div class="between"><div><span class="badge">COLLECTION</span><h2>Missing Cards — ${esc(d.name)}</h2><p class="muted">${c.owned}/${c.required} owned • ${c.pct}% complete</p></div><button class="secondary" onclick="closeCardModal()">Close</button></div>${missing.length?`<div class="missingCardTable"><div class="missingCardRow head"><span>Card</span><span>Required</span><span>Owned</span><span>Missing</span></div>${missing.map(x=>`<div class="missingCardRow"><strong>${esc(x.name)}</strong><span>${x.required}</span><span>${x.owned}</span><b class="bad">${x.missing}</b></div>`).join("")}</div><div class="row" style="margin-top:16px"><button onclick="addAllMissingToWishlist('${d.id}')">Add All Missing to Wishlist</button></div>`:`<div class="successBox"><strong>✓ Ready to build</strong><div>You own everything required for this deck.</div></div>`}`;
 document.getElementById("cardModal").style.display="flex";
}
function addAllMissingToWishlist(deckId){
 const d=state.decks.find(x=>x.id===deckId);if(!d)return;const c=deckCollectionStatus(d);let added=0;
 c.rows.filter(x=>x.missing>0).forEach(x=>{const already=collectionWantedByName(x.name),need=Math.max(0,x.missing-already);if(!need)return;const id=x.ids.find(id=>card(id))||CARDS.find(cc=>normalizedCardName(cc.name)===normalizedCardName(x.name))?.id;if(!id)return;const r=colRec(id);r.wanted=Number(r.wanted||0)+need;added+=need});
 save();openMissingCards(deckId);const body=document.getElementById("cardModalBody");if(body)body.insertAdjacentHTML("afterbegin",`<div class="notice"><strong>${added?`${added} missing card${added===1?'':'s'} added to Wishlist.`:'Wishlist already covers the missing quantities.'}</strong></div>`);
}
function deckCollectionPanel(d){const c=deckCollectionStatus(d);return `<section class="panel deckCollectionPanel"><div class="between"><div><span class="badge">DECKS</span><h2>Collection Status</h2><p class="muted">Calculated live from this deck and your existing Collection — no duplicate deck-completion data.</p></div><span class="buildStatus ${deckBuildStatusClass(c)}">${c.status}</span></div>${c.collectionKnown?`<div class="collectionDeckMetrics"><div><strong>${c.owned} / ${c.required}</strong><small>Cards owned</small></div><div><strong>${c.pct}%</strong><small>Complete</small></div><div><strong>${c.missing}</strong><small>Missing</small></div></div><div class="deckCompletionBar"><span style="width:${c.pct}%"></span></div>${c.missing?`<div class="row"><button onclick="openMissingCards('${d.id}')">View Missing Cards</button><button class="secondary" onclick="addAllMissingToWishlist('${d.id}')">Add Missing to Wishlist</button></div>`:`<div class="successBox"><strong>✓ You own everything required for this deck.</strong></div>`}`:`<div class="notice"><strong>No Collection data yet.</strong><div>Add owned cards in Collection and this deck will update automatically.</div><button style="margin-top:10px" onclick="goPage('collection')">Open Collection</button></div>`}</section>`}
function collectionDeckSuggestions(){
 if(!(state.decks||[]).length)return `<div class="panel"><h2>Deck Buildability</h2><p class="muted">Save a deck in Deck Lab to compare it with your Collection.</p><button onclick="goPage('decks')">Open Deck Lab</button></div>`;
 const all=state.decks.map(d=>({d,c:deckCollectionStatus(d)})).sort((a,b)=>b.c.pct-a.c.pct||a.c.missing-b.c.missing),ready=all.filter(x=>x.c.pct===100),closest=all.filter(x=>x.c.pct<100).slice(0,5);
 if(!hasCollectionData())return `<div class="panel collectionDeckSuggestions"><div class="between"><div><span class="badge">DECK BUILDABILITY</span><h2>Decks You Can Build</h2></div><button class="secondary" onclick="goPage('decks')">Deck Lab</button></div><p class="muted">Add owned cards above to unlock deck completion and missing-card lists.</p></div>`;
 return `<div class="panel collectionDeckSuggestions"><div class="between"><div><span class="badge">DECK BUILDABILITY</span><h2>Decks You Can Build</h2><p class="muted">Collection changes update these results immediately.</p></div><button class="secondary" onclick="goPage('decks')">Deck Lab</button></div><div class="buildableDeckGrid">${ready.length?ready.map(x=>`<button class="buildableDeck ready" onclick="openDeck('${x.d.id}')"><strong>${esc(x.d.name)}</strong><span>100% • Ready to Build</span></button>`).join(""):`<p class="muted">No saved deck is at 100% yet.</p>`}</div><h3>Closest Decks</h3><div class="closestDecks">${closest.length?closest.map(x=>`<div class="closestDeck"><button class="textButton" onclick="openDeck('${x.d.id}')">${esc(x.d.name)}</button><span>${x.c.pct}%</span><small>${x.c.missing} missing</small><button class="secondary smallbtn" onclick="openMissingCards('${x.d.id}')">Missing Cards</button></div>`).join(""):`<p class="good">Every saved deck is ready to build.</p>`}</div></div>`;
}

