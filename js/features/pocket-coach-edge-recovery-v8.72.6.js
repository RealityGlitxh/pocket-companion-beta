/* PocketNexus V8.72.6 — Pocket Coach Edge Function recovery.
   Retries once after refreshing an expired Supabase session and surfaces the
   Edge Function's real JSON error instead of the generic non-2xx wrapper. */
(function(){
'use strict';
if(window.PPCPocketCoachEdgeRecovery)return;

async function responseErrorMessage(error){
  const fallback=String(error?.message||error||'Pocket Coach request failed.');
  const response=error?.context;
  if(!response||typeof response.clone!=='function')return fallback;
  try{
    const clone=response.clone();
    const type=String(clone.headers?.get?.('content-type')||'');
    if(type.includes('application/json')){
      const body=await clone.json();
      return String(body?.error||body?.message||body?.msg||fallback);
    }
    const text=(await clone.text()).trim();
    return text||fallback;
  }catch{return fallback}
}

function responseStatus(error){
  const n=Number(error?.context?.status||error?.status||0);
  return Number.isFinite(n)?n:0;
}

async function invokeCoach(body){
  const c=typeof coachClient==='function'?coachClient():window.getPPCCloudClient?.();
  if(!c)throw new Error('Pocket Coach cloud client is unavailable.');

  let first=await c.functions.invoke('pocket-coach',{body});
  if(!first?.error&&!first?.data?.error)return first.data;

  let detail=first?.data?.error?String(first.data.error):await responseErrorMessage(first?.error);
  const status=responseStatus(first?.error);
  const authFailure=status===401||status===403||/unauthoriz|jwt|token|session/i.test(detail);

  if(authFailure&&c.auth?.refreshSession){
    try{
      const refreshed=await c.auth.refreshSession();
      if(refreshed?.data?.session){
        try{cloudSession=refreshed.data.session}catch{}
        const second=await c.functions.invoke('pocket-coach',{body});
        if(!second?.error&&!second?.data?.error)return second.data;
        detail=second?.data?.error?String(second.data.error):await responseErrorMessage(second?.error);
      }
    }catch(refreshError){
      detail=await responseErrorMessage(refreshError);
    }
  }

  if(/Edge Function returned a non-2xx status code/i.test(detail)){
    detail='Pocket Coach could not complete the request. Please try again; if it continues, refresh your sign-in session.';
  }
  throw new Error(detail);
}

function install(){
  if(window.__ppcPocketCoachEdgeRecoveryInstalled)return;
  if(typeof window.coachSend!=='function'||typeof window.coachCheckProvider!=='function')return setTimeout(install,50);
  window.__ppcPocketCoachEdgeRecoveryInstalled=true;

  window.coachCheckProvider=async function(){
    const s=typeof coachSession==='function'?coachSession():window.getPPCCloudSession?.();
    if(!s?.user){pocketCoachState.providerChecked=true;return}
    try{
      const data=await invokeCoach({action:'status'});
      pocketCoachState.providerConfigured=!!data?.providerConfigured;
      pocketCoachState.provider=data?.provider||'openai';
      pocketCoachState.model=data?.model||pocketCoachState.model;
    }catch(e){
      pocketCoachState.providerConfigured=false;
      pocketCoachState.error=e?.message||String(e);
    }
    pocketCoachState.providerChecked=true;
    pocketCoachPage(true);
  };

  window.coachSend=async function(messageOverride=''){
    const input=document.getElementById('coachInput');
    const message=String(messageOverride||input?.value||'').trim();
    if(!message||pocketCoachState.loading)return;
    const s=typeof coachSession==='function'?coachSession():window.getPPCCloudSession?.();
    if(!s?.user){pocketCoachState.error='Sign in to use Pocket Coach so it can securely read your PocketNexus data.';return pocketCoachPage(true)}

    pocketCoachState.loading=true;
    pocketCoachState.error='';
    pocketCoachState.messages.push({role:'user',content:message,source_labels:[]});
    if(input)input.value='';
    pocketCoachPage(true);

    try{
      const data=await invokeCoach({message,conversationId:pocketCoachState.conversationId});
      pocketCoachState.conversationId=data?.conversationId||pocketCoachState.conversationId;
      pocketCoachState.providerConfigured=!!data?.providerConfigured;
      pocketCoachState.provider=data?.provider||pocketCoachState.provider;
      pocketCoachState.model=data?.model||pocketCoachState.model;
      pocketCoachState.providerChecked=true;
      pocketCoachState.matchupReport=Array.isArray(data?.matchupReport)?data.matchupReport:[];
      pocketCoachState.messages.push({role:'assistant',content:data?.answer||'Pocket Coach returned no answer.',source_labels:data?.sources||[],model_provider:data?.provider,model_name:data?.model,matchupReport:pocketCoachState.matchupReport});
      if(typeof coachLoadConversations==='function')await coachLoadConversations();
    }catch(e){
      pocketCoachState.error=e?.message||String(e);
    }

    pocketCoachState.loading=false;
    pocketCoachPage(true);
  };

  window.PPCPocketCoachEdgeRecovery={version:'8.72.6',invoke:invokeCoach};
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0),{once:true});else setTimeout(install,0);
})();
