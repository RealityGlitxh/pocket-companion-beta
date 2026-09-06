// V8.4 centralized card lookup/normalization helpers.
const CardService=(()=>{
  function normalizedName(n){return String(n||"").normalize("NFKC").replace(/[’‘`´]/g,"'").replace(/[‐‑‒–—−]/g,"-").replace(/\u00a0/g," ").trim().toLowerCase().replace(/\s+/g," ")}
  function normalizeNumber(number){const s=String(number??"").trim(),n=parseInt(s,10);return Number.isFinite(n)?String(n):s.replace(/^0+/,"")||"0"}
  function buildNameMap(cards){const map=new Map();(cards||[]).forEach(c=>{const k=normalizedName(c?.name);if(k&&!map.has(k))map.set(k,c)});return map}
  function getByName(cards,map,name,canonicalizer){const direct=map?.get(normalizedName(name));if(direct)return direct;const canon=typeof canonicalizer==="function"?canonicalizer:normalizedName,want=canon(name);for(const c of cards||[]){if(canon(c?.name)===want)return c}return null}
  function getBySetNumber(cards,setCode,number,setNormalizer){const normSet=typeof setNormalizer==="function"?setNormalizer:(x=>String(x||"").trim().toUpperCase()),wantSet=normSet(setCode),wantNum=normalizeNumber(number);return (cards||[]).find(c=>normSet(c?.setCode)===wantSet&&normalizeNumber(c?.number)===wantNum)||null}
  return {normalizedName,normalizeNumber,buildNameMap,getByName,getBySetNumber};
})();
