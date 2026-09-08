import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const src=await fs.readFile('supabase/functions/pocket-coach/matchup-aware-optimizer.js','utf8');
const {buildMatchupAwareOptimizations}=await import(`data:text/javascript;base64,${Buffer.from(src).toString('base64')}`);
assert.equal(typeof buildMatchupAwareOptimizations,'function');

const decks=[{id:'d1',name:'Lucario Test',cards:[{name:'Mega Lucario ex',qty:2},{name:'Lucario',qty:2},{name:'Stable Core',qty:2},{name:'Risky Tech',qty:1}]}];
const metaAware=[{deckId:'d1',deckName:'Lucario Test',status:'matched',archetypeMatch:{archetypeId:'lucario',name:'Mega Lucario ex / Lucario',confidence:'high'}}];
const archetypes=[
  {id:'lucario',name:'Mega Lucario ex / Lucario',rank:2,usage_pct:12},
  {id:'sceptile',name:'Butterfree / Mega Sceptile ex',rank:1,usage_pct:14},
  {id:'altaria',name:'Mega Altaria ex / Espeon',rank:3,usage_pct:9},
  {id:'tiny',name:'Tiny Sample',rank:12,usage_pct:7}
];
const snapshot={generated_at:'2026-09-08T02:26:35Z'};
const snapshotMatchups=[
  {archetype_a_id:'sceptile',archetype_b_id:'lucario',a_wins:14,b_wins:6,draws:0,matches:20,confidence:'Medium'},
  {archetype_a_id:'lucario',archetype_b_id:'altaria',a_wins:5,b_wins:5,draws:0,matches:10,confidence:'Medium'},
  {archetype_a_id:'lucario',archetype_b_id:'tiny',a_wins:0,b_wins:3,draws:0,matches:3,confidence:'Limited'}
];
const cardEvidence=[
  {archetype_id:'lucario',opponent_archetype_id:'sceptile',card_name:'Matchup Tool',set_code:'B1',card_number:'99',matchup_games:100,matchup_wins:40,matchup_win_rate:40,card_games:30,card_wins:18,card_losses:12,card_win_rate:60,card_inclusion_rate:0.30,win_rate_delta:20},
  {archetype_id:'lucario',opponent_archetype_id:'sceptile',card_name:'Risky Tech',set_code:'B1',card_number:'88',matchup_games:100,matchup_wins:40,matchup_win_rate:40,card_games:25,card_wins:5,card_losses:20,card_win_rate:20,card_inclusion_rate:0.25,win_rate_delta:-20},
  {archetype_id:'lucario',opponent_archetype_id:'sceptile',card_name:'Tiny Miracle',set_code:'B1',card_number:'77',matchup_games:100,matchup_wins:40,matchup_win_rate:40,card_games:5,card_wins:5,card_losses:0,card_win_rate:100,card_inclusion_rate:0.05,win_rate_delta:60},
  {archetype_id:'lucario',opponent_archetype_id:'altaria',card_name:'Even Card',set_code:'B1',card_number:'66',matchup_games:10,matchup_wins:5,matchup_win_rate:50,card_games:8,card_wins:5,card_losses:3,card_win_rate:62.5,card_inclusion_rate:0.8,win_rate_delta:12.5}
];

const out=buildMatchupAwareOptimizations({decks,metaAware,snapshot,archetypes,snapshotMatchups,cardEvidence});
assert.equal(out.length,1);
const x=out[0];
assert.equal(x.status,'matched');
assert.equal(x.archetypeId,'lucario');
assert.equal(x.priorityMatchups[0].opponentId,'sceptile');
assert.equal(x.priorityMatchups[0].winRate,30,'B-side perspective must reverse the matchup correctly');
assert.equal(x.priorityMatchups[0].band,'unfavorable');
assert.equal(x.priorityMatchups[0].evidence,'high');
assert.ok(x.mustPrepareFor.some(m=>m.opponentId==='sceptile'));

const add=x.recommendations.find(r=>r.action==='consider-matchup-tech'&&r.cardName==='Matchup Tool');
assert.ok(add,'strong missing matchup card should become a directional add candidate');
assert.equal(add.confidence,'high-directional');
assert.equal(add.evidence.cardGames,30);
assert.match(add.guardrail,/association/i);

const review=x.recommendations.find(r=>r.action==='review-for-matchup'&&r.cardName==='Risky Tech');
assert.ok(review,'present card with negative association should be review-only');
assert.equal(review.confidence,'review-only');
assert.match(review.guardrail,/Do not cut/i);
assert.ok(!x.recommendations.some(r=>r.cardName==='Tiny Miracle'),'tiny low-inclusion sample must be suppressed');
assert.ok(!x.recommendations.some(r=>r.cardName==='Even Card'),'total matchup sample under 20 must suppress card recommendations');

const tiny=x.priorityMatchups.find(m=>m.opponentId==='tiny');
assert.equal(tiny.evidence,'low');
assert.equal(tiny.band,'insufficient-evidence');
assert.ok(!x.mustPrepareFor.some(m=>m.opponentId==='tiny'));

const noMatch=buildMatchupAwareOptimizations({decks:[{id:'d2',name:'Unknown',cards:[]}],metaAware:[],snapshot,archetypes,snapshotMatchups,cardEvidence})[0];
assert.equal(noMatch.status,'no-reliable-archetype-match');
assert.equal(noMatch.recommendations.length,0);

assert.deepEqual(
  buildMatchupAwareOptimizations({decks,metaAware,snapshot,archetypes,snapshotMatchups,cardEvidence}),
  buildMatchupAwareOptimizations({decks,metaAware,snapshot,archetypes,snapshotMatchups,cardEvidence}),
  'matchup optimizer must be deterministic'
);

console.log('MATCHUP_AWARE_OPTIMIZATION_QA_OK');
