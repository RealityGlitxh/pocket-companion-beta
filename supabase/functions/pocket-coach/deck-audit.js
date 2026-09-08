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
      resolved.push({
        name: String(entry?.name || card?.name || 'Unknown card'), qty, kind,
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
      resolvedCards: resolved
    };
  });
}
