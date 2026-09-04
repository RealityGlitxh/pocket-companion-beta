function accountPage(){
 setTimeout(addOnboardingAccountPanel,0);
 const app=document.getElementById("app");
 if(!cloudConfigured()){
   app.innerHTML=`<div class="accountPageShell"><div class="accountPageHead"><span class="eyebrow">ACCOUNT & CLOUD</span><h1>Keep your PocketNexus data with you</h1><p class="muted">Your local decks, Collection, matches, rank, and settings are still available on this device.</p></div><section class="panel accountPrimaryCard"><span class="badge">CLOUD NOT CONNECTED</span><h2>Cloud sync needs to be configured</h2><p>This copy of PocketNexus can still be used locally. Cloud sign-in and cross-device restore will become available once the site's cloud connection is configured.</p><div class="successBox"><strong>Your local data is safe.</strong><br>Nothing is uploaded automatically.</div></section></div>`;
   return;
 }
 if(!cloudSession?.user){
   app.innerHTML=`<div class="accountPageShell"><div class="accountPageHead"><span class="eyebrow">ACCOUNT & CLOUD</span><h1>Welcome back</h1><p class="muted">Sign in to use supported cloud backup and restore across devices.</p></div><section class="accountSignInLayout"><div class="panel accountPrimaryCard"><h2>Sign in with email</h2><label>Email<input id="authEmail" type="email" autocomplete="email" placeholder="you@example.com"></label><label>Password<input id="authPassword" type="password" autocomplete="current-password" placeholder="Password"></label><button class="accountSignInBtn" onclick="emailSignIn()">Sign In</button><button class="linkBtn accountForgot" onclick="resetPassword()">Forgot password?</button><div class="entryDivider"><span>or</span></div><div class="accountSocialGrid"><button class="secondary" onclick="googleSignIn()">Continue with Google</button><button class="secondary" onclick="accountAppleSignIn()">Continue with Apple</button></div><p class="accountCreatePrompt">New to PocketNexus? <button class="linkBtn" onclick="emailSignUp()">Create an account</button></p><div id="authMessage"></div></div><aside class="panel accountPrivacyNote"><span class="eyebrow">YOUR DATA</span><h2>You control when data moves</h2><p>Signing in does not automatically replace or upload the gameplay data already in this browser.</p><p class="muted">Use Account & Cloud after sign-in to create a cloud copy, restore data, or safely merge devices.</p></aside></section></div>`;
   return;
 }
 const u=cloudSession.user,p=cloudProfile||{};
 app.innerHTML=`<div class="accountPageShell">${recoveryPasswordPanel()}<div class="between accountSignedInHead"><div><span class="eyebrow">ACCOUNT & CLOUD</span><h1>${esc(p.display_name||"Your profile")}</h1><p class="muted">${esc(u.email||"Signed in")}</p></div><button class="secondary" onclick="signOutEverywhere()">Sign Out</button></div><section class="accountSignedInGrid"><div class="panel"><span class="eyebrow">PUBLIC IDENTITY</span><h2>Profile moved to Profiles</h2><p class="muted">Edit your public name, username, avatar, banner, bio, privacy, achievements, and featured decks from the Profiles tab.</p><button style="margin-top:12px" onclick="headerNavigate('profile')">Open Profiles</button></div><div class="panel accountStatusCard"><div class="statusHeadline"><span class="statusDot live"></span><div><span class="eyebrow">SYNC STATUS</span><h2>Signed in</h2><p><strong>Ready for supported cloud sync</strong></p></div></div><p class="muted">Your account can back up and restore supported PocketNexus data across devices.</p><details class="technicalDetails"><summary>Account ID</summary><p class="muted tiny">${esc(u.id)}</p></details></div></section><section class="panel accountSecurityCard"><span class="eyebrow">SECURITY</span><h2>Change password</h2><p class="muted">Use at least 8 characters.</p><div class="authGrid"><label>New Password<input id="accountNewPassword" type="password" minlength="8" autocomplete="new-password" placeholder="8+ characters"></label><label>Confirm New Password<input id="accountConfirmPassword" type="password" minlength="8" autocomplete="new-password" placeholder="Re-enter password"></label></div><div class="row" style="margin-top:12px"><button id="accountChangePasswordBtn" onclick="changeAccountPassword()">Change Password</button></div><div id="authMessage"></div></section>${cloudSyncPanel()}</div>`;
}


// V8.18 — First-Time Onboarding
function onboardingSave(){save()}
function onboardingClose(){document.getElementById("onboardingBackdrop")?.remove()}
function onboardingSkip(){state.onboarding.completed=true;state.onboarding.skipped=true;onboardingSave();onboardingClose()}
function onboardingRestart(){state.onboarding={completed:false,step:0,goal:"",ranked:null};onboardingSave();onboardingRender()}
function onboardingMaybeShow(){
 if(state.onboarding?.completed||document.getElementById("onboardingBackdrop"))return;
 onboardingRender();
}
function onboardingSetGoal(goal){state.onboarding.goal=goal;onboardingSave();onboardingRender()}
function onboardingSetRanked(v){state.onboarding.ranked=v;onboardingSave();onboardingRender()}
function onboardingNext(){state.onboarding.step=Math.min(5,(Number(state.onboarding.step)||0)+1);onboardingSave();onboardingRender()}
function onboardingBack(){state.onboarding.step=Math.max(0,(Number(state.onboarding.step)||0)-1);onboardingSave();onboardingRender()}
function onboardingFinish(){state.onboarding.completed=true;state.onboarding.completedAt=Date.now();onboardingSave();onboardingClose();state.page="dashboard";render()}
function onboardingGo(page,nextStep){state.onboarding.step=nextStep;onboardingSave();onboardingClose();state.page=page;render()}
function onboardingRankInputs(){
 const tier=document.getElementById("onboardRankTier")?.value||"Unranked",points=Number(document.getElementById("onboardRP")?.value||0);
 state.rank=state.rank||{};state.rank.tier=tier;state.rank.points=Math.max(0,points);onboardingSave();onboardingNext();
}
function onboardingShell(body,title,subtitle){
 const step=state.onboarding.step||0;
 return `<div class="onboardingBackdrop" id="onboardingBackdrop" role="dialog" aria-modal="true" aria-labelledby="onboardTitle"><section class="onboardingCard"><div class="onboardingTop"><div><span class="badge">QUICK SETUP</span><h1 id="onboardTitle">${esc(title)}</h1><p class="muted">${esc(subtitle)}</p></div><button class="secondary" aria-label="Skip onboarding" onclick="onboardingSkip()">Skip</button></div><div class="onboardingProgress" aria-label="Step ${step+1} of 6">${[0,1,2,3,4,5].map(i=>`<i class="${i<=step?'done':''}"></i>`).join('')}</div>${body}<div class="onboardingActions"><button class="secondary" ${step===0?'disabled':''} onclick="onboardingBack()">Back</button><div class="right"><button class="secondary" onclick="onboardingSkip()">Do this later</button>${step<5?`<button onclick="onboardingNext()">Next</button>`:`<button onclick="onboardingFinish()">Finish Setup</button>`}</div></div><p class="muted tiny" style="text-align:center;margin-top:14px">${step+1} / 6 • You can restart this tour later from Account.</p></section></div>`;
}
function onboardingRender(){
 onboardingClose(); if(state.onboarding?.completed)return;
 const step=state.onboarding.step||0; let html="";
 if(step===0){
  const goals=["Improve Ranked","Prepare for Tournaments","Track Performance","Build Decks","Study the Meta","Collect Cards"];
  html=onboardingShell(`<div class="onboardingEmpty"><h2>Welcome to PocketNexus</h2><p>Track your matches. Understand your decks. Study the Meta. Improve your performance.</p></div><h3>What do you want to focus on?</h3><div class="onboardingChoices">${goals.map(g=>`<button class="onboardingChoice ${state.onboarding.goal===g?'selected':''}" onclick="onboardingSetGoal('${g}')">${g}</button>`).join('')}</div>`,`Welcome, ${state.user||'Trainer'}`,"A quick setup will connect the app around the way you play.");
 }else if(step===1){
  html=onboardingShell(`<div class="onboardingEmpty"><h2>${state.decks.length?`${state.decks.length} deck${state.decks.length===1?'':'s'} ready`:'Create your first deck'}</h2><p>Your saved decks connect to Battle Tracker, Statistics, Deck Intelligence, Personal Meta, and Tournament Prep.</p><div class="row" style="justify-content:center"><button onclick="onboardingGo('decks',2)">${state.decks.length?'Open Deck Lab':'Build a Deck'}</button><button class="secondary" onclick="onboardingGo('decks',2)">Choose / Browse Decks</button></div></div>`,`Your decks`,"Build now or skip it and come back whenever you're ready.");
 }else if(step===2){
  const owned=Object.values(state.collection||{}).filter(x=>Number(x?.owned||0)>0).length;
  html=onboardingShell(`<div class="onboardingEmpty"><h2>${owned?`${owned} collection entries tracked`:'Add your collection'}</h2><p>Collection data lets Deck Lab calculate which decks you can build, completion percentage, and exactly which cards you're missing.</p><button onclick="onboardingGo('collection',3)">Open Collection</button></div>`,`Collection`,"Optional, but useful for deck completion and missing-card tracking.");
 }else if(step===3){
  html=onboardingShell(`<h3>Do you play Ranked?</h3><div class="onboardingChoices"><button class="onboardingChoice ${state.onboarding.ranked===true?'selected':''}" onclick="onboardingSetRanked(true)">Yes — track my climb</button><button class="onboardingChoice ${state.onboarding.ranked===false?'selected':''}" onclick="onboardingSetRanked(false)">No / not right now</button></div>${state.onboarding.ranked===true?`<div class="grid"><div><label>Current Rank</label><input id="onboardRankTier" value="${esc(state.rank?.tier||'Master Ball')}" placeholder="Master Ball"></div><div><label>Current RP</label><input id="onboardRP" type="number" min="0" value="${Number(state.rank?.points||0)}"></div></div><button style="margin-top:12px" onclick="onboardingRankInputs()">Save Rank & Continue</button>`:''}`,`Rank setup`,"Rank tracking is optional. You can update it anytime.");
 }else if(step===4){
  html=onboardingShell(`<div class="onboardingDemo"><div class="demoVs"><strong>My Deck</strong><span>VS</span><strong>Opponent Archetype</strong></div><div class="demoResult"><span class="winDemo">WIN</span><span class="lossDemo">LOSS</span></div></div><p>Recording one real match automatically contributes to <strong>Statistics, Deck Intelligence, Personal Meta, Coaching, and RP Progression</strong>. This demo does not create fake match data.</p><button onclick="onboardingGo('matches',5)">Open Battle Tracker</button>`,`Record your first match`,"Most matches can be recorded in a few seconds.");
 }else{
  html=onboardingShell(`<div class="onboardingTour"><div><strong>Home</strong><span class="muted">Your daily snapshot and fastest actions.</span></div><div><strong>Battle</strong><span class="muted">Record ranked or casual matches.</span></div><div><strong>Decks</strong><span class="muted">Build, edit, and prepare decks.</span></div><div><strong>Rank</strong><span class="muted">RP, season progress, and estimated rank borders.</span></div><div><strong>Meta</strong><span class="muted">Current archetypes and competitive trends.</span></div><div><strong>Tools</strong><span class="muted">Performance, Collection, Trade, Simulation, Streamer, Account, and settings.</span></div></div><div class="successBox" style="margin-top:16px"><strong>You're ready.</strong><br>The app grows more useful as you record real matches. Nothing in onboarding creates fake statistics.</div>`,`Know where everything lives`,"Play, Build, Compete, and Improve handle the main workflow. Utility tools live under More.");
 }
 document.body.insertAdjacentHTML('beforeend',html);
}

if(!window.__ppcOnboardingKeyboardHandler){
 window.__ppcOnboardingKeyboardHandler=true;
 document.addEventListener("keydown",e=>{
  if(e.key!=="Escape"||!document.getElementById("onboardingBackdrop"))return;
  e.preventDefault();
  onboardingSkip();
 });
}

function addOnboardingAccountPanel(){
 const app=document.getElementById("app");if(!app||document.getElementById("restartOnboardingPanel"))return;
 app.insertAdjacentHTML('beforeend',`<div class="panel" id="restartOnboardingPanel"><div class="between"><div><h2>Getting Started</h2><p class="muted">Replay the first-time setup and dashboard tour. This does not erase decks, matches, collection data, or settings.</p></div><button class="secondary" onclick="onboardingRestart()">Restart Onboarding</button></div></div>`);
}

function startupFailureScreen(error){
 console.error("PocketNexus startup failed",error);
 const root=document.getElementById("app");
 const navRoot=document.getElementById("nav");
 if(navRoot)navRoot.innerHTML="";
 if(root)root.innerHTML=`<div class="panel startupError" style="max-width:680px;margin:50px auto"><span class="badge">Startup Recovery</span><h1>PocketNexus could not finish loading</h1><p class="muted">Your data has not been deleted. A startup error was caught instead of leaving a blank page.</p><div class="dangerBox"><strong>Error</strong><br>${esc(error?.message||String(error||"Unknown startup error"))}</div><div class="row" style="margin-top:12px"><button onclick="location.reload()">Reload App</button><button class="secondary" onclick="resetStartupPageOnly()">Open Local Welcome Screen</button></div></div>`;
}
function resetStartupPageOnly(){
 try{state.page="dashboard";state.user=null;safeStorageSet(STORE,JSON.stringify(state));entryScreen()}catch(e){startupFailureScreen(e)}
}
function startPocketNexus(){
 try{
   initStreamerChannel();
   scheduleStreamerOverlayUpdate();
   // Paint local/guest UI first. Cloud authentication initializes in the background.
   render();
   setTimeout(()=>{try{initCloudAuth()}catch(e){console.warn("Cloud auth background init failed",e)}},0);
 }catch(e){startupFailureScreen(e)}
}
if(window.PPCMetaService){PPCMetaService.subscribe(()=>{try{if(state.page==="meta"||state.page==="dashboard")render()}catch(e){console.warn("Meta UI refresh failed",e)}});PPCMetaService.ensure(state.metaIntel.windowHours||168)}
cloudRuntimeReady=true;
startPocketNexus();


// V8.11 Rank Intelligence auto-refresh
window.addEventListener("load",()=>{try{window.PPCRankBorderService?.startAutoRefresh?.(()=>{if(state.page==="rank")window.rankBorderPage?.()})}catch(e){console.warn("Rank auto-refresh unavailable",e)}});
