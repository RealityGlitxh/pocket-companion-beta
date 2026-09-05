/* PocketNexus V8.67.7 — resilient inline OBS preview guard
   Ensures Ranked Streamer always embeds the real overlay.html output in-page. */
(function(){
  'use strict';
  if(window.PPCStreamerInlineOverlayGuard)return;

  function safe(fn){try{return fn()}catch{return null}}
  function ensureStyle(){
    if(document.querySelector('link[data-pn-obs-embed]'))return;
    const l=document.createElement('link');l.rel='stylesheet';l.href='css/streamer-obs-embed-v8.67.6.css?v=867707';l.dataset.pnObsEmbed='true';document.head.appendChild(l);
  }
  function isRanked(){try{return state?.page==='streamer'&&(state?.streamer?.overlayMode||'ranked')==='ranked'}catch{return false}}
  function findObsPanel(){
    const preview=document.getElementById('streamPreview');
    if(preview)return preview.closest('.panel')||preview.parentElement;
    return [...document.querySelectorAll('#app .panel')].find(p=>/copy obs source|open overlay|waiting for overlay|overlay connected/i.test(p.textContent||''))||null;
  }
  function installInline(){
    if(!isRanked())return false;
    ensureStyle();
    const obs=findObsPanel();if(!obs)return false;
    const legacy=obs.querySelector('#streamPreview,.streamPreview');
    if(legacy){legacy.hidden=true;legacy.classList.add('rankedLegacyPreview');legacy.style.display='none'}
    let shell=obs.querySelector('.rankedRealObsShell');
    if(!shell){
      shell=document.createElement('div');shell.className='rankedRealObsShell';
      shell.innerHTML='<div class="rankedRealObsBar"><span><i></i>ACTUAL OBS OUTPUT</span><small>Live preview — no extra tab required.</small></div><div class="rankedRealObsViewport"><iframe id="rankedRealObsPreview" title="Live OBS overlay preview" src="overlay.html?embedded=1&v=867707" loading="eager"></iframe></div>';
      obs.appendChild(shell);
      shell.querySelector('iframe')?.addEventListener('load',()=>safe(()=>publishStreamerOverlayState()));
    }
    safe(()=>publishStreamerOverlayState());
    return true;
  }
  function wrap(name){
    const fn=window[name];if(typeof fn!=='function'||fn.__inlineObsGuard)return;
    function wrapped(){const out=fn.apply(this,arguments);requestAnimationFrame(()=>requestAnimationFrame(installInline));return out}
    wrapped.__inlineObsGuard=true;wrapped.__base=fn;window[name]=wrapped;
  }
  function hook(){wrap('streamerPage');wrap('updateStreamerSetting');wrap('setStreamerPreset');installInline()}
  let tries=0;const t=setInterval(()=>{hook();if(++tries>200)clearInterval(t)},50);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)installInline()});
  window.addEventListener('pageshow',installInline);
  window.PPCStreamerInlineOverlayGuard={version:'8.67.7',apply:installInline};
})();
