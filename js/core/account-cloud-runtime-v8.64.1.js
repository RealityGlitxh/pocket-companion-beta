/* PocketNexus V8.64.1 — Account + Cloud runtime extraction
   Performance Pass 2D.
   Account authentication UI helpers, cloud backup/restore, autosync controls,
   recovery points, and the unified cloud status center live here instead of
   being owned by the combined Rank/Streamer bundle.

   This is intentionally loaded after the legacy combined bundle during the
   staged split. It replaces the legacy global handlers without changing the
   visible Account UI. A follow-up commit can then delete the duplicated legacy
   Account/Cloud block from streamer_rank_tools.js safely. */
(function(){
 'use strict';
 if(window.PPCAccountCloudRuntime)return;

 const RECOVERY_REGISTRY_KEY=STORE+'_recovery_registry';
 let pendingCloudRestoreData=null;
 let cloudDomainSummary848=[];

 function client(){return window.PPCAccountCloudCore?.client?.()||window.getPPCCloudClient?.()||cloudClient||null}
 function session(){return window.PPCAccountCloudCore?.session?.()||window.getPPCCloudSession?.()||cloudSession||null}
 function userId(){return session()?.user?.id||''}
 function coreInit(){return window.PPCAccountCloudCore?.init?.()||window.initCloudAuth?.()||null}
 function persist(){safeStorageSet(STORE,JSON.stringify(state))}
 function rerenderAccount(){try{if(state.page==='account'&&typeof accountPage==='function')accountPage()}catch(e){console.warn('Account refresh failed',e)}}

 function authMessage(msg,bad=false){
  const el=document.getElementById('authMessage');if(!el)return;
  el.className=bad?'dangerBox':'successBox';el.textContent=msg||'';
 }
 async function loadCloudProfile(){
  cloudProfile=null;const c=client(),s=session();if(!c||!s?.user)return null;
  const {data,error}=await c.from('profiles').select('*').eq('id',s.user.id).maybeSingle();
  if(error)throw error;cloudProfile=data||null;return cloudProfile;
 }
 async function emailSignUp(){
  const c=client()||coreInit();if(!c)return authMessage('Account service is not configured or still loading.',true);
  const email=(document.getElementById('authEmail')?.value||'').trim(),password=document.getElementById('authPassword')?.value||'';
  if(!email||password.length<8)return authMessage('Enter an email and a password of at least 8 characters.',true);
  const redirect=(typeof ppcAuthRedirectUrl==='function'&&ppcAuthRedirectUrl())||'';
  const {error}=await c.auth.signUp({email,password,options:redirect?{emailRedirectTo:redirect}:undefined});
  authMessage(error?error.message:(redirect?'Account created. Check your email if confirmation is enabled.':'Account created. Sign in with email/password; confirmation links require the hosted site.'),!!error);
 }
 async function emailSignIn(){
  const c=client()||coreInit();if(!c)return authMessage('Account service is not configured or still loading.',true);
  const email=(document.getElementById('authEmail')?.value||'').trim(),password=document.getElementById('authPassword')?.value||'';
  try{const {data,error}=await c.auth.signInWithPassword({email,password});if(error)return authMessage(error.message,true);if(data?.session){cloudSession=data.session;state.user=data.session.user?.email||'Account';state.sessionMode='cloud';persist();render()}else authMessage('Signed in. Loading your account…')}catch(e){authMessage(e?.message||'Could not sign in.',true)}
 }
 async function googleSignIn(){
  if(typeof ppcAuthRedirectUrl==='function'&&!ppcAuthRedirectUrl())return authMessage('Google sign-in requires the hosted website, not the local file test.',true);
  const c=client()||coreInit();if(!c)return authMessage('Account service is not configured or still loading.',true);
  const {error}=await c.auth.signInWithOAuth({provider:'google',options:{redirectTo:(typeof ppcAuthRedirectUrl==='function'&&ppcAuthRedirectUrl())||location.href.split('#')[0].split('?')[0]}});if(error)authMessage(error.message,true);
 }
 async function accountAppleSignIn(){
  if(typeof ppcAuthRedirectUrl==='function'&&!ppcAuthRedirectUrl())return authMessage('Apple sign-in requires the hosted website, not the local file test.',true);
  const c=client()||coreInit();if(!c)return authMessage('Account service is not configured or still loading.',true);
  const {error}=await c.auth.signInWithOAuth({provider:'apple',options:{redirectTo:(typeof ppcAuthRedirectUrl==='function'&&ppcAuthRedirectUrl())||location.href.split('#')[0].split('?')[0]}});if(error)authMessage(error.message,true);
 }
 async function resetPassword(){
  if(typeof ppcAuthRedirectUrl==='function'&&!ppcAuthRedirectUrl())return authMessage('Password recovery requires the hosted website, not the local file test.',true);
  const c=client()||coreInit();if(!c)return authMessage('Account service is not configured or still loading.',true);
  const email=(document.getElementById('authEmail')?.value||'').trim();if(!email)return authMessage('Enter your email first.',true);
  const {error}=await c.auth.resetPasswordForEmail(email,{redirectTo:(typeof ppcAuthRedirectUrl==='function'&&ppcAuthRedirectUrl())||location.href.split('#')[0].split('?')[0]});authMessage(error?error.message:'Password reset email sent.',!!error);
 }
 async function completePasswordRecovery(){
  const c=client(),s=session();if(!c||!s?.user)return authMessage('Recovery session is not active. Open the newest recovery email again.',true);
  const password=document.getElementById('recoveryNewPassword')?.value||'',confirmPassword=document.getElementById('recoveryConfirmPassword')?.value||'';
  if(password.length<8)return authMessage('Use a password of at least 8 characters.',true);if(password!==confirmPassword)return authMessage('The two passwords do not match.',true);
  const {error}=await c.auth.updateUser({password});if(error)return authMessage(error.message,true);passwordRecoveryMode=false;authMessage('Password reset complete. You can use the new password on other devices.');rerenderAccount();
 }
 function recoveryPasswordPanel(){return passwordRecoveryMode?`<div class="panel recoveryPanel"><span class="eyebrow">PASSWORD RECOVERY</span><h2>Choose a new password</h2><p class="muted">Your recovery link is verified. Set a new password to finish recovering the account.</p><div class="authGrid"><div><label>New Password</label><input id="recoveryNewPassword" type="password" minlength="8" autocomplete="new-password" placeholder="8+ characters"></div><div><label>Confirm Password</label><input id="recoveryConfirmPassword" type="password" minlength="8" autocomplete="new-password" placeholder="Re-enter password"></div></div><div class="row" style="margin-top:12px"><button onclick="completePasswordRecovery()">Set New Password</button></div><div id="authMessage"></div></div>`:''}
 async function changeAccountPassword(){
  const c=client(),s=session();if(!c||!s?.user)return authMessage('You must be signed in to change your password.',true);
  const password=document.getElementById('accountNewPassword')?.value||'',confirm=document.getElementById('accountConfirmPassword')?.value||'';
  if(password.length<8)return authMessage('Use a password of at least 8 characters.',true);if(password!==confirm)return authMessage('The two passwords do not match.',true);
  const btn=document.getElementById('accountChangePasswordBtn');if(btn){btn.disabled=true;btn.textContent='Changing…'}
  try{const {error}=await c.auth.updateUser({password});if(error)return authMessage(error.message,true);const a=document.getElementById('accountNewPassword'),b=document.getElementById('accountConfirmPassword');if(a)a.value='';if(b)b.value='';authMessage('Password changed successfully. You can now use it to sign in on another browser.')}catch(e){authMessage(e?.message||'Could not change password.',true)}finally{if(btn){btn.disabled=false;btn.textContent='Change Password'}}
 }
 async function signOutEverywhere(){
  try{const c=client();if(c&&session()?.user)await c.auth.signOut()}catch(e){console.warn('Cloud sign-out failed',e)}
  cloudSession=null;cloudProfile=null;cloudSyncState=null;collectionCloudStatus='local';collectionCloudLastHash='';state.user=null;state.sessionMode=null;state.page='dashboard';state.cloudPrefs.autoSync=false;persist();render();
 }
 async function cloudSignOut(){return signOutEverywhere()}
 async function saveCloudProfile(){
  const c=client(),s=session();if(!c||!s?.user)return;
  const display_name=(document.getElementById('profileDisplayName')?.value||'').trim().slice(0,40),avatar_url=(document.getElementById('profileAvatar')?.value||'').trim().slice(0,500);
  const {error}=await c.from('profiles').upsert({id:s.user.id,display_name,avatar_url,updated_at:new Date().toISOString()});if(error)return authMessage(error.message,true);await loadCloudProfile();authMessage('Profile saved.');
 }

 function cloudUserId(){return userId()}
 function cloudSyncEnabled(){return !!(client()&&session()?.user&&cloudSyncState?.initial_upload_completed&&state.cloudPrefs?.autoSync)}
 function scheduleCloudSync(){if(!cloudSyncEnabled())return;if(cloudSyncBusy){cloudSyncPending=true;return}clearTimeout(cloudSyncTimer);cloudSyncTimer=setTimeout(()=>syncLocalToCloud({silent:true}),1200)}
 function meaningfulCollectionEntries(){return Object.entries(state.collection||{}).filter(([,r])=>Number(r?.owned||0)>0||Number(r?.wanted||0)>0||Number(r?.tradeable||0)>0)}
 function localCloudCounts(){const rows=meaningfulCollectionEntries();return {decks:(state.decks||[]).length,matches:(state.matches||[]).length,rankHistory:(state.rankHistory||[]).length,collection:rows.length,collectionCopies:rows.reduce((sum,[,r])=>sum+Number(r?.owned||0),0),sessions:(state.sessions||[]).length}}
 function cloudPreferencePayload(){return {battlePrefs:state.battlePrefs||{},streamer:state.streamer||{},trade:state.trade||{},archetypePrefs:state.archetypePrefs||{},metaV73:state.metaV73||{},metaIntel:state.metaIntel||{},rank:state.rank||null,selected:state.selected||null,simDeck:state.simDeck||null,cloudPrefs:state.cloudPrefs||{autoSync:false}}}
 async function loadCloudSyncState(){
  cloudSyncState=null;const c=client(),uid=userId();if(!c||!uid)return null;
  const {data,error}=await c.from('cloud_sync_state').select('user_id,initial_upload_completed,last_sync_at').eq('user_id',uid).maybeSingle();if(error){cloudSyncLastError=error.message;return null}cloudSyncState=data||{user_id:uid,initial_upload_completed:false,last_sync_at:null};return cloudSyncState;
 }
 async function replaceCloudRows(table,idField,rows,{removeStale=false}={}){
  const c=client(),uid=userId();if(!c||!uid)throw new Error('Not signed in.');
  if(rows.length){const payload=rows.map(r=>({user_id:uid,...r}));const {error}=await c.from(table).upsert(payload,{onConflict:`user_id,${idField}`});if(error)throw error}
  if(removeStale){const {data:existing,error:readErr}=await c.from(table).select(idField).eq('user_id',uid);if(readErr)throw readErr;const wanted=new Set(rows.map(r=>String(r[idField]))),stale=(existing||[]).map(x=>String(x[idField])).filter(id=>!wanted.has(id));if(stale.length){const {error}=await c.from(table).delete().eq('user_id',uid).in(idField,stale);if(error)throw error}}
 }
 async function syncLocalToCloud({silent=false,initial=false,removeStale=false}={}){
  const c=client(),uid=userId();if(!c||!uid){if(!silent)authMessage('Sign in before using cloud sync.',true);return false}if(cloudSyncBusy)return false;
  cloudSyncBusy=true;cloudSyncLastError='';
  try{
   ensureStableLocalIds();
   await syncDecksToCloud({force:true,initial,allowPush:true});await syncCollectionToCloud({force:true,initial});await syncBattleRankToCloud({force:true,initial});
   const {error:prefErr}=await c.from('cloud_preferences').upsert({user_id:uid,payload:cloudPreferencePayload(),updated_at:new Date().toISOString()},{onConflict:'user_id'});if(prefErr)throw prefErr;
   const now=new Date().toISOString(),{error:statusErr}=await c.from('cloud_sync_state').upsert({user_id:uid,initial_upload_completed:initial?true:!!cloudSyncState?.initial_upload_completed,last_sync_at:now},{onConflict:'user_id'});if(statusErr)throw statusErr;
   cloudSyncState={user_id:uid,initial_upload_completed:initial?true:!!cloudSyncState?.initial_upload_completed,last_sync_at:now};cloudSyncLastAt=now;if(!silent)authMessage('Cloud sync complete.');return true;
  }catch(e){cloudSyncLastError=e?.message||String(e);if(!silent)authMessage('Cloud sync failed: '+cloudSyncLastError,true);return false}finally{cloudSyncBusy=false;if(cloudSyncPending){cloudSyncPending=false;scheduleCloudSync()}}
 }
 function initialCloudUpload(){PPCUI.open({eyebrow:'CLOUD SETUP',title:'Create your first cloud copy?',message:'Your existing browser decks, matches, rank history, collection, sessions, and preferences will be uploaded. Your local browser data stays intact.',actions:[{label:'Cancel',className:'secondary',onclick:'PPCUI.close()'},{label:'Upload My Data',onclick:'PPCUI.close();performInitialCloudUpload()'}]})}
 async function performInitialCloudUpload(){state.cloudPrefs.autoSync=true;persist();const ok=await syncLocalToCloud({initial:true});if(ok){await loadCloudSyncState();rerenderAccount()}}

 function localRecoveryRegistry(){const list=safeJsonParse(safeStorageGet(RECOVERY_REGISTRY_KEY),[]);return Array.isArray(list)?list.filter(x=>x&&x.key):[]}
 function saveRecoveryRegistry(list){safeStorageSet(RECOVERY_REGISTRY_KEY,JSON.stringify((list||[]).slice(0,8)))}
 function registerRecoveryPoint(key,label='Automatic safety backup'){const list=localRecoveryRegistry().filter(x=>x.key!==key);list.unshift({key,label,createdAt:Date.now()});saveRecoveryRegistry(list);return key}
 function localRecoveryPointsHtml(){const list=localRecoveryRegistry();if(!list.length)return `<p class="muted">No automatic restore points yet. One is created before every cloud restore.</p>`;return `<div class="recoveryPoints">${list.map(x=>`<div class="recoveryPoint"><div><strong>${esc(x.label||'Safety backup')}</strong><small>${new Date(Number(x.createdAt)||Date.now()).toLocaleString()}</small></div><button class="secondary" onclick="previewRecoveryPoint('${esc(x.key)}')">Restore</button></div>`).join('')}</div>`}
 function makeLocalCloudBackup(label='Before cloud restore'){const key=`${STORE}_before_cloud_restore_${Date.now()}`;safeStorageSet(key,JSON.stringify(state));registerRecoveryPoint(key,label);return key}
 function previewRecoveryPoint(key){
  const snap=safeJsonParse(safeStorageGet(key),null);if(!snap)return PPCUI.notice('This restore point is no longer available.',{title:'Restore point missing',tone:'warning'});
  const current=localCloudCounts(),oldState=repairStateShape({...snap}),old={decks:oldState.decks.length,matches:oldState.matches.length,collection:Object.values(oldState.collection||{}).filter(r=>Number(r?.owned||0)||Number(r?.wanted||0)||Number(r?.tradeable||0)).length,sessions:oldState.sessions.length};
  PPCUI.open({eyebrow:'LOCAL RECOVERY',title:'Restore this browser backup?',message:'This replaces the current browser state with the saved restore point. A fresh safety backup will be created first.',html:`<div class="comparisonGrid"><div><span>Current browser</span><strong>${current.decks} decks</strong><small>${current.matches} matches • ${current.collection} collection cards</small></div><div><span>Restore point</span><strong>${old.decks} decks</strong><small>${old.matches} matches • ${old.collection} collection cards</small></div></div>`,actions:[{label:'Cancel',className:'secondary',onclick:'PPCUI.close()'},{label:'Restore Backup',className:'danger',onclick:`performRecoveryRestore('${esc(key)}')`}]});
 }
 function performRecoveryRestore(key){const snap=safeJsonParse(safeStorageGet(key),null);if(!snap)return PPCUI.notice('This restore point is unavailable.',{tone:'warning'});makeLocalCloudBackup('Before local recovery restore');state=repairStateShape(snap);ensureStableLocalIds();persist();PPCUI.close();render();requestAnimationFrame(()=>authMessage('Local restore point recovered successfully.'))}
 function openManualCloudSyncConfirm(){PPCUI.open({eyebrow:'CLOUD SYNC',title:'Upload this browser to cloud?',message:'Safe sync adds and updates records. It does not delete cloud-only records.',actions:[{label:'Cancel',className:'secondary',onclick:'PPCUI.close()'},{label:'Upload Now',onclick:'PPCUI.close();manualCloudSyncConfirmed()'}]})}
 async function manualCloudSyncConfirmed(){const ok=await syncLocalToCloud({silent:false});if(ok){await loadCloudSyncState();rerenderAccount()}}
 async function toggleCloudAutoSync(on){if(on){PPCUI.open({eyebrow:'AUTO SYNC',title:'Enable automatic cloud sync?',message:'Changes on this browser will be uploaded automatically. Cloud-only records are not deleted by safe sync.',actions:[{label:'Cancel',className:'secondary',onclick:'state.cloudPrefs.autoSync=false;PPCUI.close();accountPage()'},{label:'Enable Auto Sync',onclick:'PPCUI.close();enableCloudAutoSyncConfirmed()'}]});return}state.cloudPrefs.autoSync=false;persist();rerenderAccount()}
 async function enableCloudAutoSyncConfirmed(){state.cloudPrefs.autoSync=true;persist();if(cloudSyncState?.initial_upload_completed)await syncLocalToCloud({silent:true});rerenderAccount()}

 async function fetchAllCloudData(){
  const c=client(),uid=userId();if(!c||!uid)throw new Error('Sign in first.');const result={cloud_decks:[],cloud_matches:[],cloud_rank_history:[],cloud_sessions:[],cloud_collection:[],preferences:{},rankedState:null};
  const calls=await Promise.all([c.rpc('get_my_cloud_deck_sync'),c.rpc('get_my_battle_match_sync'),c.rpc('get_my_rank_history_sync'),c.rpc('get_my_battle_session_sync'),c.rpc('get_my_collection_sync'),c.rpc('get_my_ranked_state')]);
  const firstError=calls.find(x=>x?.error)?.error;if(firstError)throw firstError;
  result.cloud_decks=(calls[0].data||[]).filter(row=>!row.deleted_at);result.cloud_matches=(calls[1].data||[]).filter(row=>!row.deleted_at);result.cloud_rank_history=(calls[2].data||[]).filter(row=>!row.deleted_at);result.cloud_sessions=(calls[3].data||[]).filter(row=>!row.deleted_at);result.cloud_collection=(calls[4].data||[]).filter(row=>!row.deleted_at).map(row=>({card_id:row.card_id,payload:{owned:Number(row.owned_quantity||0),wanted:Number(row.wanted_quantity||0),tradeable:Number(row.trade_quantity||0)},updated_at:row.updated_at}));result.rankedState=Array.isArray(calls[5].data)?(calls[5].data[0]||null):(calls[5].data||null);
  const {data:pref,error:prefErr}=await c.from('cloud_preferences').select('payload').eq('user_id',uid).maybeSingle();if(prefErr)throw prefErr;result.preferences=pref?.payload||{};return result;
 }
 function cloudPayloadSummary(d){return {decks:d.cloud_decks?.length||0,matches:d.cloud_matches?.length||0,rankHistory:d.cloud_rank_history?.length||0,collection:d.cloud_collection?.length||0,sessions:d.cloud_sessions?.length||0}}
 async function openCloudRestorePreview(){
  if(!client()||!userId())return authMessage('Sign in first.',true);cloudSyncBusy=true;rerenderAccount();
  try{const d=await fetchAllCloudData();pendingCloudRestoreData=d;const cloud=cloudPayloadSummary(d),local=localCloudCounts(),differs=cloud.decks!==local.decks||cloud.matches!==local.matches||cloud.collection!==local.collection||cloud.sessions!==local.sessions;PPCUI.open({eyebrow:'CLOUD RESTORE',title:'Compare before restoring',message:'Nothing has changed yet. Safe Merge keeps existing browser records and adds cloud-only records. Replace Browser uses the cloud copy as the source of truth.',html:`<div class="comparisonGrid"><div><span>This browser</span><strong>${local.decks} decks</strong><small>${local.matches} matches • ${local.collection} collection cards • ${local.sessions} sessions</small></div><div><span>Cloud</span><strong>${cloud.decks} decks</strong><small>${cloud.matches} matches • ${cloud.collection} collection cards • ${cloud.sessions} sessions</small></div></div>${differs?'<div class="warningBox"><strong>Differences detected.</strong> Use Safe Merge unless you intentionally want to replace this browser.</div>':'<div class="successBox">Counts match. You can still merge safely or replace this browser.</div>'}`,actions:[{label:'Cancel',className:'secondary',onclick:'PPCUI.close()'},{label:'Safe Merge',className:'secondary',onclick:'performCloudSafeMerge()'},{label:'Replace Browser',className:'danger',onclick:'performCloudReplace()'}]})}catch(e){PPCUI.notice(esc(e?.message||String(e)),{title:'Cloud restore unavailable',tone:'danger'})}finally{cloudSyncBusy=false}
 }
 function mergePayloadRowsKeepLocal(localRows,cloudRows){const out=Array.isArray(localRows)?localRows.map(x=>({...x})):[],seen=new Set(out.map(x=>String(x?.id||x?.local_id||'')).filter(Boolean));(cloudRows||[]).forEach(row=>{const p=row?.payload;if(!p)return;const id=String(p.id||row.local_id||'');if(id&&seen.has(id))return;out.push(p);if(id)seen.add(id)});return out}
 function performCloudSafeMerge(){
  const d=pendingCloudRestoreData;if(!d)return PPCUI.notice('Reload the cloud preview first.',{tone:'warning'});makeLocalCloudBackup('Before safe cloud merge');state.decks=mergePayloadRowsKeepLocal(state.decks,d.cloud_decks);state.matches=mergePayloadRowsKeepLocal(state.matches,d.cloud_matches);state.rankHistory=mergePayloadRowsKeepLocal(state.rankHistory,d.cloud_rank_history);state.sessions=mergePayloadRowsKeepLocal(state.sessions,d.cloud_sessions);const merged={...(state.collection||{})};(d.cloud_collection||[]).forEach(x=>{if(!merged[x.card_id])merged[x.card_id]=x.payload||{}});state.collection=merged;state=repairStateShape(state);ensureStableLocalIds();persist();pendingCloudRestoreData=null;PPCUI.close();render();requestAnimationFrame(()=>authMessage('Safe merge complete. Existing browser records were kept; cloud-only records were added.'));
 }
 function performCloudReplace(){
  const d=pendingCloudRestoreData;if(!d)return PPCUI.notice('Reload the cloud preview first.',{tone:'warning'});makeLocalCloudBackup('Before cloud replacement');state.decks=d.cloud_decks.map(x=>x.payload).filter(Boolean);state.matches=d.cloud_matches.map(x=>x.payload).filter(Boolean);state.rankHistory=d.cloud_rank_history.map(x=>x.payload).filter(Boolean);state.sessions=d.cloud_sessions.map(x=>x.payload).filter(Boolean);state.collection=Object.fromEntries(d.cloud_collection.map(x=>[x.card_id,x.payload||{}]));const pref=d.preferences||{};['battlePrefs','streamer','trade','archetypePrefs','metaV73','metaIntel','rank','selected','simDeck','cloudPrefs','deckPrefs','collectionPrefs'].forEach(k=>{if(pref[k]!==undefined)state[k]=pref[k]});if(d.rankedState?.ranked_state&&Object.keys(d.rankedState.ranked_state).length)state.rank={...(state.rank||{}),...d.rankedState.ranked_state};state=repairStateShape(state);ensureStableLocalIds();initBattleRankRuntimeSnapshot();persist();pendingCloudRestoreData=null;PPCUI.close();render();requestAnimationFrame(()=>authMessage('Cloud data restored. A recoverable local backup was created first.'));
 }
 async function restoreCloudToLocal(){return openCloudRestorePreview()}
 async function cloudDataSummary(){if(!client()||!userId())return null;try{return cloudPayloadSummary(await fetchAllCloudData())}catch(e){cloudSyncLastError=e?.message||String(e);return null}}

 function baseCloudSyncPanel(){
  const local=localCloudCounts(),ready=!!cloudSyncState?.initial_upload_completed,last=cloudSyncState?.last_sync_at?new Date(cloudSyncState.last_sync_at).toLocaleString():'Never',recovery=localRecoveryPointsHtml();
  if(!ready)return `<div class="panel cloudPanel"><h2>Cloud Sync Setup</h2><p class="muted">Your account is signed in, but your existing browser data has not been uploaded.</p><div class="metricgrid"><div class="metric"><div class="l">Local Decks</div><div class="n">${local.decks}</div></div><div class="metric"><div class="l">Local Matches</div><div class="n">${local.matches}</div></div><div class="metric"><div class="l">Collection Cards</div><div class="n">${local.collection}</div></div><div class="metric"><div class="l">Total Copies</div><div class="n">${local.collectionCopies}</div></div><div class="metric"><div class="l">Sessions</div><div class="n">${local.sessions}</div></div></div><div class="successBox"><strong>Your local data is not being changed or deleted.</strong><br>Upload creates the first cloud copy and enables autosync.</div><div class="row"><button onclick="initialCloudUpload()">Upload My Existing Browser Data</button><button class="secondary" onclick="openCloudRestorePreview()">Review Existing Cloud Data</button></div><details class="cloudRecoveryDetails"><summary>Local restore points</summary>${recovery}</details></div>`;
  return `<div class="panel cloudPanel"><div class="between"><div><h2>Cloud Sync</h2><p class="muted">Safe local + cloud synchronization</p></div><span class="badge">${state.cloudPrefs?.autoSync?'Auto Sync On':'Manual'}</span></div><div class="metricgrid"><div class="metric"><div class="l">Local Decks</div><div class="n">${local.decks}</div></div><div class="metric"><div class="l">Local Matches</div><div class="n">${local.matches}</div></div><div class="metric"><div class="l">Rank History</div><div class="n">${local.rankHistory}</div></div><div class="metric"><div class="l">Collection Cards</div><div class="n">${local.collection}</div></div><div class="metric"><div class="l">Sessions</div><div class="n">${local.sessions}</div></div></div><p class="muted tiny">Last cloud sync: ${esc(last)}</p><div class="row cloudSubsystemStatus"><span class="muted tiny">Deck Cloud</span><span class="badge ${deckCloudStatus==='synced'?'good':deckCloudStatus==='error'?'bad':''}">${esc(deckCloudStatus==='synced'?'Synced':deckCloudStatus==='syncing'?'Syncing…':deckCloudStatus==='offline'?'Offline':deckCloudStatus==='error'?'Needs attention':'Cloud ready')}</span></div>${deckCloudError?`<div class="dangerBox">Decks: ${esc(deckCloudError)}</div>`:''}<div class="row cloudSubsystemStatus"><span class="muted tiny">Battle + Rank Cloud</span><span id="battleRankCloudStatus" class="badge ${battleRankCloudStatusLabel().cls||''}">${esc(battleRankCloudStatusLabel().text)}</span></div>${battleRankCloudError?`<div class="dangerBox">Battle + Rank: ${esc(battleRankCloudError)}</div>`:''}${cloudSyncLastError?`<div class="dangerBox">${esc(cloudSyncLastError)}</div>`:''}<label class="cloudToggle"><input type="checkbox" ${state.cloudPrefs?.autoSync?'checked':''} onchange="toggleCloudAutoSync(this.checked)"> Auto-sync additions and updates after local saves</label><div class="row"><button onclick="openManualCloudSyncConfirm()">Upload Local → Cloud</button><button class="secondary" onclick="openCloudRestorePreview()">Review / Restore Cloud</button></div><p class="muted tiny">Safe sync does not delete cloud-only rows. Restore shows a comparison first and creates a recoverable local restore point.</p><details class="cloudRecoveryDetails"><summary>Local restore points</summary>${recovery}</details></div>`;
 }
 async function loadCloudDomainSummary848(){const c=client(),uid=userId();if(!c||!uid){cloudDomainSummary848=[];return []}try{const {data,error}=await c.rpc('get_my_cloud_sync_summary');if(error)throw error;cloudDomainSummary848=Array.isArray(data)?data:[];return cloudDomainSummary848}catch(e){console.warn('V8.48 sync summary',e);return []}}
 function syncDomainLabel848(d){return ({decks:'Decks',battle:'Battle',rank:'Rank',collection:'Collection',preferences:'Preferences',streamer:'Streamer',tournament:'Tournament',caster:'Caster'})[d]||d}
 function cloudDomainCenter848(){const rows=cloudDomainSummary848||[];if(!rows.length){setTimeout(async()=>{await loadCloudDomainSummary848();rerenderAccount()},0);return `<section class="panel v848SyncCenter"><span class="eyebrow">V8.48 • UNIFIED CLOUD</span><h2>Sync Center</h2><p class="muted">Loading your cloud systems…</p></section>`}return `<section class="panel v848SyncCenter"><div class="between"><div><span class="eyebrow">V8.48 • UNIFIED CLOUD</span><h2>Sync Center</h2><p class="muted">One place to see which parts of PocketNexus are stored in your account.</p></div><button class="secondary" onclick="refreshCloudDomainSummary848()">Refresh</button></div><div class="v848DomainGrid">${rows.map(r=>`<div class="v848Domain"><div class="between"><strong>${esc(syncDomainLabel848(r.domain))}</strong><span class="badge">${esc(r.sync_status||'idle')}</span></div><div class="v848DomainCount">${Number(r.item_count||0)}</div><small class="muted">cloud items${Number(r.deleted_count||0)?` • ${Number(r.deleted_count)} archived`:''}</small>${r.last_cloud_change_at?`<small>Updated ${new Date(r.last_cloud_change_at).toLocaleString()}</small>`:''}${r.last_error?`<small class="dangerText">${esc(r.last_error)}</small>`:''}</div>`).join('')}</div><p class="muted tiny">Decks use cloud tombstones too, matching Battle, Rank, and Collection recovery behavior.</p></section>`}
 async function refreshCloudDomainSummary848(){await loadCloudDomainSummary848();rerenderAccount()}
 function cloudSyncPanel(){return cloudDomainCenter848()+baseCloudSyncPanel()}

 const api={authMessage,loadCloudProfile,emailSignUp,emailSignIn,googleSignIn,accountAppleSignIn,resetPassword,completePasswordRecovery,recoveryPasswordPanel,changeAccountPassword,signOutEverywhere,cloudSignOut,saveCloudProfile,cloudUserId,cloudSyncEnabled,scheduleCloudSync,meaningfulCollectionEntries,localCloudCounts,cloudPreferencePayload,loadCloudSyncState,replaceCloudRows,syncLocalToCloud,initialCloudUpload,performInitialCloudUpload,localRecoveryRegistry,saveRecoveryRegistry,registerRecoveryPoint,localRecoveryPointsHtml,previewRecoveryPoint,performRecoveryRestore,openManualCloudSyncConfirm,manualCloudSyncConfirmed,toggleCloudAutoSync,enableCloudAutoSyncConfirmed,fetchAllCloudData,makeLocalCloudBackup,cloudPayloadSummary,openCloudRestorePreview,mergePayloadRowsKeepLocal,performCloudSafeMerge,performCloudReplace,restoreCloudToLocal,cloudDataSummary,cloudSyncPanel,loadCloudDomainSummary848,syncDomainLabel848,cloudDomainCenter848,refreshCloudDomainSummary848};
 Object.assign(window,api);
 window.PPCAccountCloudRuntime={...api,version:'8.64.1',extracted:true};
})();
