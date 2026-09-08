export function buildMetaAwareOptimizations({decks=[],audits=[],snapshot=null,archetypes=[],decklists=[]}={}){
  const norm=v=>String(v??'').normalize('NFKC').toLowerCase().replace(/[’‘`´]/g,"'").replace(/[^a-z0-9' -]/g,' ').replace(/\s+/g,' ').trim();
  const pct=v=>Number.isFinite(Number(v))?Number(v):null;
  const arr=v=>Array.isArray(v)?v:[];
  const flattenDeckCards=d=>arr(d?.cards).map(c=>({name:String(c?.name||''),qty:Math.max(1,Number(c?.qty??c?.quantity??1)||1)})).filter(c=>c.name);
  const deckNameSet=d=>new Set(flattenDeckCards(d).map(c=>norm(c.name)));
  const byAudit=new Map(arr(audits).map(a=>[String(a?.deckId||a?.deckName||''),a]));
  const metaById=new Map(arr(archetypes).map(a=>[String(a?.id||a?.archetype_id||''),a]));

  function archetypeCore(a){return [...new Set([...arr(a?.pokemon),...arr(a?.key_cards)].map(norm).filter(Boolean))]}
  function matchArchetype(deck){
    const names=deckNameSet(deck), declared=norm(deck?.archetype||'');
    let best=null;
    for(const a of archetypes){
      const core=archetypeCore(a); if(!core.length)continue;
      const matched=core.filter(n=>names.has(n));
      const exactDeclared=declared&&(declared===norm(a?.name)||arr(a?.aliases).map(norm).includes(declared));
      const coverage=matched.length/core.length;
      const precision=matched.length/Math.max(1,[...names].length);
      const score=(exactDeclared?1.25:0)+(coverage*0.7)+(Math.min(precision*4,1)*0.3)+(matched.length>=2?0.15:0);
      if(!best||score>best.score)best={a,score,coverage,matched,exactDeclared};
    }
    if(!best||(!best.exactDeclared&&best.matched.length<1))return null;
    const confidence=best.exactDeclared||best.matched.length>=2&&best.coverage>=0.5?'high':best.matched.length>=2?'medium':'low';
    return {archetypeId:String(best.a.id||best.a.archetype_id||''),name:String(best.a.name||''),confidence,score:Math.round(best.score*1000)/1000,matchedCore:best.matched,coreCoverage:Math.round(best.coverage*1000)/1000};
  }
  function listsFor(id){return arr(decklists).filter(d=>String(d?.archetype_id||'')===id&&d?.is_valid!==false)}
  function benchmark(lists){
    const map=new Map();
    for(const dl of lists){
      const seen=new Set();
      const cards=[...arr(dl?.cards?.pokemon),...arr(dl?.cards?.trainer)];
      for(const c of cards){
        const n=norm(c?.name); if(!n)continue;
        const qty=Math.max(1,Number(c?.quantity??c?.qty??1)||1);
        if(!map.has(n))map.set(n,{name:String(c?.name||''),decks:0,totalQty:0,set:String(c?.set||''),number:String(c?.number??'')});
        const x=map.get(n); x.totalQty+=qty; if(!seen.has(n)){x.decks++;seen.add(n)}
      }
    }
    const total=lists.length;
    return [...map.values()].map(x=>({...x,inclusionRate:total?x.decks/total:0,avgQty:x.decks?x.totalQty/x.decks:0})).sort((a,b)=>b.inclusionRate-a.inclusionRate||b.avgQty-a.avgQty||a.name.localeCompare(b.name));
  }
  function performance(a){
    const sample=Number(a?.sample_size??a?.deck_count??0)||0,matches=Number(a?.matches??0)||0,wr=pct(a?.win_rate),usage=pct(a?.usage_pct),conf=String(a?.confidence||'').toLowerCase();
    let evidence='low'; if((conf.includes('high')||conf.includes('medium'))&&sample>=20&&matches>=75)evidence='high'; else if(sample>=8&&matches>=25)evidence='medium';
    let band='insufficient-evidence'; if(wr!=null&&evidence!=='low')band=wr>=55?'strong-current-results':wr>=50?'competitive-current-results':'below-even-current-results';
    return {rank:Number(a?.rank)||null,usagePct:usage,winRate:wr,matches,sampleSize:sample,confidence:String(a?.confidence||''),evidence,band};
  }

  return arr(decks).map(deck=>{
    const match=matchArchetype(deck),audit=byAudit.get(String(deck?.id||deck?.name||''))||null;
    if(!match)return {deckId:deck?.id||'',deckName:deck?.name||'Untitled deck',status:'no-reliable-archetype-match',archetypeMatch:null,competitive:null,benchmark:null,recommendations:[],guardrails:['No reliable current archetype match was found, so PocketNexus will not make meta-based card swaps.']};
    const archetype=metaById.get(match.archetypeId)||archetypes.find(a=>String(a?.id||a?.archetype_id||'')===match.archetypeId)||{};
    const perf=performance(archetype),lists=listsFor(match.archetypeId),stats=benchmark(lists),names=deckNameSet(deck),benchmarkReliable=lists.length>=8;
    const coreMissing=benchmarkReliable?stats.filter(x=>x.inclusionRate>=0.7&&!names.has(norm(x.name))).slice(0,8):[];
    const commonOneCopy=benchmarkReliable?stats.filter(x=>x.inclusionRate>=0.6&&x.avgQty>=1.65&&names.has(norm(x.name))&&flattenDeckCards(deck).find(c=>norm(c.name)===norm(x.name))?.qty===1).slice(0,6):[];
    const unusual=benchmarkReliable?flattenDeckCards(deck).map(c=>{const s=stats.find(x=>norm(x.name)===norm(c.name));return {name:c.name,qty:c.qty,inclusionRate:s?s.inclusionRate:0}}).filter(x=>x.inclusionRate<=0.15).slice(0,8):[];
    const recs=[];
    for(const x of coreMissing)recs.push({action:'consider-add',cardName:x.name,reason:'high-archetype-inclusion',confidence:lists.length>=20&&x.inclusionRate>=0.8?'high-meta':'medium-meta',evidence:{benchmarkDecks:lists.length,inclusionRate:Math.round(x.inclusionRate*1000)/1000,avgQty:Math.round(x.avgQty*100)/100}});
    for(const x of commonOneCopy)recs.push({action:'consider-second-copy',cardName:x.name,reason:'benchmark-often-runs-two',confidence:lists.length>=20?'medium-meta':'low-meta',evidence:{benchmarkDecks:lists.length,inclusionRate:Math.round(x.inclusionRate*1000)/1000,avgQty:Math.round(x.avgQty*100)/100}});
    const guardrails=[];
    if(match.confidence==='low')guardrails.push('Archetype match confidence is low; treat all meta comparisons as exploratory.');
    if(!benchmarkReliable)guardrails.push(`Only ${lists.length} recent classified benchmark deck(s) were available; card-frequency recommendations are withheld.`);
    if(perf.evidence==='low')guardrails.push('Current snapshot performance has limited sample support; do not describe the archetype as definitively strong or weak.');
    guardrails.push('Unusual cards are review candidates, not automatic cuts. PocketNexus must not remove them solely because tournament inclusion is low.');
    guardrails.push('Meta recommendations never override legality or verified structural fixes from the Deck Intelligence Audit.');
    return {deckId:deck?.id||'',deckName:deck?.name||'Untitled deck',status:'matched',archetypeMatch:match,competitive:{snapshotGeneratedAt:snapshot?.generated_at||null,windowHours:snapshot?.window_hours??null,...perf},benchmark:{recentClassifiedDecks:lists.length,reliable:benchmarkReliable,coreMissing:coreMissing.map(x=>({name:x.name,set:x.set,number:x.number,inclusionRate:Math.round(x.inclusionRate*1000)/1000,avgQty:Math.round(x.avgQty*100)/100})),commonOneCopy:commonOneCopy.map(x=>({name:x.name,inclusionRate:Math.round(x.inclusionRate*1000)/1000,avgQty:Math.round(x.avgQty*100)/100})),unusualReview:unusual},recommendations:recs.slice(0,10),structuralStatus:audit?.legality?.status||null,guardrails};
  });
}
