/* PocketNexus v8.79.1 — card detail drawer activation.
   Only card-detail opens use the drawer; shared dialogs/notices keep the centered modal. */
(()=>{
 'use strict';
 const modal=()=>document.getElementById('cardModal');
 function setSide(on){const m=modal();if(m)m.classList.toggle('pnCardSidePanel',!!on)}
 function wrap(name){
   const base=window[name];if(typeof base!=='function'||base.__pnSidePanelWrapped)return false;
   const wrapped=function(...args){setSide(true);return base.apply(this,args)};
   wrapped.__pnSidePanelWrapped=true;wrapped.__pnSidePanelOriginal=base;window[name]=wrapped;return true;
 }
 function install(){const a=wrap('openCardModal'),b=wrap('openCollectionCard');return a||b||!!(window.openCardModal?.__pnSidePanelWrapped||window.openCollectionCard?.__pnSidePanelWrapped)}
 const ui=window.PPCUI;if(ui&&typeof ui.open==='function'&&!ui.open.__pnCenteredDialogWrapped){const base=ui.open;const open=function(...args){setSide(false);return base.apply(this,args)};open.__pnCenteredDialogWrapped=true;ui.open=open}
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){const m=modal();if(m&&m.style.display!=='none')window.closeCardModal?.()}},true);
 window.PPCCardDetailSidePanel={version:'8.79.1',install,setSide};
 let tries=0;const timer=setInterval(()=>{install();if((window.openCardModal?.__pnSidePanelWrapped||window.openCollectionCard?.__pnSidePanelWrapped)&&++tries>5)clearInterval(timer);else if(++tries>80)clearInterval(timer)},100);
 install();
})();
