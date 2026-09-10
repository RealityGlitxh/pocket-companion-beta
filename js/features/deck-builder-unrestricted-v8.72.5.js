/* PocketNexus V8.72.5 — Deck building uses the full legal card pool.
   Collection ownership remains a separate tracking feature and never blocks deck construction. */
(function(){
  'use strict';

  const policy=Object.freeze({
    collectionRestrictsDecks:false,
    fullCardPool:true,
    enforceDeckSize:true,
    enforceCopyLimit:true,
    collectionOnlyWhenExplicitlyRequested:true
  });
  window.PocketNexusDeckPolicy=policy;

  function normalizeLegacyDeckView(){
    try{
      if(typeof deckBuildFilter!=='undefined'&&!['all','favorites'].includes(deckBuildFilter))deckBuildFilter='all';
    }catch(_e){}
    try{
      if(typeof deckBuildSort!=='undefined'&&['completion','fewest','most'].includes(deckBuildSort))deckBuildSort='name';
    }catch(_e){}
  }

  function scrubDeckManagerCollectionControls(){
    document.querySelectorAll('.deckFilterGroup button').forEach(btn=>{
      const action=String(btn.getAttribute('onclick')||'');
      if(/setDeckBuildFilter\('(ready|almost|missing)'\)/.test(action))btn.remove();
    });
    document.querySelectorAll('.deckSortGroup select option').forEach(opt=>{
      if(['completion','fewest','most'].includes(String(opt.value||'')))opt.remove();
    });
    document.querySelectorAll('.deckSortGroup select').forEach(sel=>{sel.value='name';});
    document.querySelectorAll('.deckOwned').forEach(el=>{
      el.classList.remove('needs');
      el.classList.add('ready');
      el.textContent='Full card pool • Collection not required';
    });
    const header=document.querySelector('.deckManagerHeader .muted');
    if(header)header.textContent='Build, organize, test, and track decks using the full legal card pool. Collection ownership is tracked separately.';
  }

  function scrubDeckEditorCollectionLimits(){
    document.querySelectorAll('.decktile.collectionOwned,.decktile.collectionMissing').forEach(el=>{
      el.classList.remove('collectionOwned','collectionMissing');
    });
    document.querySelectorAll('.deckOwnBadge').forEach(el=>el.remove());
  }

  function scrubDeckModalCollectionLimits(){
    if(String(window.state?.page||'')!=='decks')return;
    document.querySelectorAll('#cardModalBody .pill').forEach(el=>{
      if(/^Owned for deck\b/i.test(String(el.textContent||'').trim()))el.remove();
    });
    document.querySelectorAll('#cardModalBody .collectionQuickEdit').forEach(el=>el.remove());
  }

  const originalDecks=window.decks;
  if(typeof originalDecks==='function'){
    window.decks=function(){
      normalizeLegacyDeckView();
      const result=originalDecks.apply(this,arguments);
      scrubDeckManagerCollectionControls();
      return result;
    };
  }

  const originalEditor=window.renderEditorShell;
  if(typeof originalEditor==='function'){
    window.renderEditorShell=function(){
      const result=originalEditor.apply(this,arguments);
      scrubDeckEditorCollectionLimits();
      return result;
    };
  }

  const originalOpenCardModal=window.openCardModal;
  if(typeof originalOpenCardModal==='function'){
    window.openCardModal=function(){
      const result=originalOpenCardModal.apply(this,arguments);
      scrubDeckModalCollectionLimits();
      return result;
    };
  }

  // Pocket Coach defaults to the full card pool. Collection-only building remains available
  // when the user explicitly asks for a deck limited to cards they own.
  try{
    if(typeof COACH_PROMPTS!=='undefined'&&Array.isArray(COACH_PROMPTS)){
      const i=COACH_PROMPTS.findIndex(x=>/top meta decks? with my collection/i.test(String(x||'')));
      if(i>=0)COACH_PROMPTS[i]='Build me a strong legal deck for the current meta.';
    }
  }catch(_e){}

  window.deckConstructionUsesCollection=function(){return false;};
})();
