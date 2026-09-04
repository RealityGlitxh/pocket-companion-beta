/* PocketNexus V8.64.1 Hotfix 14 — interaction shield recovery */
(function(){
  'use strict';
  const LOG_KEY='__ppcInteractionGuard';
  const knownOverlayIds=new Set(['globalSearchOverlay','ppcWhatsNewBackdrop','onboardingBackdrop','cardModal','mobileMoreBackdrop']);
  function log(kind,detail){
    try{
      window[LOG_KEY]=window[LOG_KEY]||[];
      window[LOG_KEY].push({at:new Date().toISOString(),kind,detail});
      if(window[LOG_KEY].length>20)window[LOG_KEY].shift();
      console.warn('[PocketNexus interaction guard]',kind,detail||'');
    }catch(_){ }
  }
  function rectArea(r){return Math.max(0,r.width)*Math.max(0,r.height)}
  function viewportArea(){return Math.max(1,window.innerWidth*window.innerHeight)}
  function isVisible(el){
    if(!el||!el.isConnected)return false;
    const s=getComputedStyle(el);
    if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0)return false;
    const r=el.getBoundingClientRect();
    return r.width>1&&r.height>1;
  }
  function isIntentionalOverlay(el){
    if(!el)return false;
    const root=el.closest?.('#globalSearchOverlay,#ppcWhatsNewBackdrop,#onboardingBackdrop,#cardModal,#mobileMoreBackdrop');
    if(!root)return false;
    if(root.id==='cardModal'&&getComputedStyle(root).display==='none')return false;
    return isVisible(root);
  }
  function neutralizeUnexpectedShield(el,reason){
    if(!el||!el.isConnected)return false;
    if(isIntentionalOverlay(el))return false;
    const r=el.getBoundingClientRect();
    const s=getComputedStyle(el);
    const areaRatio=rectArea(r)/viewportArea();
    const tag=el.tagName;
    const interactive=tag==='BUTTON'||tag==='A'||tag==='SUMMARY'||el.getAttribute('role')==='button'||s.cursor==='pointer';
    const layered=s.position==='fixed'||s.position==='absolute'||Number.parseInt(s.zIndex||'0',10)>=60;
    if(interactive&&layered&&areaRatio>.55){
      el.style.setProperty('pointer-events','none','important');
      log('disabled-unexpected-click-shield',{reason,tag,id:el.id,className:String(el.className||''),areaRatio:Number(areaRatio.toFixed(2)),position:s.position,zIndex:s.zIndex});
      return true;
    }
    return false;
  }
  function sweep(){
    const points=[
      [innerWidth*.5,Math.min(innerHeight-1,110)],
      [innerWidth*.25,innerHeight*.25],
      [innerWidth*.5,innerHeight*.45],
      [innerWidth*.75,innerHeight*.65]
    ];
    let fixed=0;
    for(const [x,y] of points){
      const stack=document.elementsFromPoint(Math.max(0,x),Math.max(0,y));
      for(const el of stack.slice(0,4)){
        if(neutralizeUnexpectedShield(el,'startup-sweep')){fixed++;break;}
      }
    }
    document.querySelectorAll('#globalSearchOverlay,#ppcWhatsNewBackdrop,#onboardingBackdrop,#mobileMoreBackdrop').forEach(root=>{
      if(!knownOverlayIds.has(root.id))return;
      const s=getComputedStyle(root),r=root.getBoundingClientRect();
      const visuallyGone=s.visibility==='hidden'||Number(s.opacity)===0||r.width<2||r.height<2;
      if(visuallyGone&&s.pointerEvents!=='none'){
        root.style.setProperty('pointer-events','none','important');
        log('disabled-invisible-overlay',{id:root.id});
      }
    });
    return fixed;
  }
  document.addEventListener('pointerdown',function(e){
    const t=e.target;
    if(neutralizeUnexpectedShield(t,'pointerdown')){
      e.preventDefault();e.stopImmediatePropagation();
      const underneath=document.elementFromPoint(e.clientX,e.clientY);
      if(underneath&&underneath!==t){
        requestAnimationFrame(()=>underneath.click?.());
      }
    }
  },true);
  window.PPCInteractionGuard={sweep,log,getLog:()=>((window[LOG_KEY]||[]).slice())};
  const run=()=>{sweep();setTimeout(sweep,250);setTimeout(sweep,1200)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
