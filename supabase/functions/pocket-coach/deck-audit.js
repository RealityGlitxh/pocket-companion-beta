export function buildDeckAudits(decks = [], catalogRows = []) {
  const norm = (v) => String(v ?? '').normalize('NFKC').toLowerCase().replace(/[’‘`´]/g, "'").replace(/[^a-z0-9' -]/g, ' ').replace(/\s+/g, ' ').trim();
  const num = (v) => Math.max(0, Number(v ?? 0) || 0);
  const identity = (c) => {
    let set = String(c?.setCode ?? c?.set ?? '').trim().toUpperCase();
    let number = String(c?.number ?? '').trim();
    if ((!set || !number) && c?.id) {
      const m = String(c.id).match(/^(.+)-(\d+)$/);
      if (m) { set = m[1].toUpperCase(); number = m[2]; }
    }
    number = number ? String(parseInt(number, 10) || '') : '';
    return { set, number, name: norm(c?.name) };
  };
  const keyOf = (c) => { const p = identity(c); return p.set && p.number ? `${p.set}:${p.number}` : ''; };
  const byKey = new Map();
  const byName = new Map();
  for (const c of catalogRows || []) {
    const key = keyOf(c), name = norm(c?.name);
    if (key) byKey.set(key, c);
    if (name) {
      const rows = byName.get(name) || [];
      rows.push(c);
      byName.set(name, rows);
    }
  }
  const resolveCard = (card) => {
    const key = keyOf(card), name = norm(card?.name);
    if (key && byKey.has(key)) {
      const hit = byKey.get(key);
      if (!name || norm(hit?.name) === name) return { card: hit, confidence: 'set+number+name' };
    }
    const sameName = name ? (byName.get(name) || []) : [];
    if (sameName.length === 1) return { card: sameName[0], confidence: 'unique-name' };
    return { card: null, confidence: 'unresolved' };
  };
  const stageRank = (stage) => {
    const s = norm(stage);
    if (s === 'basic' || s === '0') return 0;
    if (s.includes('stage 1') || s === '1') return 1;
    if (s.includes('stage 2') || s === '2') return 2;
    return -1;
  };
  const kindOf = (c) => {
    const type = norm(c?.type), stage = norm(c?.stage);
    if (stage || type.includes('pokemon') || type.includes('pokémon')) return 'pokemon';
    if (['trainer','supporter','item','tool','stadium','fossil'].some(x => type.includes(x))) return 'trainer';
    return 'unknown';
  };
  const energyTypesOf = (energy) => {
    const raw = Array.isArray(energy) ? energy : String(energy ?? '').split(/[,/+|]/g);
    return [...new Set(raw.map(x => String(x ?? '').replace(/energy/ig, '').trim()).filter(Boolean))];
  };
  const catalogCandidate = (name) => {
    const rows = byName.get(norm(name)) || [];
    if (rows.length !== 1) return null;
    const c = rows[0], id = identity(c);
    return { name: String(c?.name || name), set: id.set, number: id.number, kind: kindOf(c), stage: c?.stage ?? null, evidence: 'verified-catalog-unique-name' };
  };

  return (decks || []).map((deck) => {
    const entries = Array.isArray(deck?.cards) ? deck.cards : [];
    const names = new Map();
    const resolved = [];
    let totalCards = 0, pokemonCount = 0, trainerCount = 0, unknownCount = 0, basicCount = 0;
    for (let entryIndex = 0; entryIndex < entries.length; entryIndex++) {
      const entry = entries[entryIndex];
      const qty = Math.max(1, num(entry?.qty ?? entry?.quantity ?? 1));
      totalCards += qty;
      const nameKey = norm(entry?.name) || `unknown:${String(entry?.id ?? entryIndex)}`;
      names.set(nameKey, (names.get(nameKey) || 0) + qty);
      const hit = resolveCard(entry), card = hit.card;
      const kind = card ? kindOf(card) : 'unknown';
      if (kind === 'pokemon') pokemonCount += qty;
      else if (kind === 'trainer') trainerCount += qty;
      else unknownCount += qty;
      if (kind === 'pokemon' && stageRank(card?.stage) === 0) basicCount += qty;
      const id = card ? identity(card) : identity(entry);
      resolved.push({
        name: String(entry?.name || card?.name || 'Unknown card'), qty, kind,
        set: id.set || null, number: id.number || null,
        stage: card?.stage ?? null, evolvesFrom: card?.evolvesFrom ?? card?.evolves_from ?? null,
        resolution: hit.confidence
      });
    }

    const duplicateViolations = [...names.entries()].filter(([, qty]) => qty > 2).map(([name, qty]) => ({ name, qty }));
    const deckNames = new Set(resolved.map(x => norm(x.name)).filter(Boolean));
    const evolutionIssues = [];
    for (const x of resolved) {
      const rank = stageRank(x.stage);
      if (x.kind !== 'pokemon' || rank <= 0) continue;
      const parent = norm(x.evolvesFrom);
      if (parent && !deckNames.has(parent)) evolutionIssues.push({ card: x.name, evolvesFrom: x.evolvesFrom, issue: 'missing-required-previous-stage' });
      else if (!parent) evolutionIssues.push({ card: x.name, evolvesFrom: null, issue: 'evolution-parent-metadata-unverified' });
    }

    const energyTypes = energyTypesOf(deck?.energy ?? deck?.energyType ?? deck?.energyTypes);
    const engineCandidates = resolved
      .filter(x => x.kind === 'pokemon')
      .map(x => ({ name: x.name, qty: x.qty, stage: x.stage, stageRank: stageRank(x.stage), isExLike: /\bex\b/i.test(x.name) }))
      .sort((a,b) => b.stageRank - a.stageRank || Number(b.isExLike) - Number(a.isExLike) || b.qty - a.qty || a.name.localeCompare(b.name))
      .slice(0, 5)
      .map(({stageRank: _stageRank, isExLike: _isExLike, ...x}) => x);
    const trainerCore = resolved.filter(x => x.kind === 'trainer' && x.qty >= 2).sort((a,b) => b.qty-a.qty || a.name.localeCompare(b.name)).slice(0, 8).map(x => ({name:x.name,qty:x.qty}));
    const singletonPokemon = resolved.filter(x => x.kind === 'pokemon' && x.qty === 1).map(x => x.name);
    const unknownPokemonStages = resolved.filter(x => x.kind === 'pokemon' && stageRank(x.stage) < 0).length;

    const hardFailures = [];
    if (totalCards !== 20) hardFailures.push({ rule: 'deck-size', message: `Deck has ${totalCards}/20 cards.` });
    if (duplicateViolations.length) hardFailures.push({ rule: 'same-name-copy-limit', message: 'One or more card names exceed the two-copy limit.', cards: duplicateViolations });
    const basicCheckReliable = unknownCount === 0 && unknownPokemonStages === 0;
    if (basicCheckReliable && basicCount < 1) hardFailures.push({ rule: 'basic-pokemon-required', message: 'No Basic Pokémon found.' });

    const consistencySignals = [];
    if (basicCheckReliable && basicCount >= 1 && basicCount <= 2) consistencySignals.push({ type: 'low-basic-count', severity: 'strategy-dependent', message: `${basicCount} Basic Pokémon is legal but gives fewer opening options.` });
    if (evolutionIssues.some(x => x.issue === 'missing-required-previous-stage')) consistencySignals.push({ type: 'incomplete-evolution-line', severity: 'structural', message: 'At least one Evolution Pokémon is missing its verified previous stage.' });
    if (energyTypes.length > 2) consistencySignals.push({ type: 'multi-energy', severity: 'strategy-dependent', message: `${energyTypes.length} Energy types can make Energy sequencing less consistent depending on attack costs.` });
    if (singletonPokemon.length >= 3) consistencySignals.push({ type: 'pokemon-singletons', severity: 'strategy-dependent', message: `${singletonPokemon.length} Pokémon are single-copy inclusions; verify each has a clear role.` });
    if (unknownCount > 0 || unknownPokemonStages > 0) consistencySignals.push({ type: 'unresolved-card-metadata', severity: 'data-quality', message: `${unknownCount} card slot(s) and ${unknownPokemonStages} Pokémon stage record(s) could not be fully classified from the verified catalog.` });

    // Deterministic optimization candidates. These are evidence-backed possibilities, not automatic edits.
    const requiredCuts = [];
    for (const d of duplicateViolations) requiredCuts.push({
      cardName: d.name,
      quantity: d.qty - 2,
      reason: 'same-name-copy-limit',
      confidence: 'required',
      evidence: `Deck contains ${d.qty} copies; known limit is 2.`
    });
    if (totalCards > 20) {
      const alreadyRequired = requiredCuts.reduce((n,x)=>n+x.quantity,0);
      const remaining = Math.max(0, totalCards - 20 - alreadyRequired);
      if (remaining > 0) requiredCuts.push({
        cardName: null,
        quantity: remaining,
        reason: 'deck-size-overage',
        confidence: 'required-count-only',
        evidence: `${remaining} additional card slot(s) must be removed to reach 20; the audit cannot safely choose which strategic cards to cut.`
      });
    }

    const addCandidates = [];
    const seenAdds = new Set();
    for (const issue of evolutionIssues.filter(x=>x.issue==='missing-required-previous-stage' && x.evolvesFrom)) {
      const candidate = catalogCandidate(issue.evolvesFrom);
      if (!candidate) continue;
      const k = norm(candidate.name);
      if (seenAdds.has(k)) continue;
      seenAdds.add(k);
      const existingQty = names.get(k) || 0;
      if (existingQty >= 2) continue;
      addCandidates.push({
        ...candidate,
        quantity: 1,
        reason: 'complete-evolution-line',
        supports: issue.card,
        confidence: 'structural-high',
        evidence: `${issue.card} is verified as evolving from ${candidate.name}, which is absent from the deck.`
      });
    }
    if (basicCheckReliable && basicCount <= 2) {
      for (const x of resolved.filter(x=>x.kind==='pokemon' && stageRank(x.stage)===0 && x.qty===1)) {
        const k = norm(x.name);
        if (seenAdds.has(k) || (names.get(k)||0) >= 2) continue;
        seenAdds.add(k);
        addCandidates.push({
          name:x.name,set:x.set,number:x.number,kind:'pokemon',stage:x.stage,quantity:1,
          reason:'increase-basic-redundancy',confidence:'strategy-dependent',
          evidence:`${x.name} is already a verified Basic in the deck at one copy; a second copy is legal and may improve access, but whether it is optimal depends on the deck plan.`
        });
      }
    }

    const reviewCutCandidates = resolved
      .filter(x => x.qty === 1)
      .map(x => ({
        cardName:x.name,kind:x.kind,stage:x.stage,
        reason:x.kind==='unknown'?'unresolved-singleton':'singleton-review',
        confidence:x.kind==='unknown'?'data-quality':'strategy-dependent',
        evidence:x.kind==='unknown'?'Card metadata is unresolved, so its role cannot be verified.':'Single-copy inclusion; only cut it if its role is less important than the proposed addition.'
      }))
      .slice(0, 10);

    const suggestedSwaps = [];
    for (const add of addCandidates.filter(x=>x.confidence==='structural-high')) {
      const exactCut = requiredCuts.find(x=>x.cardName && x.quantity>0);
      if (exactCut) suggestedSwaps.push({
        remove:{cardName:exactCut.cardName,quantity:1,reason:exactCut.reason},
        add:{cardName:add.name,quantity:1,set:add.set,number:add.number,reason:add.reason},
        confidence:'high-structural',
        explanation:`This simultaneously fixes a required cut and restores the verified evolution chain for ${add.supports}.`
      });
    }

    const priorities = [];
    if (hardFailures.length) priorities.push({rank:1,type:'legality',message:'Fix known construction-rule failures before strategic tuning.'});
    if (evolutionIssues.some(x=>x.issue==='missing-required-previous-stage')) priorities.push({rank:hardFailures.length?2:1,type:'evolution-structure',message:'Repair verified missing evolution parents before lower-confidence consistency changes.'});
    if (consistencySignals.some(x=>x.type==='unresolved-card-metadata')) priorities.push({rank:3,type:'data-quality',message:'Resolve unknown card metadata before making confident optimization claims.'});
    if (consistencySignals.some(x=>x.type==='low-basic-count')) priorities.push({rank:4,type:'opening-consistency',message:'Review Basic count only after legality and evolution structure are sound.'});
    if (consistencySignals.some(x=>x.type==='multi-energy')) priorities.push({rank:5,type:'energy-consistency',message:'Review Energy types against verified attack costs before changing Energy settings.'});

    const optimization = {
      mode:'deterministic-structural-v1',
      autoApply:false,
      requiredCuts,
      addCandidates: addCandidates.slice(0,8),
      reviewCutCandidates,
      suggestedSwaps: suggestedSwaps.slice(0,5),
      priorities,
      guardrails:[
        'Required cuts are based only on known deck-size or same-name copy rules.',
        'Add candidates come only from verified catalog identity or an already-verified Basic in the deck.',
        'Strategy-dependent candidates are suggestions, not legality requirements.',
        'No card is auto-removed solely because it is a singleton.',
        'Energy changes require verified attack-cost evidence before being presented as specific optimization advice.'
      ]
    };

    return {
      deckId: deck?.id || '',
      deckName: deck?.name || 'Untitled deck',
      archetype: deck?.archetype || '',
      totalCards,
      targetCards: 20,
      counts: { pokemon: pokemonCount, trainers: trainerCount, unresolved: unknownCount, basics: basicCount, unknownPokemonStages },
      energyTypes,
      duplicateViolations,
      evolutionIssues,
      engineCandidates,
      trainerCore,
      singletonPokemon,
      legality: {
        status: hardFailures.length ? 'illegal-or-incomplete' : (basicCheckReliable ? 'passes-known-rules' : 'needs-metadata-review'),
        hardFailures,
        basicCheckReliable
      },
      consistencySignals,
      optimization,
      resolvedCards: resolved
    };
  });
}
