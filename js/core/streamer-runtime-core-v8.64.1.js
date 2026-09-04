/* PocketNexus V8.64.1 — Streamer runtime core
   Performance Pass 2D. Eager, lightweight overlay-state publisher used by
   Battle saves and startup. The heavy Streamer page is lazy-loaded. */

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
