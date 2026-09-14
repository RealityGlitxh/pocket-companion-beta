/* PocketNexus V8.78.0 — Streamer legacy state normalization hotfix */
(function(){
  'use strict';
  if(window.PPCStreamerLegacyStateHotfix)return;

  function textValue(value,fallback=''){
    if(typeof value==='string')return value;
    if(value==null)return fallback;
    if(typeof value==='object'){
      const candidate=value.name??value.label??value.title??value.value??value.id;
      if(candidate!=null&&candidate!==value)return String(candidate);
      return fallback;
    }
    return String(value);
  }

  function repairStreamerState(){
    if(!window.state)return;
    state.streamer=state.streamer&&typeof state.streamer==='object'?state.streamer:{};
    const s=state.streamer;
    const fallbackDeck=state.battlePrefs?.lastDeckId||state.decks?.[0]?.id||'';
    s.controlDeckId=textValue(s.controlDeckId,textValue(fallbackDeck,''));
    s.controlOpponent=textValue(s.controlOpponent,'');
    s.customOpponent=textValue(s.customOpponent,'');
    s.controlTurnOrder=textValue(s.controlTurnOrder,'unknown')||'unknown';
    s.sessionType=textValue(s.sessionType,'Ranked Grind')||'Ranked Grind';
    s.sessionCustomName=textValue(s.sessionCustomName,'');
    s.tournamentName=textValue(s.tournamentName,'');
    s.tournamentRound=textValue(s.tournamentRound,'Round 1')||'Round 1';
    s.tournamentRecord=textValue(s.tournamentRecord,'0-0')||'0-0';
    s.tournamentStage=textValue(s.tournamentStage,'Swiss')||'Swiss';
    s.casterA=textValue(s.casterA,'Player A')||'Player A';
    s.casterB=textValue(s.casterB,'Player B')||'Player B';
  }

  repairStreamerState();

  const originalOpponentValue=window.streamerOpponentValue;
  if(typeof originalOpponentValue==='function'){
    window.streamerOpponentValue=function(){
      repairStreamerState();
      const value=originalOpponentValue.apply(this,arguments);
      return textValue(value,'').trim();
    };
  }

  const originalStreamerPage=window.streamerPage;
  if(typeof originalStreamerPage==='function'){
    window.streamerPage=function(){
      repairStreamerState();
      return originalStreamerPage.apply(this,arguments);
    };
  }

  window.PPCStreamerLegacyStateHotfix={version:'8.78.0',repair:repairStreamerState,textValue};
})();
