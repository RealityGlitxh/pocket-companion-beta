/* PocketNexus V8.64.1 Hotfix 6 — Brain Teaser slide flow */
(() => {
  let advanceTimer = null;
  const clearAdvance = () => { if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; } };
  const goToBrain = () => setTimeout(() => document.querySelector('.brainTraining')?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 0);

  window.brainCard = function brainCardSlide(p) {
    const a = brainRead().answers?.[p.id];
    const icon = {'Best Move':'↗','Find the Misplay':'!','KO Math':'Σ','Sequencing':'⇥','Energy Management':'⚡','Retreat Decisions':'↩','Matchup Puzzles':'VS','Opening Hand':'5','Endgame Training':'◎'}[p.type] || '✦';
    const correctText = p.choices[p.answer];
    return `<article class="brainCard brainSlide ${a?'answered':''}">
      <div class="brainCardTop"><span class="brainModeIcon">${icon}</span><div><span class="eyebrow">${esc(p.type)}</span><h3>${esc(p.title)}</h3></div><span class="brainDifficulty">${esc(p.difficulty)}</span></div>
      <div class="brainScenario"><span>SCENARIO</span><p>${esc(p.prompt)}</p></div>
      <div class="brainChoices">${p.choices.map((c,i)=>`<button class="brainChoice ${a?(i===p.answer?'correct':(i===a.choice?'wrong':'')):''}" ${a?'disabled':''} onclick="brainAnswer('${p.id}',${i})"><span>${String.fromCharCode(65+i)}</span><strong>${esc(c)}</strong></button>`).join('')}</div>
      ${a?`<div class="brainExplain ${a.correct?'correct':'wrong'}"><span>${a.correct?'✓':'!'}</span><div><strong>${a.correct?'Correct — nice read.':`Correct answer: ${String.fromCharCode(65+p.answer)} — ${esc(correctText)}`}</strong><p>${esc(p.why)}</p><small>Next scenario loads automatically.</small></div></div>`:''}
    </article>`;
  };

  window.brainAnswer = function brainAnswerSlide(id, choice) {
    const db = brainRead(), p = brainPuzzle(id);
    db.answers = db.answers || {};
    if (db.answers[id]) return;
    const correct = Number(choice) === p.answer;
    db.answers[id] = { choice: Number(choice), correct, at: new Date().toISOString() };
    brainWrite(db);
    trainingChallengeRefresh();
    clearAdvance();
    trainingPage(false);
    trainingCloudSync(true);
    advanceTimer = setTimeout(() => {
      const current = BRAIN_PUZZLES.findIndex(x => x.id === id);
      brainViewIndex = (current + 1) % BRAIN_PUZZLES.length;
      trainingPage(false);
      goToBrain();
    }, correct ? 1800 : 3600);
  };

  window.brainGo = function brainGoSlide(delta) {
    clearAdvance();
    brainViewIndex = (brainViewIndex + Number(delta) + BRAIN_PUZZLES.length) % BRAIN_PUZZLES.length;
    trainingPage(false);
    goToBrain();
  };

  window.brainJump = function brainJumpSlide(i) {
    clearAdvance();
    brainViewIndex = Math.max(0, Math.min(BRAIN_PUZZLES.length - 1, Number(i) || 0));
    trainingPage(false);
    goToBrain();
  };

  window.brainSection = function brainSectionSlide() {
    const st = brainStats();
    const remaining = Math.max(0, BRAIN_PUZZLES.length - st.done);
    const p = BRAIN_PUZZLES[brainViewIndex] || BRAIN_PUZZLES[0];
    return `<section class="brainTraining brainTrainingCompact">
      <div class="brainHero brainHeroCompact"><div><span class="eyebrow">COMPETITIVE TRAINING LAB</span><h2>Sharpen your next decision.</h2><p>One scenario at a time. Answer, review the result, then move straight into the next rep.</p></div><div class="brainCompactStats"><strong>${st.done}/${BRAIN_PUZZLES.length}</strong><span>${st.done?st.accuracy+'% accuracy':'Start training'}</span></div></div>
      <div class="brainTabs brainTabsCompact"><span>↗ Best Move</span><span>! Misplay</span><span>Σ KO Math</span><span>⇥ Sequencing</span><span>⚡ Energy</span><span>↩ Retreat</span><span>VS Matchups</span><span>5 Opening Hand</span><span>◎ Endgame</span></div>
      <div class="brainPager"><button class="secondary" onclick="brainGo(-1)">← Previous</button><label><span>SCENARIO ${brainViewIndex+1} OF ${BRAIN_PUZZLES.length}</span><select onchange="brainJump(this.value)">${BRAIN_PUZZLES.map((x,i)=>`<option value="${i}" ${i===brainViewIndex?'selected':''}>${i+1}. ${esc(x.type)} — ${esc(x.title)}</option>`).join('')}</select></label><button class="secondary" onclick="brainGo(1)">Next →</button></div>
      <div class="brainGrid brainGridCompact">${brainCard(p)}</div>
      <div class="brainFooter panel brainFooterCompact"><div><strong>${remaining?`${remaining} scenarios remaining`:'Training set complete'}</strong><span>Every answer gives feedback before the next scenario.</span></div><button class="secondary" onclick="brainReset()">Reset</button></div>
    </section>`;
  };
})();
