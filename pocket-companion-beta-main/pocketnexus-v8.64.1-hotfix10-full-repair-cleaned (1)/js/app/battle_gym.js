function standardMatches(){
 const today=completedMatches().filter(m=>new Date(m.timestamp).toDateString()===new Date().toDateString()),ts=wl(today),st=streakInfo(),active=state.sessions.find(s=>!s.end);
 document.getElementById("app").innerHTML=`<div class="battleModeHeader"><div class="between"><div><span class="eyebrow">BATTLE TRACKER</span><h1>Battle</h1><p class="muted">Record ranked or casual matches, review sessions, and track your battle history.</p></div><div class="row"><button class="secondary" onclick="goPage('rank')">Rank Details</button><button class="secondary" onclick="state.page='stats';render()">Performance</button></div></div></div>${battleRankOverviewHtml()}${activeSessionBar(active)}${battleResultSummaryHtml(battleSaveNotice)}<div class="battleLayout v821BattleLayout">${battleFormHtml()}<div><div class="panel"><div class="between"><div><h2>Today's Battles</h2><p class="muted">Overall match record. Ranked RP is shown above.</p></div><span class="pill">${ts.n} MATCH${ts.n===1?'':'ES'}</span></div><div class="metricgrid compactBattleMetrics"><div class="metric"><div class="l">Record</div><div class="n">${ts.w}-${ts.l}</div></div><div class="metric"><div class="l">Win Rate</div><div class="n">${ts.n?ts.wr.toFixed(1)+"%":"—"}</div></div><div class="metric"><div class="l">Overall Streak</div><div class="n">${st.type==="none"?"—":(st.type==="win"?"W":"L")+st.count}</div><small>Ranked + casual</small></div><div class="metric"><div class="l">Best Overall W Streak</div><div class="n">W${st.bestWin}</div><small>Not your RP streak</small></div></div></div><div class="panel"><div class="between"><div><h2>Sessions</h2><p class="muted">Optional grind or testing sessions.</p></div>${active?"":sessionStartControls()}</div>${sessionHistoryHtml()}</div></div></div><div class="panel"><div class="between"><div><h2>Battle History</h2><p class="muted">Search or filter your recorded matches.</p></div><div class="row"><button class="secondary" onclick="exportBattleJSON()">JSON</button><button class="secondary" onclick="exportBattleCSV()">CSV</button></div></div>${battleFiltersHtml()}<div id="battleHistory"></div></div>`;
 renderBattleHistory();
}


// V8.27 — Gym Battle + Deck Pairing Advisor (frontend/local-first)
function gymState(){return ensureGymBattleState()}
function gymDeckName(id){return resolveSelectableDeck(id)?.name||''}
function gymSelectableDecks(){
 const saved=(state.decks||[]).map(d=>({...d,source:d.source||'user',isMetaDeck:false}));
 const meta=selectableMetaDecks().map(metaDeckFromArchetype).filter(Boolean);
 const seen=new Set();
 return [...saved,...meta].filter(d=>{const key=String(d.id);if(seen.has(key))return false;seen.add(key);return true});
}
function gymMetaRows(){
 // V8.50.6: prefer the currently selected event-scoped competitive field when available.
 const live=window.CompetitiveMeta847;
 if(live?.loaded&&Array.isArray(live.meta)&&live.meta.length){
  return live.meta.slice(0,10).map((a,i)=>({name:a.archetype||`Meta Deck ${i+1}`,usage:Number(a.meta_share||0),rank:i+1,confidence:a.confidence_label||"LOW",games:Number(a.games||0),eventId:live.eventId||null}));
 }
 let rows=[];try{rows=(MetaService?.getTopArchetypes?.()||[]).slice(0,10)}catch(e){}
 return rows.map((a,i)=>({name:a.name||a.shortName||`Meta Deck ${i+1}`,usage:Number(a.stats?.usage??a.usage),rank:Number(a.stats?.rank||a.rank||i+1),confidence:a.stats?.confidence||a.confidence||"Limited",games:Number(a.stats?.matches||0)}));
}
function gymDeckProfile(deck){
 const ms=completedMatches().filter(m=>m.deckId===deck.id||personalMetaKey(m.deckName)===personalMetaKey(deck.name));
 const overall=wl(ms),meta=gymMetaRows();
 const cells=meta.map(a=>{const list=ms.filter(m=>{const k=personalMetaKey(m.opponentArchetype),q=personalMetaKey(a.name);return q&&(k===q||k.includes(q)||q.includes(k))});return {...a,...wl(list)}});
 const shrink=Math.min(1,overall.n/12),strength=overall.n?50+(overall.wr-50)*shrink:50;
 return {deck,ms,overall,cells,strength};
}
function gymMatchupCellForTarget(profile,target){
 const q=personalMetaKey(target||"");if(!q)return {n:0,w:0,l:0,wr:0};
 const list=profile.ms.filter(m=>{const k=personalMetaKey(m.opponentArchetype);return k&&(k===q||k.includes(q)||q.includes(k))});
 return wl(list);
}
function gymScoutTargets(){
 const g=gymState(),manual=(g.scoutTargets||[]).map(String).map(x=>x.trim()).filter(Boolean),lineup=(g.awayPlayers||[]).flatMap(p=>[p.deck1,p.deck2]).map(String).map(x=>x.trim()).filter(Boolean);
 return [...new Set([...manual,...lineup])].slice(0,8);
}
function gymPairAnalysis(a,b,mode=gymState().pairingMode){
 const pa=gymDeckProfile(a),pb=gymDeckProfile(b),meta=gymMetaRows();
 let knownWeight=0,coveredWeight=0,sharedBadWeight=0;
 meta.forEach((m,i)=>{const w=Number.isFinite(m.usage)&&m.usage>0?m.usage:1,totalA=pa.cells[i],totalB=pb.cells[i];if(totalA.n||totalB.n){knownWeight+=w;const best=Math.max(totalA.n?totalA.wr:-1,totalB.n?totalB.wr:-1);if(best>=50)coveredWeight+=w;if(totalA.n&&totalB.n&&totalA.wr<50&&totalB.wr<50)sharedBadWeight+=w;}});
 const coverage=knownWeight?coveredWeight/knownWeight*100:0,overlap=knownWeight?sharedBadWeight/knownWeight*100:0;
 const strength=(pa.strength+pb.strength)/2,confidence=Math.min(100,(pa.overall.n+pb.overall.n)/24*100);
 const targets=gymScoutTargets();let scoutKnown=0,scoutCovered=0,scoutBad=0;
 const scout=targets.map(name=>{const ca=gymMatchupCellForTarget(pa,name),cb=gymMatchupCellForTarget(pb,name),known=ca.n||cb.n,best=Math.max(ca.n?ca.wr:-1,cb.n?cb.wr:-1);if(known){scoutKnown++;if(best>=50)scoutCovered++;if(ca.n&&cb.n&&ca.wr<50&&cb.wr<50)scoutBad++;}return {name,a:ca,b:cb,best};});
 const scoutCoverage=scoutKnown?scoutCovered/scoutKnown*100:0;
 let score;if(mode==="antiMeta")score=strength*.25+coverage*.55+(100-overlap)*.20;else if(mode==="proven")score=strength*.56+coverage*.19+(100-overlap)*.10+confidence*.15;else if(mode==="scout"&&targets.length)score=strength*.24+scoutCoverage*.50+(100-(scoutKnown?scoutBad/scoutKnown*100:0))*.16+confidence*.10;else score=strength*.48+coverage*.37+(100-overlap)*.15;
 score=Math.round(Math.max(0,Math.min(100,score)));
 const risks=meta.map((m,i)=>({name:m.name,usage:Number.isFinite(m.usage)?m.usage:0,a:pa.cells[i],b:pb.cells[i]})).filter(x=>x.a.n&&x.b.n&&x.a.wr<50&&x.b.wr<50).sort((x,y)=>y.usage-x.usage);
 const covered=meta.map((m,i)=>({name:m.name,a:pa.cells[i],b:pb.cells[i]})).filter(x=>(x.a.n&&x.a.wr>=50)||(x.b.n&&x.b.wr>=50)).length;
 return {a,b,pa,pb,score,coverage,overlap,confidence,risks,covered,metaCount:meta.length,scout,scoutKnown,scoutCoverage,mode};
}
function gymAllPairs(mode=gymState().pairingMode){
 const ds=gymSelectableDecks(),out=[];
 for(let i=0;i<ds.length;i++)for(let j=i+1;j<ds.length;j++)out.push(gymPairAnalysis(ds[i],ds[j],mode));
 return out.sort((x,y)=>y.score-x.score||y.confidence-x.confidence);
}
function gymPairConfidenceLabel(n){return n>=70?"High":n>=35?"Medium":"Low"}
function gymPairModeLabel(m){return m==="antiMeta"?"Anti-Meta":m==="proven"?"Most Proven":m==="scout"?"Scout Target":"Balanced"}
function gymSetPairingMode(mode){const g=gymState();g.pairingMode=mode;save();gymBattlePage()}
function gymSetScoutTarget(i,val){const g=gymState();g.scoutTargets=Array.isArray(g.scoutTargets)?g.scoutTargets:[];g.scoutTargets[i]=String(val||"").trim();save()}

// V8.40 — sanitized competitive matchup intelligence. This calls only the public
// get_pairing_matchup RPC; raw league tables, players and source rows remain private.
let pairingLiveIntel=null,pairingLiveIntelLoading=false,pairingLiveIntelError="";
function pairingArchetypeOptions(selected=""){
 const liveNames=(window.CompetitiveMeta847?.meta||[]).map(x=>x.archetype);
 const names=[...new Set([...sharedArchetypeNames(),...liveNames,...(state.decks||[]).map(d=>d.archetype||d.name),...gymScoutTargets()].map(x=>String(x||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
 return `<option value="">Choose archetype…</option>${names.map(n=>`<option value="${esc(n)}" ${n===selected?'selected':''}>${esc(n)}</option>`).join("")}`;
}
async function pairingLookupCompetitive(){
 const a=document.getElementById("pairingLiveDeckA")?.value?.trim()||"",b=document.getElementById("pairingLiveDeckB")?.value?.trim()||"";
 if(!a||!b){pairingLiveIntelError="Choose both archetypes first.";pairingLiveIntel=null;gymBattlePage();return}
 if(a===b){pairingLiveIntelError="Choose two different archetypes.";pairingLiveIntel=null;gymBattlePage();return}
 let client=window.getPPCCloudClient?.();if(!client){try{initCloudAuth?.();client=window.getPPCCloudClient?.()}catch(e){}}
 if(!client){pairingLiveIntelError="Competitive data service is still loading. Try again in a moment.";pairingLiveIntel=null;gymBattlePage();return}
 pairingLiveIntelLoading=true;pairingLiveIntelError="";gymBattlePage();
 try{
  // V8.50.6: use the event-scoped competitive RPC instead of the legacy all-events aggregate.
  const eventId=window.CompetitiveMeta847?.eventId||null;
  const {data,error}=await client.rpc("get_competitive_matchup",{p_deck_a:a,p_deck_b:b,p_event_id:eventId});
  if(error)throw error;
  pairingLiveIntel=Array.isArray(data)?data[0]||null:data||null;
  if(!pairingLiveIntel)pairingLiveIntelError="No competitive matchup sample has been recorded for this pairing yet.";
 }catch(e){pairingLiveIntel=null;pairingLiveIntelError=e?.message||"Could not load competitive matchup data."}
 pairingLiveIntelLoading=false;gymBattlePage();
}
function pairingLiveIntelHtml(){
 const a=pairingLiveIntel?.deck_a||"",b=pairingLiveIntel?.deck_b||"",r=pairingLiveIntel;
 let body=`<p class="muted tiny">Choose two canonical archetypes to query event-scoped competitive evidence. The selected event follows Meta Center when available; no player names, teams, spreadsheets or raw matches are returned.</p>`;
 if(pairingLiveIntelLoading)body+=`<div class="notice pairingLiveResult"><strong>Loading competitive matchup…</strong></div>`;
 else if(pairingLiveIntelError)body+=`<div class="notice pairingLiveResult"><strong>${esc(pairingLiveIntelError)}</strong></div>`;
 else if(r){const aWr=Number(r.deck_a_win_rate??r.deck_a_win_pct??0),bWr=Number(r.deck_b_win_rate??r.deck_b_win_pct??0),games=Number(r.games||0),ties=Number(r.ties||0),confidence=String(r.confidence_label||r.confidence||"LOW"),edge=aWr>50?`${a} favored`:bWr>50?`${b} favored`:"Even observed split",event=window.CompetitiveMeta847?.events?.find(x=>x.id===window.CompetitiveMeta847?.eventId),eventLabel=event?[event.competition_name,event.season,event.week_number?`Week ${event.week_number}`:event.stage].filter(Boolean).join(" • "):"All available competitive data",strongSample=games>=10;body+=`<div class="pairingLiveResult"><div class="pairingIntelMetrics"><div><strong>${r.deck_a_wins}-${r.deck_b_wins}${ties?`-${ties}`:""}</strong><small>Competitive record</small></div><div><strong>${aWr.toFixed(1)}%</strong><small>${esc(a)} observed WR</small></div><div><strong>${games}</strong><small>Games</small></div><div><strong>${esc(confidence)}</strong><small>Confidence</small></div></div><div class="pairingIntelEdge"><strong>${esc(edge)}</strong>${!strongSample?` <span class="muted tiny">• Limited sample — use as evidence, not certainty.</span>`:""}</div><div class="pairingIntelSource">Source: ${esc(eventLabel)} • event-scoped sanitized aggregate</div></div>`}
 return `<section class="panel pairingLiveIntel"><div class="between"><div><span class="eyebrow">LIVE COMPETITIVE INTELLIGENCE</span><h2>Check a matchup</h2></div><span class="pill">SANITIZED RPC</span></div><div class="pairingLiveGrid"><label>Your archetype<select id="pairingLiveDeckA">${pairingArchetypeOptions(a)}</select></label><span class="pairingLiveVs">VS</span><label>Opponent archetype<select id="pairingLiveDeckB">${pairingArchetypeOptions(b)}</select></label><button onclick="pairingLookupCompetitive()" ${pairingLiveIntelLoading?'disabled':''}>${pairingLiveIntelLoading?'Checking…':'Check Matchup'}</button></div>${body}</section>`;
}
function gymPairCard(p,rank=1,playerIndex=0){
 const risk=p.risks[0]?.name||"No shared bad matchup confirmed",scout=p.scoutKnown?` • Scout coverage ${p.scoutCoverage.toFixed(0)}%`:"";
 return `<article class="gymPairCard ${rank===1?"recommended":""}"><div class="gymPairRank">#${rank}</div><div class="gymPairMain"><span class="eyebrow">${rank===1?"RECOMMENDED PAIR":"ALTERNATIVE"} • ${gymPairModeLabel(p.mode).toUpperCase()}</span><h3>${esc(p.a.name)} <span>+</span> ${esc(p.b.name)}</h3><div class="gymPairMetrics"><div><strong>${p.score}</strong><small>Pair Score</small></div><div><strong>${p.coverage.toFixed(0)}%</strong><small>Known Meta Coverage</small></div><div><strong>${p.overlap.toFixed(0)}%</strong><small>Shared Weakness</small></div><div><strong>${gymPairConfidenceLabel(p.confidence)}</strong><small>Confidence</small></div></div><p class="muted tiny">Based on ${p.pa.overall.n+p.pb.overall.n} recorded games${scout}. Main confirmed risk: ${esc(risk)}.</p></div><button onclick="gymAssignPair(${playerIndex},'${p.a.id}','${p.b.id}')">Use Pair</button></article>`;
}
function gymAssignPair(i,a,b){const g=gymState();g.homePlayers[i].deck1=a;g.homePlayers[i].deck2=b;g.view='setup';save();gymBattlePage()}
function gymUpdateSetup(side,i,key,val){const g=gymState(),arr=side==='home'?g.homePlayers:g.awayPlayers;if(arr[i])arr[i][key]=val;save()}
function gymSetupDeckOptions(selected=''){
 const mine=(state.decks||[]).map(d=>`<option value="${d.id}" ${String(d.id)===String(selected)?'selected':''}>${esc(d.name)}</option>`).join('');
 const meta=selectableMetaDecks().map(a=>`<option value="${metaDeckId(a)}" ${metaDeckId(a)===String(selected)?'selected':''}>${esc(a.name)}${a.stats?.rank?` • Meta #${a.stats.rank}`:''}</option>`).join('');
 return `<option value="">Select deck…</option>${mine?`<optgroup label="My Decks">${mine}</optgroup>`:''}${meta?`<optgroup label="Meta Decks — ready to use">${meta}</optgroup>`:''}`;
}
function gymSetupPlayerCard(side,p,i){
 const home=side==='home';
 return `<article class="gymRosterPlayer"><div class="gymPlayerNum">${i+1}</div><div class="gymPlayerFields"><input aria-label="${home?'Your':'Opponent'} player ${i+1} name" value="${esc(p.name)}" onchange="gymUpdateSetup('${side}',${i},'name',this.value)">${home?`<div class="gymDeckPickRow"><select onchange="gymUpdateSetup('home',${i},'deck1',this.value)">${gymSetupDeckOptions(p.deck1)}</select><select onchange="gymUpdateSetup('home',${i},'deck2',this.value)">${gymSetupDeckOptions(p.deck2)}</select></div><button class="secondary smallButton" onclick="gymOpenPairing(${i})">Find Best Pair</button>`:`<div class="gymDeckPickRow"><input placeholder="Deck 1 / archetype" value="${esc(p.deck1)}" onchange="gymUpdateSetup('away',${i},'deck1',this.value)"><input placeholder="Deck 2 / archetype" value="${esc(p.deck2)}" onchange="gymUpdateSetup('away',${i},'deck2',this.value)"></div>`}</div></article>`;
}
function gymOpenPairing(i){const g=gymState();g.pairingPlayer=Math.max(0,Math.min(4,Number(i)||0));g.view='pairing';save();gymBattlePage()}
function gymPairingPage(){
 const g=gymState(),i=Number(g.pairingPlayer||0),p=g.homePlayers[i],mode=g.pairingMode,pairs=gymAllPairs(mode).slice(0,12),meta=gymMetaRows(),scout=gymScoutTargets();
 const modes=[["balanced","Balanced"],["antiMeta","Anti-Meta"],["proven","Most Proven"],["scout","Scout Target"]];
 return `<div class="gymPairingPage"><div class="between gymPairingHero"><div><span class="eyebrow">GYM BATTLE • PREP</span><h1>Deck Pairing Lab</h1><p class="muted">Compare more pair combinations and change what “best” means for this player.</p></div><button class="secondary" onclick="gymSetView('setup')">← Back to Lineup</button></div><section class="panel gymPairIntro"><div><span>PLAYER</span><strong>${esc(p.name||`Player ${i+1}`)}</strong></div><div><span>AVAILABLE DECKS</span><strong>${gymSelectableDecks().length}</strong></div><div><span>POSSIBLE PAIRS</span><strong>${Math.max(0,(gymSelectableDecks().length*(gymSelectableDecks().length-1))/2)}</strong></div><div><span>META SAMPLE</span><strong>${meta.length||"—"}</strong></div></section><section class="panel gymPairControls"><div><span class="eyebrow">PAIRING STRATEGY</span><div class="gymPairModeTabs">${modes.map(x=>`<button class="${mode===x[0]?"active":""}" onclick="gymSetPairingMode('${x[0]}')">${x[1]}</button>`).join("")}</div></div><div class="gymPairModeHelp">${mode==="antiMeta"?"Prioritizes coverage against the current Meta sample and punishes shared bad matchups more heavily.":mode==="proven"?"Prioritizes decks with stronger personal results and larger recorded samples.":mode==="scout"?"Prioritizes your proven results into the opponent archetypes you enter below. Untested matchups stay unknown.":"Balances personal results, current Meta coverage, and shared weakness risk."}</div></section><section class="panel gymScoutPanel"><div><span class="eyebrow">OPPONENT SCOUTING</span><h2>What decks do you expect?</h2><p class="muted">The advisor automatically reads archetypes entered in the opponent lineup. Add up to four extra targets here.</p></div><div class="gymScoutGrid">${[0,1,2,3].map(n=>`<input list="gymArchetypeLibrary" placeholder="Expected archetype ${n+1}" value="${esc(g.scoutTargets?.[n]||"")}" onchange="gymSetScoutTarget(${n},canonicalArchetypeName(this.value));gymBattlePage()">`).join("")}${sharedArchetypeDatalist("gymArchetypeLibrary")}</div>${scout.length?`<div class="gymScoutChips">${scout.map(x=>`<span>${esc(x)}</span>`).join("")}</div>`:`<p class="muted tiny">No scouted archetypes yet. Enter opponent decks in the lineup or type targets above.</p>`}</section>${pairingLiveIntelHtml()}${pairs.length?`<div class="gymPairList">${pairs.map((x,n)=>gymPairCard(x,n+1,i)).join("")}</div>`:`<section class="panel"><h2>Need at least two available decks</h2><p class="muted">Use decks from My Decks or the Meta library. Recommendations get smarter as you record Battle Tracker results and as live Meta data is collected.</p><div class="row"><button onclick="goPage('decks')">Open My Decks</button><button class="secondary" onclick="goPage('meta')">Open Meta</button></div></section>`}<div class="notice gymPairDataRule"><strong>Data rule:</strong> The advisor never treats an untested matchup as a win. More Battle Tracker matches improve personal confidence; more tournament matches improve Meta coverage. Pair rankings update automatically as either data source grows.</div></div>`;
}
function gymSetView(v){const g=gymState();g.view=v;save();gymBattlePage()}
async function gymStartBattle(){
 const g=gymState();
 if(g.active&&!g.active.winner&&g.active.results?.length){const ok=await ppcConfirm('A Gym Battle is already in progress. Start over and replace it?','Replace active Gym Battle');if(!ok)return}
 const duplicateHome=g.homePlayers.some(p=>p.deck1&&p.deck1===p.deck2);
 if(duplicateHome){ppcNotice('Each player needs two different decks. You can mix My Decks and Meta decks.');return}
 const invalid=g.homePlayers.some(p=>!p.name.trim()||!p.deck1||!p.deck2)||g.awayPlayers.some(p=>!p.name.trim()||!p.deck1.trim()||!p.deck2.trim());
 if(invalid){ppcNotice('Fill all 5 player names and both decks for each side before starting.');return}
 g.active={id:makeId(),startedAt:Date.now(),homeGym:g.homeGym||'My Gym',awayGym:g.awayGym||'Opponent Gym',homePlayers:g.homePlayers.map(p=>({name:p.name,decks:[gymDeckName(p.deck1),gymDeckName(p.deck2)],deckIds:[p.deck1,p.deck2],alive:[true,true],wins:0,losses:0})),awayPlayers:g.awayPlayers.map(p=>({name:p.name,decks:[p.deck1,p.deck2],alive:[true,true],wins:0,losses:0})),homeIndex:0,awayIndex:0,homeDeck:0,awayDeck:0,results:[],winner:null};
 g.view='battle';save();gymBattlePage();
}
function gymCurrentPlayer(side){const a=gymState().active;if(!a)return null;return side==='home'?a.homePlayers[a.homeIndex]:a.awayPlayers[a.awayIndex]}
function gymAdvanceAfterLoss(side){
 const a=gymState().active,players=side==='home'?a.homePlayers:a.awayPlayers,idxKey=side==='home'?'homeIndex':'awayIndex',deckKey=side==='home'?'homeDeck':'awayDeck';
 let i=a[idxKey],d=a[deckKey],p=players[i];p.alive[d]=false;
 if(p.alive[0]||p.alive[1]){a[deckKey]=p.alive[0]?0:1;return {eliminated:false,name:p.name}}
 let next=i+1;while(next<players.length&&!players[next].alive.some(Boolean))next++;
 if(next>=players.length){a.winner=side==='home'?'away':'home';return {eliminated:true,name:p.name,teamOut:true}}
 a[idxKey]=next;a[deckKey]=players[next].alive[0]?0:1;return {eliminated:true,name:p.name,teamOut:false};
}
function gymRecordResult(winnerSide){
 const g=gymState(),a=g.active;if(!a||a.winner)return;
 const hp=gymCurrentPlayer('home'),ap=gymCurrentPlayer('away'),hd=a.homeDeck,ad=a.awayDeck;
 const winner=winnerSide==='home'?hp:ap,loserSide=winnerSide==='home'?'away':'home',loser=winnerSide==='home'?ap:hp;
 winner.wins++;loser.losses++;
 a.results.push({id:makeId(),at:Date.now(),homePlayer:hp.name,awayPlayer:ap.name,homeDeck:hp.decks[hd],awayDeck:ap.decks[ad],winner:winnerSide});
 const change=gymAdvanceAfterLoss(loserSide);a.lastNotice=change.teamOut?`${change.name} was eliminated. ${a.winner==='home'?a.homeGym:a.awayGym} wins the Gym Battle!`:change.eliminated?`${change.name} is out. The next gym member steps in.`:`${change.name} lost Deck ${loserSide==='home'?hd+1:ad+1} and switches decks.`;
 if(a.winner){a.endedAt=Date.now();g.history.unshift(JSON.parse(JSON.stringify(a)));g.history=g.history.slice(0,30)}
 save();gymBattlePage();
}
function gymUndoResult(){
 const g=gymState(),a=g.active;if(!a||!a.results.length)return ppcNotice('No Gym Battle result to undo.');
 // V8.50.8: if the battle had already completed, remove its archived snapshot before reopening it.
 if(a.winner)g.history=(g.history||[]).filter(h=>h.id!==a.id);
 // Rebuild battle deterministically from lineup, replaying every result except the last.
 const replay=a.results.slice(0,-1).map(r=>r.winner),base={id:a.id,startedAt:a.startedAt,homeGym:a.homeGym,awayGym:a.awayGym,homePlayers:a.homePlayers.map(p=>({name:p.name,decks:[...p.decks],deckIds:p.deckIds?[...p.deckIds]:undefined,alive:[true,true],wins:0,losses:0})),awayPlayers:a.awayPlayers.map(p=>({name:p.name,decks:[...p.decks],alive:[true,true],wins:0,losses:0})),homeIndex:0,awayIndex:0,homeDeck:0,awayDeck:0,results:[],winner:null};
 g.active=base;for(const w of replay){const x=g.active,h=x.homePlayers[x.homeIndex],o=x.awayPlayers[x.awayIndex],hd=x.homeDeck,od=x.awayDeck;(w==='home'?h:o).wins++;(w==='home'?o:h).losses++;x.results.push({id:makeId(),at:Date.now(),homePlayer:h.name,awayPlayer:o.name,homeDeck:h.decks[hd],awayDeck:o.decks[od],winner:w});gymAdvanceAfterLoss(w==='home'?'away':'home')}
 g.active.lastNotice='Last result undone.';save();gymBattlePage();
}
function gymAliveCount(players){return players.filter(p=>p.alive.some(Boolean)).length}
function gymLivesHtml(players,current){return players.map((p,i)=>`<div class="gymLifeRow ${i===current?'current':''} ${!p.alive.some(Boolean)?'out':''}"><span>${i+1}</span><div><strong>${esc(p.name)}</strong><small>${p.alive[0]?'●':'×'} ${esc(p.decks[0])} · ${p.alive[1]?'●':'×'} ${esc(p.decks[1])}</small></div></div>`).join('')}
function gymBattleControlPage(){
 const g=gymState(),a=g.active;if(!a)return gymSetupPage();const hp=a.homePlayers[a.homeIndex],ap=a.awayPlayers[a.awayIndex],finished=!!a.winner;
 return `<div class="between"><div><span class="eyebrow">GYM BATTLE • LIVE</span><h1>${esc(a.homeGym)} vs ${esc(a.awayGym)}</h1><p class="muted">Winner keeps their deck. The losing deck is eliminated automatically.</p></div><div class="row"><button class="secondary" onclick="gymUndoResult()">Undo Last</button><button class="secondary" onclick="gymSetView('setup')">Setup</button></div></div><section class="gymScoreboard"><div><span>${esc(a.homeGym)}</span><strong>${gymAliveCount(a.homePlayers)}</strong><small>players alive</small></div><b>VS</b><div><span>${esc(a.awayGym)}</span><strong>${gymAliveCount(a.awayPlayers)}</strong><small>players alive</small></div></section>${a.lastNotice?`<div class="notice gymNotice"><strong>${esc(a.lastNotice)}</strong></div>`:''}${finished?`<section class="panel gymWinner"><span class="eyebrow">GYM BATTLE COMPLETE</span><h2>🏆 ${esc(a.winner==='home'?a.homeGym:a.awayGym)} wins</h2><p>${a.results.filter(r=>r.winner==='home').length}–${a.results.filter(r=>r.winner==='away').length} match record</p><div class="row"><button onclick="gymNewBattle()">New Gym Battle</button><button class="secondary" onclick="gymSetView('history')">Battle History</button></div></section>`:`<section class="gymCurrentMatch"><article><span>${esc(a.homeGym)}</span><h2>${esc(hp.name)}</h2><strong>${esc(hp.decks[a.homeDeck])}</strong><small>Deck ${a.homeDeck+1} • ${hp.alive[0]?'●':'×'} ${hp.alive[1]?'●':'×'}</small></article><div class="gymVs">VS</div><article><span>${esc(a.awayGym)}</span><h2>${esc(ap.name)}</h2><strong>${esc(ap.decks[a.awayDeck])}</strong><small>Deck ${a.awayDeck+1} • ${ap.alive[0]?'●':'×'} ${ap.alive[1]?'●':'×'}</small></article></section><div class="gymResultButtons"><button class="quickWin" onclick="gymRecordResult('home')">${esc(hp.name)} WINS</button><button class="quickLoss" onclick="gymRecordResult('away')">${esc(ap.name)} WINS</button></div>`}<div class="gymRosterGrid"><section class="panel"><h2>${esc(a.homeGym)}</h2>${gymLivesHtml(a.homePlayers,a.homeIndex)}</section><section class="panel"><h2>${esc(a.awayGym)}</h2>${gymLivesHtml(a.awayPlayers,a.awayIndex)}</section></div><section class="panel"><div class="between"><div><h2>Match Log</h2><p class="muted">Every elimination is saved locally as you go.</p></div><span class="pill">${a.results.length} games</span></div>${a.results.slice().reverse().map((r,i)=>`<div class="gymLogRow"><span>${a.results.length-i}</span><div><strong>${esc(r.homePlayer)} vs ${esc(r.awayPlayer)}</strong><small>${esc(r.homeDeck)} vs ${esc(r.awayDeck)}</small></div><b>${r.winner==='home'?esc(r.homePlayer):esc(r.awayPlayer)} W</b></div>`).join('')||'<p class="muted">No games recorded yet.</p>'}</section>`;
}
async function gymNewBattle(){const g=gymState();if(g.active&&!g.active.winner&&g.active.results?.length){const ok=await ppcConfirm('Leave the active Gym Battle and start a new one?','Start new Gym Battle');if(!ok)return}g.active=null;g.view='setup';save();gymBattlePage()}
function gymHistoryPage(){const g=gymState();return `<div class="between"><div><span class="eyebrow">GYM BATTLE</span><h1>Battle History</h1><p class="muted">Completed team battles saved on this browser.</p></div><button class="secondary" onclick="gymSetView('setup')">← Setup</button></div>${g.history.length?g.history.map(a=>`<article class="panel gymHistoryCard"><div><strong>${esc(a.homeGym)} vs ${esc(a.awayGym)}</strong><small>${new Date(a.startedAt).toLocaleString()}</small></div><div><span class="badge">${esc(a.winner==='home'?a.homeGym:a.awayGym)} won</span><strong>${a.results.filter(r=>r.winner==='home').length}-${a.results.filter(r=>r.winner==='away').length}</strong></div></article>`).join(''):'<section class="panel"><p class="muted">No completed Gym Battles yet.</p></section>'}`}
function gymSetupPage(){
 const g=gymState(),top=gymAllPairs()[0];
 return `<div class="between"><div><span class="eyebrow">BATTLE TRACKER • TEAM FORMAT</span><h1>Gym Battle</h1><p class="muted">5 players per gym. Each player brings 2 decks. Lose a deck, switch. Lose both, you're eliminated.</p></div><div class="row"><button class="secondary" onclick="gymSetView('history')">History</button></div></div><section class="panel gymRules"><div><strong>5</strong><span>Players / Gym</span></div><div><strong>2</strong><span>Decks / Player</span></div><div><strong>WIN</strong><span>Keep Current Deck</span></div><div><strong>LOSS</strong><span>Deck Eliminated</span></div></section>${top?`<section class="panel gymAdvisorSpotlight"><div><span class="eyebrow">DECK PAIRING LAB</span><h2>Best current pair: ${esc(top.a.name)} + ${esc(top.b.name)}</h2><p class="muted">Pair Score ${top.score}/100 • ${top.coverage.toFixed(0)}% known meta coverage • ${gymPairConfidenceLabel(top.confidence)} confidence</p></div><button onclick="gymOpenPairing(0)">Open Pairing Lab →</button></section>`:''}<div class="gymNames"><label>Your Gym<input value="${esc(g.homeGym)}" onchange="gymState().homeGym=this.value;save()"></label><label>Opponent Gym<input value="${esc(g.awayGym)}" onchange="gymState().awayGym=this.value;save()"></label></div><div class="gymRosterGrid"><section class="panel"><div class="between"><div><h2>Your 5-Player Lineup</h2><p class="muted">Choose any two decks from My Decks or the current Meta library.</p></div><span class="pill">10 DECK SLOTS</span></div><div class="gymRosterList">${g.homePlayers.map((p,i)=>gymSetupPlayerCard('home',p,i)).join('')}</div></section><section class="panel"><div class="between"><div><h2>Opponent Lineup</h2><p class="muted">Names and archetypes can be entered manually.</p></div><span class="pill">NO ACCOUNT NEEDED</span></div><div class="gymRosterList">${g.awayPlayers.map((p,i)=>gymSetupPlayerCard('away',p,i)).join('')}</div></section></div><div class="gymStartBar"><div><strong>Ready to run the battle?</strong><span>Results save locally after every game.</span></div><button onclick="gymStartBattle()">Start Gym Battle</button></div><div class="notice"><strong>Frontend-first:</strong> Gym Battle is local-only in this version. It does not write new Gym data to Supabase yet, so we can finish the interface and rules before adding backend tables.</div>`;
}
function gymBattlePage(){const g=gymState();if(g.view==='pairing')return document.getElementById('app').innerHTML=gymPairingPage();if(g.view==='battle')return document.getElementById('app').innerHTML=gymBattleControlPage();if(g.view==='history')return document.getElementById('app').innerHTML=gymHistoryPage();document.getElementById('app').innerHTML=gymSetupPage()}
function matches(){if((state.battlePrefs.experienceMode||'standard')==='gym')return gymBattlePage();return standardMatches()}

function record(result){let id=document.getElementById("md").value;if(!id)return ppcNotice("Create a deck first.");let d=state.decks.find(x=>x.id===id);state.matches.push({id:makeId(),deckId:id,deckName:d.name,opponent:document.getElementById("opp").value.trim(),notes:document.getElementById("notes").value.trim(),result,date:new Date().toISOString()});save();state.page="stats";statsPage()}
function statsPage(){statisticsPage()}
function ensureTrade(){state.trade=state.trade||{have:[],want:[]}}
function tradePage(){
 const have=CARDS.filter(c=>collectionRead(c.id).tradeable>0),want=CARDS.filter(c=>collectionRead(c.id).wanted>0);
 document.getElementById("app").innerHTML=`<div class="between"><div><h1>Trade Center</h1><p class="muted">Synced automatically with Collection.</p></div><button onclick="state.page='collection';render()">Open Collection</button></div><div class="grid"><div class="panel"><h2>I Have</h2>${have.length?have.map(c=>`<div class="between deckrow"><span>${esc(c.name)}</span><span class="pill">×${collectionRead(c.id).tradeable}</span></div>`).join(""):`<p class="muted">Mark cards as tradeable in Collection.</p>`}</div><div class="panel"><h2>I Want</h2>${want.length?want.map(c=>`<div class="between deckrow"><span>${esc(c.name)}</span><span class="pill">×${collectionRead(c.id).wanted}</span></div>`).join(""):`<p class="muted">Mark cards as wanted in Collection.</p>`}</div></div><div class="panel"><p class="muted">Collection quantities are the source of truth for Trade Center.</p></div>`;
}
function addTrade(kind){ensureTrade();let el=document.getElementById(kind==="have"?"haveSearch":"wantSearch"),v=el.value.trim();if(!v)return;state.trade[kind].push(v);save();tradePage()}
function removeTrade(kind,i){ensureTrade();state.trade[kind].splice(i,1);save();tradePage()}

function imageDiagnosticsPanel(){
 const withUrls=CARDS.filter(c=>(c.thumbnailImageSources||[]).length>0).length;
 const without=CARDS.length-withUrls;
 const examples=CARDS.filter(c=>c.thumbnailUrl).slice(0,5);
 return `<div class="panel"><h2>Card Image Diagnostics</h2><p class="muted">Use this when card art is blank or falling back to text placeholders.</p><div class="debugGrid"><div class="metric"><div class="l">Cards loaded</div><div class="n">${CARDS.length}</div></div><div class="metric"><div class="l">With image URLs</div><div class="n">${withUrls}</div></div><div class="metric"><div class="l">Without image URLs</div><div class="n">${without}</div></div><div class="metric"><div class="l">Data source</div><div class="n" style="font-size:14px">${esc(CARD_DATA_SOURCE)}</div></div><div class="metric"><div class="l">Load mode</div><div class="n" style="font-size:14px">${esc(window.cardLoadMode||"fallback")}</div></div></div><h3 style="margin-top:14px">Example normalized URLs</h3>${examples.length?examples.map(c=>`<div><strong>${esc(c.name)}</strong><div class="debugUrl">Thumb: ${esc(c.thumbnailUrl)}</div><div class="debugUrl">Full: ${esc(c.fullImageUrl)}</div><div class="muted tiny">Raw dataset image field: ${esc(c.rawImageName||"(absolute URL or missing)")}</div></div>`).join(""):`<p class="muted">Open Deck Lab or Collection first so the full card database loads.</p>`}<div class="row" style="margin-top:14px"><button onclick="testCardImages()">Test Card Images</button><span class="muted">Tests at most 10 cards.</span></div><div id="imageTestResults"></div></div>`;
}
function testSingleImage(url,timeout=8000){
 return new Promise(resolve=>{
  if(!url)return resolve("missing");
  const im=new Image();let done=false;
  const finish=v=>{if(done)return;done=true;clearTimeout(timer);im.onload=null;im.onerror=null;resolve(v)};
  const timer=setTimeout(()=>finish("failed"),timeout);
  im.onload=()=>finish("loaded");im.onerror=()=>finish("failed");im.src=url;
 });
}
async function testCardImages(){
 const root=document.getElementById("imageTestResults");if(!root)return;
 const sample=CARDS.slice(0,10);
 if(!sample.length){root.innerHTML=`<p class="muted">No cards loaded. Open Deck Lab or Collection first.</p>`;return}
 root.innerHTML=`<p class="muted">Testing ${sample.length} card images…</p>`;
 let loaded=0,failed=0,missing=0,rows=[];
 for(const c of sample){
   const url=(c.thumbnailImageSources||[])[0]||"";
   const status=await testSingleImage(url);
   if(status==="loaded")loaded++;else if(status==="missing")missing++;else failed++;
   rows.push(`<div class="imgTestRow"><strong>${esc(c.name)}</strong> — <span class="${status==="loaded"?"good":status==="failed"?"bad":"muted"}">${status}</span><br><span class="muted">${esc(url||"No URL")}</span></div>`);
 }
 const blocked=failed===sample.length && sample.length>0;
 root.innerHTML=`<div class="debugGrid" style="margin-top:12px"><div class="metric"><div class="l">Loaded</div><div class="n good">${loaded}</div></div><div class="metric"><div class="l">Failed</div><div class="n bad">${failed}</div></div><div class="metric"><div class="l">Missing URL</div><div class="n">${missing}</div></div></div>${blocked?`<p class="bad">Every tested remote image failed. The remote image host may be blocked or unavailable from this browser/network.</p>`:`<p class="muted">Image loading appears ${loaded>0?"available":"unavailable or incomplete"}.</p>`}${rows.join("")}`;
}


function deckMappingDiagnostics(){
 const verified=ArchetypeService.getArchetypes().filter(a=>Array.isArray(a.sampleDeck)&&a.sampleDeck.length);
 let total=0,resolved=0,unresolved=[];
 verified.forEach(a=>a.sampleDeck.forEach(x=>{
   total+=Number(x.quantity||0);
   const c=getCardForSample(x);
   if(c)resolved+=Number(x.quantity||0);
   else unresolved.push({archetype:a.name,code:x.code||`${x.set}-${x.number}`,name:x.name,set:x.set,number:x.number});
 }));
 const promoTests=[
   {source:"P-A",target:normalizeExternalSetCode("P-A")},
   {source:"P-B",target:normalizeExternalSetCode("P-B")}
 ];
 return `<div class="panel"><h2>Deck Mapping Diagnostics</h2>
 <div class="debugGrid">
  <div class="metric"><div class="l">Verified Archetypes</div><div class="n">${verified.length}</div></div>
  <div class="metric"><div class="l">Cards Required</div><div class="n">${total}</div></div>
  <div class="metric"><div class="l">Cards Resolved</div><div class="n">${resolved}</div></div>
  <div class="metric"><div class="l">Unresolved Entries</div><div class="n">${unresolved.length}</div></div>
 </div>
 <h3>Set Alias Tests</h3>
 ${promoTests.map(t=>`<div class="deckrow"><strong>${esc(t.source)}</strong> → <span class="pill">${esc(t.target)}</span></div>`).join("")}
 <h3>Unresolved Sample Cards</h3>
 ${unresolved.length?unresolved.slice(0,30).map(x=>`<div class="deckrow"><strong>${esc(x.code)}</strong> ${esc(x.name)} <span class="muted">(${esc(x.archetype)})</span></div>`).join(""):`<p class="good">✓ All currently loaded verified sample-deck cards resolve successfully.</p>`}
 <p class="muted tiny">Resolution order: normalized set + card number → card ID → normalized card name.</p>
 </div>`;
}


const STREAM_OVERLAY_STORE="ppc_stream_overlay_v83";
const STREAM_CHANNEL_NAME="ppc-stream-v83";
var streamerOverlayTimer=null,streamerTicker=null,streamerChannel=null,streamerLastOverlaySeen=0,streamerNotice=null;
function initStreamerChannel(){
 if(streamerChannel||typeof BroadcastChannel!=="function")return streamerChannel;
 try{
  streamerChannel=new BroadcastChannel(STREAM_CHANNEL_NAME);
  streamerChannel.onmessage=e=>{
   const d=e.data||{};
   if(d.type==="overlay-ready"||d.type==="overlay-heartbeat"||d.type==="pong"){
    streamerLastOverlaySeen=Date.now();updateStreamerConnectionUI();
   }
   if(d.type==="ping")streamerChannel.postMessage({type:"pong",from:"app",at:Date.now()});
  };
 }catch(e){streamerChannel=null}
 return streamerChannel;
}
function scheduleStreamerOverlayUpdate(){
 clearTimeout(streamerOverlayTimer);
 streamerOverlayTimer=setTimeout(()=>{try{publishStreamerOverlayState()}catch(e){console.warn("Streamer overlay update failed",e)}},80);
}
function activeStreamerSession(){return (state.sessions||[]).find(s=>!s.end)||null}
