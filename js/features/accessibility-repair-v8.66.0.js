/* PocketNexus Pass 3C-1 — accessible-name repair.
   Presentation/semantics only. Does not replace page renderers or data behavior. */
(function(){
  'use strict';

  function text(el){ return (el?.textContent || '').replace(/\s+/g,' ').trim(); }
  function hasName(el){
    if(!el) return true;
    if((el.getAttribute('aria-label')||'').trim()) return true;
    if((el.getAttribute('aria-labelledby')||'').trim()) return true;
    if((el.getAttribute('title')||'').trim()) return true;
    if(text(el)) return true;
    if(el.id && document.querySelector('label[for="'+CSS.escape(el.id)+'"]')) return true;
    if(el.closest('label')) return true;
    return false;
  }
  function label(el,name){ if(el && !hasName(el) && name) el.setAttribute('aria-label',name); }
  function placeholderLabel(el,fallback){
    if(!el || hasName(el)) return;
    const p=(el.getAttribute('placeholder')||'').trim();
    label(el,p||fallback);
  }
  function repair(root=document){
    // Known account/profile/sync fields found by the 3C audit.
    label(root.querySelector?.('#authEmail'),'Email address');
    label(root.querySelector?.('#authPassword'),'Password');
    label(root.querySelector?.('#profileSearchInput'),'Search public profiles');
    label(root.querySelector?.('#pocketImportJson'),'Paste PocketNexus import data');
    label(root.querySelector?.('#streamRankTier'),'Rank tier');
    label(root.querySelector?.('#streamRankPoints'),'Rank points');

    root.querySelectorAll?.('input:not([type="hidden"]),textarea,select').forEach(el=>placeholderLabel(el, el.tagName==='SELECT'?'Select option':'Input field'));

    // Empty icon buttons keep their behavior; only add a semantic name.
    root.querySelectorAll?.('button,[role="button"]').forEach(el=>{
      if(hasName(el)) return;
      const img=el.querySelector('img[alt]');
      const svg=el.querySelector('svg[aria-label],svg title');
      const inferred=(img?.getAttribute('alt')||svg?.getAttribute('aria-label')||svg?.querySelector('title')?.textContent||'').trim();
      label(el,inferred||'Action');
    });
  }

  let queued=false;
  function queue(){
    if(queued) return; queued=true;
    requestAnimationFrame(()=>{ queued=false; repair(document); });
  }
  document.addEventListener('DOMContentLoaded',queue,{once:true});
  new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
  window.PPCAccessibilityRepair={version:'8.66.0',repair:queue};
})();
