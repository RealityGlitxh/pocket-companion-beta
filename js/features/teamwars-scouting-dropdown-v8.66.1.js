/* PocketNexus V8.66.2 — Team Wars scouting archetype dropdowns.
   UI-only enhancement: converts opponent Deck A / Deck B scouting fields into
   archetype selects while preserving existing values and handlers. Unknown is
   the valid default so wars can begin before the opponent lineup is known. */
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
    return nodes.find(el=>/opponent lineup/i.test((el.textContent||'').slice(0,900)))||null;
  }

  function fieldLabel(input){
    const explicit=input.id?document.querySelector(`label[for="${CSS.escape(input.id)}"]`):null;
    if(explicit)return (explicit.textContent||'').trim();
    const wrap=input.closest('label');
    if(wrap)return (wrap.textContent||'').trim();
    const parent=input.parentElement;
    if(!parent)return '';
    const firstLabel=parent.querySelector(':scope > label');
    if(firstLabel)return (firstLabel.textContent||'').trim();
    const prev=input.previousElementSibling;
    if(prev&&/^(LABEL|SMALL|SPAN|STRONG)$/.test(prev.tagName))return (prev.textContent||'').trim();
    return (parent.textContent||'').trim().slice(0,80);
  }

  function isOpponentDeckInput(input,root){
    if(!input||input.tagName!=='INPUT'||input.dataset.ppcScoutDropdown==='1')return false;
    if(!root.contains(input))return false;
    const label=fieldLabel(input);
    const ph=(input.getAttribute('placeholder')||'').trim();
    const idClass=`${input.id||''} ${input.className||''}`;
    return /deck\s*[ab]/i.test(label)||(/archetype/i.test(ph)&&/deck/i.test((input.parentElement?.textContent||'')))||/deck.*[ab]|[ab].*deck/i.test(idClass);
  }

  function replaceInput(input,names){
    const select=document.createElement('select');
    for(const attr of [...input.attributes]){
      if(['type','placeholder','value'].includes(attr.name))continue;
      try{select.setAttribute(attr.name,attr.value)}catch{}
    }
    select.dataset.ppcScoutDropdown='1';
    select.setAttribute('aria-label',input.getAttribute('aria-label')||`${fieldLabel(input)||'Deck'} archetype`);

    const current=String(input.value||'').trim();
    const unknown=document.createElement('option');
    unknown.value='';
    unknown.textContent='Unknown';
    select.appendChild(unknown);

    if(current&&!names.includes(current)){
      const o=document.createElement('option');
      o.value=current;
      o.textContent=current;
      select.appendChild(o);
    }
    for(const name of names){
      const o=document.createElement('option');
      o.value=name;
      o.textContent=name;
      select.appendChild(o);
    }
    select.value=current;

    if(typeof input.onchange==='function')select.onchange=input.onchange;
    if(typeof input.oninput==='function')select.oninput=input.oninput;
    input.replaceWith(select);
  }

  function enhance(){
    const root=scoutingRoot();if(!root)return;
    const names=archetypeNames();if(!names.length)return;
    [...root.querySelectorAll('input')].filter(i=>isOpponentDeckInput(i,root)).forEach(i=>replaceInput(i,names));
  }

  let queued=false;
  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance()})}
  document.addEventListener('DOMContentLoaded',queue,{once:true});
  document.addEventListener('click',queue,true);
  document.addEventListener('change',queue,true);
  new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
  window.PPCTeamWarsScoutingDropdown={version:'8.66.2',enhance:queue};
})();
