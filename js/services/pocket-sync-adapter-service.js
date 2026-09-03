/* V8.59.2 Pocket Sync Adapter Framework
   Standardizes legitimate read-only sources before they enter the V8.59.1 ingestion layer.
   This framework intentionally does not accept passwords, cookies, reusable session tokens,
   or private-endpoint credentials. */
(function(){
  const registry=new Map();
  const SCHEMA_VERSION='1.0';
  const DOMAINS=['collection','rank_history','battle_history'];
  const forbiddenKey=/^(password|passcode|cookie|cookies|session_cookie|session_token|game_session|refresh_token|client_secret|service_role|service_role_key)$/i;

  function clonePlain(value){
    if(value==null)return value;
    if(typeof value==='string'||typeof value==='number'||typeof value==='boolean')return value;
    if(Array.isArray(value))return value.map(clonePlain);
    if(typeof value==='object'){
      const out={};
      for(const [k,v] of Object.entries(value))out[k]=clonePlain(v);
      return out;
    }
    return String(value);
  }
  function assertNoForbiddenSecrets(value,path='input'){
    if(value==null||typeof value!=='object')return;
    if(Array.isArray(value)){value.forEach((v,i)=>assertNoForbiddenSecrets(v,`${path}[${i}]`));return}
    for(const [k,v] of Object.entries(value)){
      if(forbiddenKey.test(k))throw new Error(`Adapter input rejected: ${path}.${k} is a credential/session field.`);
      assertNoForbiddenSecrets(v,`${path}.${k}`);
    }
  }
  function normalizeScopes(scopes){return [...new Set((scopes||[]).filter(x=>DOMAINS.includes(x)))]}
  function normalizeDefinition(def){
    if(!def||typeof def!=='object')throw new Error('Adapter definition must be an object.');
    const id=String(def.id||'').trim();
    if(!/^[a-z0-9][a-z0-9_-]{2,63}$/i.test(id))throw new Error('Adapter id is invalid.');
    if(typeof def.read!=='function')throw new Error(`Adapter ${id} requires a read() function.`);
    return Object.freeze({
      id,label:String(def.label||id),version:String(def.version||'1.0.0'),sourceKey:String(def.sourceKey||id),
      sourceKind:String(def.sourceKind||'adapter'),official:!!def.official,readOnly:def.readOnly!==false,
      availability:String(def.availability||'available'),scopes:normalizeScopes(def.scopes),description:String(def.description||''),
      requiresSignIn:!!def.requiresSignIn,read:def.read,toEnvelope:typeof def.toEnvelope==='function'?def.toEnvelope:null
    });
  }
  function register(def){const d=normalizeDefinition(def);if(!d.readOnly)throw new Error(`Adapter ${d.id} rejected: Pocket Sync adapters must be read-only.`);registry.set(d.id,d);return publicMeta(d)}
  function publicMeta(d){return {id:d.id,label:d.label,version:d.version,sourceKey:d.sourceKey,sourceKind:d.sourceKind,official:d.official,readOnly:d.readOnly,availability:d.availability,scopes:[...d.scopes],description:d.description,requiresSignIn:d.requiresSignIn}}
  function list(){return [...registry.values()].map(publicMeta)}
  function get(id){const d=registry.get(String(id||''));return d?publicMeta(d):null}
  function pickArray(raw,...keys){for(const k of keys)if(Array.isArray(raw?.[k]))return raw[k];return []}
  function defaultEnvelope(adapter,raw){
    const base=raw&&typeof raw==='object'?raw:{};
    const nested=base.domains&&typeof base.domains==='object'?base.domains:base;
    return {
      schema_version:SCHEMA_VERSION,
      adapter:{id:adapter.id,version:adapter.version},
      source:{key:adapter.sourceKey,label:adapter.label,kind:adapter.sourceKind,official:adapter.official,read_only:true},
      fetched_at:new Date().toISOString(),
      domains:{
        collection:pickArray(nested,'collection','cards','owned_cards'),
        rank_history:pickArray(nested,'rank_history','rankHistory','ranks','rank_records'),
        battle_history:pickArray(nested,'battle_history','battleHistory','matches','battles')
      },
      provenance:clonePlain(base.provenance||{})
    };
  }
  function validateEnvelope(envelope,adapter){
    if(!envelope||typeof envelope!=='object')throw new Error(`Adapter ${adapter.id} did not return an envelope.`);
    const domains=envelope.domains||{};
    for(const domain of DOMAINS){if(!Array.isArray(domains[domain]))throw new Error(`Adapter ${adapter.id} envelope is missing domains.${domain} array.`)}
    assertNoForbiddenSecrets(envelope.provenance||{},'envelope.provenance');
    return envelope;
  }
  async function run(id,context={}){
    const adapter=registry.get(String(id||''));
    if(!adapter)throw new Error(`Pocket Sync adapter not registered: ${id}`);
    if(adapter.availability!=='available')throw new Error(`${adapter.label} is ${adapter.availability}; it cannot run yet.`);
    assertNoForbiddenSecrets(context?.input,'adapter.input');
    const started=performance?.now?.()||Date.now();
    const raw=await adapter.read({input:clonePlain(context.input),session:context.session||null,signal:context.signal||null});
    assertNoForbiddenSecrets(raw,'adapter.output');
    let envelope=adapter.toEnvelope?await adapter.toEnvelope(clonePlain(raw),{schemaVersion:SCHEMA_VERSION}):defaultEnvelope(adapter,raw);
    envelope={...defaultEnvelope(adapter,{}),...envelope,domains:{...defaultEnvelope(adapter,{}).domains,...(envelope?.domains||{})},adapter:{id:adapter.id,version:adapter.version},source:{key:adapter.sourceKey,label:adapter.label,kind:adapter.sourceKind,official:adapter.official,read_only:true,...(envelope?.source||{})}};
    validateEnvelope(envelope,adapter);
    const counts=Object.fromEntries(DOMAINS.map(d=>[d,envelope.domains[d].length]));
    return {envelope,diagnostics:{adapter_id:adapter.id,schema_version:SCHEMA_VERSION,duration_ms:Math.max(0,Math.round((performance?.now?.()||Date.now())-started)),counts,read_only:true}};
  }

  register({
    id:'staged_json',label:'Staged JSON Adapter',version:'1.0.0',sourceKey:'staged_json',sourceKind:'manual_import',official:false,availability:'available',
    scopes:DOMAINS,description:'Developer/test adapter for user-supplied JSON. It proves the adapter contract without claiming access to Pokémon TCG Pocket.',
    async read({input}){if(typeof input==='string')return JSON.parse(input||'{}');return input&&typeof input==='object'?input:{}}
  });
  register({
    id:'official_pocket_api',label:'Official Pocket API Adapter',version:'0.0.0-research',sourceKey:'official_pocket_api',sourceKind:'official_api',official:true,availability:'research',
    scopes:DOMAINS,description:'Reserved adapter slot. It stays disabled until a verified official third-party read-only Pocket player-data API and authorization flow exists.',
    async read(){throw new Error('Official Pocket API adapter is still behind the research gate.')}
  });

  window.PPCPocketSyncAdapters=Object.freeze({schemaVersion:SCHEMA_VERSION,domains:[...DOMAINS],register,list,get,run});
})();
