/* PocketNexus V8.64.1 Hotfix 9 — Training cleanup */
(function(){
  if(typeof window.trainingDailyHtml==='function') window.trainingDailyHtml=function(){return ''};
  window.trainingShowcaseHtml=function(ach){
    const unlocked=Object.entries(TRAINING_ACHIEVEMENTS).filter(([k])=>(ach||[]).some(a=>a.achievement_key===k));
    if(!unlocked.length)return '';
    const selected=trainingShowcaseRead();
    return `<div class="trainingUnlockedRow"><span class="trainingUnlockedLabel">Unlocked</span>${unlocked.map(([k,v])=>`<button type="button" class="trainingUnlockedBadge ${selected.includes(k)?'selected':''}" onclick="trainingShowcaseToggle('${k}')" title="${esc(v[1])}"><b>${v[2]}</b><span>${esc(v[0])}</span></button>`).join('')}<small>Tap up to 3 to feature on your public Training Profile.</small></div>`;
  };
  window.trainingProfileHtml=function(){
    const signed=trainingSigned(),p=signed&&trainingCloud.profile?trainingCloud.profile:trainingLocalProfile(),ach=signed&&trainingCloud.loaded?trainingCloud.achievements:trainingLocalAchievements(),level=trainingLevel(p.training_xp),st=trainingStreaks(),d=trainingChallengeState();
    return `<section class="panel trainingProgressPanel"><div class="trainingProgressHead"><div><span class="eyebrow">YOUR TRAINING PROGRESS</span><h2>Level ${level}</h2><p class="muted">Tracks your practice across the daily card and Brain Teasers.</p></div><div class="trainingProgressActions"><span class="pill ${signed?'ready':''}">${signed?(trainingCloud.loading?'SYNCING':'CLOUD SAVED'):'LOCAL ONLY'}</span>${signed?`<button class="secondary" onclick="trainingCloudSync(true)">Sync</button>`:''}</div></div><div class="trainingProgressStats"><div><strong>${Number(p.training_xp||0)}</strong><span>XP</span></div><div><strong>${st.current}</strong><span>Day streak</span></div><div><strong>${Number(p.brain_accuracy||0)}%</strong><span>Accuracy</span></div><div><strong>${Number(p.modes_completed||0)}/9</strong><span>Modes</span></div><div><strong>${ach.length}</strong><span>Badges</span></div></div><div class="trainingDailyMini"><span class="trainingDailyMiniTitle">Today</span>${d.tasks.map(t=>`<span class="trainingDailyTask ${t.done?'done':''}">${t.done?'✓':'○'} ${esc(t.label.replace('today’s ','').replace('today',''))}</span>`).join('')}</div>${trainingShowcaseHtml(ach)}${trainingCloud.error&&signed?`<div class="notice">Cloud sync issue: ${esc(trainingCloud.error)}</div>`:''}</section>`;
  };
})();
