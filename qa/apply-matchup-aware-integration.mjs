import fs from 'node:fs/promises';

const path='supabase/functions/pocket-coach/index.ts';
let s=await fs.readFile(path,'utf8');

function replaceOnce(oldText,newText,label){
  if(s.includes(newText)) return;
  if(!s.includes(oldText)) throw new Error(`Integration anchor missing: ${label}`);
  s=s.replace(oldText,newText);
}

replaceOnce(
  "import { buildMetaAwareOptimizations } from './meta-aware-optimizer.js';",
  "import { buildMetaAwareOptimizations } from './meta-aware-optimizer.js';\nimport { buildMatchupAwareOptimizations } from './matchup-aware-optimizer.js';",
  'matchup optimizer import'
);

replaceOnce(
  "knowledgeEngine:'v3',verifiedCardGameplay:true,deckIntelligenceAudit:true,deckOptimizationIntelligence:true,metaAwareOptimization:true",
  "knowledgeEngine:'v4',verifiedCardGameplay:true,deckIntelligenceAudit:true,deckOptimizationIntelligence:true,metaAwareOptimization:true,matchupAwareOptimization:true",
  'status capability flags'
);

const metaAnchor="const metaOptimizations=buildMetaAwareOptimizations({decks:decks.slice(0,16),audits:deckAudits,snapshot:snap||null,archetypes:metaArchetypes,decklists:metaDecklists});const knowledgeHits=";
const metaIntegrated=`const metaOptimizations=buildMetaAwareOptimizations({decks:decks.slice(0,16),audits:deckAudits,snapshot:snap||null,archetypes:metaArchetypes,decklists:metaDecklists});let snapshotMatchups:any[]=[],matchupCardEvidence:any[]=[];const matchedArchetypeIds=[...new Set(metaOptimizations.filter((x:any)=>x?.status==='matched'&&x?.archetypeMatch?.archetypeId).map((x:any)=>String(x.archetypeMatch.archetypeId)))].slice(0,8);if(snap?.id&&matchedArchetypeIds.length){const matchupSince=new Date(Date.now()-7*24*60*60*1000).toISOString();const matrixPromise=db.from('meta_snapshot_matchups').select('archetype_a_id,archetype_b_id,a_wins,b_wins,draws,matches,a_win_rate,confidence').eq('snapshot_id',snap.id).limit(2000);const evidencePromises=matchedArchetypeIds.map((id:string)=>db.rpc('get_matchup_card_evidence',{p_archetype_ids:[id],p_since:matchupSince,p_min_matchup_games:8,p_min_card_games:5}).limit(500));const [matrixR,...evidenceR]=await Promise.all([matrixPromise,...evidencePromises]);snapshotMatchups=matrixR.data||[];matchupCardEvidence=evidenceR.flatMap((r:any)=>r.data||[])}const matchupOptimizations=buildMatchupAwareOptimizations({decks:decks.slice(0,16),metaAware:metaOptimizations,snapshot:snap||null,archetypes:metaArchetypes,snapshotMatchups,cardEvidence:matchupCardEvidence});const knowledgeHits=`;
replaceOnce(metaAnchor,metaIntegrated,'matchup data load and optimizer call');

replaceOnce(
  "deckIntelligence:{auditVersion:'v1',optimizationVersion:'v1',metaAwareVersion:'v1',audits:deckAudits,metaAware:metaOptimizations}",
  "deckIntelligence:{auditVersion:'v1',optimizationVersion:'v1',metaAwareVersion:'v1',matchupAwareVersion:'v1',audits:deckAudits,metaAware:metaOptimizations,matchupAware:matchupOptimizations}",
  'context deck intelligence'
);

replaceOnce(
  "meta:{snapshot:snap||null,top:topMeta,benchmarkDecklistsLoaded:metaDecklists.length}",
  "meta:{snapshot:snap||null,top:topMeta,benchmarkDecklistsLoaded:metaDecklists.length,matchupMatrixRows:snapshotMatchups.length,matchupCardEvidenceRows:matchupCardEvidence.length}",
  'meta context counts'
);

replaceOnce(
  "const sources=['My Decks','Deck Intelligence Audit','Deck Optimization Intelligence','Meta-Aware Optimization','Battle Tracker','Brain Teasers','Collection','Rank History','Simulation Lab','Current Meta'];",
  "const sources=['My Decks','Deck Intelligence Audit','Deck Optimization Intelligence','Meta-Aware Optimization','Matchup-Aware Optimization','Battle Tracker','Brain Teasers','Collection','Rank History','Simulation Lab','Current Meta','Current Matchup Matrix'];",
  'source labels'
);

replaceOnce(
  "if(metaDecklists.length)sources.push('Recent Classified Meta Decklists');",
  "if(metaDecklists.length)sources.push('Recent Classified Meta Decklists');if(matchupCardEvidence.length)sources.push('Matchup Card Evidence');",
  'matchup card evidence source'
);

replaceOnce(
  "Never invent a card-level meta recommendation when the metaAware recommendation list does not contain it.\\n\\nCRITICAL GROUNDING RULES:",
  "Never invent a card-level meta recommendation when the metaAware recommendation list does not contain it.\\n\\ndeckIntelligence.matchupAware is a separate matchup-preparation layer derived from the latest stored matchup matrix plus aggregated recent decklist results. priorityMatchups ranks opponents using current usage, observed matchup results, and sample strength. mustPrepareFor only contains sufficiently supported unfavorable high-usage matchups. Card-level matchup recommendations are correlations from winning and losing lists, not proof that a card caused the result. Never call a review-for-matchup card a cut. Never claim a consider-matchup-tech card guarantees improvement. If evidence is low, missing, or excluded by the optimizer guardrails, say the matchup-specific evidence is insufficient. Structural legality and verified structural fixes remain higher priority.\\n\\nCRITICAL GROUNDING RULES:",
  'matchup prompt grounding'
);

replaceOnce(
  "- When citing a meta recommendation, mention its evidence level or benchmark sample when useful. Low or medium evidence must be framed as directional rather than definitive.\\n",
  "- When citing a meta recommendation, mention its evidence level or benchmark sample when useful. Low or medium evidence must be framed as directional rather than definitive.\\n- For matchup questions, use deckIntelligence.matchupAware rather than guessing from general archetype win rate. State matchup games/evidence when useful, and describe card deltas as associations rather than causes.\\n",
  'matchup grounding rule'
);

replaceOnce(
  "distinguish STRUCTURAL DECK QUALITY, META FIT, VERIFIED CARD GAMEPLAY, CURRENT META, and YOUR DATA.",
  "distinguish STRUCTURAL DECK QUALITY, META FIT, MATCHUP PREPARATION, VERIFIED CARD GAMEPLAY, CURRENT META, and YOUR DATA.",
  'response framing'
);

replaceOnce(
  "metaOptimizationCount:metaOptimizations.length,metaBenchmarkDecklists:metaDecklists.length,",
  "metaOptimizationCount:metaOptimizations.length,matchupOptimizationCount:matchupOptimizations.length,metaBenchmarkDecklists:metaDecklists.length,matchupCardEvidenceRows:matchupCardEvidence.length,",
  'context summary matchup counts'
);

replaceOnce("model='grounded-rules-v4'","model='grounded-rules-v5'",'fallback model version');

replaceOnce(
  "knowledgeEngine:'v3',knowledgeHits:knowledgeHits.length,cardFacts:cardKnowledge.cards.length,verifiedCardGameplayCount:gameplay.length,cardCatalogStatus:cardKnowledge.status,deckIntelligenceAudit:true,deckOptimizationIntelligence:true,metaAwareOptimization:true,deckAuditCount:deckAudits.length,metaOptimizationCount:metaOptimizations.length,metaBenchmarkDecklists:metaDecklists.length",
  "knowledgeEngine:'v4',knowledgeHits:knowledgeHits.length,cardFacts:cardKnowledge.cards.length,verifiedCardGameplayCount:gameplay.length,cardCatalogStatus:cardKnowledge.status,deckIntelligenceAudit:true,deckOptimizationIntelligence:true,metaAwareOptimization:true,matchupAwareOptimization:true,deckAuditCount:deckAudits.length,metaOptimizationCount:metaOptimizations.length,matchupOptimizationCount:matchupOptimizations.length,metaBenchmarkDecklists:metaDecklists.length,matchupCardEvidenceRows:matchupCardEvidence.length",
  'response capability flags'
);

await fs.writeFile(path,s);
console.log('MATCHUP_AWARE_INDEX_INTEGRATION_OK');
