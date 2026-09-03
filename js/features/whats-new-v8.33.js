(function(){
  const VERSION="8.33.1";
  const SEEN_KEY=`ppc_whats_new_seen_${VERSION.replace('.','_')}`;
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
    const html=`<div class="whatsNewBackdrop" id="ppcWhatsNewBackdrop" role="dialog" aria-modal="true" aria-labelledby="whatsNewTitle">
      <section class="whatsNewModal">
        <button class="whatsNewClose" type="button" aria-label="Close What's New">×</button>
        <div class="whatsNewHero">
          <div class="whatsNewCopy"><span class="eyebrow">WHAT'S NEW • V${VERSION}</span><h1 id="whatsNewTitle">Battle Tracker and Gym Battle are now cleanly separated.</h1><p>Battle Tracker now opens directly into standard match recording, while Gym Battle opens directly into the team format. The redundant mode switch has been removed.</p></div>
          <div class="updateCardFan" aria-hidden="true"><i class="updateCard u1"><b>20</b><span>DECK</span></i><i class="updateCard u2"><b>VS</b><span>BATTLE</span></i><i class="updateCard u3"><b>♜</b><span>EVENT</span></i></div>
        </div>
        <div class="whatsNewGrid">
          <article class="whatsNewFeature featured"><span>⌂</span><div><b>NEW</b><h3>Direct Battle Routes</h3><p>Battle Tracker and Gym Battle now open as separate experiences instead of asking you to choose the mode twice.</p></div></article>
          <article class="whatsNewFeature"><span>◉</span><div><h3>Cleaner Battle Tracker</h3><p>The Standard Match / Gym Battle toggle is gone. Battle Tracker is focused only on normal ranked and casual matches.</p></div></article>
          <article class="whatsNewFeature"><span>◆</span><div><h3>Dedicated Gym Battle</h3><p>Gym Battle opens directly from Play and keeps its own setup, history, and Pairing Lab connection.</p></div></article>
          <article class="whatsNewFeature"><span>⚙</span><div><h3>Less Duplicate Navigation</h3><p>The Play menu is now the single place to choose Battle Tracker, Rank, or Gym Battle.</p></div></article>
        </div>
        <div class="whatsNewFooter"><label class="whatsNewToggle"><input id="whatsNewAutoToggle" type="checkbox" ${auto?'checked':''}><span>Show What's New automatically after major updates</span></label><div class="row"><button class="secondary" id="whatsNewDismiss" type="button">Got It</button><button id="whatsNewExplore" type="button">Explore Home →</button></div></div>
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
