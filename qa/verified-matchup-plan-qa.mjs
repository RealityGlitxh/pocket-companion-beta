import assert from 'node:assert/strict';
import {buildVerifiedMatchupPlans} from '../supabase/functions/pocket-coach/verified-matchup-plan.js';

const decks=[{id:'d1',name:'QA Deck',cards:[
  {name:'Search Tool',setCode:'QA',number:'1',qty:2},
  {name:'Energy Tool',setCode:'QA',number:'2',qty:2},
  {name:'Switch Tool',setCode:'QA',number:'3',qty:1},
  {name:'Pressure Mon',setCode:'QA',number:'4',qty:2},
  {name:'Unverified Card',setCode:'QA',number:'5',qty:2}
]}];
const gameplay=[
  {name:'Search Tool',set:'QA',number:'1',verification:'set+number+normalized-name',effect:'Draw 2 cards.'},
  {name:'Energy Tool',set:'QA',number:'2',verification:'set+number+normalized-name',effect:'Attach 1 Energy from your Energy Zone to 1 of your Pokémon.'},
  {name:'Switch Tool',set:'QA',number:'3',verification:'set+number+normalized-name',effect:'Switch your Active Pokémon with 1 of your Benched Pokémon.'},
  {name:'Pressure Mon',set:'QA',number:'4',verification:'set+number+normalized-name',attacks:[{name:'QA Hit',damage:'80',cost:['C'],effect:''}]},
  {name:'Wrong Identity',set:'QA',number:'5',verification:'set+number+normalized-name',effect:'Draw 9 cards.'}
];
const matchup=[{status:'matched',deckId:'d1',deckName:'QA Deck',archetypeName:'QA Archetype',mustPrepareFor:[{opponentName:'Threat A'}],topMetaThreats:[
  {opponentName:'Threat A',winRate:41.5,opponentUsagePct:15,matches:100,evidence:'high',band:'unfavorable'},
  {opponentName:'Threat B',winRate:52,opponentUsagePct:8,matches:40,evidence:'medium',band:'roughly-even'}
]}];
const personal=[{deckId:'d1',deckName:'QA Deck',matchedThreats:[
  {opponentName:'Threat A',winRate:60,decided:10,evidence:'medium',comparison:'personally-above-global'},
  {opponentName:'Threat B',winRate:null,decided:2,evidence:'insufficient',comparison:'insufficient-evidence'}
]}];
const plans=buildVerifiedMatchupPlans({decks,matchupAware:matchup,personalMatchups:personal,verifiedCardGameplay:gameplay});
assert.equal(plans.length,1);
const p=plans[0];
assert.equal(p.status,'ready');
assert.equal(p.threats[0].mustPrepare,true);
assert.equal(p.threats[0].global.winRate,41.5);
assert.equal(p.threats[0].personal.winRate,60);
assert.equal(p.threats[1].personal.evidence,'insufficient');
assert(p.planSignals.openingSetup.some(x=>x.name==='Search Tool'));
assert(p.planSignals.openingSetup.some(x=>x.name==='Energy Tool'));
assert(p.planSignals.preserveForPivot.some(x=>x.name==='Switch Tool'));
assert(p.planSignals.pressureOptions.some(x=>x.name==='Pressure Mon'));
assert(!p.verifiedTools.some(x=>x.name==='Wrong Identity'));
assert(p.guardrails.some(x=>x.includes('not a guaranteed optimal turn order')));
assert(p.guardrails.some(x=>x.includes('Opponent target priorities require verified opponent card facts')));
assert.deepEqual(plans,buildVerifiedMatchupPlans({decks,matchupAware:matchup,personalMatchups:personal,verifiedCardGameplay:gameplay}));
console.log('VERIFIED_MATCHUP_PLAN_QA_OK');
