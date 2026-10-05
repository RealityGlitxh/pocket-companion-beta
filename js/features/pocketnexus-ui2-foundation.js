/* PocketNexus UI 2.0 — presentation shell only. No backend/state mutations. */
(function(){
'use strict';
if(window.PocketNexusUI2)return;
function page(){
 try{return String(state?.page||document.body.dataset.page||'').replace(/[^a-z0-9_-]/gi,'-').toLowerCase()}catch{return ''}
}
function apply(){
 const p=page();document.documentElement.dataset.pnUi='2';document.body.dataset.pnUi='2';document.body.dataset.pnPage=p;
 const app=document.getElementById('app');if(app){app.dataset.pnUi='2';app.dataset.pnPage=p}
}
const mo=new MutationObserver(apply);mo.observe(document.body,{childList:true,subtree:true});apply();
window.PocketNexusUI2={version:'2.0.0-foundation',apply};
})();