// V8.69 centralized card lookup/normalization helpers + validated Pokemon Zone feed.
const CardService=(()=>{
  const POKEMON_ZONE_FEED_URL='https://cdmzrsvwztndqfwzsumo.supabase.co/functions/v1/pokemon-zone-feed';
  const PZ_CACHE_KEY='ppc_pokemon_zone_feed_v8690';
  const PZ_CACHE_MS=10*60*1000;
  let pzMemory=null;
  function normalizedName(n){return String(n||"").normalize("NFKC").replace(/[’‘`´]/g,"'").replace(/[‐‑‒–—−]/g,"-").replace(/\u00a0/g," ").trim().toLowerCase().replace(/\s+/g," ")}
  function normalizeNumber(number){const s=String(number??"").trim(),n=parseInt(s,10);return Number.isFinite(n)?String(n):s.replace(/^0+/,"")||"0"}
  function buildNameMap(cards){const map=new Map();(cards||[]).forEach(c=>{const k=normalizedName(c?.name);if(k&&!map.has(k))map.set(k,c)});return map}
  function getByName(cards,map,name,canonicalizer){const direct=map?.get(normalizedName(name));if(direct)return direct;const canon=typeof canonicalizer==="function"?canonicalizer:normalizedName,want=canon(name);for(const c of cards||[]){if(canon(c?.name)===want)return c}return null}
  function getBySetNumber(cards,setCode,number,setNormalizer){const normSet=typeof setNormalizer==="function"?setNormalizer:(x=>String(x||"").trim().toUpperCase()),wantSet=normSet(setCode),wantNum=normalizeNumber(number);return (cards||[]).find(c=>normSet(c?.setCode)===wantSet&&normalizeNumber(c?.number)===wantNum)||null}
  function pzReadCache(){try{const x=JSON.parse(localStorage.getItem(PZ_CACHE_KEY)||'null');return x&&x.savedAt&&x.data?x:null}catch{return null}}
  function pzWriteCache(data){try{localStorage.setItem(PZ_CACHE_KEY,JSON.stringify({savedAt:Date.now(),data}))}catch{}}
  function normalizePokemonZoneCard(c,setNames={}){const code=String(c?.set_code||'').trim();return {id:`pz-${code.toLowerCase()}-${String(c?.card_number||'').padStart(3,'0')}`,name:String(c?.name||'').trim(),category:/trainer/i.test(String(c?.card_kind||''))?'Trainer':'Pokémon',stage:String(c?.subtype||''),setCode:code,setName:setNames[code]||code,number:String(c?.card_number??''),image:'',rarity:String(c?.rarity||''),hp:Number(c?.hp||0)||null,source:'pokemon-zone',sourceUrl:String(c?.source_url||''),validationStatus:'validated'} }
  async function fetchValidatedPokemonZoneFeed({force=false}={}){
    if(!force&&pzMemory&&Date.now()-pzMemory.savedAt<PZ_CACHE_MS)return pzMemory.data;
    const cached=pzReadCache();if(!force&&cached&&Date.now()-cached.savedAt<PZ_CACHE_MS){pzMemory=cached;return cached.data}
    const r=await fetch(POKEMON_ZONE_FEED_URL,{cache:'no-store',headers:{Accept:'application/json'}});if(!r.ok)throw new Error(`Pokemon Zone feed unavailable (${r.status})`);const data=await r.json();
    const clean={generatedAt:data?.generatedAt||new Date().toISOString(),sets:Array.isArray(data?.sets)?data.sets:[],cards:Array.isArray(data?.cards)?data.cards:[],updates:Array.isArray(data?.updates)?data.updates:[],sourceStatus:data?.sourceStatus||{}};
    pzMemory={savedAt:Date.now(),data:clean};pzWriteCache(clean);return clean;
  }
  function mergeValidated(cards,feed){const base=Array.isArray(cards)?cards.slice():[],sets=Array.isArray(feed?.sets)?feed.sets:[],setNames=Object.fromEntries(sets.map(s=>[String(s.set_code||''),String(s.name||s.set_code||'')]));const extras=(feed?.cards||[]).filter(c=>c?.validation_status==='validated'||c?.validationStatus==='validated').map(c=>normalizePokemonZoneCard(c,setNames)).filter(c=>c.name&&c.setCode&&c.number);const key=c=>`${String(c?.setCode||'').toUpperCase()}|${normalizeNumber(c?.number)}`,seen=new Set(base.map(key));for(const c of extras){const k=key(c);if(!seen.has(k)){base.push(c);seen.add(k)}}return base}
  async function hydrateValidatedCards(cards,{force=false}={}){const feed=await fetchValidatedPokemonZoneFeed({force});return {cards:mergeValidated(cards,feed),feed}}
  function clearPokemonZoneCache(){pzMemory=null;try{localStorage.removeItem(PZ_CACHE_KEY)}catch{}}
  return {normalizedName,normalizeNumber,buildNameMap,getByName,getBySetNumber,fetchValidatedPokemonZoneFeed,mergeValidated,hydrateValidatedCards,clearPokemonZoneCache,POKEMON_ZONE_FEED_URL};
})();
