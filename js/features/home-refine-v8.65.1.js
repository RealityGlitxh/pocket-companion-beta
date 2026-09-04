/* PocketNexus v8.65.1 — Pass 3B-1 Home Refinement
   Deliberately scoped to Home. Keeps existing state/data ownership intact. */
(function(){
  function metaCommand(){
    const top=MetaService.getTopArchetypes().slice(0,4),snap=metaLiveSnapshot()?.snapshot;
    const status=window.PPCMetaService?.getStatus?.()||{source:"fallback",loading:false,error:""};
    const source=String(status.source||"fallback").toUpperCase();
    const live=source==="LIVE";
    const updated=snap?.generatedAt?`Updated ${new Date(snap.generatedAt).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}`:"Latest available snapshot";
    return `<section class="panel commandCard metaCommand homeIntelCard"><div class="commandCardHead"><div><span class="eyebrow">META SNAPSHOT</span><h2>Field pressure</h2></div><span class="statusDot ${live?'live':''}">${status.loading?'SYNCING':source}</span></div><div class="commandMetaList">${top.length?top.map((a,i)=>`<button onclick="state.page='meta';state.metaIntel.detailId='${a.id}';render()"><span class="metaRank">${i+1}</span><strong>${esc(a.shortName||a.name)}</strong><b>${metaPct(a.stats?.usage)}</b></button>`).join(''):`<div class="commandEmpty">Meta data is not loaded yet. Open Meta when you want to refresh it.</div>`}</div><div class="homeIntelFooter"><span>${esc(updated)}</span><button class="textButton" onclick="goPage('meta')">Open Meta →</button></div></section>`;
  }

  function recentRows(n){
    const ms=completedMatches().sort((a,b)=>b.timestamp-a.timestamp).slice(0,n);
    if(!ms.length)return `<div class="homeRecentEmpty"><strong>No battles recorded yet.</strong><span>Record your first result to start building matchup and performance history.</span><button onclick="goPage('matches')">Record Battle</button></div>`;
    return `<div class="homeRecentList">${ms.map(m=>{
      const rc=m.result==="win"?"good":m.result==="loss"?"bad":"neutral",result=String(m.result||"—").toUpperCase(),ranked=m.gameMode==="ranked";
      const rp=Number(m.rankChange),rpText=Number.isFinite(rp)&&rp!==0?` • ${rp>0?'+':''}${rp} RP`:'';
      const turn=m.turnOrder!=="unknown"?` • ${m.turnOrder==="first"?'Went first':'Went second'}`:'';
      return `<article class="homeRecentRow"><span class="homeResultBadge ${rc}">${result}</span><div class="homeRecentMatch"><strong>${esc(m.deckName||"Deck")} <span>vs ${esc(m.opponentArchetype||"Unknown")}</span></strong><small>${ranked?'Ranked':'Battle'}${turn}${rpText}</small></div><time>${new Date(m.timestamp).toLocaleDateString([], {month:'short',day:'numeric'})}</time></article>`;
    }).join('')}</div>`;
  }

  function refinedDashboard(){
    const st=stats(),rank=state.rank||{tier:"Unranked",points:0,streak:0},completed=completedMatches().sort((a,b)=>b.timestamp-a.timestamp),todayKey=new Date().toDateString();
    const today=completed.filter(m=>new Date(m.timestamp).toDateString()===todayKey),tw=today.filter(m=>m.result==="win").length,tl=today.filter(m=>m.result==="loss").length;
    const todayRp=today.reduce((n,m)=>n+(Number.isFinite(Number(m.rankChange))?Number(m.rankChange):0),0),todayWr=today.length?Math.round(tw/today.length*100):0;
    const recentDeck=state.decks.find(d=>d.id===completed[0]?.deckId)||state.decks.find(d=>d.id===state.selected)||state.decks[0]||null;
    const deckMatches=recentDeck?completed.filter(m=>m.deckId===recentDeck.id||String(m.deckName||'').trim().toLowerCase()===String(recentDeck.name||'').trim().toLowerCase()):[];
    const deckWins=deckMatches.filter(m=>m.result==='win').length,deckLosses=deckMatches.filter(m=>m.result==='loss').length;
    const deckRecord=deckMatches.length?`${deckWins}-${deckLosses}`:'No games yet';
    const todayTrend=todayRp===0?'0 RP':`${todayRp>0?'+':''}${todayRp} RP`;
    document.getElementById("app").innerHTML=`
      <section class="home3bHero">
        <div class="home3bHeroMain">
          <div class="pocketHeroKicker"><span class="pocketBallMark" aria-hidden="true"><i></i></span><span>YOUR COMPETITIVE POCKET</span></div>
          <h1>Ready for your next game?</h1>
          <p>Record the result first. PocketNexus keeps your deck, rank, matchup history, and coaching connected behind it.</p>
          <div class="home3bHeroActions"><button class="homePrimaryAction" onclick="goPage('matches')"><span>＋</span> Record Battle</button><button class="secondary" onclick="goPage('rank')">Open Rank</button></div>
        </div>
        <aside class="homeTodayCard" aria-label="Today's battle summary">
          <div class="homeTodayHead"><span class="eyebrow">TODAY</span><span class="homeTodayRp ${todayRp>0?'good':todayRp<0?'bad':''}">${todayTrend}</span></div>
          <div class="homeTodayRecord"><strong>${tw}-${tl}</strong><span>record</span></div>
          <div class="homeTodayStats"><div><b>${today.length}</b><span>Games</span></div><div><b>${today.length?todayWr+'%':'—'}</b><span>Win rate</span></div><div><b>${dashboardRankFmt(rank.points)}</b><span>Current RP</span></div></div>
        </aside>
      </section>

      <section class="homeContinueCard">
        <div class="homeContinueCopy"><span class="eyebrow">CONTINUE PLAYING</span><h2>${recentDeck?esc(recentDeck.name):'Build your first deck'}</h2><p>${recentDeck?`${deckCount(recentDeck)}/20 cards • ${analyze(recentDeck)}/100 structure • ${deckRecord} tracked record`:'A saved deck connects Battle, Performance, Collection, and competitive preparation.'}</p></div>
        <div class="homeContinueActions"><button onclick="goPage('${recentDeck?'matches':'decks'}')">${recentDeck?'Play This Deck':'Build Deck'}</button>${recentDeck?`<button class="secondary" onclick="openDeck('${recentDeck.id}')">Edit Deck</button>`:''}</div>
      </section>

      <section class="home3bDestinations" aria-label="PocketNexus workspaces">
        <article class="home3bDestination play"><div><span class="home3bIcon">◉</span><span class="eyebrow">PLAY</span></div><h2>Battle & Rank</h2><p>Log games and keep your climb current.</p><button class="homeDestinationLink" onclick="goPage('matches')">Battle workspace →</button></article>
        <article class="home3bDestination build"><div><span class="home3bIcon">▣</span><span class="eyebrow">BUILD</span></div><h2>Decks & Collection</h2><p>Build lists and know what you own.</p><button class="homeDestinationLink" onclick="goPage('decks')">Build workspace →</button></article>
        <article class="home3bDestination compete"><div><span class="home3bIcon">◆</span><span class="eyebrow">COMPETE</span></div><h2>Meta & Events</h2><p>Scout the field before you queue.</p><button class="homeDestinationLink" onclick="goPage('meta')">Competitive workspace →</button></article>
        <article class="home3bDestination improve"><div><span class="home3bIcon">⌁</span><span class="eyebrow">IMPROVE</span></div><h2>Performance</h2><p>Turn recorded games into next steps.</p><button class="homeDestinationLink" onclick="goPage('stats')">Performance workspace →</button></article>
      </section>

      <section class="homeSectionHeading"><div><span class="eyebrow">INTELLIGENCE</span><h2>What matters next</h2></div><button class="textButton" onclick="window.PPCWhatsNew?.open?.()">What's New</button></section>
      <div class="foundationIntelGrid home3bIntelGrid">${dashboardRankWidget()}${metaCommand()}${dashboardCoachingWidget()}</div>

      <section class="panel foundationRecent home3bRecent"><div class="between"><div><span class="eyebrow">RECENT</span><h2>Last battles</h2><p class="muted tiny">Your newest tracked results, newest first.</p></div><button class="secondary" onclick="goPage('matches')">Open Battle Tracker</button></div>${recentRows(5)}</section>`;
  }

  window.dashboardMetaCommand=metaCommand;
  window.homeRecentBattleRows=recentRows;
  window.dashboard=refinedDashboard;
  window.PPCHomeRefinement={version:"8.65.1",render:refinedDashboard};
})();
