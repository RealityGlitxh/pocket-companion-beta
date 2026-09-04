/* PocketNexus V8.64.1 — eager utility pages
   Diagnostics, About/Privacy, More/Settings and shared rank-tier helpers. */

const PPC_RANK_THRESHOLDS=[
 {min:0,tier:"Beginner 1"},{min:20,tier:"Beginner 2"},{min:50,tier:"Beginner 3"},{min:80,tier:"Beginner 4"},
 {min:110,tier:"Poké Ball 1"},{min:140,tier:"Poké Ball 2"},{min:170,tier:"Poké Ball 3"},{min:210,tier:"Poké Ball 4"},
 {min:250,tier:"Great Ball 1"},{min:290,tier:"Great Ball 2"},{min:330,tier:"Great Ball 3"},{min:380,tier:"Great Ball 4"},
 {min:440,tier:"Ultra Ball 1"},{min:510,tier:"Ultra Ball 2"},{min:590,tier:"Ultra Ball 3"},{min:690,tier:"Ultra Ball 4"},
 {min:810,tier:"Master Ball"}
];
function rankTierFromPoints(points){
 const rp=Math.max(0,Math.floor(Number(points)||0));
 let rank=PPC_RANK_THRESHOLDS[0];
 for(const row of PPC_RANK_THRESHOLDS){if(rp>=row.min)rank=row;else break}
 return rank.tier;
}
function rankProgressFromPoints(points){
 const rp=Math.max(0,Math.floor(Number(points)||0));
 let index=0;for(let i=0;i<PPC_RANK_THRESHOLDS.length;i++){if(rp>=PPC_RANK_THRESHOLDS[i].min)index=i;else break}
 const current=PPC_RANK_THRESHOLDS[index],next=PPC_RANK_THRESHOLDS[index+1]||null;
 return {tier:current.tier,nextTier:next?.tier||null,nextMin:next?.min??null,toNext:next?Math.max(0,next.min-rp):0};
}

function fullDiagnosticResults(){
 const checks=[];const add=(name,ok,detail="")=>checks.push({name,ok:!!ok,detail});
 add("State object",!!state&&typeof state==="object");
 add("Valid page",VALID_PAGES.has(state.page),state.page);
 add("Deck array",Array.isArray(state.decks),`${state.decks?.length||0} decks`);
 add("Match array",Array.isArray(state.matches),`${state.matches?.length||0} matches`);
 add("Unique deck IDs",new Set((state.decks||[]).map(x=>x.id)).size===(state.decks||[]).length);
 add("Unique match IDs",new Set((state.matches||[]).map(x=>x.id)).size===(state.matches||[]).length);
 add("Selected deck reference",!state.selected||(state.decks||[]).some(d=>d.id===state.selected),state.selected||"none");
 add("Card database mode",["idle","loading","online","fallback"].includes(window.cardLoadMode),window.cardLoadMode);
 add("Card page size",CARD_PAGE_SIZE===48,String(CARD_PAGE_SIZE));
 add("Archetype library",ArchetypeService.getArchetypes().length>=30,`${ArchetypeService.getArchetypes().length} archetypes`);
 add("20-card archetype samples",ArchetypeService.getArchetypes().filter(a=>validateSampleDeck(a).valid).length===ArchetypeService.getArchetypes().length);
 add("Storage",storageAvailable,storageAvailable?"localStorage available":"memory fallback active");
 add("Cloud config",cloudConfigured(),cloudConfigured()?"configured":"optional / not configured");
 add("Cloud runtime",typeof scheduleCloudSync==="function");
 add("Streamer control state",!!state.streamer&&typeof state.streamer==="object");
 add("Streamer deck reference",!state.streamer?.controlDeckId||state.decks.some(d=>d.id===state.streamer.controlDeckId),state.streamer?.controlDeckId||"none");
 add("Streamer archetype library",ArchetypeService.getArchetypes().length>=30,`${ArchetypeService.getArchetypes().length} archetypes`);
 add("Overlay state publisher",typeof publishStreamerOverlayState==="function");
 add("BroadcastChannel",typeof BroadcastChannel==="function",typeof BroadcastChannel==="function"?"supported":"storage fallback available");
 add("Overlay file URL",typeof window.streamerOverlayFileUrl==="function",typeof window.streamerOverlayFileUrl==="function"?window.streamerOverlayFileUrl():"Available after Streamer opens");
 add("Rank Border service",!!window.PPCRankBorderService,"rank-border-live reader");
 add("Rank Border page",typeof rankBorderPage==="function");
 add("Rank Border cache",typeof window.PPCRankBorderService?.getCached==="function","5-minute client cache");
 // V8.19 pre-public regression gates for the three most recent connected systems.
 add("Collection → Deck Lab integration",typeof deckCollectionStatus==="function"&&typeof openMissingCards==="function"&&typeof addAllMissingToWishlist==="function","V8.16 live calculations");
 add("Better Battle Tracker",typeof quickRecordResult==="function"&&typeof quickRematch==="function"&&typeof undoLastBattleMatch==="function","V8.17 quick record/rematch/undo");
 add("First-time onboarding",!!state.onboarding&&typeof onboardingRender==="function"&&typeof onboardingRestart==="function","V8.18 six-step setup");
 add("Personal Meta",typeof personalMetaMatrixHtml==="function","V8.14 feature present");
 add("Tournament Prep",typeof tournamentPrepHtml==="function","V8.15 feature present");
 add("Rank season lifecycle safeguard",typeof rankSeasonLifecycle==="function","V8.19.2 frontend expiry detection");
 add("Pre-public environment runner",typeof runPrePublicEnvironmentTests==="function","non-destructive live-browser checks");
 return checks;
}

function runImportCompatibilityTests(){
 const tests=[
  ["Speed","X Speed"],
  ["X-Speed","X Speed"],
  ["XSpeed","X Speed"],
  ["Research","Professor's Research"],
  ["Professor’s Research","Professor's Research"],
  ["Poke Ball","Poké Ball"],
  ["Pokemon Center Lady","Pokémon Center Lady"]
 ];
 return tests.map(([input,expected])=>{
   const c=getCardByName(canonicalImportName(input));
   return {input,expected,actual:c?.name||null,pass:!!c&&importedNameMatches(expected,c.name)};
 });
}


// V8.8 Rank Border Intelligence

// Performance Pass 2D: Rank Intelligence UI moved to
// js/app/rank_tools-v8.64.1.js and is loaded on demand by the route loader.

async function runPrePublicEnvironmentTests(){
 const root=document.getElementById("app");if(!root)return;
 root.innerHTML=`<div class="between"><div><h1>Pre-Public Environment Tests</h1><p class="muted">Live-browser checks. These checks do not create, edit, upload, restore, or delete user data.</p></div><button class="secondary" onclick="state.page='more';render()">← Back</button></div><div class="panel" id="prePublicResults"><p class="muted">Running environment checks…</p></div>`;
 const checks=[];const add=(name,status,detail="")=>checks.push({name,status,detail});
 add("Viewport / responsive shell",document.documentElement.scrollWidth<=window.innerWidth+2?"PASS":"FAIL",`${window.innerWidth}×${window.innerHeight}; page width ${document.documentElement.scrollWidth}px`);
 add("Touch-friendly environment",("ontouchstart" in window)||navigator.maxTouchPoints>0?"INFO":"INFO",navigator.maxTouchPoints?`${navigator.maxTouchPoints} touch point(s) reported`:"Desktop/non-touch browser reported");
 add("Keyboard events",typeof KeyboardEvent==="function"?"PASS":"FAIL","Escape, Tab, Enter and Space are available to the browser runtime");
 add("Local storage",storageAvailable?"PASS":"WARN",storageAvailable?"Persistent browser storage available":"Memory fallback only");
 add("Online state",navigator.onLine?"PASS":"WARN",navigator.onLine?"Browser reports online":"Browser reports offline");
 add("Supabase configuration",cloudConfigured()?"PASS":"FAIL",cloudConfigured()?"Project URL + publishable key configured":"Missing project configuration");
 add("Supabase SDK",window.supabase?.createClient?"PASS":"FAIL",window.supabase?.createClient?"SDK loaded":"SDK unavailable (network/CSP/file loading issue)");
 try{
   initCloudAuth();
   if(cloudClient){
     const {data,error}=await cloudClient.auth.getSession();
     add("Supabase Auth request",error?"FAIL":"PASS",error?error.message:(data?.session?"Authenticated session detected":"Auth endpoint reachable; no signed-in session"));
   }else add("Supabase Auth request","FAIL","Client could not initialize");
 }catch(e){add("Supabase Auth request","FAIL",e?.message||String(e))}
 try{
   const svc=(typeof window.rankBorderService==="function"?window.rankBorderService():null);
   if(svc?.refresh){await svc.refresh();const d=svc.getData?.();const life=(typeof window.rankSeasonLifecycle==="function"?window.rankSeasonLifecycle(d?.season||{}):{label:"Rank bundle loaded on demand"});add("Rank service request",d?"PASS":"WARN",d?`${d.season?.name||"Season"} • ${life.label}`:"No rank payload returned");}
   else add("Rank service request","INFO","Rank Intelligence is lazy-loaded and has not been opened yet.");
 }catch(e){add("Rank service request","WARN",e?.message||String(e))}
 add("Onboarding escape handler",typeof onboardingSkip==="function"?"PASS":"FAIL","Onboarding can be dismissed without trapping the user");
 add("Backup before local restore",/backupAllData\(\)/.test(performPastedBackupRestore.toString())&&/makeLocalCloudBackup/.test(performPastedBackupRestore.toString())?"PASS":"FAIL","Local restore creates both a download and a recoverable browser restore point first");
 add("Backup before cloud restore",/makeLocalCloudBackup/.test(performCloudReplace.toString())&&/makeLocalCloudBackup/.test(performCloudSafeMerge.toString())?"PASS":"FAIL","Cloud replace and safe merge save a local recovery point first");
 add("Match delete confirmation",/PPCUI\.open/.test(deleteMatch.toString())?"PASS":"FAIL","Delete Match requires an in-app confirmation dialog");
 add("Undo scope",/battleSaveNotice\?\.matchId/.test(undoLastBattleMatch.toString())?"PASS":"FAIL","Undo targets only the just-recorded match ID");
 const r=document.getElementById("prePublicResults");if(!r)return;
 const fail=checks.filter(x=>x.status==="FAIL").length,warn=checks.filter(x=>x.status==="WARN").length;
 r.innerHTML=`<div class="between"><div><h2>Environment Results</h2><p class="muted">${checks.length} checks • ${fail} failed • ${warn} warning(s)</p></div><span class="badge">${fail?"NOT READY":warn?"REVIEW":"PASS"}</span></div>${checks.map(x=>`<div class="switch"><span><strong>${esc(x.name)}</strong>${x.detail?`<div class="muted tiny">${esc(x.detail)}</div>`:""}</span><strong class="${x.status==="PASS"?"diagPass":x.status==="FAIL"?"diagFail":"diagWarn"}">${x.status}</strong></div>`).join("")}<div class="${fail?"dangerBox":warn?"warningBox":"successBox"}" style="margin-top:14px">${fail?"Do not publish yet. Fix failed checks first.":warn?"Core checks passed, but warnings still require review in the intended hosting environment.":"All automated live-browser checks passed. Manual device testing is still required before public release."}</div>`;
}

function runFullDiagnostics(){
 const results=fullDiagnosticResults(),fails=results.filter(x=>!x.ok&&x.name!=="Cloud config").length;
 const root=document.getElementById("app");if(!root)return;
 root.innerHTML=`<div class="between"><div><h1>Full Diagnostics</h1><p class="muted">Runtime/state integrity check.</p></div><button class="secondary" onclick="state.page='more';render()">← Back</button></div><div class="panel">${results.map(x=>`<div class="switch"><span>${esc(x.name)}${x.detail?`<div class="muted tiny">${esc(x.detail)}</div>`:""}</span><strong class="${x.ok?"diagPass":x.name==="Cloud config"?"diagWarn":"diagFail"}">${x.ok?"PASS":x.name==="Cloud config"?"OPTIONAL":"FAIL"}</strong></div>`).join("")}</div><div class="${fails?"dangerBox":"successBox"}">${fails?`${fails} required check(s) failed.`:"All required runtime checks passed."}</div>`;
}
const BETA_QA_KEY="ppc_beta_qa_v8641";
const BETA_QA_ITEMS=[
 ["install","Install/update PWA"],["auth","Sign in, close app, reopen, session remains"],["deck","Create/save/open a deck"],["collection","Collection search/filter/card detail"],["battle","Record and undo a Battle Tracker match"],["ranked","Team Ranked queue/match/report flow with two accounts"],["training","Complete a Training challenge and sync"],["offline","Go offline after warm cache and reopen core screens"],["rotate","Rotate phone and use keyboard/input screens"],["privacy","Review profile privacy/public showcase"]
];
function betaQaState(){try{return JSON.parse(localStorage.getItem(BETA_QA_KEY)||'{}')}catch{return{}}}
function betaQaToggle(key,checked){const x=betaQaState();x[key]=!!checked;localStorage.setItem(BETA_QA_KEY,JSON.stringify(x));aboutPage()}
function betaQaReset(){localStorage.removeItem(BETA_QA_KEY);aboutPage()}
function betaQaHtml(){const x=betaQaState(),done=BETA_QA_ITEMS.filter(([k])=>x[k]).length;return `<section class="panel betaQaPanel"><div class="between"><div><span class="eyebrow">CLOSED BETA QA</span><h2>Device validation checklist</h2><p class="muted">${done}/${BETA_QA_ITEMS.length} checks marked complete on this device. Team Ranked requires two real accounts.</p></div><span class="badge">${done===BETA_QA_ITEMS.length?'DEVICE PASS':'IN PROGRESS'}</span></div><div class="betaQaList">${BETA_QA_ITEMS.map(([k,label])=>`<label class="switch betaQaItem"><span><strong>${esc(label)}</strong></span><input type="checkbox" ${x[k]?'checked':''} onchange="betaQaToggle('${k}',this.checked)"></label>`).join('')}</div><div class="row"><button class="secondary" onclick="betaQaReset()">Reset this device</button><button class="secondary" onclick="runPrePublicEnvironmentTests()">Run environment checks</button></div></section>`}
async function betaFeedbackExport(){
 const note=(document.getElementById("betaFeedbackText")?.value||"").trim();
 const area=document.getElementById("betaFeedbackStatus");
 if(!note){if(area)area.textContent="Write what happened before creating a report.";return}
 const session=window.PPCLaunch?.betaSession?.()||null, mobile=window.PPCMobile?.readinessReport?.()||null, storage=await window.PPCLaunch?.storageEstimate?.();
 const payload={app:"PocketNexus",version:"8.64.1-beta-rc",report_id:'R-'+Date.now().toString(36).toUpperCase(),created_at:new Date().toISOString(),beta_session:session,page:state.page||"unknown",online:navigator.onLine,standalone:window.PPCMobile?.isStandalone?.()||false,user_agent:navigator.userAgent,screen:{width:screen.width,height:screen.height,pixel_ratio:devicePixelRatio||1},storage,feedback:note,qa_checklist:betaQaState(),mobile_readiness:mobile,runtime_errors:window.PPCLaunch?.getRuntimeErrors?.()||[],diagnostics:typeof fullDiagnosticResults==="function"?fullDiagnosticResults().map(x=>({name:x.name,ok:x.ok,detail:x.detail||""})):[]};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`pocketnexus-beta-report-${payload.report_id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);if(area)area.textContent=`Beta report ${payload.report_id} created. Review it before sharing it with the project team.`;
}
function aboutPage(){
 const secure=location.protocol==='https:'||['localhost','127.0.0.1'].includes(location.hostname), online=navigator.onLine, session=window.PPCLaunch?.betaSession?.();
 document.getElementById("app").innerHTML=`<div class="between"><div><span class="eyebrow">CLOSED BETA VALIDATION • V8.64.1</span><h1>About, Privacy & Beta Status</h1><p class="muted">Validate the release candidate on real hosted devices before public launch.</p></div><button class="secondary" onclick="goPage('account')">Account & Data</button></div>
 <section class="panel"><div class="between"><div><span class="eyebrow">RELEASE READINESS</span><h2>Closed beta status</h2></div><span class="badge">BETA RC</span></div><div class="launchStatusGrid"><article><span>Connection</span><strong>${online?'Online':'Offline'}</strong><small>Current browser state</small></article><article><span>Secure context</span><strong>${secure?'Ready':'Needs HTTPS'}</strong><small>PWA/auth production requirement</small></article><article><span>Build</span><strong>V8.64.1</strong><small>${esc(session?.id||'Beta session')}</small></article></div><div class="launchLinks"><a class="buttonLink secondary" href="privacy.html">Privacy</a><a class="buttonLink secondary" href="terms.html">Terms</a><a class="buttonLink secondary" href="support.html">Support</a></div></section>
 ${betaQaHtml()}
 <div class="grid betaInfoGrid"><section class="panel"><h2>What counts as validated?</h2><p>Automated checks are only the first layer. Public-launch approval requires real hosted testing on the devices and account flows your beta users actually use.</p><p class="muted">A checklist marked complete means this browser/device was tested; it is not a global production certification.</p></section><section class="panel"><h2>Independent third-party project</h2><p>PocketNexus is an independent companion application and is not affiliated with The Pokémon Company or Nintendo.</p></section><section class="panel"><h2>Privacy summary</h2><p>Guest data stays in this browser. Signed-in features can store supported app data in the project's cloud backend. Diagnostic reports are created locally and are not automatically uploaded.</p></section><section class="panel"><h2>Beta bug reports</h2><p>Reports now include a beta session ID, device dimensions, PWA readiness, storage estimate, QA checklist, runtime errors, and app diagnostics.</p><p class="muted">Reports intentionally exclude passwords and private service keys. Review every report before sharing.</p></section></div>
 <section class="panel betaFeedbackPanel"><span class="eyebrow">BETA FEEDBACK</span><h2>Create a diagnostic report</h2><p class="muted">Describe what you did, what you expected, and what happened. Reproduce the issue once if it is safe to do so, then create the report.</p><textarea id="betaFeedbackText" rows="4" placeholder="Example: iPhone Safari → Team Ranked → Join Queue → spinner stayed visible after 20 seconds..."></textarea><div class="row"><button onclick="betaFeedbackExport()">Create Beta Report</button><button class="secondary" onclick="runPrePublicEnvironmentTests()">Run Launch Checks</button></div><p id="betaFeedbackStatus" class="muted tiny" aria-live="polite"></p></section>`;
}

function morePage(){
 let rank=state.rank||{tier:"Master Ball",points:0,streak:0};
 document.getElementById("app").innerHTML=`<div class="pageHero compact"><div><span class="eyebrow">TOOLS & SETTINGS</span><h1>More</h1><p>Collection, performance, streaming, account, backups, and advanced tools.</p></div></div><div class="toolLaunchGrid">
 <button class="toolLaunchCard" onclick="goPage('tournaments')"><span>♜</span><strong>Tournaments</strong><small>Leaderboards, decks, and scouting</small></button>
 <button class="toolLaunchCard" onclick="window.PPCWhatsNew?.open?.(true)"><span>✦</span><strong>What's New</strong><small>See recent PocketNexus updates</small></button>
 <button class="toolLaunchCard" onclick="goPage('collection')"><span>▦</span><strong>Collection</strong><small>Owned, wanted, and tradeable cards</small></button>
 <button class="toolLaunchCard" onclick="goPage('stats')"><span>⌁</span><strong>Performance</strong><small>Coaching, matchups, and trends</small></button>
 <button class="toolLaunchCard" onclick="goPage('streamer')"><span>◉</span><strong>Streamer</strong><small>Sessions and OBS overlays</small></button>
 <button class="toolLaunchCard" onclick="goPage('trade')"><span>⇄</span><strong>Trade</strong><small>Wishlist and tradeable cards</small></button>
 <button class="toolLaunchCard" onclick="goPage('account')"><span>●</span><strong>Account & Cloud</strong><small>Sign-in, security, and sync</small></button>
 <button class="toolLaunchCard" onclick="goPage('about')"><span>i</span><strong>About & Privacy</strong><small>Data handling and third-party notice</small></button>
 </div><div class="grid settingsGrid">
 <div class="panel"><h2>Rank Tracker</h2><p class="muted">RP is the source of truth. Your rank is calculated automatically.</p><label>Rank</label><input id="tier" value="${esc(rankTierFromPoints(rank.points))}" readonly aria-readonly="true"><label>Current Points</label><input id="points" type="number" min="0" value="${rank.points||0}" oninput="document.getElementById('tier').value=rankTierFromPoints(this.value)"><label>Win Streak</label><input id="streak" type="number" min="0" value="${rank.streak||0}"><button onclick="saveRank()">Save RP</button></div>
 <div class="panel"><h2>Backup My Data</h2><p class="muted">Keep a portable copy of your local PocketNexus data.</p><div class="row"><button onclick="backupAllData()">Download Backup</button><button class="secondary" onclick="restoreBackupPrompt()">Restore Backup</button></div></div>
 </div><details class="panel advancedTools"><summary>Advanced & troubleshooting</summary><p class="muted">Diagnostics and raw exports are mainly useful when something is not working.</p>${imageDiagnosticsPanel()}<div class="advancedToolActions"><button onclick="runMetaDiagnostics()">Meta Diagnostics</button><button onclick="runFullDiagnostics()">Full Diagnostics</button><button onclick="runPrePublicEnvironmentTests()">Environment Tests</button><button class="secondary" onclick="exportBattleJSON()">Battle JSON</button><button class="secondary" onclick="exportBattleCSV()">Battle CSV</button></div>${battleDiagnosticsHtml()}${deckMappingDiagnostics()}</details>`;
}

function saveRank(){const points=Math.max(0,Math.floor(Number(document.getElementById("points").value||0)));state.rank={...(state.rank||{}),tier:rankTierFromPoints(points),points,streak:Math.max(0,Number(document.getElementById("streak").value||0))};save();morePage()}


window.cardLoadMode="idle";
if(Array.isArray(state.matches)&&state.matches.length){state.matches=state.matches.map(normalizeMatch).filter(Boolean);safeStorageSet(STORE,JSON.stringify(state));}

// Performance Pass 2D: Account/auth/backup/restore runtime moved to
// js/core/account-cloud-core-v8.64.1.js and account-cloud-runtime-v8.64.1.js.
