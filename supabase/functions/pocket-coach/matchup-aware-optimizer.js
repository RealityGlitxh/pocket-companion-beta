export function buildMatchupAwareOptimizations({decks=[],metaAware=[],snapshot=null,archetypes=[],snapshotMatchups=[],cardEvidence=[]}={}){
  const norm=v=>String(v??'').normalize('NFKC').toLowerCase().replace(/[’‘`´]/g,"'").replace(/[^a-z0-9' -]/g,' ').replace(/\s+/g,' ').trim();
  const arr=v=>Array.isArray(v)?v:[];
  const num=v=>Number.isFinite(Number(v))?Number(v):null;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const round=(v,d=1)=>{const p=10**d;return Math.round(Number(v)*p)/p};
  const deckCards=d=>arr(d?.cards).map(c=>({name:String(c?.name||''),qty:Math.max(1,Number(c?.qty??c?.quantity??1)||1)})).filter(c=>c.name);
  const deckNames=d=>new Set(deckCards(d).map(c=>norm(c.name)));
  const archetypeMap=new Map(arr(archetypes).map(a=>[String(a?.id||a?.archetype_id||''),a]));
  const metaMap=new Map(arr(metaAware).map(m=>[String(m?.deckId||m?.deckName||''),m]));

  function matchupPerspective(row,userId){
    const a=String(row?.archetype_a_id||''),b=String(row?.archetype_b_id||'');
    const matches=Number(row?.matches||0)||0;
    const aWins=Number(row?.a_wins||0)||0,bWins=Number(row?.b_wins||0)||0,draws=Number(row?.draws||0)||0;
    if(a!==userId&&b!==userId)return null;
    const opponentId=a===userId?b:a;
    const wins=a===userId?aWins:bWins;
    const losses=a===userId?bWins:aWins;
    const decided=wins+losses;
    const winRate=decided?100*wins/decided:null;
    return {opponentId,matches,decided,wins,losses,draws,winRate:winRate==null?null:round(winRate,1),confidence:String(row?.confidence||'')};
  }
  function sampleEvidence(x){
    const c=norm(x?.confidence);
    if(x?.decided>=20&&(c.includes('high')||c.includes('medium')))return 'high';
    if(x?.decided>=8)return 'medium';
    return 'low';
  }
  function matchupBand(wr,evidence){
    if(wr==null||evidence==='low')return 'insufficient-evidence';
    if(wr<=42)return 'unfavorable';
    if(wr<48)return 'slightly-unfavorable';
    if(wr<=52)return 'roughly-even';
    if(wr<58)return 'slightly-favorable';
    return 'favorable';
  }
  function opponentUsage(id){return num(archetypeMap.get(id)?.usage_pct)??0}
  function opponentRank(id){return Number(archetypeMap.get(id)?.rank)||null}
  function opponentName(id){return String(archetypeMap.get(id)?.name||id)}
  function threatScore(p){
    const usage=opponentUsage(p.opponentId);
    const wr=p.winRate;
    const weakness=wr==null?1:1+clamp((50-wr)/25,-0.35,1.2);
    const evidenceFactor=sampleEvidence(p)==='high'?1:sampleEvidence(p)==='medium'?0.9:0.7;
    return usage*weakness*evidenceFactor;
  }
  function evidenceRows(userId,oppId){return arr(cardEvidence).filter(r=>String(r?.archetype_id||'')===userId&&String(r?.opponent_archetype_id||'')===oppId)}
  function cardAssociations(deck,userId,opp){
    const names=deckNames(deck),rows=evidenceRows(userId,opp.opponentId),positive=[],negative=[];
    for(const r of rows){
      const matchupGames=Number(r?.matchup_games||0)||0,cardGames=Number(r?.card_games||0)||0;
      const inclusion=num(r?.card_inclusion_rate)??0,delta=num(r?.win_rate_delta),cardWr=num(r?.card_win_rate),baseWr=num(r?.matchup_win_rate);
      if(matchupGames<20||cardGames<10||inclusion<0.15||delta==null||cardWr==null||baseWr==null)continue;
      const support=cardGames>=30&&inclusion>=0.3?'high':cardGames>=15?'medium':'limited';
      const item={cardName:String(r?.card_name||''),set:String(r?.set_code||''),number:String(r?.card_number??''),present:names.has(norm(r?.card_name)),matchupGames,cardGames,inclusionRate:round(inclusion*100,1),cardWinRate:round(cardWr,1),baselineWinRate:round(baseWr,1),deltaWinRate:round(delta,1),evidence:support,interpretation:'association-not-causation'};
      if(delta>=8)positive.push(item);
      else if(delta<=-8)negative.push(item);
    }
    positive.sort((a,b)=>b.evidence.localeCompare(a.evidence)||b.deltaWinRate-a.deltaWinRate||b.cardGames-a.cardGames);
    negative.sort((a,b)=>a.deltaWinRate-b.deltaWinRate||b.cardGames-a.cardGames);
    return {positive:positive.slice(0,6),negative:negative.slice(0,6)};
  }

  return arr(decks).map(deck=>{
    const meta=metaMap.get(String(deck?.id||deck?.name||''))||null;
    const match=meta?.status==='matched'?meta?.archetypeMatch:null;
    if(!match?.archetypeId){
      return {deckId:deck?.id||'',deckName:deck?.name||'Untitled deck',status:'no-reliable-archetype-match',archetypeId:null,priorityMatchups:[],recommendations:[],guardrails:['No reliable archetype match was available, so matchup-specific deck optimization is withheld.']};
    }
    const userId=String(match.archetypeId),matrix=arr(snapshotMatchups).map(r=>matchupPerspective(r,userId)).filter(Boolean);
    const priorities=matrix.map(p=>{const evidence=sampleEvidence(p),band=matchupBand(p.winRate,evidence);return {...p,opponentName:opponentName(p.opponentId),opponentRank:opponentRank(p.opponentId),opponentUsagePct:round(opponentUsage(p.opponentId),1),evidence,band,threatScore:round(threatScore(p),2)};}).sort((a,b)=>b.threatScore-a.threatScore||b.matches-a.matches).slice(0,8);
    const recommendations=[];
    const enriched=priorities.map(p=>{
      const assoc=cardAssociations(deck,userId,p);
      const usefulAdds=assoc.positive.filter(x=>!x.present&&(x.evidence==='high'||x.evidence==='medium'));
      const reviewPresent=assoc.negative.filter(x=>x.present);
      for(const x of usefulAdds.slice(0,2))recommendations.push({action:'consider-matchup-tech',cardName:x.cardName,opponentArchetype:p.opponentName,reason:'positive-result-association-in-this-matchup',confidence:x.evidence==='high'&&p.evidence==='high'?'high-directional':'medium-directional',evidence:{matchupGames:x.matchupGames,cardGames:x.cardGames,inclusionRatePct:x.inclusionRate,cardWinRate:x.cardWinRate,baselineWinRate:x.baselineWinRate,deltaWinRate:x.deltaWinRate},guardrail:'This is an association in observed lists, not proof the card caused the better result.'});
      for(const x of reviewPresent.slice(0,2))recommendations.push({action:'review-for-matchup',cardName:x.cardName,opponentArchetype:p.opponentName,reason:'negative-result-association-in-this-matchup',confidence:'review-only',evidence:{matchupGames:x.matchupGames,cardGames:x.cardGames,inclusionRatePct:x.inclusionRate,cardWinRate:x.cardWinRate,baselineWinRate:x.baselineWinRate,deltaWinRate:x.deltaWinRate},guardrail:'Do not cut this card solely from correlation; role, matchup plan, and structural needs still matter.'});
      return {...p,cardAssociations:{positive:assoc.positive,negative:assoc.negative}};
    });
    const mustPrepare=enriched.filter(x=>x.opponentUsagePct>=5&&(x.band==='unfavorable'||x.band==='slightly-unfavorable')&&x.evidence!=='low').slice(0,4);
    const topMetaThreats=enriched.filter(x=>x.opponentUsagePct>=5).slice(0,5);
    const guardrails=[
      'Matchup win rates are observational and sample-dependent; they do not prove a deterministic matchup.',
      'Card-level matchup evidence is correlation from winning and losing lists, not proof that a card caused the result.',
      'Cards with fewer than 10 observed matchup games, under 15% inclusion, or fewer than 20 total matchup games are excluded from card recommendations.',
      'Review-for-matchup cards are never automatic cuts.',
      'Matchup recommendations never override legality, evolution requirements, or higher-confidence structural fixes.',
      'If the latest snapshot lacks a matchup, PocketNexus must say evidence is unavailable rather than infer a win rate.'
    ];
    return {deckId:deck?.id||'',deckName:deck?.name||'Untitled deck',status:'matched',archetypeId:userId,archetypeName:String(match?.name||archetypeMap.get(userId)?.name||userId),archetypeMatchConfidence:String(match?.confidence||''),snapshotGeneratedAt:snapshot?.generated_at||null,priorityMatchups:enriched,mustPrepareFor:mustPrepare,topMetaThreats,recommendations:recommendations.slice(0,12),guardrails};
  });
}
