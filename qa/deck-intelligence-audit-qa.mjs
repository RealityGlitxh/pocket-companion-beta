import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const helperSource = await fs.readFile('supabase/functions/pocket-coach/deck-audit.js', 'utf8');
const mod = await import(`data:text/javascript;base64,${Buffer.from(helperSource).toString('base64')}`);
const { buildDeckAudits } = mod;
assert.equal(typeof buildDeckAudits, 'function');

const catalog = [
  {id:'A1-1',set:'A1',number:'1',name:'Basic Alpha',type:'Pokemon',stage:'Basic'},
  {id:'A1-2',set:'A1',number:'2',name:'Alpha ex',type:'Pokemon',stage:'Stage 1',evolvesFrom:'Basic Alpha'},
  {id:'A1-3',set:'A1',number:'3',name:'Basic Beta',type:'Pokemon',stage:'Basic'},
  {id:'A1-10',set:'A1',number:'10',name:'Trainer One',type:'Item'},
  {id:'A1-11',set:'A1',number:'11',name:'Trainer Two',type:'Supporter'},
  {id:'A1-12',set:'A1',number:'12',name:'Trainer Three',type:'Item'},
  {id:'A1-13',set:'A1',number:'13',name:'Trainer Four',type:'Supporter'},
  {id:'A1-14',set:'A1',number:'14',name:'Trainer Five',type:'Item'},
  {id:'A1-15',set:'A1',number:'15',name:'Trainer Six',type:'Tool'},
  {id:'A1-16',set:'A1',number:'16',name:'Trainer Seven',type:'Stadium'},
  {id:'A1-20',set:'A1',number:'20',name:'Mystery Mon',type:'Pokemon',stage:''}
];
const card=(name,number,qty=2)=>({name,setCode:'A1',number,qty});

const legalDeck={id:'legal',name:'Legal Test',energy:'Lightning / Colorless',cards:[
  card('Basic Alpha',1),card('Alpha ex',2),card('Basic Beta',3),
  card('Trainer One',10),card('Trainer Two',11),card('Trainer Three',12),card('Trainer Four',13),
  card('Trainer Five',14),card('Trainer Six',15),card('Trainer Seven',16)
]};
const legal=buildDeckAudits([legalDeck],catalog)[0];
assert.equal(legal.totalCards,20);
assert.equal(legal.counts.pokemon,6);
assert.equal(legal.counts.trainers,14);
assert.equal(legal.counts.basics,4);
assert.deepEqual(legal.energyTypes,['Lightning','Colorless']);
assert.equal(legal.duplicateViolations.length,0);
assert.equal(legal.evolutionIssues.length,0);
assert.equal(legal.legality.status,'passes-known-rules');
assert.ok(legal.engineCandidates.some(x=>x.name==='Alpha ex'));

const duplicateDeck={...legalDeck,id:'duplicate',name:'Duplicate Test',cards:[
  {name:'Basic Alpha',setCode:'A1',number:1,qty:3},
  {name:'Alpha ex',setCode:'A1',number:2,qty:1},
  card('Basic Beta',3),card('Trainer One',10),card('Trainer Two',11),card('Trainer Three',12),
  card('Trainer Four',13),card('Trainer Five',14),card('Trainer Six',15),card('Trainer Seven',16)
]};
const duplicate=buildDeckAudits([duplicateDeck],catalog)[0];
assert.equal(duplicate.totalCards,20);
assert.equal(duplicate.duplicateViolations.length,1);
assert.equal(duplicate.legality.status,'illegal-or-incomplete');
assert.ok(duplicate.legality.hardFailures.some(x=>x.rule==='same-name-copy-limit'));

const brokenEvolution={...legalDeck,id:'broken',name:'Broken Evolution',cards:legalDeck.cards.map(x=>({...x}))};
brokenEvolution.cards[0]={name:'Trainer One',setCode:'A1',number:10,qty:2};
const broken=buildDeckAudits([brokenEvolution],catalog)[0];
assert.ok(broken.evolutionIssues.some(x=>x.card==='Alpha ex'&&x.issue==='missing-required-previous-stage'));
assert.ok(broken.consistencySignals.some(x=>x.type==='incomplete-evolution-line'));

const unknownStageDeck={id:'unknown',name:'Unknown Stage',energy:['Psychic'],cards:[
  {name:'Mystery Mon',setCode:'A1',number:20,qty:2},
  card('Trainer One',10),card('Trainer Two',11),card('Trainer Three',12),card('Trainer Four',13),
  card('Trainer Five',14),card('Trainer Six',15),card('Trainer Seven',16),
  {name:'Trainer Eight',qty:2},{name:'Trainer Nine',qty:2}
]};
const unknown=buildDeckAudits([unknownStageDeck],catalog)[0];
assert.equal(unknown.counts.basics,0);
assert.equal(unknown.legality.basicCheckReliable,false);
assert.equal(unknown.legality.status,'needs-metadata-review');
assert.ok(!unknown.legality.hardFailures.some(x=>x.rule==='basic-pokemon-required'));

assert.deepEqual(buildDeckAudits([legalDeck],catalog),buildDeckAudits([legalDeck],catalog),'audit must be deterministic');

const indexSource=await fs.readFile('supabase/functions/pocket-coach/index.ts','utf8');
assert.match(indexSource,/buildDeckAudits/);
assert.match(indexSource,/deckIntelligenceAudit:true/);
assert.match(indexSource,/Deck Intelligence Audit/);
assert.match(indexSource,/consistencySignals are structural or strategy-dependent/);

console.log('DECK_INTELLIGENCE_AUDIT_QA_OK');
