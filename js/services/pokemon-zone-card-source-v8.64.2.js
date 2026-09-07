// V8.64.2 Pokemon Zone card-source adapter.
// Non-destructive: this adapter does not replace the existing PocketNexus card loader.
const PokemonZoneCardSource=(()=>{
  const SOURCE='pokemon-zone';
  const BASE='https://www.pokemon-zone.com';

  function text(v){return String(v??'').replace(/\s+/g,' ').trim()}
  function normName(v){return text(v).normalize('NFKC').replace(/[’‘`´]/g,"'").replace(/[‐‑‒–—−]/g,'-').toLowerCase()}
  function normSet(v){return text(v).toUpperCase()}
  function normNumber(v){const s=text(v),n=parseInt(s,10);return Number.isFinite(n)?String(n):s.replace(/^0+/,'')||'0'}
  function absUrl(v){const s=text(v);if(!s)return '';try{return new URL(s,BASE).href}catch{return s}}
  function setNumberFromUrl(url){const m=String(url||'').match(/\/cards\/([^/]+)\/(\d+)\//i);return m?{setCode:normSet(m[1]),number:normNumber(m[2])}:{setCode:'',number:''}}

  function normalizeCard(raw={}){
    const fromUrl=setNumberFromUrl(raw.url||raw.href||raw.link);
    const name=text(raw.name||raw.title);
    return {
      source:SOURCE,
      sourceUrl:absUrl(raw.url||raw.href||raw.link),
      setCode:normSet(raw.setCode||raw.set||fromUrl.setCode),
      number:normNumber(raw.number||raw.cardNumber||fromUrl.number),
      name,
      normalizedName:normName(name),
      rarity:text(raw.rarity),
      type:text(raw.type||raw.cardType).toLowerCase(),
      stage:text(raw.stage).toLowerCase(),
      health:Number.isFinite(Number(raw.health??raw.hp))?Number(raw.health??raw.hp):null,
      element:text(raw.element||raw.energyType).toLowerCase(),
      retreatCost:Number.isFinite(Number(raw.retreatCost))?Number(raw.retreatCost):null,
      weakness:text(raw.weakness),
      evolvesFrom:text(raw.evolvesFrom),
      image:absUrl(raw.image||raw.imageUrl),
      effect:text(raw.effect||raw.text),
      attacks:Array.isArray(raw.attacks)?raw.attacks:[],
      abilities:Array.isArray(raw.abilities)?raw.abilities:[],
      raw
    };
  }

  function cardKey(card){const c=normalizeCard(card);return c.setCode&&c.number?`${c.setCode}:${c.number}`:`NAME:${c.normalizedName}`}
  function index(cards){const m=new Map();for(const raw of cards||[]){const c=normalizeCard(raw),k=cardKey(c);if(k&&!m.has(k))m.set(k,c)}return m}

  function compare(primaryCards,zoneCards){
    const primary=index(primaryCards),zone=index(zoneCards);let matched=0;const missingInZone=[],nameMismatch=[];
    for(const [key,p] of primary){const z=zone.get(key);if(!z){missingInZone.push(key);continue}matched++;if(p.normalizedName&&z.normalizedName&&p.normalizedName!==z.normalizedName)nameMismatch.push({key,primary:p.name,zone:z.name})}
    const coverage=primary.size?matched/primary.size:0;
    return {primaryCount:primary.size,zoneCount:zone.size,matched,coverage,missingInZone,nameMismatch,green:primary.size>0&&zone.size>0&&coverage>=0.95&&nameMismatch.length===0};
  }

  return {SOURCE,BASE,normalizeCard,cardKey,index,compare,setNumberFromUrl};
})();
