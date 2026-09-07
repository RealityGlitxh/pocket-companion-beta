/* PocketNexus V8.64.2 — Gym opponent archetype dropdown hotfix
   Replaces free-text opponent archetype fields with canonical dropdowns
   without changing the existing Gym Battle state/update handlers. */
(function(){
  "use strict";
  if(window.PPCGymOpponentArchetypeDropdown)return;

  function archetypeNames(){
    const names=[];
    try{ if(typeof sharedArchetypeNames==="function") names.push(...sharedArchetypeNames()); }catch{}
    try{ names.push(...(window.CompetitiveMeta847?.meta||[]).map(x=>x?.archetype)); }catch{}
    try{ names.push(...(window.state?.decks||[]).map(d=>d?.archetype||d?.name)); }catch{}
    return [...new Set(names.map(x=>String(x||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  }

  function esc(v){
    return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  }

  function upgrade(root=document){
    const fields=[...root.querySelectorAll?.('input[placeholder="Archetype"]')||[]];
    if(!fields.length)return 0;
    const options=archetypeNames();
    let changed=0;
    fields.forEach(input=>{
      if(input.dataset.ppcGymDropdownUpgraded==="1")return;
      const select=document.createElement('select');
      for(const attr of [...input.attributes]){
        if(['type','placeholder','value'].includes(attr.name))continue;
        select.setAttribute(attr.name,attr.value);
      }
      select.dataset.ppcGymDropdownUpgraded='1';
      const current=String(input.value||"").trim();
      const all=current&&!options.includes(current)?[current,...options]:options;
      select.innerHTML=`<option value="">Select archetype…</option>${all.map(n=>`<option value="${esc(n)}" ${n===current?'selected':''}>${esc(n)}</option>`).join('')}`;
      input.replaceWith(select);
      changed++;
    });
    return changed;
  }

  let queued=false;
  function queueUpgrade(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;upgrade(document)});
  }

  const observer=new MutationObserver(queueUpgrade);
  const start=()=>{
    const app=document.getElementById('app');
    if(app)observer.observe(app,{childList:true,subtree:true});
    upgrade(document);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();

  window.PPCGymOpponentArchetypeDropdown={version:'8.64.2',upgrade,archetypeNames};
})();
