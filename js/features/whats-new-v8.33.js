(function(){
  const VERSION="8.64.1";
  const SEEN_KEY=`ppc_whats_new_seen_${VERSION.replaceAll('.','_')}`;
  const AUTO_KEY="ppc_whats_new_auto";
  function read(key){try{return typeof safeStorageGet==='function'?safeStorageGet(key):localStorage.getItem(key)}catch(e){return null}}
  function write(key,value){try{if(typeof safeStorageSet==='function')return safeStorageSet(key,value);localStorage.setItem(key,value);return true}catch(e){return false}}
  function shouldAutoShow(){return read(AUTO_KEY)!=="off"}
  function close(markSeen=true){
    document.getElementById("ppcWhatsNewBackdrop")?.remove();
    if(markSeen)write(SEEN_KEY,"seen");
  }
  function setAuto(enabled){write(AUTO_KEY,enabled?"on":"off")}
  function open(manual=false){
    if(document.getElementById("ppcWhatsNewBackdrop"))return;
    if(!manual){
      if(!shouldAutoShow()||read(SEEN_KEY)==="seen")return;
      if(document.getElementById("onboardingBackdrop"))return;
      if(typeof state!=="undefined"&&!state?.onboarding?.completed)return;
    }
    const auto=shouldAutoShow();
    const html=`<div class="onboardingBackdrop ppcUpdateBackdrop" id="ppcWhatsNewBackdrop" role="dialog" aria-modal="true" aria-labelledby="whatsNewTitle">
      <section class="onboardingCard ppcUpdateCard">
        <div class="onboardingTop ppcUpdateTop"><div><span class="badge">POCKETNEXUS UPDATE</span><h1 id="whatsNewTitle">A cleaner beta, a bigger Meta read, and better training.</h1><p class="muted">This update focuses on reliability and presentation without changing the data you already saved.</p></div><button class="secondary whatsNewClose" type="button" aria-label="Close What's New">×</button></div>
        <div class="onboardingProgress ppcUpdateProgress" aria-label="Three update highlights"><i class="done"></i><i class="done"></i><i class="done"></i></div>
        <div class="ppcUpdateHero"><div class="ppcUpdateMark"><span class="pocketBallMark"><i></i></span></div><div><span class="eyebrow">LATEST UPDATE</span><h2>A more polished PocketNexus beta</h2><p>Branding, launch surfaces, reliability, Meta tools, Training, and privacy safeguards have all been tightened for the next beta round.</p></div></div>
        <div class="ppcUpdateGrid">
          <article><span>◫</span><div><b>TOURNAMENTS</b><h3>More resilient event browsing</h3><p>Cached tournament data stays usable during refresh failures, empty standings no longer cause repeated reload loops, and the page recovers instead of taking the rest of the app down.</p></div></article>
          <article><span>▦</span><div><b>META</b><h3>Combined Meta + matchup matrix</h3><p>The Meta Center can use a much larger competitive sample and switch between a ranked list and matchup matrix for faster field reads.</p></div></article>
          <article><span>✦</span><div><b>TRAINING</b><h3>Competitive Training refresh</h3><p>Daily card training and Brain Teasers now have clearer progress, stronger hierarchy, and more polished puzzle cards.</p></div></article>
          <article><span>⌁</span><div><b>PRIVACY</b><h3>Safer beta diagnostics</h3><p>Diagnostic exports sanitize token-like values, authorization codes, URL credentials, and sensitive auth fragments before they are stored or shared.</p></div></article>
        </div>
        <div class="onboardingActions ppcUpdateActions"><label class="whatsNewToggle"><input id="whatsNewAutoToggle" type="checkbox" ${auto?'checked':''}><span>Show this window automatically after major updates</span></label><div class="right"><button class="secondary" id="whatsNewDismiss" type="button">Got It</button><button id="whatsNewExplore" type="button">Explore PocketNexus →</button></div></div>
      </section>
    </div>`;
    document.body.insertAdjacentHTML("beforeend",html);
    const root=document.getElementById("ppcWhatsNewBackdrop");
    root.querySelector(".whatsNewClose")?.addEventListener("click",()=>close(true));
    root.querySelector("#whatsNewDismiss")?.addEventListener("click",()=>close(true));
    root.querySelector("#whatsNewExplore")?.addEventListener("click",()=>{close(true);if(typeof goPage==='function')goPage('dashboard')});
    root.querySelector("#whatsNewAutoToggle")?.addEventListener("change",e=>setAuto(!!e.target.checked));
    root.addEventListener("click",e=>{if(e.target===root)close(true)});
    setTimeout(()=>root.querySelector(".whatsNewClose")?.focus(),0);
  }
  function maybeShow(){open(false)}
  window.PPCWhatsNew={open,close,maybeShow,setAuto,version:VERSION};
  if(!window.__ppcWhatsNewEscape){
    window.__ppcWhatsNewEscape=true;
    document.addEventListener("keydown",e=>{if(e.key==='Escape'&&document.getElementById("ppcWhatsNewBackdrop")){e.preventDefault();close(true)}});
  }
})();
