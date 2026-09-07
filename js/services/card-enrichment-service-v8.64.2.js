// PocketNexus V8.64.2 — non-destructive rich gameplay enrichment.
// Existing CardService/card records remain authoritative. Rich facts are attached only
// when set+number and normalized card name agree, preventing accidental cross-card merges.
const CardEnrichmentService=(()=>{
  const SOURCE='r4ph1-ptcgp-data';
  function text(v){return v==null?'':String(v).trim()}
  function normName(v){return text(v).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/\s+/g,' ').toLowerCase()}
  function parseId(id){const m=text(id).match(/^(.+)-(\d+)$/);return m?{setCode:m[1].toUpperCase(),number:String(parseInt(m[2],10))}:{setCode:'',number:''}}
  function parts(c){
    const p=(c?.setCode&&c?.number)?{setCode:text(c.setCode).toUpperCase(),number:String(parseInt(c.number,10)||'')} : parseId(c?.id||c?.cardId);
    return {setCode:p.setCode,number:p.number,name:normName(c?.name)};
  }
  function key(c){const p=parts(c);return p.setCode&&p.number?`${p.setCode}:${p.number}`:''}
  function richFacts(c){return {
    source:SOURCE,sourceId:text(c?.id),type:text(c?.type),hp:Number(c?.hp)||null,stage:text(c?.stage),evolvesFrom:text(c?.evolvesFrom||c?.evolves_from),weakness:text(c?.weakness),
    retreat:Number.isFinite(Number(c?.retreat))?Number(c.retreat):null,isEx:!!c?.isEx,isMegaEx:!!c?.isMegaEx,
    attacks:Array.isArray(c?.attacks)?c.attacks.map(a=>({name:text(a?.name),damage:text(a?.damage),cost:Array.isArray(a?.cost)?a.cost.map(text).filter(Boolean):[],effect:text(a?.effect)})):[],
    abilities:Array.isArray(c?.abilities)?c.abilities.map(a=>typeof a==='string'?{name:'',effect:text(a)}:{name:text(a?.name),effect:text(a?.effect||a?.text)}):[],effect:text(c?.effect)
  }}
  function buildIndex(richCards){const out=new Map();for(const c of richCards||[]){const k=key(c);if(k)out.set(k,c)}return out}
  function enrichCard(base,index){
    if(!base||!index)return base;const k=key(base);if(!k)return base;const rich=index.get(k);if(!rich)return base;
    if(normName(base.name)!==normName(rich.name))return base;
    return {...base,gameplay:richFacts(rich)};
  }
  function enrichCards(baseCards,richCards){const idx=richCards instanceof Map?richCards:buildIndex(richCards);return (baseCards||[]).map(c=>enrichCard(c,idx))}
  function factsForCard(base,index){const x=enrichCard(base,index);return x?.gameplay||null}
  function coachFacts(cards,max=24){return (cards||[]).filter(c=>c?.gameplay).slice(0,Math.max(1,Math.min(Number(max)||24,40))).map(c=>({id:c.id||'',name:c.name||'',setCode:c.setCode||'',number:c.number||'',gameplay:c.gameplay}))}
  function coverage(baseCards,richCards){const idx=richCards instanceof Map?richCards:buildIndex(richCards);let matched=0,nameMismatch=0,withGameplay=0;for(const b of baseCards||[]){const r=idx.get(key(b));if(!r)continue;if(normName(b.name)!==normName(r.name)){nameMismatch++;continue}matched++;const f=richFacts(r);if(f.effect||f.abilities.length||f.attacks.length)withGameplay++}return {base:(baseCards||[]).length,rich:idx.size,matched,nameMismatch,withGameplay,green:matched>0&&nameMismatch===0}}
  return {SOURCE,normName,key,richFacts,buildIndex,enrichCard,enrichCards,factsForCard,coachFacts,coverage};
})();

// QA trigger only: Gate #4 current-main signed-in regression verification (2026-09-07).
