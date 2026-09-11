/* PocketNexus V8.73.6 — Pocket Coach route render guard.
   Prevents delayed provider/history callbacks from replacing another route's DOM. */
(function(){
'use strict';
if(window.PPCPocketCoachRouteRenderGuard)return;
const ALLOWED=new Set(['coach','pocket-coach','pocketcoach']);
function onCoachRoute(){
  try{return ALLOWED.has(String(window.state?.page||'').toLowerCase())}catch{return false}
}
function install(){
  const base=window.pocketCoachPage;
  if(typeof base!=='function')return false;
  if(base.__routeGuarded)return true;
  function guardedPocketCoachPage(){
    if(!onCoachRoute())return;
    return base.apply(this,arguments);
  }
  guardedPocketCoachPage.__routeGuarded=true;
  guardedPocketCoachPage.__base=base;
  window.pocketCoachPage=guardedPocketCoachPage;
  return true;
}
let attempts=0;
const timer=setInterval(()=>{if(install()||++attempts>120)clearInterval(timer)},50);
install();
window.PPCPocketCoachRouteRenderGuard={version:'8.73.6',install,onCoachRoute};
})();
