// PocketNexus v8.79.0 — Deck Manager card-art presentation.
// Presentation-only: preserves existing deck data, sync, filters, actions and editor behavior.
(()=>{
 if(!document.querySelector('link[data-pn-deck-art]')){const l=document.createElement('link');l.rel='stylesheet';l.href='css/deck-manager-art-v8.79.0.css?v=879000';l.dataset.pnDeckArt='true';document.head.appendChild(l)}
 const cardEntries=d=>Object.entries(d?.cards||{}).filter(([,q])=>Number(q)>0);
 const findCard=id=>{const key=String(id||'');return (window.CARDS||[]).find(c=>String(c?.id??c?.cardId??c?.code??'')===key)||null};
 const artForCard=c=>window.ImageService?.fields?.(c)?.[0]||'';
 const artsForDeck=d=>cardEntries(d).map(([id])=>artForCard(findCard(id))).filter(Boolean);
 const safeUrl=url=>String(url||'').replace(/["'()\\\n\r]/g,'');
 function decorate(){
   if(state?.page!=='decks')return;
   const page=document.querySelector('.deckManagerPage');if(!page)return;
   const decks=(state?.decks||[]),cards=[...document.querySelectorAll('.deckManagerCard')],allArts=[];
   decks.forEach(d=>{const arts=artsForDeck(d);allArts.push(...arts);const card=cards.find(el=>el.querySelector('h3')?.textContent===String(d.name||''));if(card&&arts[0])card.style.setProperty('--pn-deck-art',`url("${safeUrl(arts[0])}")`)});
   const hero=[...new Set(allArts)].slice(0,3);
   if(hero.length){
     const layers=hero.map((u,i)=>`linear-gradient(90deg,rgba(7,15,28,${i?'.15':'.55'}),rgba(14,15,35,.12)),url("${safeUrl(u)}")`).join(',');
     page.querySelector('.deckManagerHeader')?.style.setProperty('--pn-deck-hero-art',layers);
     page.querySelector('.deckImportPanel')?.style.setProperty('--pn-import-art',`url("${safeUrl(hero[hero.length-1])}")`);
     const header=page.querySelector('.deckManagerHeader');if(header&&!header.querySelector('.pnDeckArtStrip')){const strip=document.createElement('div');strip.className='pnDeckArtStrip';strip.setAttribute('aria-hidden','true');hero.forEach(u=>{const img=document.createElement('img');img.src=u;img.alt='';img.loading='lazy';img.onerror=()=>img.remove();strip.appendChild(img)});header.appendChild(strip)}
   }
 }
 const base=window.decks;if(typeof base==='function')window.decks=function(){const r=base.apply(this,arguments);requestAnimationFrame(decorate);return r};
 document.addEventListener('click',()=>{if(state?.page==='decks')setTimeout(decorate,0)},true);
 window.PPCDeckManagerArt={version:'8.79.0',decorate};
})();
