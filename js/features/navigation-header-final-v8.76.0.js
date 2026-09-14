/* PocketNexus v8.76.0 — Navigation / Header Final Polish */
(function(){
  'use strict';
  if(window.__PPC_NAV_HEADER_FINAL_8760)return;
  window.__PPC_NAV_HEADER_FINAL_8760=true;

  const VERSION='8.76.0';
  const originalNav=window.nav;
  const originalOpenSearch=window.openGlobalSearch;

  function isSignedIn(){return !!(window.state?.user||window.cloudSession?.user)}
  function isEditable(target){return !!target?.closest?.('input,textarea,select,[contenteditable="true"]')}
  function closeSearchSafe(){try{window.closeGlobalSearch?.()}catch{}}
  function closeMenusSafe(){try{window.closeHeaderMenus?.()}catch{}}

  function goHome(){
    if(isSignedIn()){
      try{window.headerNavigate?.('dashboard')}catch{try{window.goPage?.('dashboard')}catch{}}
      return;
    }
    document.getElementById('staticEntry')?.scrollIntoView?.({block:'start',behavior:'smooth'});
    setTimeout(()=>document.getElementById('entryEmail')?.focus?.(),120);
  }

  function logoFallback(){
    const brand=document.querySelector('.appBrand');
    const img=brand?.querySelector('.appBrandLogo');
    if(!brand||!img)return;
    if(!brand.querySelector('.appBrandFallback')){
      const fallback=document.createElement('span');
      fallback.className='appBrandFallback';fallback.setAttribute('aria-hidden','true');fallback.textContent='PN';
      img.insertAdjacentElement('afterend',fallback);
    }
    if(!img.dataset.fallbackBound){
      img.dataset.fallbackBound='1';
      img.addEventListener('error',()=>brand.classList.add('logoFailed'),{once:true});
      img.addEventListener('load',()=>brand.classList.remove('logoFailed'));
    }
    brand.onclick=goHome;
    brand.setAttribute('aria-label','PocketNexus Home');
  }

  function searchButtonPolish(){
    const button=document.getElementById('globalSearchButton');
    if(!button)return;
    const text=button.querySelector('.globalSearchButtonText');
    const kbd=button.querySelector('kbd');
    if(text)text.textContent='Search';
    if(kbd)kbd.textContent=/Mac|iPhone|iPad/i.test(navigator.platform||navigator.userAgent||'')?'⌘ K':'Ctrl K';
    button.setAttribute('aria-label','Search PocketNexus');
    button.setAttribute('title','Search PocketNexus');
  }

  function signedOutControl(){
    const userRoot=document.getElementById('user');
    if(!userRoot)return;
    if(isSignedIn())return;
    if(userRoot.querySelector('.headerSignIn'))return;
    userRoot.innerHTML='<button class="headerSignIn" type="button" aria-label="Sign in to PocketNexus">Sign In</button>';
    userRoot.querySelector('.headerSignIn')?.addEventListener('click',()=>{
      document.getElementById('staticEntry')?.scrollIntoView?.({block:'start',behavior:'smooth'});
      setTimeout(()=>document.getElementById('entryEmail')?.focus?.(),120);
    });
  }

  function groupUtilityMenu(){
    const menu=document.querySelector('.headerUtilityDropdown');
    if(!menu||menu.dataset.grouped8760==='1')return;
    const buttons=[...menu.querySelectorAll(':scope > .navCategoryItem')];
    if(!buttons.length)return;
    const groups=[
      ['ACCOUNT',['Account & Cloud']],
      ['TOOLS',['Pocket Sync','Search','Trade','Streamer']],
      ['APPLICATION',['Settings']],
      ['INFORMATION',['About & Privacy']]
    ];
    const byTitle=new Map(buttons.map(btn=>[btn.querySelector('strong')?.textContent?.trim()||'',btn]));
    const frag=document.createDocumentFragment();
    groups.forEach(([label,titles])=>{
      const matches=titles.map(t=>byTitle.get(t)).filter(Boolean);
      if(!matches.length)return;
      const heading=document.createElement('div');heading.className='headerUtilityGroupLabel';heading.textContent=label;heading.setAttribute('role','presentation');
      frag.appendChild(heading);matches.forEach(btn=>frag.appendChild(btn));
    });
    buttons.filter(btn=>!frag.contains(btn)).forEach(btn=>frag.appendChild(btn));
    menu.replaceChildren(frag);
    menu.dataset.grouped8760='1';
  }

  function accountLabels(){
    const chip=document.querySelector('.userChip');
    if(chip){chip.setAttribute('aria-label','Open public Profiles');chip.setAttribute('title','Profiles')}
    const cog=document.querySelector('.headerUtilityButton');
    if(cog){cog.setAttribute('aria-label','Open Settings and account tools');cog.setAttribute('title','Settings and account tools')}
  }

  function activeStatePolish(){
    document.querySelectorAll('.navPrimaryBtn,.mobileBottomNav button').forEach(btn=>{
      if(btn.classList.contains('active'))btn.setAttribute('aria-current','page');
      else if(btn.getAttribute('aria-current')==='page')btn.removeAttribute('aria-current');
    });
    document.querySelectorAll('.navCategory').forEach(details=>{
      const summary=details.querySelector(':scope > summary');
      if(summary)summary.setAttribute('aria-expanded',details.open?'true':'false');
    });
  }

  function bindMenuSafety(){
    document.querySelectorAll('.navCategory').forEach(details=>{
      if(details.dataset.navSafety8760)return;
      details.dataset.navSafety8760='1';
      details.addEventListener('toggle',()=>{
        const summary=details.querySelector(':scope > summary');
        summary?.setAttribute('aria-expanded',details.open?'true':'false');
        if(details.open){closeSearchSafe();try{window.closeHeaderMenus?.(details)}catch{}}
      });
    });
  }

  function enhanceSearchPanel(){
    const input=document.getElementById('globalSearchInput');
    if(!input)return;
    input.placeholder='Search';input.setAttribute('aria-label','Search PocketNexus');
    const results=document.getElementById('globalSearchResults');
    if(results)results.setAttribute('aria-live','polite');
    const root=input.closest('[role="dialog"],.globalSearchDialog,.globalSearchModal,.globalSearchPanel');
    root?.setAttribute('aria-label','PocketNexus Search');
  }

  function polishHeader(){
    logoFallback();searchButtonPolish();signedOutControl();groupUtilityMenu();accountLabels();activeStatePolish();bindMenuSafety();
    document.querySelector('.appHeader')?.setAttribute('data-nav-version',VERSION);
  }

  if(typeof originalNav==='function'){
    window.nav=function(){
      const out=originalNav.apply(this,arguments);
      polishHeader();
      return out;
    };
  }

  if(typeof originalOpenSearch==='function'){
    window.openGlobalSearch=function(prefill=''){
      closeMenusSafe();
      const out=originalOpenSearch.call(this,prefill);
      setTimeout(enhanceSearchPanel,0);
      return out;
    };
  }

  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&String(e.key).toLowerCase()==='k'&&!e.altKey){
      if(isEditable(e.target))return;
      e.preventDefault();closeMenusSafe();
      try{window.openGlobalSearch?.()}catch{}
      setTimeout(()=>document.getElementById('globalSearchInput')?.focus?.(),0);
      return;
    }
    if(e.key==='Escape'){
      closeMenusSafe();
      try{window.closeMobileMoreSheet?.()}catch{}
      if(document.getElementById('globalSearchInput'))closeSearchSafe();
    }
  });

  document.addEventListener('click',e=>{
    const backdrop=e.target?.closest?.('.globalSearchBackdrop,.globalSearchModalBackdrop,.searchBackdrop');
    if(backdrop&&e.target===backdrop)closeSearchSafe();
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',polishHeader,{once:true});
  else polishHeader();
})();
