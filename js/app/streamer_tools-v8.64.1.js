/* PocketNexus V8.64.1 — Streamer route bundle
   Performance Pass 2D. Loaded only when Streamer is opened. */

function updateStreamerConnectionUI(){
 const el=document.getElementById("streamObsStatus");if(!el)return;
 const supported=typeof BroadcastChannel==="function",connected=supported&&Date.now()-streamerLastOverlaySeen<5500;
 el.className=`obsStatus ${connected?"connected":"waiting"}`;
 el.innerHTML=`<span class="obsDot"></span>${connected?"Overlay Connected":supported?"Waiting for Overlay":"Storage Fallback"}`;
}
function streamerEnsureTicker(){
 clearInterval(streamerTicker);
 streamerTicker=setInterval(()=>{
  if(state.page!=="streamer"){clearInterval(streamerTicker);return}
  const ss=streamerSessionStats(),timer=document.getElementById("streamSessionTimer");if(timer)timer.textContent=ss?formatDuration(ss.durationMs):"00:00:00";
  updateStreamerConnectionUI();
  const ch=initStreamerChannel();if(ch)try{ch.postMessage({type:"ping",from:"app",at:Date.now()})}catch(e){}
 },1000);
 updateStreamerConnectionUI();
}
function streamerDeckChanged(v){state.streamer.controlDeckId=v;state.battlePrefs.lastDeckId=v;save();streamerPage()}
function streamerOpponentChanged(v){state.streamer.controlOpponent=v;save();streamerPage()}
function streamerCustomOpponentChanged(v){state.streamer.customOpponent=v.trim();save();publishStreamerOverlayState();renderStreamerMatchupPanel()}
function streamerTurnOrder(v){state.streamer.controlTurnOrder=v;save();document.querySelectorAll("[data-stream-turn]").forEach(b=>b.classList.toggle("active",b.dataset.streamTurn===v));}
function streamerSessionName(){return state.streamer.sessionType==="Custom"?(state.streamer.sessionCustomName||"Custom Session").trim()||"Custom Session":state.streamer.sessionType||"Ranked Grind"}
function streamerStartSession(){
 if(activeStreamerSession())return ppcNotice("A battle session is already active.");
 const d=streamerCurrentDeck(),rank=currentRankObj();
 state.sessions.push({id:makeId(),start:Date.now(),end:null,deckId:d?.id||"",name:streamerSessionName(),startRank:{tier:rank.tier,points:rank.points}});save();streamerPage();
}
function streamerEndSession(){const s=activeStreamerSession();if(!s)return;s.end=Date.now();save();streamerNotice={kind:"session",text:`Session ended: ${s.name||"Battle Session"}`};streamerPage()}
async function streamerRecordMatch(result){
 const deck=streamerCurrentDeck(),opp=streamerOpponentValue();
 const errors=[];if(!deck)errors.push("Select a saved deck or a Meta deck.");if(!opp)errors.push("Select an opponent archetype or enter Other.");if(!["win","loss"].includes(result))errors.push("Choose Win or Loss.");
 const v=document.getElementById("streamValidation");if(errors.length){if(v)v.innerHTML=`<div class="dangerBox">${errors.map(x=>`<div>• ${esc(x)}</div>`).join("")}</div>`;return}
 const rank=currentRankObj(),active=activeStreamerSession();
 const m={id:makeId(),timestamp:Date.now(),deckId:deck.id,deckName:deck.name,deckArchetype:deck.archetype||"",opponentArchetype:MetaAdapter.normalizeArchetypeName(opp),opponentName:"",result,turnOrder:state.streamer.controlTurnOrder||"unknown",gameMode:"ranked",rankBefore:rank,rankAfter:{tier:"",points:null},rankChange:0,sessionId:active?.id||null,tournament:"",durationMinutes:null,notes:"Recorded from Stream Control Center",tags:["streamer","ranked"]};
 await applyRankedMatchRP(m);
 state.matches.push(m);upsertRankHistory(m);state.battlePrefs.lastDeckId=deck.id;state.streamer.lastRecordedMatchId=m.id;save();streamerNotice={kind:"match",matchId:m.id,result:m.result,deckName:m.deckName,opponent:m.opponentArchetype,rankChange:m.rankChange,rankAfterPoints:m.rankAfter?.points};streamerPage();
}
function streamerUndoLastMatch(){
 const id=state.streamer.lastRecordedMatchId||streamerNotice?.matchId;if(!id)return ppcNotice("There is no recent Stream Control Center match to undo.");
 const idx=state.matches.findIndex(m=>String(m.id)===String(id));if(idx<0)return ppcNotice("That match is no longer in the Battle Log.");
 const m=normalizeMatch(state.matches[idx]);
 PPCUI.open({eyebrow:"STREAM CONTROL",title:"Undo last streamed match?",message:`${esc(m.result.toUpperCase())} — ${esc(m.deckName)} vs ${esc(m.opponentArchetype)}`,actions:[{label:"Cancel",className:"secondary",onclick:"PPCUI.close()"},{label:"Undo Match",className:"danger",onclick:`PPCUI.close();performStreamerUndoLastMatch('${esc(id)}')`}]});
}
function performStreamerUndoLastMatch(id){
 const idx=state.matches.findIndex(m=>String(m.id)===String(id));if(idx<0)return ppcNotice("That match is no longer in the Battle Log.");
 const m=normalizeMatch(state.matches[idx]);state.matches.splice(idx,1);deleteRankHistoryForMatch(id);
 if(Number.isFinite(m.rankAfter?.points)&&Number(state.rank?.points)===Number(m.rankAfter.points)&&Number.isFinite(m.rankBefore?.points)){state.rank={...(state.rank||{}),tier:pocketRankTierFromRP(m.rankBefore.points),points:Number(m.rankBefore.points),streak:Number(m.rankStreakBefore||0)}}
 state.streamer.lastRecordedMatchId=null;save();streamerNotice={kind:"undo",text:"Last streamed match removed."};streamerPage();
}

function streamerRankPointsPreview(value){
 const points=Math.max(0,Math.floor(Number(value)||0)),info=rankProgressFromPoints(points),tier=document.getElementById("streamRankTier"),hint=document.getElementById("streamRankHint");
 if(tier)tier.value=info.tier;
 if(hint)hint.textContent=info.nextTier?`${info.toNext} RP to ${info.nextTier}`:"Master Ball reached — leaderboard position is based on other players.";
}
function streamerSaveRank(){
 const points=Math.max(0,Math.floor(Number(document.getElementById("streamRankPoints")?.value||0)));
 if(!Number.isFinite(points))return ppcNotice("Rank points must be numeric.");
 const tier=rankTierFromPoints(points);state.rank={...(state.rank||{}),tier,points};save();streamerNotice={kind:"rank",text:`Rank updated automatically: ${tier} • ${points} RP`};streamerPage();
}
function streamerMetaInfo(){const opp=streamerOpponentValue();const a=ArchetypeService.getArchetypes().find(x=>x.name===opp);if(!a)return ppcNotice("No curated Meta entry is available for this opponent.");openArchetype(a.id)}
function streamRecordText(r){return `${r.w}-${r.l}${r.n?` • ${r.wr.toFixed(1)}%`:""}`}
function renderStreamerMatchupPanel(){
 const root=document.getElementById("streamMatchupPanel");if(!root)return;const opp=streamerOpponentValue(),mu=streamerMatchupStats(opp),meta=ArchetypeService.getArchetypes().find(a=>a.name===opp);
 root.innerHTML=opp?`<div class="between"><div><span class="muted tiny">PERSONAL MATCHUP</span><h3 style="margin:4px 0">vs ${esc(opp)}</h3></div>${meta?`<button class="secondary smallbtn" onclick="streamerMetaInfo()">View Meta Info</button>`:""}</div><div class="streamMatchupGrid"><div><span>SESSION</span><strong>${streamRecordText(mu.session)}</strong></div><div><span>TODAY</span><strong>${streamRecordText(mu.today)}</strong></div><div><span>LIFETIME</span><strong>${streamRecordText(mu.lifetime)}</strong></div></div>`:`<p class="muted">Select an opponent to see your personal matchup history.</p>`;
}
function testStreamerOverlayUpdate(){const data=publishStreamerOverlayState();ppcNotice(`Overlay test sent. No match was created.\nCurrent deck: ${data.deck.name}`)}


function streamerStats(){
 const d=buildStreamerOverlayState();return {rank:d.rank,record:`${d.record.wins}-${d.record.losses}-${d.record.ties||0}`,winRate:d.record.winRate,streak:d.record.streak,deck:d.deck.name,session:d.session?{w:d.session.wins,l:d.session.losses,t:d.session.ties||0,wr:d.session.winRate,rankChange:d.session.rankChange}:null,recent:d.recent};
}
function streamerOverlayFileUrl(){try{const href=window.location.href;if(href.startsWith("file:"))return href.replace(/index\.html(?:[?#].*)?$/i,"overlay.html");return new URL("overlay.html",href).href}catch(e){return "overlay.html"}}
function updateStreamerSetting(key,value){
 if(["opacity","recentCount","fontScale","sceneSeconds","sceneIndex","casterScoreA","casterScoreB"].includes(key))value=Number(value);else if(["showRank","showRecord","showWinRate","showStreak","showDeck","showSession","showRecent","showOpponent","showMatchup","showTimer","showSessionRP","sceneRotation","persistentHud"].includes(key))value=!!value;
 state.streamer[key]=value;save();renderStreamerPreview();
}
function setStreamerPreset(v){state.streamer.preset=v;save();renderStreamerPreview()}
function streamerMode(v){state.streamer.overlayMode=v;save();streamerPage()}
function streamerSceneToggle(k,v){state.streamer.scenes=state.streamer.scenes||{};state.streamer.scenes[k]=!!v;save();publishStreamerOverlayState()}
function streamerSceneStep(dir){const keys=Object.entries(state.streamer.scenes||{}).filter(x=>x[1]).map(x=>x[0]);if(!keys.length)return;state.streamer.sceneIndex=(Number(state.streamer.sceneIndex||0)+dir+keys.length)%keys.length;save();publishStreamerOverlayState();renderStreamerPreview()}

function streamerPreviewInner(){return renderStreamerOverlayHtml(buildStreamerOverlayState(),false)}
function renderStreamerOverlayHtml(d,forObs=false){
 const cfg=d.config||{},session=d.session,mu=d.matchup||{},recent=cfg.showRecent?`<div class="streamRecent">${(d.recent||[]).map(m=>`<div><span class="${m.result==="win"?"good":m.result==="tie"?"tie":"bad"}">${m.result==="win"?"W":m.result==="tie"?"T":"L"}</span><span>${esc(m.deckName)}</span><span class="muted">vs ${esc(m.opponentArchetype)}</span></div>`).join("")||`<div class="muted">No recent matches</div>`}</div>`:"";
 const opp=cfg.showOpponent&&d.opponent?`<div class="streamSession"><span><small>OPPONENT</small><strong>${esc(d.opponent)}</strong></span>${cfg.showMatchup&&mu.lifetime?`<span>${mu.lifetime.w}-${mu.lifetime.l} lifetime</span>`:""}</div>`:"";
 const sess=cfg.showSession&&session?`<div class="streamSession"><strong>SESSION ${session.wins}-${session.losses}-${session.ties||0}</strong><span>${session.winRate.toFixed(1)}%${cfg.showSessionRP?` • ${session.rankChange>0?"+":""}${session.rankChange} RP`:""}${cfg.showTimer?` • <span class="overlaySessionTimer" data-start="${session.start}">${formatDuration(Date.now()-session.start)}</span>`:""}</span></div>`:"";
 if(cfg.preset==="compact")return `<div class="streamOverlay compact"><strong>${cfg.showRecord?`${d.record.wins}-${d.record.losses}-${d.record.ties||0}`:""}</strong>${cfg.showWinRate?`<span>${d.record.winRate.toFixed(1)}%</span>`:""}${cfg.showStreak?`<span>${d.record.streak}</span>`:""}${cfg.showRank?`<span>${esc(d.rank.tier)} ${d.rank.points} RP</span>`:""}${cfg.showOpponent&&d.opponent?`<span>vs ${esc(d.opponent)}</span>`:""}</div>`;
 if(cfg.preset==="minimal")return `<div class="streamOverlay minimal">${cfg.showRank?`<strong>${esc(d.rank.tier)}</strong><span>${d.rank.points} RP</span>`:""}${cfg.showDeck?`<small>${esc(d.deck.name)}</small>`:""}</div>`;
 return `<div class="streamOverlay full"><div class="streamTop">${cfg.showRank?`<div><span class="muted">RANK</span><strong>${esc(d.rank.tier)}</strong><span>${d.rank.points} RP</span></div>`:""}${cfg.showDeck?`<div><span class="muted">CURRENT DECK</span><strong>${esc(d.deck.name)}</strong>${d.deck.energy?`<span>${esc(d.deck.energy)}</span>`:""}</div>`:""}</div><div class="streamStats">${cfg.showRecord?`<div><span>RECORD</span><strong>${d.record.wins}-${d.record.losses}</strong></div>`:""}${cfg.showWinRate?`<div><span>WIN RATE</span><strong>${d.record.winRate.toFixed(1)}%</strong></div>`:""}${cfg.showStreak?`<div><span>STREAK</span><strong>${d.record.streak}</strong></div>`:""}</div>${sess}${opp}${recent}</div>`;
}
function renderStreamerPreview(){const root=document.getElementById("streamPreview");if(!root)return;const cfg=state.streamer;root.className=`streamPreview theme-${cfg.theme}`;root.style.opacity=String(Math.max(.1,Math.min(1,(cfg.opacity||85)/100)));root.style.setProperty("--stream-scale",String((cfg.fontScale||100)/100));root.innerHTML=streamerPreviewInner()}
function copyOverlayPath(){const u=streamerOverlayFileUrl();if(navigator.clipboard?.writeText){navigator.clipboard.writeText(u).then(()=>ppcNotice("Overlay source copied."),()=>copyFallbackDialog(u,"Copy OBS browser-source path"));}else copyFallbackDialog(u,"Copy OBS browser-source path")}

function streamerPage(){
 const c=state.streamer,d=streamerCurrentDeck(),active=activeStreamerSession(),ss=streamerSessionStats(),rank=currentRankObj(),opp=c.controlOpponent||"",other=opp==="__other__";
 if(!c.controlDeckId&&state.decks[0])c.controlDeckId=state.decks[0].id;
 document.getElementById("app").innerHTML=`<div class="between"><div><h1>Stream Control Center 3.0</h1><p class="muted">Ranked • Tournament • Caster scenes + OBS tools</p></div><span class="badge">V8.50 RC1</span></div>
 <div class="panel"><div class="between"><div><span class="muted tiny">OVERLAY MODE</span><h2 style="margin:4px 0">${c.overlayMode==="tournament"?"Tournament Mode":c.overlayMode==="caster"?"Caster Mode":"Ranked Mode"}</h2></div><div class="segmented"><button class="${c.overlayMode==="ranked"?"active":""}" onclick="streamerMode('ranked')">Ranked</button><button class="${c.overlayMode==="tournament"?"active":""}" onclick="streamerMode('tournament')">Tournament</button><button class="${c.overlayMode==="caster"?"active":""}" onclick="streamerMode('caster')">Caster</button></div></div>${c.overlayMode==="tournament"?`<div class="form3"><div><label>Event</label><input value="${esc(c.tournamentName||"")}" onchange="updateStreamerSetting('tournamentName',this.value)" placeholder="Tournament name"></div><div><label>Round</label><input value="${esc(c.tournamentRound||"Round 1")}" onchange="updateStreamerSetting('tournamentRound',this.value)"></div><div><label>Record / Stage</label><input value="${esc(c.tournamentRecord||"0-0")}" onchange="updateStreamerSetting('tournamentRecord',this.value)"><input value="${esc(c.tournamentStage||"Swiss")}" onchange="updateStreamerSetting('tournamentStage',this.value)" style="margin-top:6px"></div></div>`:""}${c.overlayMode==="caster"?`<div class="form3"><div><label>Player A</label><input value="${esc(c.casterA||"Player A")}" onchange="updateStreamerSetting('casterA',this.value)"></div><div><label>Score</label><div class="row"><input type="number" min="0" value="${Number(c.casterScoreA||0)}" onchange="updateStreamerSetting('casterScoreA',this.value)"><input type="number" min="0" value="${Number(c.casterScoreB||0)}" onchange="updateStreamerSetting('casterScoreB',this.value)"></div></div><div><label>Player B</label><input value="${esc(c.casterB||"Player B")}" onchange="updateStreamerSetting('casterB',this.value)"></div></div>`:""}</div>
 ${streamerNotice?`<div class="${streamerNotice.kind==="undo"?"notice":"successBox"} streamNotice"><strong>${streamerNotice.kind==="match"?"Match recorded":esc(streamerNotice.text||"Updated")}</strong>${streamerNotice.kind==="match"?`<div>${streamerNotice.result==="win"?"WIN":"LOSS"} — ${esc(streamerNotice.deckName)} vs ${esc(streamerNotice.opponent)} • ${streamerNotice.rankChange>0?"+":""}${Number(streamerNotice.rankChange||0)} RP • ${Number(streamerNotice.rankAfterPoints||state.rank?.points||0)} RP total</div><button class="secondary smallbtn" style="margin-top:8px" onclick="streamerUndoLastMatch()">Undo</button>`:""}</div>`:""}
 <div class="streamControlGrid">
  <div>
   <div class="panel streamLivePanel"><div class="between"><div><span class="muted tiny">LIVE SESSION</span><h2 style="margin:4px 0">${active?esc(active.name||"Battle Session"):"No active session"}</h2></div><div class="streamClock" id="streamSessionTimer">${ss?formatDuration(ss.durationMs):"00:00:00"}</div></div>
    ${active?`<button class="danger" onclick="streamerEndSession()">End Session</button>`:`<div class="form2"><div><label>Session Type</label><select onchange="state.streamer.sessionType=this.value;save();streamerPage()">${["Ranked Grind","Tournament Practice","Deck Testing","Casual","Custom"].map(x=>`<option ${c.sessionType===x?"selected":""}>${x}</option>`).join("")}</select></div><div>${c.sessionType==="Custom"?`<label>Custom Name</label><input value="${esc(c.sessionCustomName||"")}" oninput="state.streamer.sessionCustomName=this.value;safeStorageSet(STORE,JSON.stringify(state))" placeholder="Stream session">`:`<label>&nbsp;</label><button onclick="streamerStartSession()" style="width:100%">Start Session</button>`}</div></div>${c.sessionType==="Custom"?`<button onclick="streamerStartSession()">Start Session</button>`:""}`}
   </div>
   <div class="panel"><h2>Quick Match</h2><label>Current Deck</label><select onchange="streamerDeckChanged(this.value)"><option value="">Select deck…</option>${matchDeckOptions(c.controlDeckId)}</select>${d?`<div class="streamDeckSummary"><strong>${esc(d.name)}</strong>${d.energy?`<span class="pill">${esc(d.energy)}</span>`:""}</div>`:`<p class="muted">Choose one of your decks or select a ready-to-use deck from the Meta.</p>`}
    <label>Opponent Archetype</label><select onchange="streamerOpponentChanged(this.value)">${battleArchetypeOptions(opp)}</select>
    <div class="${other?"":"hidden"}"><label>Custom Archetype</label><input value="${esc(c.customOpponent||"")}" oninput="streamerCustomOpponentChanged(this.value)" placeholder="Type opponent deck"></div>
    <label>Turn Order</label><div class="segmented streamTurns"><button data-stream-turn="first" class="${c.controlTurnOrder==="first"?"active":""}" onclick="streamerTurnOrder('first')">Went First</button><button data-stream-turn="second" class="${c.controlTurnOrder==="second"?"active":""}" onclick="streamerTurnOrder('second')">Went Second</button><button data-stream-turn="unknown" class="${c.controlTurnOrder==="unknown"?"active":""}" onclick="streamerTurnOrder('unknown')">Unknown</button></div>
    <div class="streamResultButtons"><button class="streamWin" onclick="streamerRecordMatch('win')">✓ WIN</button><button class="streamLoss" onclick="streamerRecordMatch('loss')">✕ LOSS</button></div><div id="streamValidation"></div>
   </div>
   <div class="panel" id="streamMatchupPanel"></div>
  </div>
  <div>
   <div class="panel"><h2>Session Performance</h2>${ss?`<div class="metricgrid"><div class="metric"><div class="l">Record</div><div class="n">${ss.w}-${ss.l}</div></div><div class="metric"><div class="l">Win Rate</div><div class="n">${ss.wr.toFixed(1)}%</div></div><div class="metric"><div class="l">Streak</div><div class="n">${esc(ss.streak)}</div></div><div class="metric"><div class="l">Best W Streak</div><div class="n">W${ss.bestWin}</div></div><div class="metric"><div class="l">RP</div><div class="n">${ss.rankChange>0?"+":""}${ss.rankChange}</div></div><div class="metric"><div class="l">Matches</div><div class="n">${ss.n}</div></div></div>`:`<p class="muted">Start a session to track stream-specific performance.</p>`}</div>
   <div class="panel"><div class="between"><div><h2>Current Rank</h2><p class="muted tiny">Enter your RP and PocketNexus calculates the rank automatically.</p></div></div><div class="form2"><div><label>Rank</label><input id="streamRankTier" value="${esc(rankTierFromPoints(rank.points))}" readonly aria-readonly="true"></div><div><label>RP</label><input id="streamRankPoints" type="number" min="0" value="${rank.points}" oninput="streamerRankPointsPreview(this.value)"></div></div><p id="streamRankHint" class="muted tiny">${(()=>{const x=rankProgressFromPoints(rank.points);return x.nextTier?`${x.toNext} RP to ${x.nextTier}`:"Master Ball reached — leaderboard position is based on other players."})()}</p><button class="secondary" onclick="streamerSaveRank()">Update RP</button></div>
   <div class="panel"><h2>Recent Matches</h2><div class="streamRecentControl">${completedMatches().sort((a,b)=>b.timestamp-a.timestamp).slice(0,Math.max(1,Math.min(10,Number(c.recentCount||5)))).map(m=>`<div><span class="resultPill ${m.result}">${m.result==="win"?"W":"L"}</span><span><strong>${esc(m.opponentArchetype)}</strong><small>${esc(m.deckName)} • ${m.turnOrder==="first"?"First":m.turnOrder==="second"?"Second":"Unknown"}${m.rankChange?` • ${m.rankChange>0?"+":""}${m.rankChange} RP`:""}</small></span></div>`).join("")||`<p class="muted">No matches recorded yet.</p>`}</div></div>
   <div class="panel"><div class="between"><div><h2>OBS</h2><div id="streamObsStatus" class="obsStatus waiting"><span class="obsDot"></span>Waiting for Overlay</div></div><div class="row"><button class="secondary" onclick="copyOverlayPath()">Copy OBS Source</button><button class="secondary" onclick="window.open('overlay.html','_blank')">Open Overlay</button></div></div><div id="streamPreview" class="streamPreview" style="margin-top:12px"></div></div>
  </div>
 </div>
 <div class="panel"><div class="between"><div><h2>Scene Rotation</h2><p class="muted tiny">Only checked scenes rotate on OBS.</p></div><div class="row"><button class="secondary smallbtn" onclick="streamerSceneStep(-1)">← Scene</button><button class="secondary smallbtn" onclick="streamerSceneStep(1)">Scene →</button></div></div><div class="streamToggles"><label><input type="checkbox" ${c.persistentHud!==false?"checked":""} onchange="updateStreamerSetting('persistentHud',this.checked)"> Persistent HUD</label>${[["rank","Rank"],["graph","RP Graph"],["deck","Current Deck"],["decklist","20-Card List"],["qr","Deck QR"],["lastmatch","Last Match"],["matchup","Matchup"],["tournament","Tournament/Caster"]].map(([k,n])=>`<label><input type="checkbox" ${c.scenes?.[k]!==false?"checked":""} onchange="streamerSceneToggle('${k}',this.checked)"> ${n}</label>`).join("")}</div><div class="form2"><label><input type="checkbox" ${c.sceneRotation!==false?"checked":""} onchange="updateStreamerSetting('sceneRotation',this.checked)"> Auto rotate scenes</label><div><label>Seconds per scene</label><select onchange="updateStreamerSetting('sceneSeconds',this.value)">${[5,10,15,30].map(x=>`<option value="${x}" ${Number(c.sceneSeconds||10)===x?"selected":""}>${x}s</option>`).join("")}</select></div></div></div>
 <div class="panel"><h2>Overlay Settings</h2><div class="form3"><div><label>Layout</label><select onchange="setStreamerPreset(this.value)"><option value="full" ${c.preset==="full"?"selected":""}>Full</option><option value="compact" ${c.preset==="compact"?"selected":""}>Compact</option><option value="minimal" ${c.preset==="minimal"?"selected":""}>Minimal</option></select></div><div><label>Theme</label><select onchange="updateStreamerSetting('theme',this.value)"><option value="dark" ${c.theme==="dark"?"selected":""}>Dark</option><option value="light" ${c.theme==="light"?"selected":""}>Light</option><option value="transparent" ${c.theme==="transparent"?"selected":""}>Transparent</option></select></div><div><label>Recent Matches</label><select onchange="updateStreamerSetting('recentCount',this.value)">${[3,5,8,10].map(x=>`<option value="${x}" ${Number(c.recentCount)===x?"selected":""}>${x}</option>`).join("")}</select></div></div><div class="streamToggles">${[["showRank","Rank"],["showRecord","Record"],["showWinRate","Win Rate"],["showStreak","Streak"],["showDeck","Current Deck"],["showSession","Session"],["showTimer","Session Timer"],["showSessionRP","Session RP"],["showOpponent","Opponent"],["showMatchup","Matchup"],["showRecent","Recent Matches"]].map(([k,n])=>`<label><input type="checkbox" ${c[k]!==false?"checked":""} onchange="updateStreamerSetting('${k}',this.checked)"> ${n}</label>`).join("")}</div></div>
 <div class="panel"><h2>Streamer Diagnostics</h2><div class="row"><button onclick="testStreamerOverlayUpdate()">Test Overlay Update</button><button class="secondary" onclick="state.page='more';render()">Open Full Diagnostics</button></div><p class="muted tiny">Test Overlay Update does not create a match.</p></div>
 <p class="bottomnote">PocketNexus is an independent third-party Pokémon TCG Pocket companion. It does not read live match, opponent, or rank data directly from the game; streamer data is manually tracked here.</p>`;
 renderStreamerPreview();renderStreamerMatchupPanel();publishStreamerOverlayState();streamerEnsureTicker();streamerNotice=null;
}

// V8.46.2 — Streamer Overlay 3.0 dedicated Supabase cloud sync.
let streamerCloudTimer=null,streamerCloudBusy=false,streamerCloudStatus="local",streamerCloudLastAt="",streamerCloudError="";
function streamerCloudPreferencesPayload(){
 const s=state.streamer||{};
 return {mode:s.overlayMode||"ranked",enabled_scenes:Object.entries(s.scenes||{}).filter(([,v])=>v).map(([k])=>k),scene_order:Object.keys(s.scenes||{}),rotation_seconds:Number(s.sceneSeconds||10),auto_rotate:s.sceneRotation!==false,persistent_hud:true,layout:s.preset||"full",theme:s.theme||"dark",settings:{opacity:Number(s.opacity||85),fontScale:Number(s.fontScale||100),recentCount:Number(s.recentCount||5)}};
}
function applyStreamerCloudPreferences(row){
 if(!row)return;const s=state.streamer||(state.streamer={});
 s.overlayMode=row.mode||s.overlayMode||"ranked";s.sceneSeconds=Number(row.rotation_seconds||s.sceneSeconds||10);s.sceneRotation=row.auto_rotate!==false;s.preset=row.layout||s.preset||"full";s.theme=row.theme||s.theme||"dark";
 const enabled=new Set(Array.isArray(row.enabled_scenes)?row.enabled_scenes:[]),order=Array.isArray(row.scene_order)?row.scene_order:[];if(order.length)s.scenes=Object.fromEntries(order.map(k=>[k,enabled.has(k)]));
 const x=row.settings||{};if(x.opacity!=null)s.opacity=Number(x.opacity);if(x.fontScale!=null)s.fontScale=Number(x.fontScale);if(x.recentCount!=null)s.recentCount=Number(x.recentCount);
}
function streamerTournamentCloudPayload(){const s=state.streamer||{},deck=streamerCurrentDeck();return {event_name:s.tournamentName||"Tournament",stage:String(s.tournamentStage||"Swiss").toLowerCase(),current_round:s.tournamentRound||"Round 1",deck_local_id:deck?.id||null,deck_name:deck?.name||null,wins:Number(String(s.tournamentRecord||"0-0").split("-")[0]||0),losses:Number(String(s.tournamentRecord||"0-0").split("-")[1]||0),overlay_state:buildStreamerOverlayState(),status:"active"}}
function streamerCasterCloudPayload(){const s=state.streamer||{};return {event_name:s.tournamentName||"Tournament",round_label:s.tournamentRound||"Round 1",stage:s.tournamentStage||"Swiss",player_a:s.casterA||"Player A",player_b:s.casterB||"Player B",score_a:Number(s.casterScoreA||0),score_b:Number(s.casterScoreB||0),best_of:3,overlay_state:buildStreamerOverlayState(),status:"active"}}
async function syncStreamerCloud({initial=false}={}){
 if(!cloudClient||!cloudSession?.user||streamerCloudBusy)return false;streamerCloudBusy=true;streamerCloudStatus="syncing";streamerCloudError="";
 try{
  if(initial){const {data,error}=await cloudClient.rpc("get_my_streamer_overlay_preferences");if(error)throw error;const row=Array.isArray(data)?data[0]:data;if(row){applyStreamerCloudPreferences(row);safeStorageSet(STORE,JSON.stringify(state));}}
  let r=await cloudClient.rpc("set_my_streamer_overlay_preferences",{p_preferences:streamerCloudPreferencesPayload()});if(r.error)throw r.error;
  const mode=state.streamer?.overlayMode||"ranked";
  if(mode==="tournament"){r=await cloudClient.rpc("upsert_my_streamer_tournament_session",{p_local_id:"active-tournament",p_payload:streamerTournamentCloudPayload()});if(r.error)throw r.error}
  if(mode==="caster"){r=await cloudClient.rpc("upsert_my_streamer_caster_session",{p_local_id:"active-caster",p_payload:streamerCasterCloudPayload()});if(r.error)throw r.error}
  streamerCloudStatus="synced";streamerCloudLastAt=new Date().toISOString();return true;
 }catch(e){streamerCloudStatus=(typeof navigator!=="undefined"&&navigator.onLine===false)?"offline":"error";streamerCloudError=e?.message||String(e);console.warn("Streamer Cloud Sync V8.46.2 failed",e);return false}finally{streamerCloudBusy=false}
}
function scheduleStreamerCloudSync(){if(!cloudClient||!cloudSession?.user)return;clearTimeout(streamerCloudTimer);streamerCloudTimer=setTimeout(()=>syncStreamerCloud(),900)}
window.syncStreamerCloud=syncStreamerCloud;

// Re-attach eager expansion UI after this lazy bundle registers streamerPage.
if(typeof window.PPCStreamerExpansionEnhance==='function'&&typeof window.streamerPage==='function'){
 const ppcBaseStreamerPage=window.streamerPage;
 window.streamerPage=function(){const out=ppcBaseStreamerPage.apply(this,arguments);window.PPCStreamerExpansionEnhance?.();return out};
}
