/* PocketNexus V8.64.1 — Account + Cloud startup core
   Performance Pass 2D foundation.
   Owns only the startup-critical Supabase session/bootstrap path so the larger
   Rank/Streamer bundle can be split safely in follow-up commits.
   No visible Account UI is changed here. */
(function(){
  'use strict';
  if(window.PPCAccountCloudCore)return;

  const CONFIG={
    url:'https://cdmzrsvwztndqfwzsumo.supabase.co',
    publishableKey:'sb_publishable_rRpqFtZ_izENE8u8gTjo9Q_858RVJzl'
  };

  let authSubscriptionBound=false;
  let sessionRequestStarted=false;

  function configured(){
    return /^https:\/\/.+\.supabase\.co$/i.test(CONFIG.url)
      && !!CONFIG.publishableKey
      && !CONFIG.publishableKey.includes('PASTE_');
  }

  function client(){
    try{return cloudClient||null}catch{return null}
  }

  function session(){
    try{return cloudSession||null}catch{return null}
  }

  function safePersist(){
    try{safeStorageSet(STORE,JSON.stringify(state))}catch(e){console.warn('Cloud core state persist',e)}
  }

  async function hydrate(nextSession,event='INITIAL_SESSION'){
    try{cloudSession=nextSession||null}catch{}

    if(nextSession?.user){
      try{if(typeof cleanupAuthReturnUrl==='function')cleanupAuthReturnUrl()}catch{}
      try{
        if(state.user&&state.user!=='Guest'&&state.sessionMode!=='cloud')state.localProfileName=state.user;
        state.user=nextSession.user.email||'Account';
        state.sessionMode='cloud';
        if(typeof VALID_PAGES!=='undefined'&&VALID_PAGES?.has?.(state.page)===false)state.page='dashboard';
        safePersist();
        render?.();
      }catch(e){console.warn('Cloud core initial session paint',e)}
    }else{
      try{
        if(state.sessionMode==='cloud'){
          state.user=state.localProfileName||null;
          state.sessionMode=null;
          safePersist();
          render?.();
        }
      }catch(e){console.warn('Cloud core signed-out state',e)}
    }

    // These are optional here by design. During the staged extraction they are
    // supplied by the legacy cloud bundle; later they can move into dedicated
    // cloud-domain modules without changing startup behavior.
    try{if(typeof loadCloudProfile==='function')await loadCloudProfile()}catch(e){console.warn('Profile hydrate failed',e)}
    try{if(typeof loadCloudSyncState==='function')await loadCloudSyncState()}catch(e){console.warn('Cloud sync-state hydrate failed',e)}

    if(nextSession?.user){
      try{if(typeof mergeDeckCloudOnSignIn==='function')await mergeDeckCloudOnSignIn()}catch(e){console.warn('Deck sign-in merge failed',e)}
      try{if(typeof mergeCloudCollectionOnSignIn==='function')await mergeCloudCollectionOnSignIn()}catch(e){console.warn('Collection sign-in merge failed',e)}
      try{if(typeof mergeBattleRankCloudOnSignIn==='function')await mergeBattleRankCloudOnSignIn()}catch(e){console.warn('Battle/rank sign-in merge failed',e)}
      try{
        const p=typeof cloudProfile!=='undefined'?cloudProfile:null;
        state.user=p?.display_name||nextSession.user.email||'Account';
        state.sessionMode='cloud';
        safePersist();
      }catch(e){console.warn('Cloud core profile state',e)}
    }

    try{
      if(event==='PASSWORD_RECOVERY'){
        passwordRecoveryMode=true;
        state.page='account';
        safePersist();
      }
    }catch(e){console.warn('Password recovery state',e)}

    try{render?.()}catch(e){console.warn('Cloud core final render',e)}
  }

  function init(){
    const existing=client();
    if(existing)return existing;
    if(!configured()||!window.supabase?.createClient)return null;

    try{
      // bootstrap.js owns these shared runtime variables. Keeping the state there
      // avoids changing storage/session semantics during this performance refactor.
      cloudClient=window.supabase.createClient(CONFIG.url,CONFIG.publishableKey,{
        auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
      });
      cloudInitStarted=true;
    }catch(e){
      try{cloudInitStarted=false;cloudSyncLastError=e?.message||String(e)}catch{}
      console.warn('Account cloud core init failed',e);
      return null;
    }

    const c=client();
    if(!c)return null;

    if(!sessionRequestStarted){
      sessionRequestStarted=true;
      c.auth.getSession().then(({data,error})=>{
        if(error){try{cloudSyncLastError=error.message}catch{};try{render?.()}catch{};return}
        hydrate(data?.session||null,'INITIAL_SESSION');
      }).catch(e=>{try{cloudSyncLastError=e?.message||String(e)}catch{};console.warn('Initial auth session failed',e)});
    }

    if(!authSubscriptionBound){
      authSubscriptionBound=true;
      c.auth.onAuthStateChange((event,nextSession)=>{
        setTimeout(()=>hydrate(nextSession,event),0);
      });
    }

    return c;
  }

  window.PPCAccountCloudCore={configured,init,client,session,hydrate,config:{url:CONFIG.url}};

  // Compatibility exports let existing Account/entry code call the same names.
  // The legacy combined bundle may temporarily overwrite these during the staged
  // split; account_startup explicitly prefers PPCAccountCloudCore.init().
  if(typeof window.cloudConfigured!=='function')window.cloudConfigured=configured;
  if(typeof window.initCloudAuth!=='function')window.initCloudAuth=init;
  if(typeof window.getPPCCloudClient!=='function')window.getPPCCloudClient=client;
  if(typeof window.getPPCCloudSession!=='function')window.getPPCCloudSession=session;
})();
