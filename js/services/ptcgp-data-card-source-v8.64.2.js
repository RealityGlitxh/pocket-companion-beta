// PocketNexus V8.64.2 — optional rich gameplay-data adapter for R4PH1/PTCGP-Data.
// This does not replace the production CardService. It normalizes richer card facts
// so they can be compared/validated before any source switch.
const PtcgpDataCardSource=(()=>{
  const SOURCE='r4ph1-ptcgp-data';
  const ROOT='https://raw.githubusercontent.com/R4PH1/PTCGP-Data/main/data/';
  const FILES={pokemon:'Pokemon.json',item:'Items.json',fossil:'Fossils.json',supporter:'Supporters.json',tool:'Tools.json',stadium:'Stadiums.json'};
  function text(v){return v==null?'':String(v).trim()}
  function parseId(id){const raw=text(id);const m=raw.match(/^(.+)-(\d+)$/);return m?{setCode:m[1].toUpperCase(),number:String(parseInt(m[2],10))}:{setCode:'',number:''}}
  function normalizeAttack(a){return {name:text(a?.name),damage:text(a?.damage),cost:Array.isArray(a?.cost)?a.cost.map(text).filter(Boolean):[],effect:text(a?.effect)}}
  function normalizeAbility(a){if(typeof a==='string')return {name:'',effect:text(a)};return {name:text(a?.name),effect:text(a?.effect||a?.text)}}
  function normalizeCard(raw,kind){
    const p=parseId(raw?.id), k=text(kind).toLowerCase();
    const isPokemon=k==='pokemon'||raw?.attacks||raw?.abilities||raw?.type||raw?.stage;
    return {
      id:text(raw?.id), setCode:p.setCode, number:p.number, name:text(raw?.name), source:SOURCE,
      sourceUrl:'https://github.com/R4PH1/PTCGP-Data', category:isPokemon?'Pokemon':k,
      type:isPokemon?text(raw?.type):'', hp:isPokemon?(Number(raw?.hp)||null):((k==='fossil'&&Number(raw?.hp))||null),
      stage:isPokemon?text(raw?.stage):'', evolvesFrom:isPokemon?text(raw?.evolves_from):'',
      weakness:isPokemon?text(raw?.weakness):'', retreat:isPokemon&&Number.isFinite(Number(raw?.retreat))?Number(raw.retreat):null,
      isEx:!!raw?.is_ex, isMegaEx:!!raw?.is_mega_ex,
      abilities:isPokemon&&Array.isArray(raw?.abilities)?raw.abilities.map(normalizeAbility):[],
      attacks:isPokemon&&Array.isArray(raw?.attacks)?raw.attacks.map(normalizeAttack):[],
      effect:!isPokemon?text(raw?.effect):'', duplicateIds:Array.isArray(raw?.duplicate_ids)?raw.duplicate_ids.map(text):[]
    };
  }
  async function loadKind(kind,fetchImpl=fetch){const file=FILES[kind];if(!file)throw new Error(`Unknown PTCGP-Data kind: ${kind}`);const r=await fetchImpl(ROOT+file,{cache:'no-store'});if(!r.ok)throw new Error(`PTCGP-Data ${file} HTTP ${r.status}`);const data=await r.json();if(!Array.isArray(data))throw new Error(`PTCGP-Data ${file} is not an array`);return data.map(x=>normalizeCard(x,kind))}
  function key(c){const p=c?.setCode&&c?.number?c:parseId(c?.id);return `${text(p.setCode).toUpperCase()}:${String(parseInt(p.number,10)||0)}`}
  function compare(existing,rich){const base=new Map((existing||[]).map(c=>[key(c),c]));const incoming=(rich||[]).map(c=>c?.source===SOURCE?c:normalizeCard(c,c?.category));let matched=0,nameMismatch=0,richGameplay=0;for(const c of incoming){const b=base.get(key(c));if(!b)continue;matched++;if(text(b?.name).toLowerCase()!==text(c?.name).toLowerCase())nameMismatch++;if(c.effect||c.abilities.length||c.attacks.some(a=>a.effect||a.name))richGameplay++}return {existing:(existing||[]).length,incoming:incoming.length,matched,nameMismatch,richGameplay,green:matched>0&&nameMismatch===0}}
  return {SOURCE,ROOT,FILES,parseId,normalizeCard,loadKind,key,compare};
})();
