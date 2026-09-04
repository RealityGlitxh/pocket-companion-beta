/* PocketNexus v8.65.3 — Pass 3B-3 Battle Refinement
   Presentation-only wrapper around the existing Battle renderer. */
(function(){
  const base=window.standardMatches;
  if(typeof base!=='function') return;

  function currentDeckName(){
    try{
      const selected=(state.decks||[]).find(d=>d.id===state.selected);
      const latest=completedMatches().sort((a,b)=>b.timestamp-a.timestamp)[0];
      const recent=(state.decks||[]).find(d=>d.id===latest?.deckId);
      return selected?.name||recent?.name||(state.decks||[])[0]?.name||'No deck selected';
    }catch(_){return 'No deck selected'}
  }
  function snapshot(){
    let rows=[];try{rows=completedMatches()}catch(_){}
    const key=new Date().toDateString();
    const today=rows.filter(m=>new Date(m.timestamp).toDateString()===key);
    const wins=today.filter(m=>m.result==='win').length;
    const losses=today.filter(m=>m.result==='loss').length;
    const active=(state.sessions||[]).find(s=>!s.end);
    const rp=Number(state.rank?.points||0);
    return {today,wins,losses,active,rp};
  }
  function enhance(){
    const app=document.getElementById('app');
    if(!app||state.page!=='matches') return;
    if(app.querySelector('.battle3bPage')) return;

    const wrap=document.createElement('div');
    wrap.className='battle3bPage';
    while(app.firstChild) wrap.appendChild(app.firstChild);
    app.appendChild(wrap);

    const hero=wrap.querySelector(':scope > .between, :scope > .battleModeHeader .between');
    if(hero){
      hero.classList.add('battle3bHero');
      const copy=hero.firstElementChild;
      if(copy){
        const eyebrow=copy.querySelector('.eyebrow');
        if(eyebrow) eyebrow.textContent='PLAY • FAST BATTLE LOG';
        const p=copy.querySelector('p');
        if(p) p.textContent='Record the result first. Sessions, rank context, and full history stay one tap away.';
      }
    }

    const tabs=wrap.querySelector('.battleTabs');
    if(tabs) tabs.classList.add('battle3bTabs');

    const s=snapshot();
    const focus=document.createElement('section');
    focus.className='battle3bFocus';
    focus.innerHTML=`<div><span>ACTIVE DECK</span><strong>${esc(currentDeckName())}</strong></div><div><span>TODAY</span><strong>${s.wins}-${s.losses}</strong></div><div><span>CURRENT RP</span><strong>${Number.isFinite(s.rp)?s.rp.toLocaleString():'—'}</strong></div><div><span>SESSION</span><strong>${s.active?esc(s.active.name||'Active session'):'None'}</strong></div>`;
    if(tabs) tabs.before(focus); else if(hero) hero.after(focus); else wrap.prepend(focus);

    const grid=wrap.querySelector('.battleRecordGrid');
    if(grid) grid.classList.add('battle3bRecordGrid');
    const recordCard=wrap.querySelector('.battleRecordCard');
    if(recordCard){
      recordCard.classList.add('battle3bRecordCard');
      const h2=recordCard.querySelector('h2');
      if(h2&&!/record/i.test(h2.textContent||'')) h2.textContent='Record battle';
    }
    const resultActions=wrap.querySelector('.quickResultActions');
    if(resultActions) resultActions.classList.add('battle3bResultActions');

    wrap.querySelectorAll('.battlePulseCard,.battleRecentCard,.sessionCard,.historyFilters,.matchCard').forEach(el=>el.classList.add('battle3bSurface'));
    const history=wrap.querySelector('#battleHistory');
    if(history) history.classList.add('battle3bHistory');
  }

  window.standardMatches=function(){
    const out=base.apply(this,arguments);
    enhance();
    return out;
  };
  window.PPCBattleRefinement={version:'8.65.3',enhance};
})();
