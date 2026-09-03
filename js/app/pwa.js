/* Pocket Companion V8.64.0 — closed beta validation */
(() => {
  const PWA_VERSION = '8.64.0';
  const VALID_DEEP_PAGES = new Set(['dashboard','matches','rank','decks','collection','meta','tournaments','teamwars','stats','optimizer','coach','training','profile','trade','streamer','sync','account','about','more']);
  let deferredInstallPrompt = null, refreshing = false, lastViewportHeight = 0;
  const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const secureEnough = () => location.protocol === 'https:' || ['localhost','127.0.0.1'].includes(location.hostname);
  const cleanUrl = () => location.protocol==='http:'||location.protocol==='https:' ? location.origin+location.pathname : '';
  function notice(message, actionLabel, action){
    document.getElementById('pwaNotice')?.remove(); const el=document.createElement('div'); el.id='pwaNotice'; el.className='pwaNotice'; el.setAttribute('role','status');
    el.innerHTML=`<div><strong>Pocket Companion</strong><span>${message}</span></div>${actionLabel?`<button type="button" id="pwaNoticeAction">${actionLabel}</button>`:''}<button type="button" class="pwaNoticeClose" aria-label="Dismiss">×</button>`;
    document.body.appendChild(el); el.querySelector('.pwaNoticeClose')?.addEventListener('click',()=>el.remove()); if(actionLabel)el.querySelector('#pwaNoticeAction')?.addEventListener('click',()=>{action?.();el.remove()});
  }
  function installButton(){if(isStandalone()||document.getElementById('pwaInstallButton'))return;const tools=document.querySelector('.headerTools');if(!tools)return;const b=document.createElement('button');b.id='pwaInstallButton';b.className='pwaInstallButton';b.type='button';b.textContent='Install';b.hidden=!deferredInstallPrompt;b.addEventListener('click',async()=>{if(!deferredInstallPrompt)return;deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;b.hidden=true});tools.insertBefore(b,tools.firstChild)}
  function routeFromUrl(){
    try{const u=new URL(location.href), requested=(u.searchParams.get('page')||'').toLowerCase(); if(!requested)return;
      const page=requested==='battle'?'matches':requested; if(!VALID_DEEP_PAGES.has(page))return;
      if(typeof state!=='object'||!state)return; state.page=page;
      if(page==='matches'&&requested==='battle'&&state.battlePrefs)state.battlePrefs.experienceMode='standard';
      try{save?.()}catch{} try{render?.()}catch{};
      u.searchParams.delete('page');u.searchParams.delete('source');history.replaceState({},'',u.pathname+(u.searchParams.size?'?'+u.searchParams.toString():'')+u.hash);
    }catch(e){console.warn('[PWA] deep link ignored',e)}
  }
  function authRedirectUrl(){
    const base=cleanUrl(); if(!base)return '';
    try{const page=(typeof state==='object'&&VALID_DEEP_PAGES.has(state?.page))?state.page:'dashboard';const u=new URL(base);u.searchParams.set('page',page);u.searchParams.set('source','auth');return u.toString()}catch{return base}
  }
  async function share(data={}){
    const payload={title:data.title||'Pocket Companion',text:data.text||'',url:data.url||cleanUrl()||location.href};
    try{if(navigator.share){await navigator.share(payload);return true}if(navigator.clipboard?.writeText){await navigator.clipboard.writeText([payload.text,payload.url].filter(Boolean).join('\n'));notice('Share text copied to your clipboard.');return true}}catch(e){if(e?.name==='AbortError')return false;console.warn('[PWA] share failed',e)}
    notice('Sharing is not available in this browser.');return false;
  }
  function viewportReady(){
    const vv=window.visualViewport;if(!vv)return;const h=Math.round(vv.height);document.documentElement.style.setProperty('--ppc-visual-height',`${h}px`);const keyboard=window.innerHeight-h>140;document.documentElement.classList.toggle('mobileKeyboardOpen',keyboard);lastViewportHeight=h;
  }
  function resume(){document.documentElement.classList.toggle('pwaStandalone',isStandalone());viewportReady();if(navigator.onLine&&typeof cloudClient!=='undefined'&&cloudClient){cloudClient.auth?.getSession?.().then(({data})=>{if(data?.session&&typeof cloudSession!=='undefined')cloudSession=data.session}).catch(()=>{})}}
  function readinessReport(){
    const manifest=document.querySelector('link[rel="manifest"]');
    const checks={
      secureContext: secureEnough(),
      serviceWorker: 'serviceWorker' in navigator,
      manifest: !!manifest,
      viewport: !!document.querySelector('meta[name="viewport"]'),
      webShare: !!navigator.share,
      standalone: isStandalone(),
      online: navigator.onLine,
      safeArea: CSS?.supports?.('padding-bottom: env(safe-area-inset-bottom)') ?? false
    };
    const runtimeErrors=window.PPCLaunch?.getRuntimeErrors?.()||[];
    return {version:PWA_VERSION,checks,passed:Object.entries(checks).filter(([k])=>!['webShare','standalone','online'].includes(k)).every(([,v])=>!!v),runtimeErrorCount:runtimeErrors.length,screen:{width:screen.width,height:screen.height,pixelRatio:devicePixelRatio||1},viewport:{width:innerWidth,height:innerHeight}};
  }
  window.PPCMobile={version:PWA_VERSION,isStandalone,share,authRedirectUrl,routeFromUrl,readinessReport};
  window.ppcMobileShare=share;
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;installButton();const b=document.getElementById('pwaInstallButton');if(b)b.hidden=false});
  window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;document.getElementById('pwaInstallButton')?.remove();localStorage.setItem('ppc_pwa_installed',PWA_VERSION)});
  window.addEventListener('online',()=>{notice('Back online. Live features can reconnect.');resume()}); window.addEventListener('offline',()=>notice('You’re offline. Cached app screens, card data, and recent artwork remain available.'));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)resume()}); window.addEventListener('pageshow',resume); window.visualViewport?.addEventListener('resize',viewportReady); window.visualViewport?.addEventListener('scroll',viewportReady);
  window.addEventListener('load',()=>{routeFromUrl();resume();setTimeout(routeFromUrl,250)});
  if('serviceWorker' in navigator&&secureEnough()){
    navigator.serviceWorker.addEventListener('controllerchange',()=>{if(refreshing)return;refreshing=true;location.reload()});
    window.addEventListener('load',async()=>{try{const reg=await navigator.serviceWorker.register('./sw.js',{scope:'./'});const promptUpdate=w=>notice('A new version is ready.','Update',()=>w.postMessage({type:'SKIP_WAITING'}));if(reg.waiting)promptUpdate(reg.waiting);reg.addEventListener('updatefound',()=>{const w=reg.installing;if(!w)return;w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)promptUpdate(w)})});setInterval(()=>reg.update().catch(()=>{}),60*60*1000)}catch(err){console.warn('[PWA] service worker registration failed',err)}installButton();const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);if(ios&&!isStandalone()&&!localStorage.getItem('ppc_ios_install_hint')){localStorage.setItem('ppc_ios_install_hint','1');setTimeout(()=>notice('On iPhone/iPad, use Share → Add to Home Screen to install the app.'),1400)}});
  }
  const ERROR_KEY='ppc_runtime_errors_v8640';
  function recordRuntimeError(kind,message,source,line){try{const rows=JSON.parse(localStorage.getItem(ERROR_KEY)||'[]');rows.push({at:new Date().toISOString(),kind,message:String(message||'Unknown error').slice(0,500),source:String(source||'').split('/').pop(),line:Number(line)||0,page:(typeof state==='object'&&state?.page)||'unknown'});localStorage.setItem(ERROR_KEY,JSON.stringify(rows.slice(-20)));}catch{}}
  window.addEventListener('error',e=>recordRuntimeError('error',e.message,e.filename,e.lineno));
  window.addEventListener('unhandledrejection',e=>recordRuntimeError('promise',e.reason?.message||e.reason||'Unhandled promise rejection','',0));
  const BETA_SESSION_KEY='ppc_beta_session_v8640';
  function betaSession(){try{let x=JSON.parse(sessionStorage.getItem(BETA_SESSION_KEY)||'null');if(!x){x={id:'B-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,7).toUpperCase(),started_at:new Date().toISOString()};sessionStorage.setItem(BETA_SESSION_KEY,JSON.stringify(x))}return x}catch{return{id:'B-LOCAL',started_at:new Date().toISOString()}}}
  async function storageEstimate(){try{if(!navigator.storage?.estimate)return null;const x=await navigator.storage.estimate();return {usage:x.usage||0,quota:x.quota||0,percent:x.quota?Math.round((x.usage/x.quota)*1000)/10:0}}catch{return null}}
  window.PPCLaunch={version:PWA_VERSION,betaSession,getRuntimeErrors:()=>{try{return JSON.parse(localStorage.getItem(ERROR_KEY)||'[]')}catch{return[]}},clearRuntimeErrors:()=>localStorage.removeItem(ERROR_KEY),storageEstimate};
})();
