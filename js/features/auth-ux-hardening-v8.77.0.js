/* PocketNexus v8.77.1 — Account authentication UX hardening.
   Additive only: preserves Supabase/session/cloud-sync ownership in the existing
   Account Cloud core/runtime while improving the signed-out Account form. */
(function(){
  'use strict';
  if(window.PPCAuthUXHardening)return;

  const originalAccountPage=window.accountPage;
  const originalEmailSignIn=window.emailSignIn;
  const originalEmailSignUp=window.emailSignUp;
  let signInPending=false;
  let signUpPending=false;

  function friendlyAuthMessage(raw,action='sign-in'){
    const text=String(raw||'').trim();
    const lower=text.toLowerCase();
    if(!text)return action==='sign-up'?'Something went wrong while creating your account. Please try again.':'Something went wrong while signing in. Please try again.';
    if(/invalid login credentials|invalid credentials|email.*password.*invalid|incorrect password/.test(lower))return 'Email or password is incorrect.';
    if(/already registered|already exists|user already registered/.test(lower))return 'An account with this email already exists.';
    if(/rate limit|too many requests|too many attempts|429/.test(lower))return 'Too many attempts. Try again shortly.';
    if(/failed to fetch|network|offline|fetch failed|networkerror|connection/.test(lower))return "PocketNexus couldn't connect. Check your connection and try again.";
    if(/session.*expired|refresh token|invalid refresh token|jwt.*expired/.test(lower))return 'Your session expired. Please sign in again.';
    if(/password.*8|weak password|password should/.test(lower))return 'Use a password of at least 8 characters.';
    if(/invalid.*email|email.*invalid/.test(lower))return 'Enter a valid email address.';
    return action==='sign-up'?'Something went wrong while creating your account. Please try again.':'Something went wrong while signing in. Please try again.';
  }

  function translateMessage(action='sign-in'){
    const el=document.getElementById('authMessage');
    if(!el||!el.textContent?.trim()||!el.classList.contains('dangerBox'))return;
    el.textContent=friendlyAuthMessage(el.textContent,action);
  }

  function setButtonBusy(id,busy,busyText,idleText){
    const btn=document.getElementById(id);if(!btn)return;
    btn.disabled=!!busy;btn.setAttribute('aria-busy',busy?'true':'false');btn.textContent=busy?busyText:idleText;
  }

  function toggleAuthPassword(inputId='authPassword',button){
    const input=document.getElementById(inputId),btn=button||document.getElementById('authPasswordToggle');
    if(!input||!btn)return;
    const revealing=input.type==='password';input.type=revealing?'text':'password';
    btn.setAttribute('aria-pressed',revealing?'true':'false');btn.setAttribute('aria-label',revealing?'Hide password':'Show password');btn.textContent=revealing?'Hide':'Show';
    input.focus({preventScroll:true});
  }

  function enhanceAccountAuthUI(){
    const password=document.getElementById('authPassword'),email=document.getElementById('authEmail');
    if(!password||!email)return;
    let submit=document.querySelector('.accountSignInBtn');
    if(submit&&!submit.id)submit.id='accountEmailSignInBtn';
    submit=document.getElementById('accountEmailSignInBtn')||submit;
    if(submit){submit.type='button';submit.setAttribute('aria-busy',submit.disabled?'true':'false')}
    if(!document.getElementById('authPasswordToggle')){
      const toggle=document.createElement('button');toggle.id='authPasswordToggle';toggle.type='button';toggle.className='secondary authPasswordToggle';
      toggle.setAttribute('aria-label','Show password');toggle.setAttribute('aria-pressed','false');toggle.textContent='Show';
      toggle.addEventListener('click',()=>toggleAuthPassword('authPassword',toggle));password.insertAdjacentElement('afterend',toggle);
    }
    const enterSubmit=e=>{if(e.key!=='Enter'||e.isComposing)return;e.preventDefault();window.emailSignIn?.()};
    if(!email.dataset.authEnterBound){email.dataset.authEnterBound='1';email.addEventListener('keydown',enterSubmit)}
    if(!password.dataset.authEnterBound){password.dataset.authEnterBound='1';password.addEventListener('keydown',enterSubmit)}
  }

  async function hardenedEmailSignIn(){
    if(signInPending||typeof originalEmailSignIn!=='function')return;
    signInPending=true;setButtonBusy('accountEmailSignInBtn',true,'Signing in…','Sign In');
    try{await originalEmailSignIn();translateMessage('sign-in')}
    catch(e){const el=document.getElementById('authMessage');if(el){el.className='dangerBox';el.textContent=friendlyAuthMessage(e?.message,'sign-in')}}
    finally{signInPending=false;setButtonBusy('accountEmailSignInBtn',false,'Signing in…','Sign In')}
  }

  async function hardenedEmailSignUp(){
    if(signUpPending||typeof originalEmailSignUp!=='function')return;
    signUpPending=true;
    try{await originalEmailSignUp();translateMessage('sign-up')}
    catch(e){const el=document.getElementById('authMessage');if(el){el.className='dangerBox';el.textContent=friendlyAuthMessage(e?.message,'sign-up')}}
    finally{signUpPending=false}
  }

  function hardenedAccountPage(){
    const result=typeof originalAccountPage==='function'?originalAccountPage.apply(this,arguments):undefined;
    queueMicrotask(enhanceAccountAuthUI);return result;
  }

  window.accountPage=hardenedAccountPage;window.emailSignIn=hardenedEmailSignIn;window.emailSignUp=hardenedEmailSignUp;window.toggleAuthPassword=toggleAuthPassword;

  /* Account rendering can be invoked through older global bindings. Observe the app
     shell so the accessibility enhancement is applied regardless of which renderer
     initiated the DOM replacement. */
  const app=document.getElementById('app');
  if(app&&window.MutationObserver){
    const observer=new MutationObserver(()=>enhanceAccountAuthUI());
    observer.observe(app,{childList:true,subtree:true});
  }
  queueMicrotask(enhanceAccountAuthUI);
  window.PPCAuthUXHardening={version:'8.77.1',enhance:enhanceAccountAuthUI,friendlyAuthMessage};
})();
