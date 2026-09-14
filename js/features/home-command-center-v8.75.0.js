/* PocketNexus v8.75.0 — Home / Dashboard Final Polish
   Presentation-only command center. Uses existing state/services/routes and does not own backend data. */
(function(){
  'use strict';
  const VERSION='8.75.0';
  const $esc=(value)=>typeof window.esc==='function'?window.esc(value):String(value??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const list=(value)=>Array.isArray(value)?value:[];
  const num=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const dateValue=(value)=>{const t=value instanceof Date?value.getTime():new Date(value||0).getTime();return Number.isFinite(t)?t:0};
  const route=(page)=>{if(typeof window.goPage==='function')window.goPage(page);else{window.state.page=page;window.render?.()}};
  const fmtRp=(value)=>typeof window.dashboardRankFmt==='function'?window.dashboardRankFmt(value):(typeof window.rankBorderFmt==='function'?window.rankBorderFmt(value):String(Math.round(num(value))));

  function completed(){
    try{return typeof window.completedMatches==='function'?list(window.completedMatches()).filter(Boolean):list(window.state?.matches).filter(m=>m&&m.result)}catch{return []}
  }
  function activeDeck(matches){
    const s=window.state||{},decks=list(s.decks),last=matches[0];
    const ids=[s.battlePrefs?.lastDeckId,s.selected,s.selectedDeckId,s.activeDeckId,last?.deckId].filter(Boolean).map(String);
    for(const id of ids){const d=decks.find(x=>String(x?.id)===id);if(d)return d}
    if(last?.deckName){const n=String(last.deckName).trim().toLowerCase(),d=decks.find(x=>String(x?.name||'').trim().toLowerCase()===n);if(d)return d}
    return decks[0]||null;
  }
  function collectionOwnedCount(){
    const rows=Object.values(window.state?.collection||{});
    return rows.reduce((sum,row)=>sum+(num(row?.owned)>0?1:0),0);
  }
  function isEmptyAccount(matches){
    const s=window.state||{};
    return !list(s.decks).length&&!matches.length&&!list(s.rankHistory).length&&!list(s.sessions).length&&collectionOwnedCount()===0&&num(s.rank?.points)===0&&num(s.rank?.streak)===0;
  }
  function recentRecord(matches,count=10){
    const rows=[...matches].sort((a,b)=>dateValue(b.timestamp)-dateValue(a.timestamp)).slice(0,count);
    return {rows,w:rows.filter(x=>x.result==='win').length,l:rows.filter(x=>x.result==='loss').length,t:rows.filter(x=>x.result==='tie'||x.result==='draw').length};
  }
  function deckRecord(deck,matches){
    if(!deck)return null;
    const name=String(deck.name||'').trim().toLowerCase();
    const rows=matches.filter(m=>String(m.deckId||'')===String(deck.id||'')||String(m.deckName||'').trim().toLowerCase()===name);
    return {rows,w:rows.filter(x=>x.result==='win').length,l:rows.filter(x=>x.result==='loss').length};
  }
  function signedIn(){return !!(window.state?.user||window.cloudSession?.user)}

  function snapshot(matches,deck){
    const rank=window.state?.rank||{tier:'Unranked',points:0,streak:0},recent=recentRecord(matches,10),drec=deckRecord(deck,matches);
    const metrics=[];
    metrics.push({label:'Current rank',value:$esc(rank.tier||'Unranked'),detail:num(rank.points)?`${fmtRp(rank.points)} RP`:'No RP tracked yet',action:'rank'});
    if(recent.rows.length)metrics.push({label:'Recent record',value:`${recent.w}-${recent.l}`,detail:`Last ${recent.rows.length} tracked ${recent.rows.length===1?'match':'matches'}`,action:'stats'});
    if(deck)metrics.push({label:'Active deck',value:$esc(deck.name||'Saved deck'),detail:drec?.rows.length?`${drec.w}-${drec.l} tracked record`:`${typeof window.deckCount==='function'?window.deckCount(deck):list(deck.cards).length}/20 cards`,action:'decks'});
    if(num(rank.streak)>0)metrics.push({label:'Current streak',value:`${num(rank.streak)}W`,detail:'Tracked ranked streak',action:'rank'});
    const owned=collectionOwnedCount();
    if(owned>0&&metrics.length<4)metrics.push({label:'Collection',value:String(owned),detail:'Unique owned cards tracked',action:'collection'});
    while(metrics.length<3){
      if(metrics.length===1)metrics.push({label:'Recent record',value:'Start tracking',detail:'Log a battle to build your record',action:'matches'});
      else metrics.push({label:'Active deck',value:'Choose a deck',detail:'Build or open a saved deck',action:'decks'});
    }
    return `<section class="pnHomeSnapshot" aria-labelledby="pnHomeSnapshotTitle"><div class="pnHomeSnapshotHead"><div><span class="eyebrow">COMPETITIVE SNAPSHOT</span><h2 id="pnHomeSnapshotTitle">Where you are right now</h2></div>${signedIn()?'<span class="pnHomeCloudHint">Account data</span>':'<span class="pnHomeCloudHint">Local guest data</span>'}</div><div class="pnHomeMetricStrip">${metrics.slice(0,4).map(m=>`<button type="button" class="pnHomeMetric" data-home-route="${m.action}"><span>${m.label}</span><strong>${m.value}</strong><small>${$esc(m.detail)}</small></button>`).join('')}</div></section>`;
  }

  function safeMeta(){
    try{
      const live=window.PPCMetaService,status=live?.getStatus?.()||{source:'fallback',loading:false,error:''};
      let rows=list(live?.getArchetypes?.());
      if(!rows.length&&window.MetaService?.getTopArchetypes)rows=list(window.MetaService.getTopArchetypes());
      const snapshot=status.snapshot||live?.getPayload?.()?.snapshot||window.metaLiveSnapshot?.()?.snapshot||null;
      return {rows,status,snapshot,error:''};
    }catch(e){return {rows:[],status:{source:'unavailable',loading:false,error:e?.message||String(e)},snapshot:null,error:e?.message||String(e)}}
  }
  function usageOf(a){return num(a?.stats?.usage,a?.usage??-1)}
  function rankOf(a){const v=Number(a?.stats?.rank??a?.rank);return Number.isFinite(v)?v:null}
  function prevRankOf(a){const v=Number(a?.stats?.previousRank??a?.previousRank);return Number.isFinite(v)?v:null}
  function pct(value){const n=Number(value);if(!Number.isFinite(n)||n<0)return '—';return n<=1?`${(n*100).toFixed(n<.1?1:0)}%`:`${n.toFixed(n<10?1:0)}%`}
  function metaRead(){
    const {rows,status,snapshot,error}=safeMeta();
    const source=String(status?.source||'fallback').toLowerCase(),live=['live','cached','stale'].includes(source),failed=!!(error||status?.error)&&!rows.length;
    if(failed){
      return `<section class="pnHomeMeta panel" aria-labelledby="pnHomeMetaTitle"><div class="pnHomeSectionHead"><div><span class="eyebrow">META READ</span><h2 id="pnHomeMetaTitle">Current competitive field</h2></div><span class="statusDot bad">UNAVAILABLE</span></div><div class="pnHomeModuleError"><strong>Meta temporarily unavailable</strong><span>Your rank, decks, recent activity, and quick actions are still available.</span></div><button class="secondary pnHomeModuleLink" type="button" data-home-route="meta">Open Meta Center →</button></section>`;
    }
    const ranked=rows.filter(a=>rankOf(a)!==null).sort((a,b)=>rankOf(a)-rankOf(b));
    const top=ranked[0]||[...rows].sort((a,b)=>usageOf(b)-usageOf(a))[0]||null;
    const most=[...rows].filter(a=>usageOf(a)>=0).sort((a,b)=>usageOf(b)-usageOf(a))[0]||top;
    const movers=rows.map(a=>({a,cur:rankOf(a),prev:prevRankOf(a)})).filter(x=>x.cur!==null&&x.prev!==null&&x.cur!==x.prev).map(x=>({...x,delta:x.prev-x.cur}));
    const riser=[...movers].sort((a,b)=>b.delta-a.delta)[0],faller=[...movers].sort((a,b)=>a.delta-b.delta)[0];
    const sample=num(snapshot?.matches)||num(snapshot?.decklists)||num(top?.stats?.samples,top?.sampleSize??0);
    const updated=snapshot?.generatedAt?new Date(snapshot.generatedAt):null;
    const updatedText=updated&&Number.isFinite(updated.getTime())?`Updated ${updated.toLocaleDateString([], {month:'short',day:'numeric'})} ${updated.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}`:'Latest available snapshot';
    const cells=[];
    if(top)cells.push({label:'Top archetype',value:$esc(top.shortName||top.name||'Unknown'),detail:usageOf(top)>=0?`${pct(usageOf(top))} usage`:'Current #1'});
    if(riser?.delta>0)cells.push({label:'Biggest riser',value:$esc(riser.a.shortName||riser.a.name||'Unknown'),detail:`Up ${riser.delta} ${riser.delta===1?'spot':'spots'} to #${riser.cur}`});
    else if(most)cells.push({label:'Most played',value:$esc(most.shortName||most.name||'Unknown'),detail:`${pct(usageOf(most))} usage`});
    if(faller?.delta<0)cells.push({label:'Biggest faller',value:$esc(faller.a.shortName||faller.a.name||'Unknown'),detail:`Down ${Math.abs(faller.delta)} ${Math.abs(faller.delta)===1?'spot':'spots'} to #${faller.cur}`});
    else if(top?.stats?.confidence||top?.confidence)cells.push({label:'Confidence',value:$esc(top.stats?.confidence||top.confidence),detail:'Top archetype sample'});
    if(sample>0)cells.push({label:'Meta sample',value:sample.toLocaleString(),detail:snapshot?.matches?'Tracked matches':'Tracked decklists'});
    return `<section class="pnHomeMeta panel" aria-labelledby="pnHomeMetaTitle"><div class="pnHomeSectionHead"><div><span class="eyebrow">META READ</span><h2 id="pnHomeMetaTitle">What changed in the field</h2></div><span class="statusDot ${live?'live':''}">${status?.loading?'SYNCING':$esc(source.toUpperCase())}</span></div>${cells.length?`<div class="pnHomeMetaGrid">${cells.slice(0,4).map(c=>`<div class="pnHomeMetaCell"><span>${c.label}</span><strong>${c.value}</strong><small>${$esc(c.detail)}</small></div>`).join('')}</div>`:`<div class="pnHomeModuleError"><strong>Meta is loading</strong><span>Open Meta Center for the full competitive view.</span></div>`}<div class="pnHomeMetaFooter"><span>${$esc(updatedText)}${status?.error?' • Cached/fallback data shown':''}</span><button class="textButton" type="button" data-home-route="meta">View Full Meta →</button></div></section>`;
  }

  function continueCard(matches,deck){
    const rankSession=window.PPCRankSessionService?.getData?.(),session=rankSession?.session;
    if(rankSession?.status==='session-active'&&session){
      const w=num(session.wins),l=num(session.losses),rp=session.current_rp;
      return `<section class="pnHomeContinue panel" aria-labelledby="pnHomeContinueTitle"><div><span class="eyebrow">CONTINUE WHERE YOU LEFT OFF</span><h2 id="pnHomeContinueTitle">Ranked session</h2><p>${w}-${l} record${Number.isFinite(Number(rp))?` • ${fmtRp(rp)} RP`:''}</p></div><button type="button" data-home-route="rank">Continue session →</button></section>`;
    }
    if(deck){
      const count=typeof window.deckCount==='function'?window.deckCount(deck):list(deck.cards).length;
      return `<section class="pnHomeContinue panel" aria-labelledby="pnHomeContinueTitle"><div><span class="eyebrow">CONTINUE WHERE YOU LEFT OFF</span><h2 id="pnHomeContinueTitle">${$esc(deck.name||'Saved deck')}</h2><p>${count}/20 cards${matches[0]?.deckId===deck.id||String(matches[0]?.deckName||'').toLowerCase()===String(deck.name||'').toLowerCase()?' • Used in your latest tracked match':''}</p></div><div class="pnHomeContinueButtons"><button type="button" data-home-open-deck="${$esc(deck.id)}">Edit deck</button><button class="secondary" type="button" data-home-route="matches">Log match</button></div></section>`;
    }
    const last=matches[0];
    if(last)return `<section class="pnHomeContinue panel" aria-labelledby="pnHomeContinueTitle"><div><span class="eyebrow">CONTINUE WHERE YOU LEFT OFF</span><h2 id="pnHomeContinueTitle">Review recent matchup</h2><p>${$esc(last.deckName||'Deck')} vs ${$esc(last.opponentArchetype||'Unknown')}</p></div><button type="button" data-home-route="stats">Review performance →</button></section>`;
    return '';
  }

  function quickActions(){
    const actions=[['＋','Log Match','matches'],['▣','Build Deck','decks'],['◆','View Meta','meta'],['?','Start Training','training'],['✦','Pocket Coach','coach']];
    return `<section class="pnHomeQuick" aria-labelledby="pnHomeQuickTitle"><div class="pnHomeSectionHead"><div><span class="eyebrow">QUICK ACTIONS</span><h2 id="pnHomeQuickTitle">What should you do next?</h2></div></div><div class="pnHomeQuickGrid">${actions.map(([icon,label,page])=>`<button type="button" data-home-route="${page}"><span aria-hidden="true">${icon}</span><strong>${label}</strong></button>`).join('')}</div></section>`;
  }

  function recentActivity(matches){
    const rows=[...matches].sort((a,b)=>dateValue(b.timestamp)-dateValue(a.timestamp)).slice(0,5);
    return `<section class="pnHomeRecent panel" aria-labelledby="pnHomeRecentTitle"><div class="pnHomeSectionHead"><div><span class="eyebrow">RECENT ACTIVITY</span><h2 id="pnHomeRecentTitle">Your latest tracked games</h2></div><button class="textButton" type="button" data-home-route="matches">Battle Tracker →</button></div>${rows.length?`<div class="pnHomeActivityList">${rows.map(m=>{const result=String(m.result||'—').toUpperCase(),cls=m.result==='win'?'good':m.result==='loss'?'bad':'neutral',rp=Number(m.rankChange),when=dateValue(m.timestamp)?new Date(m.timestamp).toLocaleDateString([], {month:'short',day:'numeric'}):'';return `<article class="pnHomeActivityRow"><span class="pnHomeActivityResult ${cls}">${$esc(result)}</span><div><strong>${$esc(m.deckName||'Deck')} <span>vs ${$esc(m.opponentArchetype||'Unknown')}</span></strong><small>${m.gameMode==='ranked'?'Ranked':'Battle'}${Number.isFinite(rp)&&rp!==0?` • ${rp>0?'+':''}${rp} RP`:''}${m.turnOrder&&m.turnOrder!=='unknown'?` • ${m.turnOrder==='first'?'First':'Second'}`:''}</small></div><time>${$esc(when)}</time></article>`}).join('')}</div>`:`<div class="pnHomeModuleError"><strong>No activity yet</strong><span>Your recorded matches will appear here.</span></div>`}</section>`;
  }

  function onboarding(){
    return `<section class="pnHomeOnboarding panel" aria-labelledby="pnHomeOnboardingTitle"><div><span class="eyebrow">WELCOME TO POCKETNEXUS</span><h2 id="pnHomeOnboardingTitle">Build your competitive home base</h2><p>Your dashboard will personalize itself as you save decks and track games. You do not need to fill out anything first.</p></div><div class="pnHomeOnboardingActions"><button type="button" data-home-route="decks"><span>1</span><strong>Build your first deck</strong><small>Create or import a 20-card list.</small></button><button type="button" data-home-route="meta"><span>2</span><strong>Explore the current meta</strong><small>See what is being played now.</small></button><button type="button" data-home-route="matches"><span>3</span><strong>Log your first match</strong><small>Start your personal performance history.</small></button></div></section>`;
  }

  function renderDashboard(){
    const app=document.getElementById('app');if(!app)return;
    const matches=completed().sort((a,b)=>dateValue(b.timestamp)-dateValue(a.timestamp)),deck=activeDeck(matches),empty=isEmptyAccount(matches);
    app.innerHTML=`<main class="pnHomeCommandCenter" data-home-version="${VERSION}">
      <header class="pnHomeHero"><div><span class="pocketHeroKicker"><span class="pocketBallMark" aria-hidden="true"><i></i></span><span>POCKETNEXUS</span></span><h1>Competitive Command Center</h1><p>Everything important about your Pocket experience, in one place.</p></div><div class="pnHomeHeroAction"><button type="button" data-home-route="matches">＋ Log Match</button></div></header>
      ${empty?onboarding():snapshot(matches,deck)}
      ${metaRead()}
      ${quickActions()}
      ${empty?'':continueCard(matches,deck)}
      ${empty?'':recentActivity(matches)}
    </main>`;
    bind(app);
    scheduleMetaRefresh();
  }

  let metaRefreshScheduled=false;
  function scheduleMetaRefresh(){
    if(metaRefreshScheduled)return;metaRefreshScheduled=true;
    const run=()=>{
      try{
        const svc=window.PPCMetaService;if(!svc?.ensure)return;
        const before=svc.getStatus?.();svc.ensure(window.state?.metaIntel?.windowHours||svc.getWindow?.()||168);
        if(svc.getStatus?.()?.loading&&!before?.loading){
          const unsubscribe=svc.subscribe?.(()=>{const st=svc.getStatus?.();if(!st?.loading){unsubscribe?.();if(window.state?.page==='dashboard')renderDashboard()}});
        }
      }catch(e){console.warn('Home meta refresh deferred safely',e)}
    };
    if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:1600});else setTimeout(run,250);
  }

  function bind(root){
    root.querySelectorAll('[data-home-route]').forEach(btn=>btn.addEventListener('click',()=>route(btn.dataset.homeRoute)));
    root.querySelectorAll('[data-home-open-deck]').forEach(btn=>btn.addEventListener('click',()=>{
      const id=btn.dataset.homeOpenDeck;
      if(typeof window.openDeck==='function')window.openDeck(id);else route('decks');
    }));
  }

  window.dashboard=renderDashboard;
  window.PPCHomeCommandCenter={version:VERSION,render:renderDashboard,metaRead,snapshot,isEmptyAccount};
})();
