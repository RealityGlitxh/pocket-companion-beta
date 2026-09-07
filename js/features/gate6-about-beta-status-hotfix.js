/* PocketNexus Gate #6 — minimal About beta-status stabilization. */
(function(){
  const original=window.aboutPage;
  if(typeof original!=='function')return;
  window.aboutPage=function(){
    original.apply(this,arguments);
    const root=document.getElementById('app');
    if(!root||root.querySelector('[data-gate6-beta-status]'))return;
    const heading=root.querySelector('.between > div');
    if(!heading)return;
    heading.insertAdjacentHTML('beforeend','<p class="muted tiny" data-gate6-beta-status><strong>Closed beta status:</strong> PocketNexus is being stabilized for V8.65 RC1, hosted regression, real-device testing, and Closed Beta.</p>');
  };
})();
