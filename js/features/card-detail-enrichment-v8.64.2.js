/* PocketNexus V8.64.2 — verified Card Detail gameplay enrichment.
 * Non-destructive: stable PocketNexus card records render first. Rich gameplay is
 * attached only after CardEnrichmentService verifies set + number + normalized name.
 */
(function(){
  if(window.PPCVerifiedCardDetail)return;

  const CACHE_MS=30*60*1000;
  const runtime={index:null,richCount:0,loadedAt:0,promise:null,error:''};

  function text(v){return v==null?'':String(v).trim()}
  function escapeHtml(v){
    try{return typeof esc==='function'?esc(text(v)):text(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}catch{return text(v)}
  }
  function baseCard(id){
    try{return typeof card==='function'?card(id):(Array.isArray(window.CARDS)?window.CARDS.find(c=>c?.id===id):null)}catch{return null}
  }
  function identityLabel(c){return [c?.setCode,c?.number?`#${c.number}`:''].filter(Boolean).join(' ')}

  async function loadRich(force=false){
    if(!window.PtcgpDataCardSource||!window.CardEnrichmentService)throw new Error('Card gameplay enrichment services unavailable');
    if(!force&&runtime.index&&Date.now()-runtime.loadedAt<CACHE_MS)return runtime.index;
    if(runtime.promise&&!force)return runtime.promise;
    runtime.promise=(async()=>{
      const kinds=Object.keys(PtcgpDataCardSource.FILES||{});
      const settled=await Promise.allSettled(kinds.map(k=>PtcgpDataCardSource.loadKind(k)));
      const rich=[];settled.forEach(r=>{if(r.status==='fulfilled'&&Array.isArray(r.value))rich.push(...r.value)});
      if(!rich.length)throw new Error('Verified gameplay source returned no usable card records');
      runtime.index=CardEnrichmentService.buildIndex(rich);
      runtime.richCount=rich.length;runtime.loadedAt=Date.now();runtime.error='';
      return runtime.index;
    })().catch(e=>{runtime.error=e?.message||String(e);throw e}).finally(()=>{runtime.promise=null});
    return runtime.promise;
  }

  function costHtml(cost){
    const list=Array.isArray(cost)?cost.filter(Boolean):[];
    return list.length?`<span class="row" style="gap:5px">${list.map(x=>`<span class="pill">${escapeHtml(x)}</span>`).join('')}</span>`:'';
  }
  function metric(label,value){return text(value)?`<div class="metric"><div class="l">${escapeHtml(label)}</div><div class="n" style="font-size:16px">${escapeHtml(value)}</div></div>`:''}
  function gameplayHtml(c,g){
    if(!g)return '';
    const metrics=[
      Number.isFinite(Number(g.hp))&&Number(g.hp)>0?metric('HP',String(Number(g.hp))):'',
      metric('Stage',g.stage),metric('Evolves From',g.evolvesFrom),metric('Type',g.type),
      g.weakness?metric('Weakness',g.weakness):'',
      Number.isFinite(Number(g.retreat))?metric('Retreat',String(Number(g.retreat))):''
    ].filter(Boolean).join('');
    const abilities=(g.abilities||[]).filter(a=>text(a?.name)||text(a?.effect)).map(a=>`<article class="panel" style="margin:8px 0"><span class="eyebrow">ABILITY</span>${a.name?`<h3>${escapeHtml(a.name)}</h3>`:''}${a.effect?`<p>${escapeHtml(a.effect)}</p>`:''}</article>`).join('');
    const attacks=(g.attacks||[]).filter(a=>text(a?.name)||text(a?.damage)||text(a?.effect)||(a?.cost||[]).length).map(a=>`<article class="panel" style="margin:8px 0"><div class="between"><div><span class="eyebrow">ATTACK</span><h3>${escapeHtml(a.name||'Attack')}</h3></div>${a.damage?`<strong>${escapeHtml(a.damage)}</strong>`:''}</div>${costHtml(a.cost)}${a.effect?`<p>${escapeHtml(a.effect)}</p>`:''}</article>`).join('');
    const effect=g.effect?`<article class="panel" style="margin:8px 0"><span class="eyebrow">EFFECT</span><p>${escapeHtml(g.effect)}</p></article>`:'';
    if(!metrics&&!abilities&&!attacks&&!effect)return '';
    return `<section class="panel verifiedCardGameplay" data-verified-card="${escapeHtml(c?.id||'')}" style="margin-top:14px"><div class="between"><div><span class="eyebrow">VERIFIED GAMEPLAY</span><h3>Card Details</h3></div><span class="pill">${escapeHtml(identityLabel(c))}</span></div>${metrics?`<div class="metricgrid" style="margin-top:10px">${metrics}</div>`:''}${abilities}${attacks}${effect}<p class="muted tiny" style="margin:10px 0 0">Verified gameplay • matched by set + card number + normalized name</p></section>`;
  }

  function clearExisting(root){root?.querySelectorAll?.('.verifiedCardGameplay,.verifiedCardGameplayLoading').forEach(x=>x.remove())}
  function renderFacts(root,c,index){
    if(!root||!c||!index)return false;
    const facts=CardEnrichmentService.factsForCard(c,index);
    clearExisting(root);
    const html=gameplayHtml(c,facts);
    if(!html)return false;
    root.insertAdjacentHTML('beforeend',html);return true;
  }
  function enhance(id){
    const root=document.getElementById('cardModalBody'),c=baseCard(id);if(!root||!c)return;
    root.dataset.enrichmentCardId=String(c.id||id||'');clearExisting(root);
    if(runtime.index){renderFacts(root,c,runtime.index);return}
    const loading=document.createElement('div');loading.className='verifiedCardGameplayLoading muted tiny';loading.style.marginTop='10px';loading.textContent='Loading verified gameplay…';root.appendChild(loading);
    loadRich().then(index=>{
      const current=document.getElementById('cardModalBody');
      if(!current||current.dataset.enrichmentCardId!==String(c.id||id||''))return;
      renderFacts(current,c,index);
    }).catch(()=>{
      const current=document.getElementById('cardModalBody');
      if(current?.dataset.enrichmentCardId===String(c.id||id||''))clearExisting(current);
    });
  }

  function wrap(name){
    const original=window[name];if(typeof original!=='function'||original.__verifiedGameplayWrapped)return false;
    const wrapped=function(id,...rest){
      const result=original.call(this,id,...rest);
      queueMicrotask(()=>{try{enhance(id)}catch(e){console.warn('Card Detail enrichment unavailable; stable card detail preserved.',e)}});
      return result;
    };
    wrapped.__verifiedGameplayWrapped=true;wrapped.__verifiedGameplayOriginal=original;window[name]=wrapped;return true;
  }
  function attach(){return {card:wrap('openCardModal'),collection:wrap('openCollectionCard')}}

  window.PPCVerifiedCardDetail={
    version:'8.64.2',source:'R4PH1/PTCGP-Data',match:'set+number+normalized-name',load:loadRich,enhance,attach,
    factsForCard(c){return runtime.index?CardEnrichmentService.factsForCard(c,runtime.index):null},
    status(){return {loaded:!!runtime.index,richCount:runtime.richCount,error:runtime.error,loadedAt:runtime.loadedAt}}
  };
  attach();setTimeout(attach,0);
})();
