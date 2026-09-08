// PocketNexus Pocket Coach V8.71 — verified name-first card-source bridge.
// This module must evaluate before the validated Coach module so its runtime
// card-source fetches see the verified supplement. Set/number remain internal.

const PRIMARY_CARD_DB='https://cdn.jsdelivr.net/npm/pokemon-tcg-pocket-database/dist/cards.extra.json';
const RICH_POKEMON_DB='https://raw.githubusercontent.com/R4PH1/PTCGP-Data/main/data/Pokemon.json';

const normalizeName=(v:unknown)=>String(v||'').normalize('NFKC').toLowerCase()
  .replace(/[’‘`´]/g,"'")
  .replace(/[^a-z0-9' -]/g,' ')
  .replace(/\s+/g,' ')
  .trim();

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

function mergeVerifiedSupplement(rows:any[],supplement:any){
  const list=Array.isArray(rows)?rows.slice():[];
  const exact=list.some(c=>normalizeName(c?.name)===ARTICUNO_KEY&&String(c?.setCode||c?.set||'').toUpperCase()==='B4A'&&Number(c?.number)===14);
  if(!exact)list.push(supplement);
  return list;
}

const nativeFetch=globalThis.fetch.bind(globalThis);
globalThis.fetch=async(input:any,init?:any)=>{
  const response=await nativeFetch(input,init);
  const url=typeof input==='string'?input:input instanceof URL?input.href:String(input?.url||'');
  if(!response.ok||(url!==PRIMARY_CARD_DB&&url!==RICH_POKEMON_DB))return response;
  try{
    const rows=await response.clone().json();
    const supplement=url===PRIMARY_CARD_DB?PRIMARY_SUPPLEMENT:RICH_SUPPLEMENT;
    const headers=new Headers(response.headers);headers.set('content-type','application/json; charset=utf-8');
    return new Response(JSON.stringify(mergeVerifiedSupplement(rows,supplement)),{status:response.status,statusText:response.statusText,headers});
  }catch{return response}
};
