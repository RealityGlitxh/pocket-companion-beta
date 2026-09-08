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
  {id:'A1-17',set:'A1',number:'17',name:'Trainer Eight',type:'Item'},
  {id:'A1-18',set:'A1',number:'18',name:'Trainer Nine',type:'Supporter'},
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
assert.equal(legal.optimization.mode,'deterministic-structural-v1');
assert.equal(legal.optimization.autoApply,false);
assert.equal(legal.optimization.requiredCuts.length,0);
assert.equal(legal.optimization.suggestedSwaps.length,0);

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
assert.deepEqual(duplicate.optimization.requiredCuts[0],{
  cardName:'basic alpha',quantity:1,reason:'same-name-copy-limit',confidence:'required',
  evidence:'Deck contains 3 copies; known limit is 2.'
});

const brokenEvolution={...legalDeck,id:'broken',name:'Broken Evolution',cards:legalDeck.cards.map(x=>({...x}))};
brokenEvolution.cards[0]={name:'Trainer One',setCode:'A1',number:10,qty:2};
const broken=buildDeckAudits([brokenEvolution],catalog)[0];
assert.ok(broken.evolutionIssues.some(x=>x.card==='Alpha ex'&&x.issue==='missing-required-previous-stage'));
assert.ok(broken.consistencySignals.some(x=>x.type==='incomplete-evolution-line'));
const parentAdd=broken.optimization.addCandidates.find(x=>x.name==='Basic Alpha');
assert.ok(parentAdd,'missing verified evolution parent optimization candidate');
assert.equal(parentAdd.reason,'complete-evolution-line');
assert.equal(parentAdd.confidence,'structural-high');
assert.equal(parentAdd.supports,'Alpha ex');
assert.equal(parentAdd.set,'A1');
assert.equal(parentAdd.number,'1');

const swapDeck={id:'swap',name:'Swap Test',energy:'Lightning',cards:[
  {name:'Trainer One',setCode:'A1',number:10,qty:3},
  {name:'Alpha ex',setCode:'A1',number:2,qty:1},
  card('Basic Beta',3),card('Trainer Two',11),card('Trainer Three',12),card('Trainer Four',13),
  card('Trainer Five',14),card('Trainer Six',15),card('Trainer Seven',16),
  card('Trainer Nine',18,2)
]};
const swap=buildDeckAudits([swapDeck],catalog)[0];
assert.equal(swap.totalCards,20);
assert.ok(swap.optimization.requiredCuts.some(x=>x.cardName==='trainer one'&&x.quantity===1));
assert.ok(swap.optimization.addCandidates.some(x=>x.name==='Basic Alpha'&&x.reason==='complete-evolution-line'));
const structuralSwap=swap.optimization.suggestedSwaps[0];
assert.equal(structuralSwap.remove.cardName,'trainer one');
assert.equal(structuralSwap.add.cardName,'Basic Alpha');
assert.equal(structuralSwap.confidence,'high-structural');

const overDeck={...legalDeck,id:'over',name:'Over Test',cards:[...legalDeck.cards,{name:'Mystery Extra',qty:2}]};
const over=buildDeckAudits([overDeck],catalog)[0];
assert.equal(over.totalCards,22);
assert.ok(over.optimization.requiredCuts.some(x=>x.reason==='deck-size-overage'&&x.quantity===2));

const unknownStageDeck={id:'unknown',name:'Unknown Stage',energy:['Psychic'],cards:[
  {name:'Mystery Mon',setCode:'A1',number:20,qty:2},
  card('Trainer One',10),card('Trainer Two',11),card('Trainer Three',12),card('Trainer Four',13),
  card('Trainer Five',14),card('Trainer Six',15),card('Trainer Seven',16),
  card('Trainer Eight',17,2),card('Trainer Nine',18,2)
]};
const unknown=buildDeckAudits([unknownStageDeck],catalog)[0];
assert.equal(unknown.counts.basics,0);
assert.equal(unknown.legality.basicCheckReliable,false);
assert.equal(unknown.legality.status,'needs-metadata-review');
assert.ok(!unknown.legality.hardFailures.some(x=>x.rule==='basic-pokemon-required'));
assert.ok(unknown.consistencySignals.some(x=>x.type==='unresolved-card-metadata'));

const lowBasicDeck={id:'low-basic',name:'Low Basic',energy:'Fire',cards:[
  {name:'Basic Alpha',setCode:'A1',number:1,qty:1},
  {name:'Alpha ex',setCode:'A1',number:2,qty:2},
  card('Trainer One',10),card('Trainer Two',11),card('Trainer Three',12),card('Trainer Four',13),
  card('Trainer Five',14),card('Trainer Six',15),card('Trainer Seven',16),
  card('Trainer Eight',17,1),card('Trainer Nine',18,2)
]};
const lowBasic=buildDeckAudits([lowBasicDeck],catalog)[0];
assert.equal(lowBasic.totalCards,20);
assert.equal(lowBasic.counts.basics,1);
assert.equal(lowBasic.legality.basicCheckReliable,true);
assert.ok(lowBasic.optimization.addCandidates.some(x=>x.name==='Basic Alpha'&&x.reason==='increase-basic-redundancy'&&x.confidence==='strategy-dependent'));

assert.deepEqual(buildDeckAudits([legalDeck],catalog),buildDeckAudits([legalDeck],catalog),'audit must be deterministic');

const indexSource=await fs.readFile('supabase/functions/pocket-coach/index.ts','utf8');
assert.match(indexSource,/buildDeckAudits/);
assert.match(indexSource,/deckIntelligenceAudit:true/);
assert.match(indexSource,/Deck Intelligence Audit/);
assert.match(indexSource,/consistencySignals are structural or strategy-dependent/);

console.log('DECK_INTELLIGENCE_AUDIT_QA_OK');
