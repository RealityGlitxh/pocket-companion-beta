(()=>{
'use strict';
if(window.PPCDeckBuilderInteraction)return;
let selectedId='';
function escText(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function currentDeck(){return (window.state?.decks||[]).find(d=>d.id===window.state?.selected)||null}
function preview(id){
 const c=typeof window.card==='function'?window.card(id):null;
 const pane=document.getElementById('pnBuilderCardPreview');
 if(!pane||!c)return;
 selectedId=String(c.id||id);
 const d=currentDeck();
 const qty=d&&typeof window.nameCount==='function'?window.nameCount(d,c.name):0;
 const full=d&&typeof window.deckCount==='function'?window.deckCount(d)>=20:false;
 const capped=qty>=2;
 const image=typeof window.imageTag==='function'?window.imageTag(c,'full'):'';
 pane.innerHTML=`<div class="pnBuilderPreviewHead"><span class="eyebrow">SELECTED CARD</span><span class="pill">${qty}/2 in deck</span></div><div class="pnBuilderPreviewArt">${image}</div><div class="pnBuilderPreviewInfo"><h2>${escText(c.name)}</h2><p>${escText(c.setCode||'')} #${escText(c.number||'')} ${c.rarity?`• ${escText(c.rarity)}`:''}</p><div class="pnBuilderPreviewTags"><span>${escText(c.category||'Card')}</span>${c.stage?`<span>${escText(c.stage)}</span>`:''}</div><div class="pnBuilderPreviewActions"><button class="secondary" ${qty?'':'disabled'} data-pn-builder-remove="${escText(c.id)}">− Remove</button><button ${full||capped?'disabled':''} data-pn-builder-add="${escText(c.id)}">${capped?'2/2':full?'Deck Full':'+ Add Card'}</button></div><button class="secondary pnBuilderViewDetails" data-pn-builder-view="${escText(c.id)}">View card details</button></div>`;
 document.querySelectorAll('.builderDraggableCard.isPreviewed').forEach(el=>el.classList.remove('isPreviewed'));
 document.querySelector(`.builderDraggableCard[data-card-id="${CSS.escape(selectedId)}"]`)?.classList.add('isPreviewed');
}
function ensure(){
 const split=document.querySelector('.builderSplit');
 if(!split)return;
 split.classList.add('pnInteractiveBuilder');
 let pane=document.getElementById('pnBuilderCardPreview');
 if(!pane){
   pane=document.createElement('aside');pane.id='pnBuilderCardPreview';pane.className='pnBuilderCardPreview';
   const deck=split.querySelector('.builderDeckPane');split.insertBefore(pane,deck);
 }
 if(selectedId&&typeof window.card==='function'&&window.card(selectedId))preview(selectedId);
 else{
   const first=document.querySelector('.builderDraggableCard[data-card-id]');
   if(first)preview(first.dataset.cardId);else pane.innerHTML='<div class="pnBuilderPreviewEmpty"><strong>Select a card</strong><span>Hover or click a card in the library to preview it here.</span></div>';
 }
}
function install(){
 if(typeof window.renderEditorShell!=='function'||typeof window.renderCatalog!=='function')return false;
 if(!window.renderEditorShell.__pnInteractionWrapped){
   const base=window.renderEditorShell;
   const wrapped=function(...args){const out=base.apply(this,args);queueMicrotask(ensure);return out};
   wrapped.__pnInteractionWrapped=true;window.renderEditorShell=wrapped;
 }
 if(!window.renderCatalog.__pnInteractionWrapped){
   const base=window.renderCatalog;
   const wrapped=function(...args){const out=base.apply(this,args);queueMicrotask(ensure);return out};
   wrapped.__pnInteractionWrapped=true;window.renderCatalog=wrapped;
 }
 ensure();return true;
}
document.addEventListener('pointerover',e=>{const cardEl=e.target.closest?.('.builderDraggableCard[data-card-id]');if(cardEl)preview(cardEl.dataset.cardId)},true);
document.addEventListener('click',e=>{
 const add=e.target.closest?.('[data-pn-builder-add]');if(add){e.preventDefault();window.addCard?.(add.dataset.pnBuilderAdd);return}
 const rem=e.target.closest?.('[data-pn-builder-remove]');if(rem){e.preventDefault();window.removeCard?.(rem.dataset.pnBuilderRemove);return}
 const view=e.target.closest?.('[data-pn-builder-view]');if(view){e.preventDefault();window.openCardModal?.(view.dataset.pnBuilderView);return}
 const cardEl=e.target.closest?.('.builderDraggableCard[data-card-id]');
 if(cardEl&&!e.target.closest('button'))preview(cardEl.dataset.cardId);
},true);
document.addEventListener('dblclick',e=>{const cardEl=e.target.closest?.('.builderDraggableCard[data-card-id]');if(cardEl&&!e.target.closest('button')){e.preventDefault();window.addCard?.(cardEl.dataset.cardId)}},true);
window.PPCDeckBuilderInteraction={version:'8.79.0',install,preview};
let tries=0;const timer=setInterval(()=>{if(install()||++tries>80)clearInterval(timer)},100);
})();