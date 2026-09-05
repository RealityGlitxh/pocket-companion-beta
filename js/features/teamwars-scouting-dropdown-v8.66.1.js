/* PocketNexus V8.66.3 — Team Wars scouting archetype dropdowns.
   Converts opponent Deck A / Deck B scouting fields into archetype selects.
   Unknown is always valid so Team Wars can begin before scouting is complete. */
(function(){
  'use strict';

  function archetypeNames(){
    let rows=[];
    try{
      const svc=window.ArchetypeService;
      rows=svc?.getArchetypes?.()||svc?.all?.()||svc?.getAll?.()||[];
    }catch{}
    return [...new Set(rows.map(x=>typeof x==='string'?x:x?.name).filter(Boolean))]
      .sort((a,b)=>String(a).localeCompare(String(b)));
  }

  function scoutingRoot(){
    const app=document.getElementById('app');
    if(!app)return null;
    const candidates=[...app.querySelectorAll('section,.panel,article,div')]
      .filter(el=>/opponent lineup/i.test((el.textContent||'').slice(0,1000)));
    return candidates.sort((a,b)=>a.querySelectorAll('*').length-b.querySelectorAll('*').length)[0]||null;
  }

  function fieldLabel(input){
    if(input.id){
      const explicit=document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
      if(explicit)return (explicit.textContent||'').trim();
    }
    const wrap=input.closest('label');
    if(wrap)return (wrap.textContent||'').trim();
    let node=input.parentElement;
    for(let depth=0;node&&depth<3;depth++,node=node.parentElement){
      const labels=[...node.children].filter(x=>x.tagName==='LABEL');
      if(labels.length===1)return (labels[0].textContent||'').trim();
    }
    return '';
  }

  function isOpponentDeckInput(input,root){
    if(!input||input.tagName!=='INPUT'||input.dataset.ppcScoutDropdown==='1'||!root.contains(input))return false;
    const ph=(input.getAttribute('placeholder')||'').trim();
    if(/^archetype$/i.test(ph)||/select archetype/i.test(ph))return true;
    const label=fieldLabel(input);
    if(/^deck\s*[ab]$/i.test(label))return true;
    const idClass=`${input.id||''} ${input.className||''}`;
    return /deck.*[ab]|[ab].*deck/i.test(idClass)&&!/player|name/i.test(idClass);
  }

  function fillOptions(select,names,current){
    const existingCurrent=String(current??select.value??'').trim();
    select.innerHTML='';
    const unknown=document.createElement('option');
    unknown.value='';unknown.textContent='Unknown';select.appendChild(unknown);
    if(existingCurrent&&!names.includes(existingCurrent)){
      const o=document.createElement('option');o.value=existingCurrent;o.textContent=existingCurrent;select.appendChild(o);
    }
    for(const name of names){
      const o=document.createElement('option');o.value=name;o.textContent=name;select.appendChild(o);
    }
    select.value=existingCurrent;
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
    fillOptions(select,names,current);
    if(typeof input.onchange==='function')select.onchange=input.onchange;
    if(typeof input.oninput==='function')select.oninput=input.oninput;
    input.replaceWith(select);
  }

  function enhance(){
    const root=scoutingRoot();if(!root)return;
    const names=archetypeNames();
    [...root.querySelectorAll('input')].filter(i=>isOpponentDeckInput(i,root)).forEach(i=>replaceInput(i,names));
    // If the selects were created before archetype data became available, populate them later.
    if(names.length){
      root.querySelectorAll('select[data-ppc-scout-dropdown="1"]').forEach(sel=>{
        const current=sel.value;
        const known=[...sel.options].map(o=>o.value).filter(Boolean);
        if(names.some(n=>!known.includes(n)))fillOptions(sel,names,current);
      });
    }
  }

  let queued=false;
  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance()})}
  document.addEventListener('DOMContentLoaded',queue,{once:true});
  document.addEventListener('click',queue,true);
  document.addEventListener('change',queue,true);
  new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
  setInterval(()=>{try{if(state?.page==='teamwars')queue()}catch{}},1000);
  window.PPCTeamWarsScoutingDropdown={version:'8.66.3',enhance:queue};
})();
