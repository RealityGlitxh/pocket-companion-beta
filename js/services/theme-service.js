/* PocketNexus — V8.12.2 Dark Neutral Theme Service */
(function(){
  "use strict";
  const DARK="dark";
  function applyDark(){
    document.documentElement.dataset.theme=DARK;
    document.documentElement.style.colorScheme="dark";
    try{localStorage.setItem("ppc_theme_v1",DARK)}catch(_){}
    window.dispatchEvent(new CustomEvent("ppc:themechange",{detail:{theme:DARK}}));
    return DARK;
  }
  function buildControl(){
    const host=document.getElementById("themeControl");
    if(host){host.innerHTML='<span class="darkModeBadge" title="Dark mode is used across the app">Dark</span>';host.dataset.ready="1";}
    applyDark();
  }
  window.ThemeService={themes:[DARK],getTheme:()=>DARK,setTheme:()=>applyDark()};
  applyDark();
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",buildControl,{once:true});else buildControl();
})();
