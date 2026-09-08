// PocketNexus Pocket Coach V8.71 — name-first verified card grounding bridge.
// Player-facing card identity is the unique normalized name. Set/number remain
// internal verification metadata and are never required from the player when a
// name resolves uniquely.

const PRIMARY_CARD_DB='https://cdn.jsdelivr.net/npm/pokemon-tcg-pocket-database/dist/cards.extra.json';
const RICH_POKEMON_DB='https://raw.githubusercontent.com/R4PH1/PTCGP-Data/main/data/Pokemon.json';
const VALIDATED_COACH='https://raw.githubusercontent.com/RealityGlitxh/pocket-companion-beta/b6b95c0024899b48e80f75d40f09df521616c278/supabase/functions/pocket-coach/index.ts';

const normalizeName=(v:unknown)=>String(v||'').normalize('NFKC').toLowerCase()
  .replace(/[’‘`´]/g,"'")
  .replace(/[^a-z0-9' -]/g,' ')
  .replace(/\s+/g,' ')
  .trim();

// Verified against current Team Rocket's Ambition references. The alternate
// artwork prints (#80 and #89) have the same gameplay text; #14 is the canonical
// gameplay identity used by the grounding bridge.
const ARTICUNO_NAME="Team Rocket's Articuno ex";
const ARTICUNO_KEY=normalizeName(ARTICUNO_NAME);
const PRIMARY_SUPPLEMENT={
  id:'B4a-14',set:'B4a',setCode:'B4a',number:14,name:ARTICUNO_NAME,
  rarity:'Double Rare',element:'Water',type:'Pokemon',stage:'Basic',health:130,
  retreatCost:2,weakness:'Metal',evolvesFrom:'',verifiedSupplement:true,
  alternatePrintNumbers:[80,89]
};
const RICH_SUPPLEMENT={
  id:'B4a-14',set:'B4a',setCode:'B4a',number:14,name:ARTICUNO_NAME,
  type:'Water',hp:130,stage:'Basic',evolves_from:'',weakness:'Metal',retreat:2,
  is_ex:true,is_mega_ex:false,
  attacks:[
    {name:'Ice Wing',damage:'40',cost:['Water','Colorless'],effect:''},
    {name:'Hailstorm',damage:'130',cost:['Water','Water','Colorless'],effect:'This attack also does 20 damage to each of your Benched Pokémon.'}
  ],
  abilities:[],effect:'',verifiedSupplement:true,alternatePrintNumbers:[80,89]
};

function mergeUniqueByIdentity(rows:any[],supplement:any){
  const list=Array.isArray(rows)?rows.slice():[];
  const same=list.filter(c=>normalizeName(c?.name)===ARTICUNO_KEY);
  // Never overwrite a source record. If the upstream source now has this exact
  // canonical identity, trust it and stop supplementing. If it has a different
  // same-name gameplay identity, keep both so downstream ambiguity can surface.
  const exact=same.some(c=>String(c?.setCode||c?.set||'').toUpperCase()==='B4A'&&Number(c?.number)===14);
  if(!exact)list.push(supplement);
  return list;
}

const nativeFetch=globalThis.fetch.bind(globalThis);
globalThis.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
  const response=await nativeFetch(input,init);
  const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
  if(!response.ok||(url!==PRIMARY_CARD_DB&&url!==RICH_POKEMON_DB))return response;
  try{
    const rows=await response.clone().json();
    const supplement=url===PRIMARY_CARD_DB?PRIMARY_SUPPLEMENT:RICH_SUPPLEMENT;
    const merged=mergeUniqueByIdentity(rows,supplement);
    const headers=new Headers(response.headers);headers.set('content-type','application/json; charset=utf-8');
    return new Response(JSON.stringify(merged),{status:response.status,statusText:response.statusText,headers});
  }catch{return response}
};

// Dynamic import is required so the fetch bridge is installed before the
// validated Coach module initializes and performs card-source requests.
await import(VALIDATED_COACH);
