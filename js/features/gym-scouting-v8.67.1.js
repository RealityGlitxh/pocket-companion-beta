/* PocketNexus V8.67.1 — Gym Battle opponent scouting
   Direct renderer override for the actual Gym Battle setup screen.
   Opponent names/decks may stay unknown before the battle starts. */
(function(){
  'use strict';

  function opponentArchetypeNames(){
    let names=[];
    try{ if(typeof sharedArchetypeNames==='function') names.push(...sharedArchetypeNames()); }catch{}
    try{ names.push(...(window.CompetitiveMeta847?.meta||[]).map(x=>x?.archetype)); }catch{}
    try{ names.push(...(window.ArchetypeService?.getArchetypes?.()||[]).map(x=>typeof x==='string'?x:x?.name)); }catch{}
    return [...new Set(names.map(x=>String(x||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  }

  function opponentArchetypeOptions(selected=''){
    const current=String(selected||'').trim();
    const names=opponentArchetypeNames();
    let html='<option value="">Unknown</option>';
    if(current&&!names.includes(current)) html+=`<option value="${esc(current)}" selected>${esc(current)}</option>`;
    html+=names.map(n=>`<option value="${esc(n)}" ${n===current?'selected':''}>${esc(n)}</option>`).join('');
    return html;
  }

  window.gymSetupPlayerCard=function(side,p,i){
    const home=side==='home';
    const displayName=String(p?.name||'');
    return `<article class="gymRosterPlayer"><div class="gymPlayerNum">${i+1}</div><div class="gymPlayerFields"><input aria-label="${home?'Your':'Opponent'} player ${i+1} name" placeholder="${home?`Player ${i+1}`:'Unknown player'}" value="${esc(displayName)}" onchange="gymUpdateSetup('${side}',${i},'name',this.value)">${home?`<div class="gymDeckPickRow"><select aria-label="Player ${i+1} Deck A" onchange="gymUpdateSetup('home',${i},'deck1',this.value)">${gymSetupDeckOptions(p.deck1)}</select><select aria-label="Player ${i+1} Deck B" onchange="gymUpdateSetup('home',${i},'deck2',this.value)">${gymSetupDeckOptions(p.deck2)}</select></div><button class="secondary smallButton" onclick="gymOpenPairing(${i})">Find Best Pair</button>`:`<div class="gymDeckPickRow"><select aria-label="Opponent ${i+1} Deck A archetype" onchange="gymUpdateSetup('away',${i},'deck1',this.value)">${opponentArchetypeOptions(p.deck1)}</select><select aria-label="Opponent ${i+1} Deck B archetype" onchange="gymUpdateSetup('away',${i},'deck2',this.value)">${opponentArchetypeOptions(p.deck2)}</select></div>`}</div></article>`;
  };

  window.gymStartBattle=async function(){
    const g=gymState();
    if(g.active&&!g.active.winner&&g.active.results?.length){
      const ok=await ppcConfirm('A Gym Battle is already in progress. Start over and replace it?','Replace active Gym Battle');
      if(!ok)return;
    }
    const duplicateHome=g.homePlayers.some(p=>p.deck1&&p.deck1===p.deck2);
    if(duplicateHome){ppcNotice('Each player needs two different decks. You can mix My Decks and Meta decks.');return;}

    // Only your own 5-player lineup must be complete before starting.
    const invalidHome=g.homePlayers.some(p=>!String(p.name||'').trim()||!p.deck1||!p.deck2);
    if(invalidHome){ppcNotice('Fill all 5 players and both decks for your team before starting. Opponent scouting can stay Unknown.');return;}

    const away=(g.awayPlayers||[]).map((p,i)=>({
      name:String(p?.name||'').trim()||`Opponent ${i+1}`,
      decks:[String(p?.deck1||'').trim()||'Unknown Deck A',String(p?.deck2||'').trim()||'Unknown Deck B'],
      alive:[true,true],wins:0,losses:0
    }));

    g.active={
      id:makeId(),startedAt:Date.now(),
      homeGym:g.homeGym||'My Gym',awayGym:g.awayGym||'Opponent Gym',
      homePlayers:g.homePlayers.map(p=>({name:p.name,decks:[gymDeckName(p.deck1),gymDeckName(p.deck2)],deckIds:[p.deck1,p.deck2],alive:[true,true],wins:0,losses:0})),
      awayPlayers:away,
      homeIndex:0,awayIndex:0,homeDeck:0,awayDeck:0,results:[],winner:null
    };
    g.view='battle';save();gymBattlePage();
  };

  window.PPCGymScouting={version:'8.67.1'};
})();
