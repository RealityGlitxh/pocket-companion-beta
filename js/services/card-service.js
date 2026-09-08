// V8.71 centralized card lookup/normalization helpers.
const CardService=(()=>{
  function normalizedName(n){return String(n||"").normalize("NFKC").replace(/[’‘`´]/g,"'").replace(/[‐‑‒–—−]/g,"-").replace(/\u00a0/g," ").trim().toLowerCase().replace(/\s+/g," ")}
  function aliasNormalizedName(n){return normalizedName(n).replace(/[“”]/g,'"').replace(/\s*([:/])\s*/g,'$1')}
  function normalizeNumber(number){const s=String(number??"").trim(),n=parseInt(s,10);return Number.isFinite(n)?String(n):s.replace(/^0+/,"")||"0"}
  function buildNameMap(cards){const map=new Map();(cards||[]).forEach(c=>{const k=normalizedName(c?.name);if(!k)return;const prev=map.get(k);if(!prev)map.set(k,c);else if(!Array.isArray(prev))map.set(k,[prev,c]);else prev.push(c)});return map}
  function unique(list){const rows=Array.isArray(list)?list:(list?[list]:[]);return rows.length===1?rows[0]:null}
  function resolveByName(cards,map,name,canonicalizer){
    const exact=unique(map?.get(normalizedName(name)));
    if(exact)return {status:'resolved',card:exact,match:'normalized-name'};
    if(Array.isArray(map?.get(normalizedName(name))))return {status:'ambiguous',cards:map.get(normalizedName(name)),match:'normalized-name'};
    const canon=typeof canonicalizer==="function"?canonicalizer:aliasNormalizedName,want=canon(name),matches=(cards||[]).filter(c=>canon(c?.name)===want);
    if(matches.length===1)return {status:'resolved',card:matches[0],match:'alias-normalized-name'};
    if(matches.length>1)return {status:'ambiguous',cards:matches,match:'alias-normalized-name'};
    return {status:'missing',cards:[],match:null};
  }
  function getByName(cards,map,name,canonicalizer){const r=resolveByName(cards,map,name,canonicalizer);return r.status==='resolved'?r.card:null}
  function getBySetNumber(cards,setCode,number,setNormalizer){const normSet=typeof setNormalizer==="function"?setNormalizer:(x=>String(x||"").trim().toUpperCase()),wantSet=normSet(setCode),wantNum=normalizeNumber(number);return (cards||[]).find(c=>normSet(c?.setCode)===wantSet&&normalizeNumber(c?.number)===wantNum)||null}
  return {normalizedName,aliasNormalizedName,normalizeNumber,buildNameMap,resolveByName,getByName,getBySetNumber};
})();
