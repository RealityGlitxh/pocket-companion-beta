import assert from 'node:assert/strict';
import { buildPersonalMatchupLearning } from '../supabase/functions/pocket-coach/personal-matchup-learning.js';

const decks=[{id:'deck-1',name:'Mega Lucario Test'}];
const matchupAware=[{status:'matched',deckId:'deck-1',deckName:'Mega Lucario Test',archetypeName:'Mega Lucario ex',topMetaThreats:[
 {opponentName:'Mega Sceptile',winRate:47,opponentUsagePct:9.1,matches:120,evidence:'high',band:'slightly-unfavorable'},
 {opponentName:'Mega Altaria ex',winRate:54,opponentUsagePct:6.4,matches:90,evidence:'high',band:'slightly-favorable'},
 {opponentName:'Zoroark ex / Mega Absol ex',winRate:49,opponentUsagePct:4.8,matches:60,evidence:'medium',band:'roughly-even'}
]}];
const mk=(opponent,result,i,extra={})=>({deckId:'deck-1',deckName:'Mega Lucario Test',opponentArchetype:opponent,result,timestamp:`2026-09-${String(1+(i%7)).padStart(2,'0')}T12:00:00Z`,...extra});
const matches=[];
for(let i=0;i<12;i++)matches.push(mk('Mega Sceptile',i<7?'win':'loss',i)); // 58.3, medium, +11.3
for(let i=0;i<6;i++)matches.push(mk('Mega Altaria ex',i<2?'win':'loss',20+i)); // 33.3, emerging, -20.7
for(let i=0;i<4;i++)matches.push(mk('Zoroark ex / Mega Absol ex',i<3?'win':'loss',40+i)); // insufficient
matches.push(mk('Unrelated Archetype','win',50));
matches.push({...mk('Mega Sceptile','win',51),deckId:'other-deck',deckName:'Other Deck'});

const out=buildPersonalMatchupLearning({matches,decks,matchupAware});
assert.equal(out.length,1);
const report=out[0];
assert.equal(report.source,'battle-tracker');
assert.equal(report.personalSamples,2);
const sceptile=report.matchedThreats.find(x=>x.opponentName==='Mega Sceptile');
assert.equal(sceptile.matches,12);
assert.equal(sceptile.decided,12);
assert.equal(sceptile.winRate,58.3);
assert.equal(sceptile.evidence,'medium');
assert.equal(sceptile.globalWinRate,47);
assert.equal(sceptile.comparison,'personally-above-global');
assert.equal(sceptile.gapPoints,11.3);
const altaria=report.matchedThreats.find(x=>x.opponentName==='Mega Altaria ex');
assert.equal(altaria.evidence,'emerging');
assert.equal(altaria.comparison,'personally-below-global');
const zoroark=report.matchedThreats.find(x=>x.opponentName==='Zoroark ex / Mega Absol ex');
assert.equal(zoroark.evidence,'insufficient');
assert.equal(zoroark.comparison,'insufficient-evidence');
assert.equal(zoroark.gapPoints,26);
assert.ok(report.guardrails.some(x=>x.includes('do not average')));

const fuzzy=buildPersonalMatchupLearning({matches:[mk('Sceptile','win',1),mk('Sceptile','loss',2),mk('Sceptile','win',3),mk('Sceptile','win',4),mk('Sceptile','win',5)],decks,matchupAware})[0];
assert.equal(fuzzy.matchedThreats.find(x=>x.opponentName==='Mega Sceptile').matches,5);

const deterministicA=buildPersonalMatchupLearning({matches,decks,matchupAware});
const deterministicB=buildPersonalMatchupLearning({matches,decks,matchupAware});
assert.deepEqual(deterministicA,deterministicB);
console.log('PERSONAL_MATCHUP_LEARNING_QA_OK',JSON.stringify({samples:report.personalSamples,sceptile,altaria,zoroark}));
