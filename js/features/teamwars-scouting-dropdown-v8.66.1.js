/* PocketNexus V8.66.1 — Team Wars scouting archetype dropdowns.
   UI-only enhancement: replaces manual Deck A / Deck B archetype text inputs
   inside the Opponent lineup scouting panel with selects populated from the
   existing ArchetypeService. Existing ids/classes/change handlers are preserved. */
(function(){
  'use strict';

  function archetypeNames(){
    let rows=[];
    try{
      const svc=window.ArchetypeService;
      rows=svc?.getArchetypes?.()||svc?.all?.()||svc?.getAll?.()||[];
    }catch{}
    const names=rows.map(x=>typeof x==='string'?x:x?.name).filter(Boolean);
    return [...new Set(names)].sort((a,b)=>String(a).localeCompare(String(b)));
  }

  function scoutingRoot(){
    const app=document.getElementById('app');
    if(!app)return null;
    const nodes=[...app.querySelectorAll('section,.panel,article,div')];
    return nodes.find(el=>/opponent lineup/i.test((el.textContent||'').slice(0,500)))||null;
  }

  function isDeckArchetypeInput(input,root){
    if(!input||input.tagName!=='INPUT'||input.dataset.ppcScoutDropdown==='1')return false;
    if(!root.contains(input))return false;
    const ph=(input.getAttribute('placeholder')||'').trim();
    if(!/archetype/i.test(ph))return false;
    const parentText=(input.parentElement?.textContent||'').trim();
    return /deck\s*a|deck\s*b/i.test(parentText);
  }

  function replaceInput(input,names){
    const select=document.createElement('select');
    for(const attr of [...input.attributes]){
      if(['type','placeholder','value'].includes(attr.name))continue;
      try{select.setAttribute(attr.name,attr.value)}catch{}
    }
    select.dataset.ppcScoutDropdown='1';
    select.setAttribute('aria-label',input.getAttribute('aria-label')||'Select deck archetype');

    const current=String(input.value||'').trim();
    const blank=document.createElement('option');
    blank.value='';blank.textContent='Select archetype...';
    select.appendChild(blank);
    if(current&&!names.includes(current)){
      const o=document.createElement('option');o.value=current;o.textContent=current;select.appendChild(o);
    }
    for(const name of names){
      const o=document.createElement('option');o.value=name;o.textContent=name;select.appendChild(o);
    }
    select.value=current;

    // Preserve property handlers in case the renderer assigned them rather than attributes.
    if(typeof input.onchange==='function')select.onchange=input.onchange;
    if(typeof input.oninput==='function')select.oninput=input.oninput;
    input.replaceWith(select);
  }

  function enhance(){
    const root=scoutingRoot();if(!root)return;
    const names=archetypeNames();if(!names.length)return;
    [...root.querySelectorAll('input')].filter(i=>isDeckArchetypeInput(i,root)).forEach(i=>replaceInput(i,names));
  }

  let queued=false;
  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance()})}
  document.addEventListener('DOMContentLoaded',queue,{once:true});
  document.addEventListener('click',queue,true);
  new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
  window.PPCTeamWarsScoutingDropdown={version:'8.66.1',enhance:queue};
})();
