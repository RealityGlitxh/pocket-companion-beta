function streamerCurrentDeck(){
 const id=state.streamer?.controlDeckId||state.battlePrefs?.lastDeckId||state.decks?.[0]?.id||"";
 return typeof resolveSelectableDeck==="function"?resolveSelectableDeck(id):(state.decks.find(d=>d.id===id)||null);
}
function streamerOpponentValue(){
 const v=state.streamer?.controlOpponent||"";
 return v==="__other__"?(state.streamer.customOpponent||"").trim():v;
}
function streamerMatchupStats(opponent=streamerOpponentValue()){
 if(!opponent)return {session:wl([]),today:wl([]),lifetime:wl([])};
 const norm=MetaAdapter?.normalizeArchetypeName?MetaAdapter.normalizeArchetypeName(opponent):opponent;
 const all=completedMatches().filter(m=>m.opponentArchetype===norm);
 const todayStart=new Date();todayStart.setHours(0,0,0,0);
 const active=activeStreamerSession();
 return {
  lifetime:wl(all),
  today:wl(all.filter(m=>m.timestamp>=todayStart.getTime())),
  session:wl(active?all.filter(m=>m.sessionId===active.id):[])
 };
}
function streamerSessionStats(){
 const s=activeStreamerSession();
 if(!s)return null;
 const ms=completedMatches().filter(m=>m.sessionId===s.id).sort((a,b)=>a.timestamp-b.timestamp),r=wl(ms),st=streakInfo(ms);
 return {session:s,...r,streak:st.type==="none"?"—":`${st.type==="win"?"W":"L"}${st.count}`,bestWin:st.bestWin,rankChange:ms.reduce((n,m)=>n+Number(m.rankChange||0),0),durationMs:Math.max(0,Date.now()-Number(s.start||Date.now()))};
}
function formatDuration(ms){
 const sec=Math.max(0,Math.floor(Number(ms||0)/1000)),h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;
 return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}
function streamerDeckCards(deck){
 const raw=deck?.cards||deck?.list||deck?.cardIds||[];
 const decorate=x=>{
  const base=typeof x==="string"?{id:x,name:x,qty:1}:{id:x.id||x.cardId||x.card_id||"",name:x.name||x.cardName||x.id||"Card",qty:Number(x.qty||x.quantity||x.count||1)};
  let card=null;try{card=(typeof getCardById==="function"&&getCardById(base.id))||(typeof getCardByName==="function"&&getCardByName(base.name))||null}catch(_){}
  return {...base,image:card?.thumbnailImageSources?.[0]||card?.thumbnailUrl||card?.image||card?.fullImageUrl||""};
 };
 if(Array.isArray(raw))return raw.map(decorate).slice(0,20);
 if(raw&&typeof raw==="object")return Object.entries(raw).map(([id,qty])=>decorate({id,name:id,qty:Number(qty||1)})).slice(0,20);
 return [];
}
function streamerRPJourney(){
 const active=activeStreamerSession(),rows=(state.rankHistory||[]).filter(x=>!active||Number(x.timestamp||x.at||0)>=Number(active.start||0)).sort((a,b)=>Number(a.timestamp||a.at||0)-Number(b.timestamp||b.at||0));
 const pts=rows.map(x=>Number(x.points??x.rankAfter?.points??x.rp??NaN)).filter(Number.isFinite);
 if(active?.startRank?.points!=null)pts.unshift(Number(active.startRank.points));
 if(!pts.length)pts.push(Number(currentRankObj().points||0));
 return pts.slice(-30);
}
function buildStreamerOverlayState(){
 const ms=completedMatches().sort((a,b)=>b.timestamp-a.timestamp),overall=wl(ms),st=streakInfo(ms),rank=currentRankObj(),deck=streamerCurrentDeck(),session=streamerSessionStats(),opp=streamerOpponentValue(),mu=streamerMatchupStats(opp),cfg=state.streamer||{},last=ms[0]||null;
 return {
  version:"8.50-rc1",updatedAt:Date.now(),config:{preset:cfg.preset||"full",theme:cfg.theme||"dark",opacity:Number(cfg.opacity||85),fontScale:Number(cfg.fontScale||100),recentCount:Number(cfg.recentCount||5),showRank:cfg.showRank!==false,showRecord:cfg.showRecord!==false,showWinRate:cfg.showWinRate!==false,showStreak:cfg.showStreak!==false,showDeck:cfg.showDeck!==false,showSession:cfg.showSession!==false,showRecent:cfg.showRecent!==false,showOpponent:cfg.showOpponent!==false,showMatchup:cfg.showMatchup!==false,showTimer:cfg.showTimer!==false,showSessionRP:cfg.showSessionRP!==false,overlayMode:cfg.overlayMode||"ranked",sceneRotation:cfg.sceneRotation!==false,sceneSeconds:Number(cfg.sceneSeconds||10),sceneIndex:Number(cfg.sceneIndex||0),persistentHud:cfg.persistentHud!==false,scenes:cfg.scenes||{}},
  deck:{id:deck?.id||"",name:deck?.name||"—",energy:deck?.energy||"",archetype:deck?.archetype||"",cards:streamerDeckCards(deck),shareUrl:state.streamer?.deckShareUrl||deck?.shareUrl||deck?.url||""},
  record:{wins:overall.w,losses:overall.l,ties:overall.t,winRate:overall.wr,streak:st.type==="none"?"—":`${st.type==="win"?"W":"L"}${st.count}`},rank:{tier:rank.tier||"Unranked",points:Number(rank.points||0)},rpJourney:streamerRPJourney(),opponent:opp||"",matchup:{session:mu.session,today:mu.today,lifetime:mu.lifetime},
  session:session?{id:session.session.id,name:session.session.name||"Battle Session",start:Number(session.session.start||0),wins:session.w,losses:session.l,ties:session.t,winRate:session.wr,streak:session.streak,bestWin:session.bestWin,rankChange:session.rankChange}:null,
  lastMatch:last?{result:last.result,deckName:last.deckName,opponentArchetype:last.opponentArchetype,rankChange:Number(last.rankChange||0),rankAfter:Number(last.rankAfter?.points||rank.points||0)}:null,
  tournament:{name:cfg.tournamentName||"Tournament",round:cfg.tournamentRound||"Round 1",record:cfg.tournamentRecord||"0-0",stage:cfg.tournamentStage||"Swiss"},caster:{a:cfg.casterA||"Player A",b:cfg.casterB||"Player B",scoreA:Number(cfg.casterScoreA||0),scoreB:Number(cfg.casterScoreB||0)},
  recent:ms.slice(0,Math.max(1,Math.min(10,Number(cfg.recentCount||5)))).map(m=>({id:m.id,result:m.result,deckName:m.deckName,opponentArchetype:m.opponentArchetype,turnOrder:m.turnOrder,rankChange:Number(m.rankChange||0),timestamp:m.timestamp}))
 };
}
function publishStreamerOverlayState(){
 const data=buildStreamerOverlayState();
 safeStorageSet(STREAM_OVERLAY_STORE,JSON.stringify(data));
 const ch=initStreamerChannel();if(ch)try{ch.postMessage({type:"state",data})}catch(e){}
 return data;
}
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
const PPC_RANK_THRESHOLDS=[
 {min:0,tier:"Beginner 1"},{min:20,tier:"Beginner 2"},{min:50,tier:"Beginner 3"},{min:80,tier:"Beginner 4"},
 {min:110,tier:"Poké Ball 1"},{min:140,tier:"Poké Ball 2"},{min:170,tier:"Poké Ball 3"},{min:210,tier:"Poké Ball 4"},
 {min:250,tier:"Great Ball 1"},{min:290,tier:"Great Ball 2"},{min:330,tier:"Great Ball 3"},{min:380,tier:"Great Ball 4"},
 {min:440,tier:"Ultra Ball 1"},{min:510,tier:"Ultra Ball 2"},{min:590,tier:"Ultra Ball 3"},{min:690,tier:"Ultra Ball 4"},
 {min:810,tier:"Master Ball"}
];
function rankTierFromPoints(points){
 const rp=Math.max(0,Math.floor(Number(points)||0));
 let rank=PPC_RANK_THRESHOLDS[0];
 for(const row of PPC_RANK_THRESHOLDS){if(rp>=row.min)rank=row;else break}
 return rank.tier;
}
function rankProgressFromPoints(points){
 const rp=Math.max(0,Math.floor(Number(points)||0));
 let index=0;for(let i=0;i<PPC_RANK_THRESHOLDS.length;i++){if(rp>=PPC_RANK_THRESHOLDS[i].min)index=i;else break}
 const current=PPC_RANK_THRESHOLDS[index],next=PPC_RANK_THRESHOLDS[index+1]||null;
 return {tier:current.tier,nextTier:next?.tier||null,nextMin:next?.min??null,toNext:next?Math.max(0,next.min-rp):0};
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


function fullDiagnosticResults(){
 const checks=[];const add=(name,ok,detail="")=>checks.push({name,ok:!!ok,detail});
 add("State object",!!state&&typeof state==="object");
 add("Valid page",VALID_PAGES.has(state.page),state.page);
 add("Deck array",Array.isArray(state.decks),`${state.decks?.length||0} decks`);
 add("Match array",Array.isArray(state.matches),`${state.matches?.length||0} matches`);
 add("Unique deck IDs",new Set((state.decks||[]).map(x=>x.id)).size===(state.decks||[]).length);
 add("Unique match IDs",new Set((state.matches||[]).map(x=>x.id)).size===(state.matches||[]).length);
 add("Selected deck reference",!state.selected||(state.decks||[]).some(d=>d.id===state.selected),state.selected||"none");
 add("Card database mode",["idle","loading","online","fallback"].includes(window.cardLoadMode),window.cardLoadMode);
 add("Card page size",CARD_PAGE_SIZE===48,String(CARD_PAGE_SIZE));
 add("Archetype library",ArchetypeService.getArchetypes().length>=30,`${ArchetypeService.getArchetypes().length} archetypes`);
 add("20-card archetype samples",ArchetypeService.getArchetypes().filter(a=>validateSampleDeck(a).valid).length===ArchetypeService.getArchetypes().length);
 add("Storage",storageAvailable,storageAvailable?"localStorage available":"memory fallback active");
 add("Cloud config",cloudConfigured(),cloudConfigured()?"configured":"optional / not configured");
 add("Cloud runtime",typeof scheduleCloudSync==="function");
 add("Streamer control state",!!state.streamer&&typeof state.streamer==="object");
 add("Streamer deck reference",!state.streamer?.controlDeckId||state.decks.some(d=>d.id===state.streamer.controlDeckId),state.streamer?.controlDeckId||"none");
 add("Streamer archetype library",ArchetypeService.getArchetypes().length>=30,`${ArchetypeService.getArchetypes().length} archetypes`);
 add("Overlay state publisher",typeof publishStreamerOverlayState==="function");
 add("BroadcastChannel",typeof BroadcastChannel==="function",typeof BroadcastChannel==="function"?"supported":"storage fallback available");
 add("Overlay file URL",typeof streamerOverlayFileUrl==="function",streamerOverlayFileUrl());
 add("Rank Border service",!!window.PPCRankBorderService,"rank-border-live reader");
 add("Rank Border page",typeof rankBorderPage==="function");
 add("Rank Border cache",typeof window.PPCRankBorderService?.getCached==="function","5-minute client cache");
 // V8.19 pre-public regression gates for the three most recent connected systems.
 add("Collection → Deck Lab integration",typeof deckCollectionStatus==="function"&&typeof openMissingCards==="function"&&typeof addAllMissingToWishlist==="function","V8.16 live calculations");
 add("Better Battle Tracker",typeof quickRecordResult==="function"&&typeof quickRematch==="function"&&typeof undoLastBattleMatch==="function","V8.17 quick record/rematch/undo");
 add("First-time onboarding",!!state.onboarding&&typeof onboardingRender==="function"&&typeof onboardingRestart==="function","V8.18 six-step setup");
 add("Personal Meta",typeof personalMetaMatrixHtml==="function","V8.14 feature present");
 add("Tournament Prep",typeof tournamentPrepHtml==="function","V8.15 feature present");
 add("Rank season lifecycle safeguard",typeof rankSeasonLifecycle==="function","V8.19.2 frontend expiry detection");
 add("Pre-public environment runner",typeof runPrePublicEnvironmentTests==="function","non-destructive live-browser checks");
 return checks;
}

function runImportCompatibilityTests(){
 const tests=[
  ["Speed","X Speed"],
  ["X-Speed","X Speed"],
  ["XSpeed","X Speed"],
  ["Research","Professor's Research"],
  ["Professor’s Research","Professor's Research"],
  ["Poke Ball","Poké Ball"],
  ["Pokemon Center Lady","Pokémon Center Lady"]
 ];
 return tests.map(([input,expected])=>{
   const c=getCardByName(canonicalImportName(input));
   return {input,expected,actual:c?.name||null,pass:!!c&&importedNameMatches(expected,c.name)};
 });
}


// V8.8 Rank Border Intelligence

// Performance Pass 2D: Rank Intelligence UI moved to
// js/app/rank_tools-v8.64.1.js and is loaded on demand by the route loader.

async function runPrePublicEnvironmentTests(){
 const root=document.getElementById("app");if(!root)return;
 root.innerHTML=`<div class="between"><div><h1>Pre-Public Environment Tests</h1><p class="muted">Live-browser checks. These checks do not create, edit, upload, restore, or delete user data.</p></div><button class="secondary" onclick="state.page='more';render()">← Back</button></div><div class="panel" id="prePublicResults"><p class="muted">Running environment checks…</p></div>`;
 const checks=[];const add=(name,status,detail="")=>checks.push({name,status,detail});
 add("Viewport / responsive shell",document.documentElement.scrollWidth<=window.innerWidth+2?"PASS":"FAIL",`${window.innerWidth}×${window.innerHeight}; page width ${document.documentElement.scrollWidth}px`);
 add("Touch-friendly environment",("ontouchstart" in window)||navigator.maxTouchPoints>0?"INFO":"INFO",navigator.maxTouchPoints?`${navigator.maxTouchPoints} touch point(s) reported`:"Desktop/non-touch browser reported");
 add("Keyboard events",typeof KeyboardEvent==="function"?"PASS":"FAIL","Escape, Tab, Enter and Space are available to the browser runtime");
 add("Local storage",storageAvailable?"PASS":"WARN",storageAvailable?"Persistent browser storage available":"Memory fallback only");
 add("Online state",navigator.onLine?"PASS":"WARN",navigator.onLine?"Browser reports online":"Browser reports offline");
 add("Supabase configuration",cloudConfigured()?"PASS":"FAIL",cloudConfigured()?"Project URL + publishable key configured":"Missing project configuration");
 add("Supabase SDK",window.supabase?.createClient?"PASS":"FAIL",window.supabase?.createClient?"SDK loaded":"SDK unavailable (network/CSP/file loading issue)");
 try{
   initCloudAuth();
   if(cloudClient){
     const {data,error}=await cloudClient.auth.getSession();
     add("Supabase Auth request",error?"FAIL":"PASS",error?error.message:(data?.session?"Authenticated session detected":"Auth endpoint reachable; no signed-in session"));
   }else add("Supabase Auth request","FAIL","Client could not initialize");
 }catch(e){add("Supabase Auth request","FAIL",e?.message||String(e))}
 try{
   const svc=rankBorderService();
   if(svc?.refresh){await svc.refresh();const d=svc.getData?.();const life=rankSeasonLifecycle(d?.season||{});add("Rank service request",d?"PASS":"WARN",d?`${d.season?.name||"Season"} • ${life.label}`:"No rank payload returned");}
   else add("Rank service request","WARN","Rank service unavailable in this runtime");
 }catch(e){add("Rank service request","WARN",e?.message||String(e))}
 add("Onboarding escape handler",typeof onboardingSkip==="function"?"PASS":"FAIL","Onboarding can be dismissed without trapping the user");
 add("Backup before local restore",/backupAllData\(\)/.test(performPastedBackupRestore.toString())&&/makeLocalCloudBackup/.test(performPastedBackupRestore.toString())?"PASS":"FAIL","Local restore creates both a download and a recoverable browser restore point first");
 add("Backup before cloud restore",/makeLocalCloudBackup/.test(performCloudReplace.toString())&&/makeLocalCloudBackup/.test(performCloudSafeMerge.toString())?"PASS":"FAIL","Cloud replace and safe merge save a local recovery point first");
 add("Match delete confirmation",/PPCUI\.open/.test(deleteMatch.toString())?"PASS":"FAIL","Delete Match requires an in-app confirmation dialog");
 add("Undo scope",/battleSaveNotice\?\.matchId/.test(undoLastBattleMatch.toString())?"PASS":"FAIL","Undo targets only the just-recorded match ID");
 const r=document.getElementById("prePublicResults");if(!r)return;
 const fail=checks.filter(x=>x.status==="FAIL").length,warn=checks.filter(x=>x.status==="WARN").length;
 r.innerHTML=`<div class="between"><div><h2>Environment Results</h2><p class="muted">${checks.length} checks • ${fail} failed • ${warn} warning(s)</p></div><span class="badge">${fail?"NOT READY":warn?"REVIEW":"PASS"}</span></div>${checks.map(x=>`<div class="switch"><span><strong>${esc(x.name)}</strong>${x.detail?`<div class="muted tiny">${esc(x.detail)}</div>`:""}</span><strong class="${x.status==="PASS"?"diagPass":x.status==="FAIL"?"diagFail":"diagWarn"}">${x.status}</strong></div>`).join("")}<div class="${fail?"dangerBox":warn?"warningBox":"successBox"}" style="margin-top:14px">${fail?"Do not publish yet. Fix failed checks first.":warn?"Core checks passed, but warnings still require review in the intended hosting environment.":"All automated live-browser checks passed. Manual device testing is still required before public release."}</div>`;
}

function runFullDiagnostics(){
 const results=fullDiagnosticResults(),fails=results.filter(x=>!x.ok&&x.name!=="Cloud config").length;
 const root=document.getElementById("app");if(!root)return;
 root.innerHTML=`<div class="between"><div><h1>Full Diagnostics</h1><p class="muted">Runtime/state integrity check.</p></div><button class="secondary" onclick="state.page='more';render()">← Back</button></div><div class="panel">${results.map(x=>`<div class="switch"><span>${esc(x.name)}${x.detail?`<div class="muted tiny">${esc(x.detail)}</div>`:""}</span><strong class="${x.ok?"diagPass":x.name==="Cloud config"?"diagWarn":"diagFail"}">${x.ok?"PASS":x.name==="Cloud config"?"OPTIONAL":"FAIL"}</strong></div>`).join("")}</div><div class="${fails?"dangerBox":"successBox"}">${fails?`${fails} required check(s) failed.`:"All required runtime checks passed."}</div>`;
}
const BETA_QA_KEY="ppc_beta_qa_v8641";
const BETA_QA_ITEMS=[
 ["install","Install/update PWA"],["auth","Sign in, close app, reopen, session remains"],["deck","Create/save/open a deck"],["collection","Collection search/filter/card detail"],["battle","Record and undo a Battle Tracker match"],["ranked","Team Ranked queue/match/report flow with two accounts"],["training","Complete a Training challenge and sync"],["offline","Go offline after warm cache and reopen core screens"],["rotate","Rotate phone and use keyboard/input screens"],["privacy","Review profile privacy/public showcase"]
];
function betaQaState(){try{return JSON.parse(localStorage.getItem(BETA_QA_KEY)||'{}')}catch{return{}}}
function betaQaToggle(key,checked){const x=betaQaState();x[key]=!!checked;localStorage.setItem(BETA_QA_KEY,JSON.stringify(x));aboutPage()}
function betaQaReset(){localStorage.removeItem(BETA_QA_KEY);aboutPage()}
function betaQaHtml(){const x=betaQaState(),done=BETA_QA_ITEMS.filter(([k])=>x[k]).length;return `<section class="panel betaQaPanel"><div class="between"><div><span class="eyebrow">CLOSED BETA QA</span><h2>Device validation checklist</h2><p class="muted">${done}/${BETA_QA_ITEMS.length} checks marked complete on this device. Team Ranked requires two real accounts.</p></div><span class="badge">${done===BETA_QA_ITEMS.length?'DEVICE PASS':'IN PROGRESS'}</span></div><div class="betaQaList">${BETA_QA_ITEMS.map(([k,label])=>`<label class="switch betaQaItem"><span><strong>${esc(label)}</strong></span><input type="checkbox" ${x[k]?'checked':''} onchange="betaQaToggle('${k}',this.checked)"></label>`).join('')}</div><div class="row"><button class="secondary" onclick="betaQaReset()">Reset this device</button><button class="secondary" onclick="runPrePublicEnvironmentTests()">Run environment checks</button></div></section>`}
async function betaFeedbackExport(){
 const note=(document.getElementById("betaFeedbackText")?.value||"").trim();
 const area=document.getElementById("betaFeedbackStatus");
 if(!note){if(area)area.textContent="Write what happened before creating a report.";return}
 const session=window.PPCLaunch?.betaSession?.()||null, mobile=window.PPCMobile?.readinessReport?.()||null, storage=await window.PPCLaunch?.storageEstimate?.();
 const payload={app:"PocketNexus",version:"8.64.1-beta-rc",report_id:'R-'+Date.now().toString(36).toUpperCase(),created_at:new Date().toISOString(),beta_session:session,page:state.page||"unknown",online:navigator.onLine,standalone:window.PPCMobile?.isStandalone?.()||false,user_agent:navigator.userAgent,screen:{width:screen.width,height:screen.height,pixel_ratio:devicePixelRatio||1},storage,feedback:note,qa_checklist:betaQaState(),mobile_readiness:mobile,runtime_errors:window.PPCLaunch?.getRuntimeErrors?.()||[],diagnostics:typeof fullDiagnosticResults==="function"?fullDiagnosticResults().map(x=>({name:x.name,ok:x.ok,detail:x.detail||""})):[]};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`pocketnexus-beta-report-${payload.report_id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);if(area)area.textContent=`Beta report ${payload.report_id} created. Review it before sharing it with the project team.`;
}
function aboutPage(){
 const secure=location.protocol==='https:'||['localhost','127.0.0.1'].includes(location.hostname), online=navigator.onLine, session=window.PPCLaunch?.betaSession?.();
 document.getElementById("app").innerHTML=`<div class="between"><div><span class="eyebrow">CLOSED BETA VALIDATION • V8.64.1</span><h1>About, Privacy & Beta Status</h1><p class="muted">Validate the release candidate on real hosted devices before public launch.</p></div><button class="secondary" onclick="goPage('account')">Account & Data</button></div>
 <section class="panel"><div class="between"><div><span class="eyebrow">RELEASE READINESS</span><h2>Closed beta status</h2></div><span class="badge">BETA RC</span></div><div class="launchStatusGrid"><article><span>Connection</span><strong>${online?'Online':'Offline'}</strong><small>Current browser state</small></article><article><span>Secure context</span><strong>${secure?'Ready':'Needs HTTPS'}</strong><small>PWA/auth production requirement</small></article><article><span>Build</span><strong>V8.64.1</strong><small>${esc(session?.id||'Beta session')}</small></article></div><div class="launchLinks"><a class="buttonLink secondary" href="privacy.html">Privacy</a><a class="buttonLink secondary" href="terms.html">Terms</a><a class="buttonLink secondary" href="support.html">Support</a></div></section>
 ${betaQaHtml()}
 <div class="grid betaInfoGrid"><section class="panel"><h2>What counts as validated?</h2><p>Automated checks are only the first layer. Public-launch approval requires real hosted testing on the devices and account flows your beta users actually use.</p><p class="muted">A checklist marked complete means this browser/device was tested; it is not a global production certification.</p></section><section class="panel"><h2>Independent third-party project</h2><p>PocketNexus is an independent companion application and is not affiliated with The Pokémon Company or Nintendo.</p></section><section class="panel"><h2>Privacy summary</h2><p>Guest data stays in this browser. Signed-in features can store supported app data in the project's cloud backend. Diagnostic reports are created locally and are not automatically uploaded.</p></section><section class="panel"><h2>Beta bug reports</h2><p>Reports now include a beta session ID, device dimensions, PWA readiness, storage estimate, QA checklist, runtime errors, and app diagnostics.</p><p class="muted">Reports intentionally exclude passwords and private service keys. Review every report before sharing.</p></section></div>
 <section class="panel betaFeedbackPanel"><span class="eyebrow">BETA FEEDBACK</span><h2>Create a diagnostic report</h2><p class="muted">Describe what you did, what you expected, and what happened. Reproduce the issue once if it is safe to do so, then create the report.</p><textarea id="betaFeedbackText" rows="4" placeholder="Example: iPhone Safari → Team Ranked → Join Queue → spinner stayed visible after 20 seconds..."></textarea><div class="row"><button onclick="betaFeedbackExport()">Create Beta Report</button><button class="secondary" onclick="runPrePublicEnvironmentTests()">Run Launch Checks</button></div><p id="betaFeedbackStatus" class="muted tiny" aria-live="polite"></p></section>`;
}

function morePage(){
 let rank=state.rank||{tier:"Master Ball",points:0,streak:0};
 document.getElementById("app").innerHTML=`<div class="pageHero compact"><div><span class="eyebrow">TOOLS & SETTINGS</span><h1>More</h1><p>Collection, performance, streaming, account, backups, and advanced tools.</p></div></div><div class="toolLaunchGrid">
 <button class="toolLaunchCard" onclick="goPage('tournaments')"><span>♜</span><strong>Tournaments</strong><small>Leaderboards, decks, and scouting</small></button>
 <button class="toolLaunchCard" onclick="window.PPCWhatsNew?.open?.(true)"><span>✦</span><strong>What's New</strong><small>See recent PocketNexus updates</small></button>
 <button class="toolLaunchCard" onclick="goPage('collection')"><span>▦</span><strong>Collection</strong><small>Owned, wanted, and tradeable cards</small></button>
 <button class="toolLaunchCard" onclick="goPage('stats')"><span>⌁</span><strong>Performance</strong><small>Coaching, matchups, and trends</small></button>
 <button class="toolLaunchCard" onclick="goPage('streamer')"><span>◉</span><strong>Streamer</strong><small>Sessions and OBS overlays</small></button>
 <button class="toolLaunchCard" onclick="goPage('trade')"><span>⇄</span><strong>Trade</strong><small>Wishlist and tradeable cards</small></button>
 <button class="toolLaunchCard" onclick="goPage('account')"><span>●</span><strong>Account & Cloud</strong><small>Sign-in, security, and sync</small></button>
 <button class="toolLaunchCard" onclick="goPage('about')"><span>i</span><strong>About & Privacy</strong><small>Data handling and third-party notice</small></button>
 </div><div class="grid settingsGrid">
 <div class="panel"><h2>Rank Tracker</h2><p class="muted">RP is the source of truth. Your rank is calculated automatically.</p><label>Rank</label><input id="tier" value="${esc(rankTierFromPoints(rank.points))}" readonly aria-readonly="true"><label>Current Points</label><input id="points" type="number" min="0" value="${rank.points||0}" oninput="document.getElementById('tier').value=rankTierFromPoints(this.value)"><label>Win Streak</label><input id="streak" type="number" min="0" value="${rank.streak||0}"><button onclick="saveRank()">Save RP</button></div>
 <div class="panel"><h2>Backup My Data</h2><p class="muted">Keep a portable copy of your local PocketNexus data.</p><div class="row"><button onclick="backupAllData()">Download Backup</button><button class="secondary" onclick="restoreBackupPrompt()">Restore Backup</button></div></div>
 </div><details class="panel advancedTools"><summary>Advanced & troubleshooting</summary><p class="muted">Diagnostics and raw exports are mainly useful when something is not working.</p>${imageDiagnosticsPanel()}<div class="advancedToolActions"><button onclick="runMetaDiagnostics()">Meta Diagnostics</button><button onclick="runFullDiagnostics()">Full Diagnostics</button><button onclick="runPrePublicEnvironmentTests()">Environment Tests</button><button class="secondary" onclick="exportBattleJSON()">Battle JSON</button><button class="secondary" onclick="exportBattleCSV()">Battle CSV</button></div>${battleDiagnosticsHtml()}${deckMappingDiagnostics()}</details>`;
}

function saveRank(){const points=Math.max(0,Math.floor(Number(document.getElementById("points").value||0)));state.rank={...(state.rank||{}),tier:rankTierFromPoints(points),points,streak:Math.max(0,Number(document.getElementById("streak").value||0))};save();morePage()}


window.cardLoadMode="idle";
if(Array.isArray(state.matches)&&state.matches.length){state.matches=state.matches.map(normalizeMatch).filter(Boolean);safeStorageSet(STORE,JSON.stringify(state));}

// Performance Pass 2D: Account/auth/backup/restore runtime moved to
// js/core/account-cloud-core-v8.64.1.js and account-cloud-runtime-v8.64.1.js.

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
