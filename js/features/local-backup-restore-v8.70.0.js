/* PocketNexus V8.70.0 — local backup + restore
   Player-facing browser backup that works without a cloud account.
   This does not export Supabase sessions, passwords, cookies, or external credentials. */
(function(){
  'use strict';
  if(window.PPCLocalBackupRestore)return;

  const SAFETY_PREFIX='ppc_local_restore_safety_';

  function escLocal(v){
    if(typeof window.esc==='function')return window.esc(v);
    return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function notice(message,bad=false){
    try{if(window.PPCUI?.notice)return PPCUI.notice(message,{title:bad?'Backup & Restore':'Local backup'});}catch{}
    try{if(typeof window.ppcNotice==='function')return window.ppcNotice(message);}catch{}
    console[bad?'warn':'log'](message);
  }

  function snapshot(){
    const clean=JSON.parse(JSON.stringify(window.state||{}));
    return {
      format:'pocketnexus-local-backup',
      version:1,
      exported_at:new Date().toISOString(),
      data:clean
    };
  }

  function exportLocalBackup(){
    try{
      const payload=JSON.stringify(snapshot(),null,2);
      const blob=new Blob([payload],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      const day=new Date().toISOString().slice(0,10);
      a.href=url;a.download=`pocketnexus-backup-${day}.json`;
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      notice('Local backup downloaded. Keep the file somewhere you trust.');
    }catch(e){
      console.error('Local backup export failed',e);
      notice('Could not create the local backup file.',true);
    }
  }

  function parseBackup(text){
    const raw=JSON.parse(text);
    const candidate=raw?.format==='pocketnexus-local-backup'?raw.data:raw;
    if(!candidate||typeof candidate!=='object'||Array.isArray(candidate))throw new Error('This is not a valid PocketNexus backup.');
    if(!Array.isArray(candidate.decks)||!Array.isArray(candidate.matches)||!candidate.collection||typeof candidate.collection!=='object')throw new Error('The backup is missing required PocketNexus data.');
    return candidate;
  }

  function makeSafetyBackup(){
    try{
      const key=SAFETY_PREFIX+Date.now();
      localStorage.setItem(key,JSON.stringify(window.state||{}));
      return key;
    }catch{return ''}
  }

  async function importLocalBackup(input){
    const file=input?.files?.[0];
    if(!file)return;
    try{
      const incoming=parseBackup(await file.text());
      makeSafetyBackup();
      let repaired=incoming;
      try{if(typeof window.repairStateShape==='function')repaired=window.repairStateShape({...incoming})}catch(e){console.warn('Backup shape repair skipped',e)}
      window.state=repaired;
      try{if(typeof window.ensureStableLocalIds==='function')window.ensureStableLocalIds()}catch{}
      if(typeof window.save==='function')window.save();
      else if(typeof window.safeStorageSet==='function'&&typeof window.STORE!=='undefined')window.safeStorageSet(window.STORE,JSON.stringify(window.state));
      if(typeof window.render==='function')window.render();
      requestAnimationFrame(()=>notice('Local backup restored successfully.'));
    }catch(e){
      console.error('Local backup restore failed',e);
      notice(e?.message||'Could not restore this backup.',true);
    }finally{
      try{input.value=''}catch{}
    }
  }

  function panelHtml(){
    return `<section class="panel localBackupRestorePanel" id="localBackupRestorePanel"><div class="between"><div><span class="eyebrow">LOCAL BACKUP</span><h2>Backup & Restore</h2></div><span class="pill">NO ACCOUNT REQUIRED</span></div><p class="muted">Download a copy of this browser's PocketNexus data, or restore it on another browser. This file contains your PocketNexus app data only — not passwords, cookies, or account session credentials.</p><div class="row wrap"><button type="button" onclick="exportPocketNexusLocalBackup()">Export Local Backup</button><label class="button secondary" for="pocketNexusLocalRestoreInput" style="cursor:pointer">Restore Local Backup</label><input id="pocketNexusLocalRestoreInput" type="file" accept="application/json,.json" onchange="restorePocketNexusLocalBackup(this)" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;clip-path:inset(50%)"></div><div class="infoBox"><strong>Restore safety:</strong> PocketNexus saves a local safety snapshot before replacing the current browser state.</div></section>`;
  }

  function injectPanel(){
    const app=document.getElementById('app');
    if(!app||document.getElementById('localBackupRestorePanel'))return;
    const shell=app.querySelector('.accountPageShell');
    if(!shell)return;
    const onboarding=document.getElementById('restartOnboardingPanel');
    if(onboarding)onboarding.insertAdjacentHTML('beforebegin',panelHtml());
    else shell.insertAdjacentHTML('beforeend',panelHtml());
  }

  const baseAccountPage=window.accountPage;
  if(typeof baseAccountPage==='function'){
    window.accountPage=function(){
      const result=baseAccountPage.apply(this,arguments);
      setTimeout(injectPanel,0);
      return result;
    };
  }

  window.exportPocketNexusLocalBackup=exportLocalBackup;
  window.restorePocketNexusLocalBackup=importLocalBackup;
  window.PPCLocalBackupRestore={exportLocalBackup,importLocalBackup,injectPanel,snapshot};

  try{if(window.state?.page==='account'){window.accountPage?.()}}catch{}
})();