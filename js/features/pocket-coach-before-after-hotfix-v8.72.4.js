/* PocketNexus V8.72.4 — Pocket Coach Before/After prompt handoff hotfix.
   Prefer the existing visible coach input before invoking a route-level prompt helper, so comparison QA and live UX do not lose the prepared prompt during a rerender. */
(function(){
'use strict';
function install(){
  if(typeof window.coachAskWhyComparison!=='function'||window.__ppcCoachAskWhyStable)return;
  window.__ppcCoachAskWhyStable=true;
  const original=window.coachAskWhyComparison;
  window.coachAskWhyComparison=function(){
    const input=document.getElementById('coachInput');
    if(!input)return original.apply(this,arguments);
    const backdrop=document.getElementById('coachCompareBackdrop');
    const text=backdrop?.querySelector('.coachCompareChange')?.innerText||'';
    const remove=(text.match(/−1\s+(.+?)(?:\s+\/+|\s*\+1|$)/)?.[1]||'the current card').trim();
    const add=(text.match(/\+1\s+(.+)$/)?.[1]||'the suggested card').trim();
    const q=`Explain why you recommended replacing ${remove} with ${add}. Explain the structural, current-meta, and matchup tradeoffs, and be clear about what is correlation versus a hard rule.`;
    document.getElementById('coachCompareBackdrop')?.remove();
    input.value=q;
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.focus();
  };
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0),{once:true});else setTimeout(install,0);
})();