const DATA_URL="https://cdn.jsdelivr.net/npm/pokemon-tcg-pocket-database/dist/cards.json";
const CARD_METADATA_URL="https://cdn.jsdelivr.net/npm/pokemon-tcg-pocket-database/dist/cards.extra.json";
const CARD_CACHE_KEY="ppc_cards_canonical_v8549";
function readCardCache(){try{const x=JSON.parse(localStorage.getItem(CARD_CACHE_KEY)||"null");return Array.isArray(x?.cards)&&x.cards.length?x.cards:null}catch{return null}}
function writeCardCache(cards){try{localStorage.setItem(CARD_CACHE_KEY,JSON.stringify({savedAt:Date.now(),cards}))}catch(e){console.warn("Card cache unavailable",e)}}
const CARD_DATA_SOURCE="pokemon-tcg-pocket-database via jsDelivr";
const LIMITLESS_IMAGE_BASE="https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket";
const STORE="ppc_browser_v2";
const LEGACY_NAMES={"pikachu-ex":"Pikachu ex","pikachu":"Pikachu","raichu":"Raichu","zapdos-ex":"Zapdos ex","mewtwo-ex":"Mewtwo ex","ralts":"Ralts","kirlia":"Kirlia","gardevoir":"Gardevoir","charmander":"Charmander","charmeleon":"Charmeleon","charizard-ex":"Charizard ex","squirtle":"Squirtle","wartortle":"Wartortle","blastoise-ex":"Blastoise ex","eevee":"Eevee","snorlax":"Snorlax","prof":"Professor's Research","prof-research":"Professor's Research","pokeball":"Poké Ball","xspeed":"X Speed","x-speed":"X Speed","sabrina":"Sabrina","giovanni":"Giovanni","potion":"Potion","redcard":"Red Card","red-card":"Red Card"};

let cardsRequested=false, cardsLoadedOnline=false, cardPage=0, cardLoadPromise=null; const CARD_PAGE_SIZE=48;
let CARDS=[{"id": "fallback-pikachu-ex", "name": "Pikachu ex", "category": "Pokémon", "stage": "Basic", "setCode": "Starter", "setName": "Starter", "number": "001", "image": "", "rarity": ""}, {"id": "fallback-pikachu", "name": "Pikachu", "category": "Pokémon", "stage": "Basic", "setCode": "Starter", "setName": "Starter", "number": "002", "image": "", "rarity": ""}, {"id": "fallback-raichu", "name": "Raichu", "category": "Pokémon", "stage": "Stage 1", "setCode": "Starter", "setName": "Starter", "number": "003", "image": "", "rarity": ""}, {"id": "fallback-zapdos-ex", "name": "Zapdos ex", "category": "Pokémon", "stage": "Basic", "setCode": "Starter", "setName": "Starter", "number": "004", "image": "", "rarity": ""}, {"id": "fallback-mewtwo-ex", "name": "Mewtwo ex", "category": "Pokémon", "stage": "Basic", "setCode": "Starter", "setName": "Starter", "number": "005", "image": "", "rarity": ""}, {"id": "fallback-ralts", "name": "Ralts", "category": "Pokémon", "stage": "Basic", "setCode": "Starter", "setName": "Starter", "number": "006", "image": "", "rarity": ""}, {"id": "fallback-kirlia", "name": "Kirlia", "category": "Pokémon", "stage": "Stage 1", "setCode": "Starter", "setName": "Starter", "number": "007", "image": "", "rarity": ""}, {"id": "fallback-gardevoir", "name": "Gardevoir", "category": "Pokémon", "stage": "Stage 2", "setCode": "Starter", "setName": "Starter", "number": "008", "image": "", "rarity": ""}, {"id": "fallback-charmander", "name": "Charmander", "category": "Pokémon", "stage": "Basic", "setCode": "Starter", "setName": "Starter", "number": "009", "image": "", "rarity": ""}, {"id": "fallback-charmeleon", "name": "Charmeleon", "category": "Pokémon", "stage": "Stage 1", "setCode": "Starter", "setName": "Starter", "number": "010", "image": "", "rarity": ""}, {"id": "fallback-charizard-ex", "name": "Charizard ex", "category": "Pokémon", "stage": "Stage 2", "setCode": "Starter", "setName": "Starter", "number": "011", "image": "", "rarity": ""}, {"id": "fallback-squirtle", "name": "Squirtle", "category": "Pokémon", "stage": "Basic", "setCode": "Starter", "setName": "Starter", "number": "012", "image": "", "rarity": ""}, {"id": "fallback-wartortle", "name": "Wartortle", "category": "Pokémon", "stage": "Stage 1", "setCode": "Starter", "setName": "Starter", "number": "013", "image": "", "rarity": ""}, {"id": "fallback-blastoise-ex", "name": "Blastoise ex", "category": "Pokémon", "stage": "Stage 2", "setCode": "Starter", "setName": "Starter", "number": "014", "image": "", "rarity": ""}, {"id": "fallback-eevee", "name": "Eevee", "category": "Pokémon", "stage": "Basic", "setCode": "Starter", "setName": "Starter", "number": "015", "image": "", "rarity": ""}, {"id": "fallback-snorlax", "name": "Snorlax", "category": "Pokémon", "stage": "Basic", "setCode": "Starter", "setName": "Starter", "number": "016", "image": "", "rarity": ""}, {"id": "fallback-prof", "name": "Professor's Research", "category": "Trainer", "stage": "Supporter", "setCode": "Starter", "setName": "Starter", "number": "017", "image": "", "rarity": ""}, {"id": "fallback-pokeball", "name": "Poké Ball", "category": "Trainer", "stage": "Item", "setCode": "Starter", "setName": "Starter", "number": "018", "image": "", "rarity": ""}, {"id": "fallback-xspeed", "name": "X Speed", "category": "Trainer", "stage": "Item", "setCode": "Starter", "setName": "Starter", "number": "019", "image": "", "rarity": ""}, {"id": "fallback-sabrina", "name": "Sabrina", "category": "Trainer", "stage": "Supporter", "setCode": "Starter", "setName": "Starter", "number": "020", "image": "", "rarity": ""}, {"id": "fallback-giovanni", "name": "Giovanni", "category": "Trainer", "stage": "Supporter", "setCode": "Starter", "setName": "Starter", "number": "021", "image": "", "rarity": ""}, {"id": "fallback-potion", "name": "Potion", "category": "Trainer", "stage": "Item", "setCode": "Starter", "setName": "Starter", "number": "022", "image": "", "rarity": ""}], cardMap=new Map(), visibleLimit=120;
let storageAvailable=StorageService.available();
function safeStorageGet(key){const v=StorageService.get(key);storageAvailable=StorageService.available();return v}
function safeStorageSet(key,value){const ok=StorageService.set(key,value);storageAvailable=StorageService.available();return ok}
function safeJsonParse(value,fallback=null){
 if(!value)return fallback;
 try{return JSON.parse(value)}catch(e){return fallback}
}
let state=safeJsonParse(safeStorageGet(STORE),null);
if(!state || typeof state!=="object" || Array.isArray(state)){
  const old=safeJsonParse(safeStorageGet("ppc_browser_v1"),null);
  state=old&&typeof old==="object"&&!Array.isArray(old)
    ?{...old,page:old.page||"dashboard",selected:old.selected||old.selectedDeck||null}
    :{user:null,decks:[],matches:[],page:"dashboard",selected:null};
}
state.decks=Array.isArray(state.decks)?state.decks:[];
state.matches=Array.isArray(state.matches)?state.matches:[];
state.collection=state.collection||{};
// V8.50.4: keep Collection state sparse. Old read-only filters could create thousands of empty rows.
Object.keys(state.collection).forEach(id=>{const r=state.collection[id]||{};const owned=Math.max(0,Number(r.owned||0)),wanted=Math.max(0,Number(r.wanted||0)),tradeable=Math.max(0,Math.min(Number(r.tradeable||0),owned));if(!owned&&!wanted&&!tradeable)delete state.collection[id];else state.collection[id]={owned:Math.floor(owned),wanted:Math.floor(wanted),tradeable:Math.floor(tradeable)}});
state.meta=state.meta||{tab:"overview",cache:null,lastUpdated:0,status:"idle",error:""};
state.trade=state.trade||{};
state.sessions=Array.isArray(state.sessions)?state.sessions:[];
state.rankHistory=Array.isArray(state.rankHistory)?state.rankHistory:[];
state.battlePrefs=state.battlePrefs||{mode:"quick",lastDeckId:"",historyPage:0,pageSize:25,statsTab:"overview",matrixMin:3};
state.archetypePrefs=state.archetypePrefs||{query:"",type:"",tier:"",sort:"name",view:"grid"};
state.streamer=state.streamer||{};
Object.assign(state.streamer,{
 preset:state.streamer.preset||"full",theme:state.streamer.theme||"dark",opacity:Number(state.streamer.opacity??85),
 showRank:state.streamer.showRank!==false,showRecord:state.streamer.showRecord!==false,showWinRate:state.streamer.showWinRate!==false,showStreak:state.streamer.showStreak!==false,
 showDeck:state.streamer.showDeck!==false,showSession:state.streamer.showSession!==false,showRecent:state.streamer.showRecent!==false,
 showOpponent:state.streamer.showOpponent!==false,showMatchup:state.streamer.showMatchup!==false,showTimer:state.streamer.showTimer!==false,showSessionRP:state.streamer.showSessionRP!==false,
 recentCount:Number(state.streamer.recentCount||5),fontScale:Number(state.streamer.fontScale||100),
 controlDeckId:state.streamer.controlDeckId||state.battlePrefs?.lastDeckId||state.decks?.[0]?.id||"",
 controlOpponent:state.streamer.controlOpponent||"",customOpponent:state.streamer.customOpponent||"",controlTurnOrder:state.streamer.controlTurnOrder||"unknown",
 sessionType:state.streamer.sessionType||"Ranked Grind",sessionCustomName:state.streamer.sessionCustomName||"",lastRecordedMatchId:state.streamer.lastRecordedMatchId||null,
 overlayMode:state.streamer.overlayMode||"ranked",sceneRotation:state.streamer.sceneRotation!==false,sceneSeconds:Number(state.streamer.sceneSeconds||10),sceneIndex:Number(state.streamer.sceneIndex||0),
 scenes:state.streamer.scenes||{rank:true,graph:true,deck:true,decklist:true,qr:true,lastmatch:true,matchup:false,tournament:true},
 tournamentName:state.streamer.tournamentName||"",tournamentRound:state.streamer.tournamentRound||"Round 1",tournamentRecord:state.streamer.tournamentRecord||"0-0",tournamentStage:state.streamer.tournamentStage||"Swiss",
 casterA:state.streamer.casterA||"Player A",casterB:state.streamer.casterB||"Player B",casterScoreA:Number(state.streamer.casterScoreA||0),casterScoreB:Number(state.streamer.casterScoreB||0)
});
state.cloudPrefs=state.cloudPrefs||{autoSync:false};
state.deckPrefs=state.deckPrefs&&typeof state.deckPrefs==="object"?state.deckPrefs:{query:"",favorites:[]};
state.deckPrefs.query=String(state.deckPrefs.query||"");
state.deckPrefs.favorites=Array.isArray(state.deckPrefs.favorites)?state.deckPrefs.favorites:[];
state.collectionPrefs=state.collectionPrefs&&typeof state.collectionPrefs==="object"?state.collectionPrefs:{quickEdit:false};
state.collectionPrefs.quickEdit=!!state.collectionPrefs.quickEdit;
state.tournamentPrefs=state.tournamentPrefs&&typeof state.tournamentPrefs==="object"?state.tournamentPrefs:{selectedKey:"",query:"",view:"leaderboard"};
state.tournamentPrefs.selectedKey=String(state.tournamentPrefs.selectedKey||"");
state.tournamentPrefs.query=String(state.tournamentPrefs.query||"");
state.tournamentPrefs.view=["leaderboard","decks","events"].includes(state.tournamentPrefs.view)?state.tournamentPrefs.view:"leaderboard";
state.metaIntel=state.metaIntel&&typeof state.metaIntel==="object"?state.metaIntel:{query:"",type:"",tier:"",confidence:"",hasSample:"",watchlist:[],compareIds:[],detailId:"",windowHours:168};
state.metaIntel.windowHours=[24,168,336,720].includes(Number(state.metaIntel.windowHours))?Number(state.metaIntel.windowHours):168;
state.metaIntel.watchlist=Array.isArray(state.metaIntel.watchlist)?state.metaIntel.watchlist:[];
state.metaIntel.compareIds=Array.isArray(state.metaIntel.compareIds)?state.metaIntel.compareIds:[];

// V8.2: cloud runtime state is initialized before any startup migration can call save().
let cloudClient=null,cloudSession=null,cloudProfile=null;
let passwordRecoveryMode=false;
let cloudSyncState=null,cloudSyncBusy=false,cloudSyncTimer=null,cloudSyncPending=false;
let cloudSyncLastError="",cloudSyncLastAt=null;
let cloudInitStarted=false,cloudRuntimeReady=false;
let collectionCloudStatus="local",collectionCloudError="",collectionCloudLastAt=null;
let collectionCloudTimer=null,collectionCloudBusy=false,collectionCloudLastHash="";
state.collectionSyncMeta=state.collectionSyncMeta&&typeof state.collectionSyncMeta==="object"?state.collectionSyncMeta:{};
state.deckSyncMeta=state.deckSyncMeta&&typeof state.deckSyncMeta==="object"?state.deckSyncMeta:{};
let deckCloudStatus="local",deckCloudError="",deckCloudLastAt=null,deckCloudTimer=null,deckCloudBusy=false,deckCloudLastHash="";
let deckRuntimeSnapshot={};
state.battleRankSyncMeta=state.battleRankSyncMeta&&typeof state.battleRankSyncMeta==="object"?state.battleRankSyncMeta:{};
state.battleRankSyncMeta.matches=state.battleRankSyncMeta.matches&&typeof state.battleRankSyncMeta.matches==="object"?state.battleRankSyncMeta.matches:{};
state.battleRankSyncMeta.sessions=state.battleRankSyncMeta.sessions&&typeof state.battleRankSyncMeta.sessions==="object"?state.battleRankSyncMeta.sessions:{};
state.battleRankSyncMeta.rankHistory=state.battleRankSyncMeta.rankHistory&&typeof state.battleRankSyncMeta.rankHistory==="object"?state.battleRankSyncMeta.rankHistory:{};
state.battleRankSyncMeta.rankedState=state.battleRankSyncMeta.rankedState&&typeof state.battleRankSyncMeta.rankedState==="object"?state.battleRankSyncMeta.rankedState:{};
let battleRankCloudStatus="local",battleRankCloudError="",battleRankCloudLastAt=null,battleRankCloudTimer=null,battleRankCloudBusy=false,battleRankCloudLastHash="";
let battleRankRuntimeSnapshot={matches:{},sessions:{},rankHistory:{},rankedState:""};
let collectionRuntimeSnapshot={};
function collectionValues(r){return {owned:Math.max(0,Number(r?.owned||0)),wanted:Math.max(0,Number(r?.wanted||0)),tradeable:Math.max(0,Math.min(Number(r?.tradeable||0),Number(r?.owned||0)))};}
function collectionMeaningful(r){const v=collectionValues(r);return !!(v.owned||v.wanted||v.tradeable)}
function collectionValueKey(r){const v=collectionValues(r);return `${v.owned}|${v.wanted}|${v.tradeable}`}
function initCollectionRuntimeSnapshot(){collectionRuntimeSnapshot={};for(const [id,r] of Object.entries(state.collection||{}))collectionRuntimeSnapshot[id]=collectionValueKey(r)}
initCollectionRuntimeSnapshot();
function captureCollectionLocalChanges(){
 const now=Date.now(),ids=new Set([...Object.keys(collectionRuntimeSnapshot),...Object.keys(state.collection||{})]);
 for(const id of ids){const key=collectionValueKey(state.collection?.[id]);if(collectionRuntimeSnapshot[id]!==key){state.collectionSyncMeta[id]={...(state.collectionSyncMeta[id]||{}),localUpdatedAt:now};collectionRuntimeSnapshot[id]=key}}
}
function deckPayloadKey(d){try{return JSON.stringify(d||{})}catch(e){return ""}}
function initDeckRuntimeSnapshot(){deckRuntimeSnapshot={};(state.decks||[]).forEach(d=>{if(d?.id)deckRuntimeSnapshot[String(d.id)]=deckPayloadKey(d)})}
function captureDeckLocalChanges(){
 const now=Date.now(),current={};
 (state.decks||[]).forEach(d=>{if(!d?.id)return;const id=String(d.id),key=deckPayloadKey(d);current[id]=key;if(deckRuntimeSnapshot[id]!==undefined&&deckRuntimeSnapshot[id]!==key)state.deckSyncMeta[id]={...(state.deckSyncMeta[id]||{}),localUpdatedAt:now,deleted:false};if(deckRuntimeSnapshot[id]===undefined&&!state.deckSyncMeta[id])state.deckSyncMeta[id]={localUpdatedAt:now,deleted:false}});
 Object.keys(deckRuntimeSnapshot).forEach(id=>{if(current[id]===undefined)state.deckSyncMeta[id]={...(state.deckSyncMeta[id]||{}),localUpdatedAt:now,deleted:true}});
 deckRuntimeSnapshot=current;
}
function deckCloudHash(){return JSON.stringify([(state.decks||[]).map(d=>[String(d.id||""),deckPayloadKey(d),Number(state.deckSyncMeta?.[d.id]?.localUpdatedAt||0)]).sort((a,b)=>a[0].localeCompare(b[0])),Object.entries(state.deckSyncMeta||{}).filter(([,m])=>m?.deleted).map(([id,m])=>[id,Number(m.localUpdatedAt||0)]).sort((a,b)=>a[0].localeCompare(b[0]))])}
function scheduleDeckCloudSync(){if(!cloudClient||!cloudSession?.user||!cloudSyncState?.initial_upload_completed)return;clearTimeout(deckCloudTimer);deckCloudTimer=setTimeout(()=>syncDecksToCloud(),700)}
function deckCloudMillis(row){return row?.updated_at?Date.parse(row.updated_at)||0:0}
async function fetchCloudDeckRows(){if(!cloudClient||!cloudSession?.user)return [];const {data,error}=await cloudClient.rpc("get_my_cloud_deck_sync");if(error)throw error;return data||[]}
function applyCloudDeckRows(rows,{initial=false}={}){
 const cloudMap=new Map((rows||[]).map(r=>[String(r.local_id||""),r]).filter(([id])=>id)),localMap=new Map((state.decks||[]).filter(d=>d?.id).map(d=>[String(d.id),d]));
 const ids=new Set([...localMap.keys(),...cloudMap.keys()]);
 for(const id of ids){const local=localMap.get(id),row=cloudMap.get(id),cloudTs=deckCloudMillis(row),m=state.deckSyncMeta[id]||{},localTs=Number(m.localUpdatedAt||0);
  if(!row){if(initial&&local&&!localTs)state.deckSyncMeta[id]={...m,localUpdatedAt:Date.now(),deleted:false};continue}
  if(initial&&local&&!localTs){if(row.deleted_at){localMap.delete(id);state.deckSyncMeta[id]={...m,localUpdatedAt:cloudTs,cloudUpdatedAt:cloudTs,deleted:true};continue}if(deckPayloadKey(local)===deckPayloadKey(row.payload)){state.deckSyncMeta[id]={...m,localUpdatedAt:cloudTs,cloudUpdatedAt:cloudTs,deleted:false};continue}state.deckSyncMeta[id]={...m,localUpdatedAt:Date.now(),cloudUpdatedAt:cloudTs,deleted:false};continue}
  if(cloudTs>=localTs){if(row.deleted_at){localMap.delete(id);state.deckSyncMeta[id]={...m,localUpdatedAt:cloudTs,cloudUpdatedAt:cloudTs,deleted:true}}else{const payload=row.payload&&typeof row.payload==="object"?row.payload:null;if(payload){payload.id=payload.id||id;localMap.set(id,payload)}state.deckSyncMeta[id]={...m,localUpdatedAt:cloudTs,cloudUpdatedAt:cloudTs,deleted:false}}}
 }
 state.decks=[...localMap.values()];
}
async function syncDecksToCloud({force=false,initial=false,allowPush=null}={}){
 if(!cloudClient||!cloudSession?.user||deckCloudBusy)return false;if(typeof navigator!=="undefined"&&navigator.onLine===false){deckCloudStatus="offline";return false}
 const canPush=allowPush===null?!!cloudSyncState?.initial_upload_completed:!!allowPush,hash=deckCloudHash();if(!force&&hash===deckCloudLastHash&&deckCloudStatus==="synced")return true;
 deckCloudBusy=true;deckCloudStatus="syncing";deckCloudError="";
 try{const rows=await fetchCloudDeckRows();applyCloudDeckRows(rows,{initial});const cloudMap=new Map(rows.map(r=>[String(r.local_id||""),r])),localMap=new Map((state.decks||[]).filter(d=>d?.id).map(d=>[String(d.id),d]));
  if(canPush){const ids=new Set([...localMap.keys(),...Object.keys(state.deckSyncMeta||{})]);for(const id of ids){const m=state.deckSyncMeta[id]||{},localTs=Number(m.localUpdatedAt||0),row=cloudMap.get(id),cloudTs=deckCloudMillis(row);if(!localTs||cloudTs>=localTs)continue;if(m.deleted&&!localMap.has(id)){const {error}=await cloudClient.rpc("delete_my_cloud_deck",{p_local_id:id,p_updated_at:new Date(localTs).toISOString()});if(error)throw error}else{const payload=localMap.get(id);if(payload){const {error}=await cloudClient.rpc("upsert_my_cloud_deck",{p_local_id:id,p_payload:payload,p_updated_at:new Date(localTs).toISOString()});if(error)throw error}}}}
  const fresh=await fetchCloudDeckRows();for(const row of fresh){const id=String(row.local_id||"");if(!id)continue;const ts=deckCloudMillis(row);state.deckSyncMeta[id]={...(state.deckSyncMeta[id]||{}),localUpdatedAt:ts,cloudUpdatedAt:ts,deleted:!!row.deleted_at}}
  initDeckRuntimeSnapshot();safeStorageSet(STORE,JSON.stringify(state));deckCloudLastHash=deckCloudHash();deckCloudStatus="synced";deckCloudLastAt=new Date().toISOString();return true;
 }catch(e){deckCloudStatus=(typeof navigator!=="undefined"&&navigator.onLine===false)?"offline":"error";deckCloudError=e?.message||String(e);console.warn("Deck Cloud Sync V8.50.2 failed",e);return false}finally{deckCloudBusy=false}
}
async function mergeDeckCloudOnSignIn(){if(!cloudClient||!cloudSession?.user)return false;deckCloudLastHash="";return syncDecksToCloud({force:true,initial:true,allowPush:false})}

function collectionCloudHash(){
 const rows=Object.entries(state.collection||{}).map(([id,r])=>[id,...Object.values(collectionValues(r)),Number(state.collectionSyncMeta?.[id]?.localUpdatedAt||0)]).filter(x=>x[1]||x[2]||x[3]||x[4]).sort((a,b)=>a[0].localeCompare(b[0]));
 return JSON.stringify(rows);
}
function collectionCloudStatusLabel(){
 if(!cloudSession?.user)return {text:"Local only",cls:""};
 if(typeof navigator!=="undefined"&&navigator.onLine===false)return {text:"Offline",cls:"warn"};
 if(collectionCloudStatus==="syncing")return {text:"Syncing…",cls:""};
 if(collectionCloudStatus==="error")return {text:"Needs attention",cls:"bad"};
 if(collectionCloudStatus==="synced")return {text:"Synced",cls:"good"};
 return {text:"Cloud ready",cls:""};
}
function scheduleCollectionCloudSync(){
 if(!cloudClient||!cloudSession?.user)return;
 const h=collectionCloudHash();if(h===collectionCloudLastHash&&collectionCloudStatus==="synced")return;
 clearTimeout(collectionCloudTimer);collectionCloudTimer=setTimeout(()=>syncCollectionToCloud(),650);
}
async function fetchCloudCollectionRows(){
 if(!cloudClient||!cloudSession?.user)return [];
 const {data,error}=await cloudClient.rpc("get_my_collection_sync");if(error)throw error;return data||[];
}
function cloudMillis(row){return row?.updated_at?Date.parse(row.updated_at)||0:0}
function applyCloudCollectionRows(cloudRows,{initial=false}={}){
 const byId=new Map((cloudRows||[]).map(r=>[String(r.card_id||""),r]).filter(x=>x[0]));
 const ids=new Set([...Object.keys(state.collection||{}),...byId.keys()]);
 for(const id of ids){
  const row=byId.get(id),local=state.collection?.[id],localTs=Number(state.collectionSyncMeta?.[id]?.localUpdatedAt||0),cloudTs=cloudMillis(row);
  if(!row)continue;
  if(initial&&!localTs&&collectionMeaningful(local)&&!row.deleted_at){
   // Migration-safe first merge for browsers created before per-card timestamps existed.
   const cv={owned:Number(row.owned_quantity||0),wanted:Number(row.wanted_quantity||0),tradeable:Number(row.trade_quantity||0)};
   state.collection[id]={owned:Math.max(Number(local?.owned||0),cv.owned),wanted:Math.max(Number(local?.wanted||0),cv.wanted),tradeable:Math.min(Math.max(Number(local?.tradeable||0),cv.tradeable),Math.max(Number(local?.owned||0),cv.owned))};
   state.collectionSyncMeta[id]={...(state.collectionSyncMeta[id]||{}),localUpdatedAt:cloudTs,cloudUpdatedAt:cloudTs};continue;
  }
  if(cloudTs>=localTs){
   if(row.deleted_at){delete state.collection[id]}else state.collection[id]={owned:Number(row.owned_quantity||0),wanted:Number(row.wanted_quantity||0),tradeable:Math.min(Number(row.trade_quantity||0),Number(row.owned_quantity||0))};
   state.collectionSyncMeta[id]={...(state.collectionSyncMeta[id]||{}),localUpdatedAt:cloudTs,cloudUpdatedAt:cloudTs};
  }
 }
 initCollectionRuntimeSnapshot();
}
async function syncCollectionToCloud({force=false,initial=false}={}){
 if(!cloudClient||!cloudSession?.user||collectionCloudBusy)return false;
 if(typeof navigator!=="undefined"&&navigator.onLine===false){collectionCloudStatus="offline";renderCollectionCloudStatus();return false}
 const hash=collectionCloudHash();if(!force&&hash===collectionCloudLastHash&&collectionCloudStatus==="synced")return true;
 collectionCloudBusy=true;collectionCloudStatus="syncing";collectionCloudError="";renderCollectionCloudStatus();
 try{
  const cloudRows=await fetchCloudCollectionRows();applyCloudCollectionRows(cloudRows,{initial});
  const cloudMap=new Map(cloudRows.map(r=>[String(r.card_id),r]));
  const ids=new Set([...Object.keys(state.collection||{}),...Object.keys(state.collectionSyncMeta||{})]);
  for(const id of ids){
   const local=state.collection?.[id],meta=state.collectionSyncMeta?.[id]||{},localTs=Number(meta.localUpdatedAt||0),row=cloudMap.get(id),cloudTs=cloudMillis(row);
   if(row&&cloudTs>=localTs)continue;
   if(!localTs&&!collectionMeaningful(local))continue;
   if(collectionMeaningful(local)){
    const v=collectionValues(local),{data,error}=await cloudClient.rpc("upsert_my_collection_card",{p_card_id:id,p_owned_quantity:v.owned,p_wanted_quantity:v.wanted,p_trade_quantity:v.tradeable});if(error)throw error;
    const saved=Array.isArray(data)?data[0]:data,ts=cloudMillis(saved)||Date.now();state.collectionSyncMeta[id]={...meta,localUpdatedAt:ts,cloudUpdatedAt:ts};
   }else if(row&&!row.deleted_at){
    const {data,error}=await cloudClient.rpc("delete_my_collection_card",{p_card_id:id});if(error)throw error;
    const saved=Array.isArray(data)?data[0]:data,ts=cloudMillis(saved)||Date.now();delete state.collection[id];state.collectionSyncMeta[id]={...meta,localUpdatedAt:ts,cloudUpdatedAt:ts};
   }
  }
  const now=new Date().toISOString();const {error:stateErr}=await cloudClient.rpc("set_my_collection_sync_state",{p_synced_at:now});if(stateErr)throw stateErr;
  initCollectionRuntimeSnapshot();safeStorageSet(STORE,JSON.stringify(state));collectionCloudLastHash=collectionCloudHash();collectionCloudStatus="synced";collectionCloudLastAt=now;return true;
 }catch(e){collectionCloudStatus=(typeof navigator!=="undefined"&&navigator.onLine===false)?"offline":"error";collectionCloudError=e?.message||String(e);console.warn("Collection Cloud Sync 2.0 failed",e);return false}
 finally{collectionCloudBusy=false;renderCollectionCloudStatus()}
}
async function mergeCloudCollectionOnSignIn(){
 if(!cloudClient||!cloudSession?.user)return false;
 collectionCloudStatus="syncing";collectionCloudError="";
 try{collectionCloudLastHash="";return await syncCollectionToCloud({force:true,initial:true})}
 catch(e){collectionCloudStatus="error";collectionCloudError=e?.message||String(e);return false}
}
function renderCollectionCloudStatus(){
 const el=document.getElementById("collectionCloudStatus");if(!el)return;const st=collectionCloudStatusLabel();el.className=`badge ${st.cls||""}`;el.textContent=st.text;el.title=collectionCloudError||(collectionCloudLastAt?`Last synced ${new Date(collectionCloudLastAt).toLocaleString()}`:"Collection cloud status");
}
if(typeof window!=="undefined"){
 window.addEventListener("online",()=>{if(cloudSession?.user){collectionCloudStatus="syncing";renderCollectionCloudStatus();syncCollectionToCloud({force:true});battleRankCloudStatus="syncing";syncBattleRankToCloud({force:true});deckCloudStatus="syncing";syncDecksToCloud({force:true});if(typeof scheduleCloudSync==="function")scheduleCloudSync();if(typeof scheduleStreamerCloudSync==="function")scheduleStreamerCloudSync()}});
 window.addEventListener("offline",()=>{collectionCloudStatus="offline";renderCollectionCloudStatus();battleRankCloudStatus="offline";renderBattleRankCloudStatus();deckCloudStatus="offline"});
}

// V8.45: dedicated Battle + Rank Cloud Sync. Matches, sessions, rank history,
// and the current ranked state use per-record timestamps plus soft deletes so
// a second browser cannot silently resurrect an older result.
function battleRankPayloadKey(value){
 try{return JSON.stringify(value??null)}catch(e){return String(value??"")}
}
function battleRankListMap(key){
 const out={};for(const row of (Array.isArray(state[key])?state[key]:[])){if(row?.id)out[String(row.id)]=battleRankPayloadKey(row)}return out;
}
function initBattleRankRuntimeSnapshot(){
 battleRankRuntimeSnapshot={matches:battleRankListMap("matches"),sessions:battleRankListMap("sessions"),rankHistory:battleRankListMap("rankHistory"),rankedState:battleRankPayloadKey(state.rank||{})};
}
initBattleRankRuntimeSnapshot();
function captureBattleRankLocalChanges(){
 const now=Date.now();
 for(const key of ["matches","sessions","rankHistory"]){
  const current=battleRankListMap(key),prior=battleRankRuntimeSnapshot[key]||{},meta=state.battleRankSyncMeta[key]||(state.battleRankSyncMeta[key]={});
  const ids=new Set([...Object.keys(prior),...Object.keys(current)]);
  for(const id of ids){
   if(prior[id]===current[id])continue;
   meta[id]={...(meta[id]||{}),localUpdatedAt:now,deleted:current[id]===undefined};
  }
  battleRankRuntimeSnapshot[key]=current;
 }
 const rankKey=battleRankPayloadKey(state.rank||{});
 if(rankKey!==battleRankRuntimeSnapshot.rankedState){state.battleRankSyncMeta.rankedState={...(state.battleRankSyncMeta.rankedState||{}),localUpdatedAt:now};battleRankRuntimeSnapshot.rankedState=rankKey}
}
function battleRankCloudHash(){
 const pack={};
 for(const key of ["matches","sessions","rankHistory"]){
  const rows=(state[key]||[]).map(x=>[String(x.id||""),battleRankPayloadKey(x),Number(state.battleRankSyncMeta?.[key]?.[x.id]?.localUpdatedAt||0)]);
  const tomb=Object.entries(state.battleRankSyncMeta?.[key]||{}).filter(([id,m])=>m?.deleted&&!rows.some(r=>r[0]===id)).map(([id,m])=>[id,"__deleted__",Number(m.localUpdatedAt||0)]);
  pack[key]=[...rows,...tomb].sort((a,b)=>a[0].localeCompare(b[0]));
 }
 pack.rank=[battleRankPayloadKey(state.rank||{}),Number(state.battleRankSyncMeta?.rankedState?.localUpdatedAt||0)];
 return JSON.stringify(pack);
}
function battleRankCloudStatusLabel(){
 if(!cloudSession?.user)return {text:"Local only",cls:""};
 if(typeof navigator!=="undefined"&&navigator.onLine===false)return {text:"Offline",cls:"warn"};
 if(battleRankCloudStatus==="syncing")return {text:"Syncing…",cls:""};
 if(battleRankCloudStatus==="error")return {text:"Needs attention",cls:"bad"};
 if(battleRankCloudStatus==="synced")return {text:"Synced",cls:"good"};
 return {text:"Cloud ready",cls:""};
}
function renderBattleRankCloudStatus(){
 const el=document.getElementById("battleRankCloudStatus");if(!el)return;const st=battleRankCloudStatusLabel();el.className=`badge ${st.cls||""}`;el.textContent=st.text;el.title=battleRankCloudError||(battleRankCloudLastAt?`Last synced ${new Date(battleRankCloudLastAt).toLocaleString()}`:"Battle + Rank cloud status");
}
function scheduleBattleRankCloudSync(){
 if(!cloudClient||!cloudSession?.user)return;
 const h=battleRankCloudHash();if(h===battleRankCloudLastHash&&battleRankCloudStatus==="synced")return;
 clearTimeout(battleRankCloudTimer);battleRankCloudTimer=setTimeout(()=>syncBattleRankToCloud(),700);
}
async function fetchBattleRankCloud(){
 const calls=await Promise.all([
  cloudClient.rpc("get_my_battle_match_sync"),cloudClient.rpc("get_my_battle_session_sync"),cloudClient.rpc("get_my_rank_history_sync"),cloudClient.rpc("get_my_ranked_state")
 ]);
 for(const r of calls)if(r.error)throw r.error;
 return {matches:calls[0].data||[],sessions:calls[1].data||[],rankHistory:calls[2].data||[],rankedState:Array.isArray(calls[3].data)?(calls[3].data[0]||null):(calls[3].data||null)};
}
function battleRankRowTs(row){return row?.updated_at?Date.parse(row.updated_at)||0:0}
function battleRankPayloadFromRow(row){return row?.payload&&typeof row.payload==="object"?row.payload:null}
function applyBattleRankCloudRows(key,rows,{initial=false}={}){
 const meta=state.battleRankSyncMeta[key]||(state.battleRankSyncMeta[key]={}),localRows=Array.isArray(state[key])?state[key]:[],localMap=new Map(localRows.filter(x=>x?.id).map(x=>[String(x.id),x]));
 const cloudMap=new Map((rows||[]).filter(x=>x?.local_id).map(x=>[String(x.local_id),x]));
 const ids=new Set([...localMap.keys(),...cloudMap.keys()]);
 for(const id of ids){
  const local=localMap.get(id),row=cloudMap.get(id),cloudTs=battleRankRowTs(row),m=meta[id]||{},localTs=Number(m.localUpdatedAt||0);
  if(!row){if(initial&&local&&!localTs)meta[id]={...m,localUpdatedAt:Date.now(),deleted:false};continue}
  if(initial&&local&&!localTs){
   const cloudPayload=battleRankPayloadFromRow(row);
   // A cloud tombstone represents an intentional deletion and must not be
   // resurrected by an older pre-V8.45 browser during its first migration.
   if(row.deleted_at){localMap.delete(id);meta[id]={...m,localUpdatedAt:cloudTs,cloudUpdatedAt:cloudTs,deleted:true};continue}
   if(battleRankPayloadKey(local)===battleRankPayloadKey(cloudPayload)){meta[id]={...m,localUpdatedAt:cloudTs,cloudUpdatedAt:cloudTs,deleted:false};continue}
   // For an active record with the same stable ID, preserve the existing local
   // edit once, then give it a timestamp so subsequent syncs are deterministic.
   meta[id]={...m,localUpdatedAt:Date.now(),cloudUpdatedAt:cloudTs,deleted:false};continue;
  }
  if(cloudTs>=localTs){
   if(row.deleted_at){localMap.delete(id);meta[id]={...m,localUpdatedAt:cloudTs,cloudUpdatedAt:cloudTs,deleted:true}}
   else {const payload=battleRankPayloadFromRow(row);if(payload){payload.id=payload.id||id;localMap.set(id,payload)}meta[id]={...m,localUpdatedAt:cloudTs,cloudUpdatedAt:cloudTs,deleted:false}}
  }
 }
 state[key]=[...localMap.values()];
}
function applyBattleRankedState(row,{initial=false}={}){
 if(!row)return;
 const cloudTs=row.ranked_state_updated_at?Date.parse(row.ranked_state_updated_at)||0:0,meta=state.battleRankSyncMeta.rankedState||{},localTs=Number(meta.localUpdatedAt||0),cloudRank=row.ranked_state&&typeof row.ranked_state==="object"?row.ranked_state:null;
 if(!cloudRank||!Object.keys(cloudRank).length)return;
 if(initial&&!localTs&&state.rank&&Object.keys(state.rank).length){
  if(battleRankPayloadKey(state.rank)===battleRankPayloadKey(cloudRank)){state.battleRankSyncMeta.rankedState={...meta,localUpdatedAt:cloudTs,cloudUpdatedAt:cloudTs};return}
  const localHasRankActivity=Number(state.rank?.points||0)>0||(state.rankHistory||[]).length>0||(state.matches||[]).some(m=>m?.gameMode==="ranked");
  const localWholeStateTs=Number(state.localUpdatedAt||0);
  if(!localHasRankActivity||cloudTs>=localWholeStateTs){state.rank={...state.rank,...cloudRank};state.battleRankSyncMeta.rankedState={...meta,localUpdatedAt:cloudTs,cloudUpdatedAt:cloudTs}}
  else state.battleRankSyncMeta.rankedState={...meta,localUpdatedAt:localWholeStateTs||Date.now(),cloudUpdatedAt:cloudTs};
  return;
 }
 if(cloudTs>=localTs){state.rank={...state.rank,...cloudRank};state.battleRankSyncMeta.rankedState={...meta,localUpdatedAt:cloudTs,cloudUpdatedAt:cloudTs}}
}
async function normalizeBattleRankMetaFromCloud(){
 const fresh=await fetchBattleRankCloud();
 for(const [key,rows] of [["matches",fresh.matches],["sessions",fresh.sessions],["rankHistory",fresh.rankHistory]]){
  const meta=state.battleRankSyncMeta[key]||(state.battleRankSyncMeta[key]={});
  for(const row of rows){const id=String(row.local_id||"");if(!id)continue;const ts=battleRankRowTs(row);meta[id]={...(meta[id]||{}),localUpdatedAt:ts,cloudUpdatedAt:ts,deleted:!!row.deleted_at}}
 }
 const rr=fresh.rankedState;if(rr?.ranked_state_updated_at){const ts=Date.parse(rr.ranked_state_updated_at)||Date.now();state.battleRankSyncMeta.rankedState={...(state.battleRankSyncMeta.rankedState||{}),localUpdatedAt:ts,cloudUpdatedAt:ts}}
}
async function syncBattleRankToCloud({force=false,initial=false}={}){
 if(!cloudClient||!cloudSession?.user||battleRankCloudBusy)return false;
 if(typeof navigator!=="undefined"&&navigator.onLine===false){battleRankCloudStatus="offline";renderBattleRankCloudStatus();return false}
 const hash=battleRankCloudHash();if(!force&&hash===battleRankCloudLastHash&&battleRankCloudStatus==="synced")return true;
 battleRankCloudBusy=true;battleRankCloudStatus="syncing";battleRankCloudError="";renderBattleRankCloudStatus();
 try{
  const cloud=await fetchBattleRankCloud();
  // V8.45.1: apply current ranked state BEFORE importing cloud history.
  // On a fresh browser, importing cloud matches/rank history first made the
  // browser look like it already had local ranked activity, which could block
  // the authoritative cloud RP/rank/streak from being restored.
  applyBattleRankedState(cloud.rankedState,{initial});
  applyBattleRankCloudRows("matches",cloud.matches,{initial});applyBattleRankCloudRows("sessions",cloud.sessions,{initial});applyBattleRankCloudRows("rankHistory",cloud.rankHistory,{initial});
  const specs={matches:{rows:cloud.matches,upsert:"upsert_my_battle_match",del:"delete_my_battle_match"},sessions:{rows:cloud.sessions,upsert:"upsert_my_battle_session",del:"delete_my_battle_session"},rankHistory:{rows:cloud.rankHistory,upsert:"upsert_my_rank_history",del:"delete_my_rank_history"}};
  for(const [key,spec] of Object.entries(specs)){
   const cloudMap=new Map((spec.rows||[]).map(r=>[String(r.local_id||""),r])),localMap=new Map((state[key]||[]).filter(x=>x?.id).map(x=>[String(x.id),x])),meta=state.battleRankSyncMeta[key]||{};
   const ids=new Set([...localMap.keys(),...Object.keys(meta)]);
   for(const id of ids){
    const m=meta[id]||{},localTs=Number(m.localUpdatedAt||0),row=cloudMap.get(id),cloudTs=battleRankRowTs(row);if(!localTs||cloudTs>=localTs)continue;
    if(m.deleted&&!localMap.has(id)){if(row&&!row.deleted_at){const {error}=await cloudClient.rpc(spec.del,{p_local_id:id});if(error)throw error}}
    else {const payload=localMap.get(id);if(payload){const {error}=await cloudClient.rpc(spec.upsert,{p_local_id:id,p_payload:payload});if(error)throw error}}
   }
  }
  const rankMeta=state.battleRankSyncMeta.rankedState||{},localRankTs=Number(rankMeta.localUpdatedAt||0),cloudRankTs=cloud.rankedState?.ranked_state_updated_at?Date.parse(cloud.rankedState.ranked_state_updated_at)||0:0;
  if(localRankTs&&localRankTs>cloudRankTs){const {error}=await cloudClient.rpc("set_my_ranked_state",{p_ranked_state:state.rank||{},p_updated_at:new Date(localRankTs).toISOString()});if(error)throw error}
  await normalizeBattleRankMetaFromCloud();initBattleRankRuntimeSnapshot();safeStorageSet(STORE,JSON.stringify(state));battleRankCloudLastHash=battleRankCloudHash();battleRankCloudStatus="synced";battleRankCloudLastAt=new Date().toISOString();return true;
 }catch(e){battleRankCloudStatus=(typeof navigator!=="undefined"&&navigator.onLine===false)?"offline":"error";battleRankCloudError=e?.message||String(e);console.warn("Battle + Rank Cloud Sync V8.45 failed",e);return false}
 finally{battleRankCloudBusy=false;renderBattleRankCloudStatus()}
}
async function mergeBattleRankCloudOnSignIn(){
 if(!cloudClient||!cloudSession?.user)return false;
 battleRankCloudStatus="syncing";battleRankCloudError="";battleRankCloudLastHash="";return syncBattleRankToCloud({force:true,initial:true});
}


const VALID_PAGES=new Set(["dashboard","decks","collection","optimizer","matches","stats","meta","tournaments","rank","trade","streamer","coach","training","profile","teamwars","sync","account","about","more"]);
function repairStateShape(s){
 if(!s||typeof s!=="object"||Array.isArray(s))s={};
 s.user=typeof s.user==="string"&&s.user.trim()?s.user.trim():null;
 s.sessionMode=s.sessionMode||null;
 s.decks=Array.isArray(s.decks)?s.decks.filter(x=>x&&typeof x==="object"):[];
 s.matches=Array.isArray(s.matches)?s.matches.filter(x=>x&&typeof x==="object"):[];
 s.sessions=Array.isArray(s.sessions)?s.sessions.filter(x=>x&&typeof x==="object"):[];
 s.rankHistory=Array.isArray(s.rankHistory)?s.rankHistory.filter(x=>x&&typeof x==="object"):[];
 s.collection=s.collection&&typeof s.collection==="object"&&!Array.isArray(s.collection)?s.collection:{};
 s.deckSyncMeta=s.deckSyncMeta&&typeof s.deckSyncMeta==="object"&&!Array.isArray(s.deckSyncMeta)?s.deckSyncMeta:{};
 s.meta=s.meta&&typeof s.meta==="object"?s.meta:{tab:"overview",cache:null,lastUpdated:0,status:"idle",error:""};
 s.trade=s.trade&&typeof s.trade==="object"?s.trade:{};
 s.battlePrefs=s.battlePrefs&&typeof s.battlePrefs==="object"?s.battlePrefs:{mode:"quick",lastDeckId:"",historyPage:0,pageSize:25,statsTab:"overview",statsRange:"all",matrixMin:3};
 s.battlePrefs.statsRange=["7d","30d","season","all"].includes(s.battlePrefs.statsRange)?s.battlePrefs.statsRange:"all";
 s.archetypePrefs=s.archetypePrefs&&typeof s.archetypePrefs==="object"?s.archetypePrefs:{query:"",type:"",tier:"",sort:"name",view:"grid"};
 s.streamer=s.streamer&&typeof s.streamer==="object"?s.streamer:{preset:"full",theme:"dark",opacity:85,showRank:true,showRecord:true,showWinRate:true,showStreak:true,showDeck:true,showSession:true,showRecent:true,recentCount:5,fontScale:100};
 s.cloudPrefs=s.cloudPrefs&&typeof s.cloudPrefs==="object"?s.cloudPrefs:{autoSync:false};
 s.deckPrefs=s.deckPrefs&&typeof s.deckPrefs==="object"?s.deckPrefs:{query:"",favorites:[]};
 s.deckPrefs.query=String(s.deckPrefs.query||"");s.deckPrefs.favorites=Array.isArray(s.deckPrefs.favorites)?s.deckPrefs.favorites:[];
 s.collectionPrefs=s.collectionPrefs&&typeof s.collectionPrefs==="object"?s.collectionPrefs:{quickEdit:false};
 s.collectionPrefs.quickEdit=!!s.collectionPrefs.quickEdit;
 s.gymBattle=s.gymBattle&&typeof s.gymBattle==="object"?s.gymBattle:{view:"setup",homeGym:"My Gym",awayGym:"Opponent Gym",homePlayers:[],awayPlayers:[],active:null,history:[]};
 s.metaV73=s.metaV73&&typeof s.metaV73==="object"?s.metaV73:{tab:"overview",matchupMin:10,cardDeckKey:"",tier:""};
 s.metaIntel=s.metaIntel&&typeof s.metaIntel==="object"?s.metaIntel:{query:"",type:"",tier:"",confidence:"",hasSample:"",watchlist:[],compareIds:[],detailId:"",windowHours:168};
 s.metaIntel.windowHours=[24,168,336,720].includes(Number(s.metaIntel.windowHours))?Number(s.metaIntel.windowHours):168;
 s.rank=s.rank&&typeof s.rank==="object"?s.rank:{tier:"Master Ball",points:0,streak:0};
 s.rank.tier=String(s.rank.tier||"Unranked");
 s.rank.points=Number.isFinite(Number(s.rank.points))?Number(s.rank.points):0;
 s.rank.streak=Number.isFinite(Number(s.rank.streak))?Number(s.rank.streak):0;
 s.page=VALID_PAGES.has(s.page)?s.page:"dashboard";
 s.decks.forEach((d,i)=>{
   if(!d.id)d.id=makeId();
   d.name=String(d.name||`Deck ${i+1}`);
   d.cards=d.cards&&typeof d.cards==="object"&&!Array.isArray(d.cards)?d.cards:{};
   for(const [id,q] of Object.entries(d.cards)){
     const n=Math.max(0,Math.floor(Number(q)||0)); if(n)d.cards[id]=n; else delete d.cards[id];
   }
   d.energy=String(d.energy||"");
 });
 s.sessions.forEach(x=>{if(!x.id)x.id=makeId()});
 s.rankHistory.forEach(x=>{if(!x.id)x.id=x.matchId?`rank-${x.matchId}`:makeId()});
 if(s.selected&&!s.decks.some(d=>d.id===s.selected))s.selected=null;
 if(s.simDeck&&!s.decks.some(d=>d.id===s.simDeck))s.simDeck=null;
 return s;
}
state=repairStateShape(state);
function ensureGymBattleState(){
 const g=state.gymBattle=state.gymBattle&&typeof state.gymBattle==="object"?state.gymBattle:{};
 g.view=["setup","pairing","battle","history"].includes(g.view)?g.view:"setup";
 g.homeGym=String(g.homeGym||"My Gym");g.awayGym=String(g.awayGym||"Opponent Gym");
 g.homePlayers=Array.isArray(g.homePlayers)?g.homePlayers:[];g.awayPlayers=Array.isArray(g.awayPlayers)?g.awayPlayers:[];g.history=Array.isArray(g.history)?g.history:[];
 while(g.homePlayers.length<5)g.homePlayers.push({name:`Player ${g.homePlayers.length+1}`,deck1:"",deck2:""});
 while(g.awayPlayers.length<5)g.awayPlayers.push({name:`Opponent ${g.awayPlayers.length+1}`,deck1:"",deck2:""});
 g.homePlayers=g.homePlayers.slice(0,5);g.awayPlayers=g.awayPlayers.slice(0,5);
 g.pairingMode=["balanced","antiMeta","proven","scout"].includes(g.pairingMode)?g.pairingMode:"balanced";
 g.scoutTargets=Array.isArray(g.scoutTargets)?g.scoutTargets.slice(0,4):[];
 return g;
}
ensureGymBattleState();
initDeckRuntimeSnapshot();
// V8.18 onboarding state. Existing users with meaningful data are treated as already onboarded.
const hadExistingActivity=!!(state.decks.length||state.matches.length||Object.keys(state.collection||{}).length||state.rankHistory.length);
state.onboarding=state.onboarding&&typeof state.onboarding==="object"?state.onboarding:{completed:hadExistingActivity,step:0,goal:"",ranked:null};
state.onboarding.step=Math.max(0,Math.min(5,Number(state.onboarding.step)||0));
state.dataVersion=Math.max(Number(state.dataVersion||0),8.51);
cardMap=new Map(CARDS.map(c=>[c.id,c]));
const BUNDLED_ID_TO_NAME=new Map(CARDS.map(c=>[c.id,c.name]));
function unresolvedCard(id,name=""){
 return {id,name:name||`Unresolved card (${id})`,category:"Unknown",stage:"",setCode:"Missing",setName:"Missing card reference",number:"",rarity:"",image:"",thumbnailUrl:"",fullImageUrl:"",thumbnailImageSources:[],fullImageSources:[],missing:true,raw:{}};
}
function save(){
 captureDeckLocalChanges();
 captureCollectionLocalChanges();
 captureBattleRankLocalChanges();
 state.localUpdatedAt=Date.now();
 safeStorageSet(STORE,JSON.stringify(state));
 if(cloudRuntimeReady){ scheduleCloudSync(); scheduleDeckCloudSync(); scheduleCollectionCloudSync(); scheduleBattleRankCloudSync(); if(typeof scheduleStreamerCloudSync==="function")scheduleStreamerCloudSync(); }
 scheduleStreamerOverlayUpdate();
}
function esc(x){return String(x??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function slug(x){return String(x??"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}
function makeId(){try{if(globalThis.crypto&&typeof globalThis.crypto.randomUUID==="function")return globalThis.crypto.randomUUID()}catch(e){}return "id-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,10)}
function stableLegacyMatchId(m,timestamp,deckName,opp){
 const raw=[timestamp,deckName,opp,m?.result||"",m?.date||m?.playedAt||m?.createdAt||""].join("|");
 let hash=2166136261;
 for(let i=0;i<raw.length;i++){hash^=raw.charCodeAt(i);hash=Math.imul(hash,16777619)}
 return "legacy-match-"+(hash>>>0).toString(36);
}
function ensureStableLocalIds(){
 let changed=false;
 ["decks","matches","rankHistory","sessions"].forEach(key=>{
   const list=Array.isArray(state[key])?state[key]:[];
   list.forEach(x=>{
     if(!x||typeof x!=="object"||x.id)return;
     if(key==="matches"){
       const ts=Number(x.timestamp||Date.parse(x.date||x.playedAt||x.createdAt||"")||Date.now());
       const deckName=x.deckName||x.deck||x.deck_name||"Unknown Deck";
       const opp=x.opponentArchetype||x.opponent||x.opponentDeck||x.opponent_deck||"Unknown";
       x.id=stableLegacyMatchId(x,ts,deckName,opp);
     }else if(key==="rankHistory"&&x.matchId){
       x.id="rank-"+String(x.matchId);
     }else{x.id=makeId()}
     changed=true;
   });
 });
 if(changed)safeStorageSet(STORE,JSON.stringify(state));
 return changed;
}
ensureStableLocalIds();


const ArchetypeService={
 validate(a){return !!(a&&a.id&&a.name&&Array.isArray(a.pokemon)&&Array.isArray(a.sampleDeck)&&(a.stats?.usage==null||Number.isFinite(Number(a.stats.usage)))&&(a.stats?.winRate==null||Number.isFinite(Number(a.stats.winRate))))},
 getArchetypes(){return ARCHETYPE_DATA.filter(a=>this.validate(a))},
 getArchetype(id){return this.getArchetypes().find(a=>a.id===id)||null},
 searchArchetypes(query=""){let q=String(query).trim().toLowerCase();return this.getArchetypes().filter(a=>!q||[a.name,a.shortName,a.type,a.tier,...a.pokemon].join(" ").toLowerCase().includes(q))},
 getTopArchetypes(){return this.getArchetypes().filter(a=>a.stats.usage!=null).sort((a,b)=>b.stats.usage-a.stats.usage)},
 getMetaOverview(){const a=this.getArchetypes(),u=a.filter(x=>x.stats.usage!=null),w=a.filter(x=>x.stats.winRate!=null),types={};a.forEach(x=>types[x.type]=(types[x.type]||0)+1);return {mostPlayed:u.sort((x,y)=>y.stats.usage-x.stats.usage)[0]||null,highestWinRate:w.sort((x,y)=>y.stats.winRate-x.stats.winRate)[0]||null,mostPopularType:Object.entries(types).sort((x,y)=>y[1]-x[1])[0]?.[0]||"—",count:a.length}}
};

// V8.41 — central Supabase Archetype Library 2.0.
// One shared, cached, public-safe library drives archetype selectors across the app.
// Rich Meta pages keep bundled deck/content data, but names are canonicalized through this service.
const CloudArchetypeLibrary={
 rows:[],loaded:false,loading:false,error:"",source:"fallback",cacheKey:"ppc_archetype_library_v841",cacheMaxAge:6*60*60*1000,
 hydrateCache(){
  if(this.rows.length)return this.rows;
  try{const c=JSON.parse(localStorage.getItem(this.cacheKey)||"null");if(c&&Array.isArray(c.rows)&&c.rows.length){this.rows=c.rows;this.loaded=true;this.source="cache"}}catch(e){}
  return this.rows;
 },
 async load(force=false){
  this.hydrateCache();
  if(this.loading)return this.rows;
  try{const c=JSON.parse(localStorage.getItem(this.cacheKey)||"null");if(!force&&c?.savedAt&&Date.now()-Number(c.savedAt)<this.cacheMaxAge&&this.rows.length)return this.rows}catch(e){}
  let client=window.getPPCCloudClient?.();
  if(!client)return this.rows;
  this.loading=true;this.error="";
  try{
   const {data,error}=await client.rpc("get_archetype_library",{p_status:"ACTIVE"});
   if(error)throw error;
   const rows=(Array.isArray(data)?data:[]).filter(x=>x?.canonical_name&&x?.display_name);
   if(rows.length){this.rows=rows;this.loaded=true;this.source="supabase";try{localStorage.setItem(this.cacheKey,JSON.stringify({savedAt:Date.now(),rows}))}catch(e){}}
  }catch(e){this.error=e?.message||String(e||"Archetype library unavailable");console.warn("Archetype library fallback active",e)}
  this.loading=false;return this.rows;
 },
 names(){
  this.hydrateCache();
  const cloud=this.rows.map(x=>x.canonical_name||x.display_name).filter(Boolean);
  if(cloud.length)return [...new Set(cloud)];
  return [...new Set(ArchetypeService.getArchetypes().map(a=>MetaAdapter?.normalizeArchetypeName?.(a.name)||a.name).filter(Boolean))];
 },
 row(name){
  this.hydrateCache();const q=this.key(name);if(!q)return null;
  return this.rows.find(x=>this.key(x.canonical_name)===q||this.key(x.display_name)===q)||null;
 },
 key(name){return String(name||"").trim().replace(/\s+/g," ").toLowerCase()},
 canonical(name){
  const raw=String(name||"").trim().replace(/\s+/g," ");if(!raw)return "";
  const direct=this.row(raw);if(direct)return direct.canonical_name;
  const bundled=ArchetypeService.getArchetypes().find(a=>[a.name,a.shortName,...(a.pokemon||[])].some(v=>this.key(v)===this.key(raw)));
  if(bundled){const normalized=MetaAdapter?.normalizeArchetypeName?.(bundled.name)||bundled.name;return this.row(normalized)?.canonical_name||normalized}
  return raw;
 },
 featured(){this.hydrateCache();return this.rows.filter(x=>x.featured)},
 stats(){this.hydrateCache();return {count:this.rows.length,featured:this.featured().length,source:this.source,error:this.error}}
};
CloudArchetypeLibrary.hydrateCache();
window.PPCArchetypeLibrary=CloudArchetypeLibrary;
function sharedArchetypeNames(){return CloudArchetypeLibrary.names().sort((a,b)=>a.localeCompare(b))}
function canonicalArchetypeName(name){return CloudArchetypeLibrary.canonical(name)}
function sharedArchetypeDatalist(id="sharedArchetypeList"){return `<datalist id="${esc(id)}">${sharedArchetypeNames().map(n=>`<option value="${esc(n)}"></option>`).join("")}</datalist>`}

let cardByNormalizedName=new Map();
function normalizedCardName(n){return CardService.normalizedName(n)}
const SET_CODE_ALIASES={
 "P-A":"PROMO-A",
 "PA":"PROMO-A",
 "PROMO A":"PROMO-A",
 "PROMO-A":"PROMO-A",
 "P-B":"PROMO-B",
 "PB":"PROMO-B",
 "PROMO B":"PROMO-B",
 "PROMO-B":"PROMO-B"
};
function normalizeExternalSetCode(code){
 const raw=String(code||"").trim().toUpperCase();
 return SET_CODE_ALIASES[raw]||raw;
}
function normalizeCardNumber(number){return CardService.normalizeNumber(number)}
function findCardBySetNumber(setCode,number){
 const wantSet=normalizeExternalSetCode(setCode);
 const wantNum=normalizeCardNumber(number);
 return CARDS.find(c=>normalizeExternalSetCode(c.setCode)===wantSet&&normalizeCardNumber(c.number)===wantNum)||null;
}

function rebuildCardNameLookup(){cardByNormalizedName=CardService.buildNameMap(CARDS)}
rebuildCardNameLookup();
function getCardByName(name){if(!cardByNormalizedName.size)rebuildCardNameLookup();return CardService.getByName(CARDS,cardByNormalizedName,name,typeof canonicalImportName==="function"?canonicalImportName:null)}
function getCardArtworkByName(name){let c=getCardByName(name);return c?.thumbnailImageSources?.[0]||c?.fullImageSources?.[0]||""}
function getCardForSample(x){
 const exact=findCardBySetNumber(x?.set,x?.number);
 if(exact&&(!x?.name||normalizedCardName(exact.name)===normalizedCardName(x.name)))return exact;
 if(x?.cardId&&cardMap.has(x.cardId)){
   const c=cardMap.get(x.cardId);if(!x?.name||normalizedCardName(c.name)===normalizedCardName(x.name))return c;
 }
 return getCardByName(x?.name)||null;
}
function validateSampleDeck(a){
 const list=Array.isArray(a?.sampleDeck)?a.sampleDeck:[];
 const total=list.reduce((s,x)=>s+Number(x.quantity||0),0), byName={};
 list.forEach(x=>{let k=normalizedCardName(x.name);byName[k]=(byName[k]||0)+Number(x.quantity||0)});
 const copyErrors=Object.entries(byName).filter(([,q])=>q>2);
 return {total,valid:total===20&&!copyErrors.length,copyErrors};
}
function sampleCardHtml(x){
 const c=getCardForSample(x), q=Number(x.quantity||0);
 return `<div class="sampleCard"><div class="sampleArt">${c?imageTag(c,"thumb"):`<div class="cardplaceholder">${esc(x.name)}<br><span class="tiny muted">${esc(x.code||"")}</span></div>`}<span class="sampleQty">×${q}</span></div><strong>${esc(x.name)}</strong><span class="tiny muted">${esc(x.code||"")}</span></div>`;
}
function sampleDeckHtml(a){
 const list=a.sampleDeck||[]; if(!list.length)return `<p class="muted">Sample deck unavailable.</p>`;
 const v=validateSampleDeck(a), poke=list.filter(x=>String(x.category).toLowerCase().includes("pokemon")), trainers=list.filter(x=>!String(x.category).toLowerCase().includes("pokemon"));
 return `<div class="between"><span class="${v.valid?"ok":"bad"}">${v.total} / 20 Cards ${v.valid?"✓":"— Check list"}</span><span class="badge">${a.sourceType==="limitless-tournament-snapshot"?"Verified Limitless sample":"Verified tournament sample"}</span></div>
 <h3>Pokémon — ${poke.reduce((s,x)=>s+Number(x.quantity||0),0)}</h3><div class="sampleGrid">${poke.map(sampleCardHtml).join("")}</div>
 <h3>Trainers — ${trainers.reduce((s,x)=>s+Number(x.quantity||0),0)}</h3><div class="sampleGrid">${trainers.map(sampleCardHtml).join("")}</div>`;
}

function archetypeArtworkHtml(a){let c=getCardByName(a.pokemon[0]);return c?`<div class="archetypeArt">${imageTag(c,"thumb")}</div>`:`<div class="archetypeArt"><div class="cardplaceholder">${esc(a.pokemon[0])}<br><span class="muted tiny">Artwork unavailable</span></div></div>`}
function fmtMeta(v){return v==null?"—":Number(v).toFixed(2)+"%"}
function filteredArchetypes(){let p=state.archetypePrefs||{},q=document.getElementById("archSearch")?.value??p.query??"",type=document.getElementById("archType")?.value??p.type??"",tier=document.getElementById("archTier")?.value??p.tier??"",sort=document.getElementById("archSort")?.value??p.sort??"name";let a=ArchetypeService.searchArchetypes(q).filter(x=>(!type||x.type===type)&&(!tier||x.tier===tier));a.sort((x,y)=>sort==="usage"?(y.stats.usage??-1)-(x.stats.usage??-1)||x.name.localeCompare(y.name):sort==="winRate"?(y.stats.winRate??-1)-(x.stats.winRate??-1)||x.name.localeCompare(y.name):sort==="tier"?x.tier.localeCompare(y.tier)||x.name.localeCompare(y.name):x.name.localeCompare(y.name));state.archetypePrefs={...p,query:q,type,tier,sort};save();return a}
function setArchView(v){state.archetypePrefs.view=v;save();renderArchetypeBrowser()}
function renderArchetypeBrowser(){let root=document.getElementById("archetypeResults");if(!root)return;let a=filteredArchetypes(),list=state.archetypePrefs.view==="list";root.className=list?"archetypeList":"archetypeGrid";root.innerHTML=a.length?a.map(x=>`<article class="archetypeCard">${archetypeArtworkHtml(x)}<div class="archetypeBody"><div class="between"><span class="badge">${esc(x.tier)}</span><span class="pill">${esc(x.type)}</span></div><h3>${esc(x.name)}</h3>${x.sampleDeck?.length?`<div class="tiny ok">✓ Verified 20-card sample</div>`:`<div class="tiny muted">Sample unavailable</div>`}<div class="archStats"><div><span>Usage</span><strong>${fmtMeta(x.stats.usage)}</strong></div><div><span>Win Rate</span><strong>${fmtMeta(x.stats.winRate)}</strong></div></div><div class="row"><button onclick="openArchetype('${x.id}')">View Deck</button>${x.sampleDeck?.length?`<button class="secondary" onclick="event.stopPropagation();copyArchetypeDeckList('${x.id}')">Copy</button>`:""}</div></div></article>`).join(""):`<div class="panel"><p class="muted">No archetypes match these filters.</p></div>`}
function openArchetype(id){
 const a=ArchetypeService.getArchetype(id);if(!a)return;const c=getCardByName(a.pokemon[0]),sample=a.sampleDeck||[],v=validateSampleDeck(a),src=a.sampleSource||{},d=a.btmKey?MetaSnapshotService.getDeck(a.btmKey):null,personal=d?MetaSnapshotService.personalRecord(d.name):{n:0,w:0,l:0,wr:0};
 const matchups=d?MetaSnapshotService.getMatchups().filter(x=>x.sourceKey===d.key&&x.total>=10).sort((x,y)=>y.total-x.total):[];
 const cards=d?[...d.cardTable].sort((x,y)=>y.inclusionPct-x.inclusionPct).slice(0,10):[];
 const finishes=d?(d.bestFinishes||[]).slice(0,8):[];
 document.getElementById("app").innerHTML=`<button class="secondary" onclick="metaPage()">← Meta Center</button>
 <div class="panel archetypeDetail"><div>${c?imageTag(c,"full"):`<div class="cardplaceholder" style="min-height:360px">${esc(a.pokemon[0])}<br>Artwork unavailable</div>`}</div><div>
 <div class="row"><span class="badge">${esc(a.tier)}</span>${d?`<span class="pill">Rank #${d.rank}</span>${rankMovementHtml(d)}`:""}</div><h1>${esc(a.name)}</h1>
 <div class="metricgrid"><div class="metric"><div class="l">Type</div><div class="n" style="font-size:18px">${esc(a.type)}</div></div><div class="metric"><div class="l">Top Cut Share</div><div class="n">${d?pct1(d.topCutShare):fmtMeta(a.stats.usage)}</div></div><div class="metric"><div class="l">Global Win Rate</div><div class="n">${d?pct1(d.winRate):fmtMeta(a.stats.winRate)}</div></div><div class="metric"><div class="l">Global Matches</div><div class="n">${d?d.record.matches:"—"}</div></div><div class="metric"><div class="l">My Record</div><div class="n">${personal.n?personal.w+"-"+personal.l:"—"}</div></div><div class="metric"><div class="l">My Win Rate</div><div class="n">${personal.n?personal.wr.toFixed(1)+"%":"—"}</div></div></div>
 <h2>Key Pokémon</h2><div class="row">${a.pokemon.map(n=>`<span class="pill">${esc(n)}</span>`).join("")}</div>
 ${d?`<p class="muted tiny">Global record ${d.record.wins}-${d.record.losses}-${d.record.draws} • ${d.samples.selected} selected samples • Score ${Number(d.score).toFixed(3)}</p>`:""}</div></div>
 <div class="panel"><div class="between"><div><h2>Verified Sample Deck</h2><p class="muted">${sample.length?`Tournament sample: ${esc(src.player||"")} • ${esc(src.placement||"")} • ${esc(src.tournamentName||"")}`:"No verified sample list available."}</p></div>${sample.length&&v.valid?`<div class="row"><button onclick="copyArchetypeDeck('${a.id}')">Open in Deck Builder</button><button class="secondary" onclick="copyArchetypeDeckList('${a.id}')">Copy Deck List</button></div>`:""}</div>${sampleDeckHtml(a)}</div>
 ${cards.length?`<div class="panel"><h2>Core Card Usage</h2><div class="cardUsageList">${cards.map(x=>{const card=findCardBySetNumber(x.set,x.number)||getCardByName(x.name);return `<div class="cardUsageRow"><div class="usageThumb">${card?imageTag(card,"thumb"):`<div class="cardplaceholder">${esc(x.name)}</div>`}</div><div><strong>${esc(x.name)}</strong><div class="muted tiny">${esc(x.code)}</div></div><div><span class="muted tiny">Inclusion</span><strong>${Number(x.inclusionPct).toFixed(1)}%</strong></div><div><span class="muted tiny">Avg Copies</span><strong>${Number(x.avgCopies).toFixed(2)}</strong></div></div>`}).join("")}</div></div>`:""}
 ${matchups.length?`<div class="panel"><h2>Major Matchups</h2><div class="matchupCards">${matchups.slice(0,10).map(m=>{const t=MetaSnapshotService.getDeck(m.targetKey);return `<div class="matchupCard"><span>${esc(t?.name||m.targetName)}</span><strong class="${m.winRate>=.55?"good":m.winRate<=.45?"bad":""}">${(m.winRate*100).toFixed(1)}%</strong><small>${m.wins}-${m.losses}-${m.draws} • ${m.total}</small></div>`}).join("")}</div></div>`:""}
 ${finishes.length?`<div class="panel"><h2>Best Finishes</h2>${finishes.map(f=>`<div class="tourneyCard"><div class="between"><div><strong>#${f.place} ${esc(f.player)}</strong><div class="muted tiny">${esc(f.tournamentName)} • ${esc(f.dateLabel)} • ${f.players} players</div></div><span class="pill">${esc(f.placeLabel)}</span></div></div>`).join("")}</div>`:""}
 <div class="bottomnote">Source: ${esc(a.source)}${a.lastUpdated?` • Snapshot ${esc(String(a.lastUpdated).slice(0,10))}`:""} • No live API request is required.</div>`;
}

function archetypeDeckText(a){
 const list=Array.isArray(a?.sampleDeck)?a.sampleDeck:[];
 if(!list.length)return "";
 const header=[
  `# ${a.name}`,
  `# Source: ${a.source||"PocketNexus"}`,
  a.sampleSource?.tournamentName?`# Tournament: ${a.sampleSource.tournamentName}`:"",
  a.sampleSource?.player?`# Player: ${a.sampleSource.player}`:"",
  ""
 ].filter((x,i)=>x!==""||i===4);
 const lines=list.map(x=>{
   const code=x.code||((x.set&&x.number)?`${x.set}-${x.number}`:"");
   return `${Number(x.quantity||1)} ${x.name}${code?` [${code}]`:""}`;
 });
 return header.concat(lines).join("\n");
}
function copyFallbackDialog(text,title="Copy this text"){
 PPCUI.open({eyebrow:"COPY",title,html:`<textarea rows="10" readonly onclick="this.select()">${esc(text)}</textarea><p class="muted tiny">Select the text and press Ctrl+C / Cmd+C.</p>`,actions:[{label:"Done",onclick:"PPCUI.close()"}]});
}
function copyTextSafe(text,success="Copied."){
 if(!text)return ppcNotice("Nothing to copy.");
 if(navigator.clipboard?.writeText){
   navigator.clipboard.writeText(text).then(()=>ppcNotice(success),()=>copyFallbackDialog(text));
 }else copyFallbackDialog(text);
}
function copyArchetypeDeckList(id){
 const a=ArchetypeService.getArchetype(id);if(!a||!a.sampleDeck?.length)return ppcNotice("No sample deck is available.");
 copyTextSafe(archetypeDeckText(a),"Deck list copied.");
}
function exportUserDeckText(deck){
 if(!deck)return "";
 const entries=Object.entries(deck.cards||{}).map(([id,qty])=>({c:card(id),qty:Number(qty||0)})).filter(x=>x.c&&x.qty>0);
 return [`# ${deck.name}`,""].concat(entries.map(x=>`${x.qty} ${x.c.name} [${x.c.setCode}-${x.c.number}]`)).join("\n");
}
function normalizeImportLine(line){
 return String(line||"")
  .replace(/\u00d7/g,"x")
  .replace(/[•·]/g," ")
  .trim();
}
function parseDeckText(text){
 const rows=[],errors=[];
 String(text||"").split(/\r?\n/).forEach((raw,idx)=>{
   let line=normalizeImportLine(raw);
   if(!line||/^#/.test(line)||/^(pokemon|pokémon|trainer|trainers|energy|deck|decklist)\s*[:\-]?$/i.test(line))return;
   line=line.replace(/^\s*[-*]\s*/,"");

   let qty=1,name="",set="",number="",code="";
   let m=line.match(/^(\d+)\s*[xX]?\s+(.+)$/);
   if(m){qty=Number(m[1]);line=m[2].trim()}
   else if((m=line.match(/^(.+?)\s+[xX]\s*(\d+)$/))){line=m[1].trim();qty=Number(m[2])}
   else if((m=line.match(/^(.+?)\s+(\d+)\s*[xX]$/))){line=m[1].trim();qty=Number(m[2])}

   // [A1-1], (A1 1), A1-1 at end, or "Name - A1 1"
   let cm=line.match(/\[([A-Za-z0-9-]+)-(\d+)\]\s*$/);
   if(cm){set=cm[1];number=cm[2];code=`${set}-${number}`;line=line.slice(0,cm.index).trim()}
   else if((cm=line.match(/\(([A-Za-z0-9-]+)\s*[-# ]\s*(\d+)\)\s*$/))){
     set=cm[1];number=cm[2];code=`${set}-${number}`;line=line.slice(0,cm.index).trim()
   } else if((cm=line.match(/\s+-\s+([A-Za-z0-9-]+)\s*[-# ]\s*(\d+)\s*$/))){
     set=cm[1];number=cm[2];code=`${set}-${number}`;line=line.slice(0,cm.index).trim()
   } else if((cm=line.match(/\s+([ABP]\d?[A-Za-z]?(?:-[AB])?|PROMO-[AB])-(\d+)\s*$/i))){
     set=cm[1];number=cm[2];code=`${set}-${number}`;line=line.slice(0,cm.index).trim()
   }

   name=line.replace(/\s{2,}/g," ").trim();
   if(!name){errors.push(`Line ${idx+1}: missing card name`);return}
   if(!Number.isFinite(qty)||qty<1){errors.push(`Line ${idx+1}: invalid quantity`);return}
   rows.push({line:idx+1,qty,name,set,number,code,raw});
 });
 return {rows,errors};
}
function importNameKey(n){
 return normalizedCardName(n);
}

const IMPORT_NAME_ALIASES={
 "professor research":"professor's research",
 "professors research":"professor's research",
 "research":"professor's research",
 "poke ball":"poké ball",
 "pokeball":"poké ball",
 "pokemon center lady":"pokémon center lady",
 "speed":"x speed",
 "x-speed":"x speed",
 "xspeed":"x speed",
 "x speed":"x speed"
};
function canonicalImportName(n){
 const k=importNameKey(n);
 return IMPORT_NAME_ALIASES[k]||k;
}
function importedNameMatches(requested,cardName){
 return canonicalImportName(requested)===canonicalImportName(cardName);
}

function resolveImportedCard(x){
 if(x.set&&x.number){
   const exact=findCardBySetNumber(x.set,x.number);
   if(exact && importedNameMatches(x.name,exact.name))return {card:exact,method:"set+number"};
 }
 const requested=canonicalImportName(x.name);
 const byName=getCardByName(requested)||getCardByName(x.name);
 if(byName && importedNameMatches(requested,byName.name)){
   const original=importNameKey(x.name);
   return {card:byName,method:original===requested?"exact-name":"alias"};
 }
 return {card:null,method:"unresolved"};
}
function analyzeImportedDeck(text){
 const parsed=parseDeckText(text),resolved=[],unresolved=[...parsed.errors],byName={},cards={};
 parsed.rows.forEach(x=>{
   const r=resolveImportedCard(x);
   if(!r.card){unresolved.push(`Line ${x.line}: ${x.qty} ${x.name}${x.code?` [${x.code}]`:""}`);return}
   resolved.push({...x,card:r.card,method:r.method});
   cards[r.card.id]=(cards[r.card.id]||0)+x.qty;
   const k=normalizedCardName(r.card.name);byName[k]=(byName[k]||0)+x.qty;
 });
 const total=resolved.reduce((s,x)=>s+x.qty,0);
 const copyViolations=Object.entries(byName).filter(([,q])=>q>2).map(([name,q])=>({name,q}));
 const pokemon=resolved.filter(x=>cardKind(x.card)==="Pokémon");
 const stageKnown=pokemon.some(x=>String(x.card?.stage||"").trim());
 const basicCount=pokemon.filter(x=>/basic/i.test(String(x.card?.stage||""))).reduce((n,x)=>n+x.qty,0);
 const structureViolations=[];
 if(stageKnown&&basicCount<1)structureViolations.push("Deck must contain at least one Basic Pokémon.");
 return {parsed,resolved,unresolved,total,copyViolations,structureViolations,basicCount,cards,valid:total===20&&!unresolved.length&&!copyViolations.length&&!structureViolations.length};
}

function testProfessorResearchLookup(){
 const variants=["Professor's Research","Professor’s Research","Professors Research","Professor Research"];
 return variants.map(v=>({input:v,match:getCardByName(v)?.name||null}));
}

async function importDeckModal(){
 const ready=await ensureCardDatabaseReady();
 if(!ready)return ppcNotice("The full Card Database could not be loaded. Retry the database before importing an external deck list.");
 document.getElementById("cardModalBody").innerHTML=`<div class="between"><div><h2>Paste / Import Deck</h2><p class="muted">Paste a 20-card Pocket list from another site or plain text. Common shorthand such as Speed/X-Speed and Poke Ball is normalized automatically.</p></div><button class="secondary" onclick="closeCardModal()">Close</button></div>
 <label>Deck Name</label><input id="importDeckName" value="Imported Deck">
 <label>Paste Deck List</label><textarea id="importDeckText" style="min-height:260px" placeholder="Examples:
2 Mega Lucario ex [B3-81]
2 Professor's Research
Poké Ball x2
1 Sabrina"></textarea>
 <div class="row" style="margin-top:10px"><button onclick="previewImportedDeck()">Analyze Deck</button><button class="secondary" onclick="loadImporterTestDeck()">Load Example</button><button class="secondary" onclick="document.getElementById('importDeckText').value=''">Clear</button></div>
 <div id="importDeckPreview" style="margin-top:12px"></div>`;
 document.getElementById("cardModal").style.display="flex";
}
function loadImporterTestDeck(){
 const el=document.getElementById("importDeckText");if(!el)return;
 el.value=`# Butterfree / Mega Sceptile ex
# Source: Limitless TCG
# Tournament: The Breakfast Club x Knowtice Blast Off-$10
# Player: LiquidHunter

2 Caterpie [B3b-1]
2 Metapod [B3b-2]
2 Butterfree [B3b-3]
1 Treecko [B3-5]
1 Grovyle [B3-6]
1 Mega Sceptile ex [B3-8]
2 Professor's Research
1 Erika
1 Copycat
1 Sabrina
1 Cyrus
2 Quick-Grow Extract
1 Leaf Cape
2 Fragrant Forest`;
 document.getElementById("importDeckName").value="Butterfree / Mega Sceptile ex";
 previewImportedDeck();
}

function previewImportedDeck(){
 const text=document.getElementById("importDeckText")?.value||"",a=analyzeImportedDeck(text),root=document.getElementById("importDeckPreview");if(!root)return;
 const pokeTotal=a.resolved.filter(x=>cardKind(x.card)==="Pokémon").reduce((s,x)=>s+x.qty,0);
 const trainerTotal=a.resolved.filter(x=>cardKind(x.card)==="Trainer").reduce((s,x)=>s+x.qty,0);
 root.innerHTML=`<div class="metricgrid"><div class="metric"><div class="l">Resolved Cards</div><div class="n">${a.total}/20</div></div><div class="metric"><div class="l">Pokémon</div><div class="n">${pokeTotal}</div></div><div class="metric"><div class="l">Trainers</div><div class="n">${trainerTotal}</div></div><div class="metric"><div class="l">Unresolved</div><div class="n">${a.unresolved.length}</div></div><div class="metric"><div class="l">Copy Violations</div><div class="n">${a.copyViolations.length}</div></div></div>
 ${a.resolved.length?`<div class="importResolved">${a.resolved.map(x=>`<div><span><strong>${x.qty}×</strong> ${esc(x.card.name)}${x.method==="alias"?` <span class="tiny good">(matched from ${esc(x.name)})</span>`:""}</span><span class="pill">${esc(x.card.setCode)}-${esc(x.card.number)} • ${x.method}</span></div>`).join("")}</div>`:""}
 ${a.unresolved.length?`<div class="dangerBox"><strong>Could not resolve:</strong>${a.unresolved.map(x=>`<div>• ${esc(x)}</div>`).join("")}</div>`:""}
 ${a.copyViolations.length?`<div class="dangerBox"><strong>More than 2 copies by card name:</strong>${a.copyViolations.map(x=>`<div>• ${esc(x.name)} ×${x.q}</div>`).join("")}</div>`:""}
 ${a.structureViolations?.length?`<div class="dangerBox"><strong>Deck structure:</strong>${a.structureViolations.map(x=>`<div>• ${esc(x)}</div>`).join("")}</div>`:""}
 ${a.total!==20?`<div class="dangerBox"><strong>Import blocked.</strong><br>Deck currently contains ${a.total}/20 resolved cards.<br><span class="tiny">Your currently selected deck has not been changed.</span></div>`:""}
 ${a.valid?`<div class="successBox"><strong>Deck is valid: 20/20 ✓</strong><div class="row" style="margin-top:10px"><button onclick="saveImportedDeck()">Import to My Decks</button></div></div>`:""}`;
}
function saveImportedDeck(){
 const text=document.getElementById("importDeckText")?.value||"",a=analyzeImportedDeck(text);if(!a.valid)return previewImportedDeck();
 let base=(document.getElementById("importDeckName")?.value||"Imported Deck").trim()||"Imported Deck",name=base,n=1;
 while(state.decks.some(d=>d.name===name)){name=`${base} Copy${n>1?" "+n:""}`;n++}
 const d={id:makeId(),name,archetype:"",energy:"",cards:a.cards,importedFrom:"paste"};
 state.decks.push(d);state.selected=d.id;state.page="decks";save();closeCardModal();render();
}

async function copyArchetypeDeck(id){
 let a=ArchetypeService.getArchetype(id);if(!a||!a.sampleDeck.length)return ppcNotice("Sample deck unavailable.");
 let v=validateSampleDeck(a);if(!v.valid)return ppcNotice(`This sample deck is not valid: ${v.total}/20 cards.`);
 let cards={},missing=[];
 a.sampleDeck.forEach(x=>{let c=getCardForSample(x);if(c)cards[c.id]=(cards[c.id]||0)+Number(x.quantity||1);else missing.push(`${x.code||""} ${x.name}`.trim())});
 if(missing.length)return ppcNotice("Could not match these cards to the Card Database:\n"+missing.join("\n")+"\n\nTip: open More → Diagnostics to inspect set-code mapping.");
 let base=a.name,name=base,n=1;while(state.decks.some(d=>d.name===name)){name=`${base} Copy${n>1?" "+n:""}`;n++}
 let d={id:makeId(),name,archetype:a.name,energy:a.type,cards,copiedFrom:{type:"battle-tower-meta",id:a.id},sourceSnapshot:a.lastUpdated||null};
 state.decks.push(d);state.selected=d.id;state.page="decks";save();render();
}
function limitlessSetCode(setCode){
 const s=String(setCode||"");
 if(/^PROMO-A$/i.test(s))return "P-A";
 if(/^PROMO-B$/i.test(s))return "P-B";
 return s;
}
function absoluteHttpUrl(value){return ImageService.absoluteHttpUrl(value)}
function imageFieldCandidates(raw){return ImageService.fields(raw)}
function buildLimitlessImageCandidates(setCode,number){
 const set=limitlessSetCode(setCode);
 const n=parseInt(number,10);
 if(!set || !Number.isFinite(n))return {thumb:[],full:[]};
 const p=String(n).padStart(3,"0");
 const root=`${LIMITLESS_IMAGE_BASE}/${encodeURIComponent(set)}/${encodeURIComponent(set)}_${p}_EN`;
 return {
   thumb:[`${root}_SM.webp`,`${root}.webp`,`${root}_SM.png`,`${root}.png`],
   full:[`${root}.webp`,`${root}_SM.webp`,`${root}.png`,`${root}_SM.png`]
 };
}
function uniqueUrls(list){return [...new Set((list||[]).filter(v=>typeof v==="string"&&/^https?:\/\//i.test(v)))];}
function imageFailover(img){return ImageService.failover(img)}
function imageTag(c,mode="thumb",extra=""){
 const sources=mode==="full"?(c.fullImageSources||[]):(c.thumbnailImageSources||[]);
 if(!sources.length)return `<div class="cardplaceholder">${esc(c.name)}<br><span class="muted tiny">Artwork unavailable</span></div>`;
 const safe=sources.map(x=>esc(x)).join("|");
 return `<img ${mode==="thumb"?'loading="lazy"':'loading="eager"'} decoding="async" src="${esc(sources[0])}" data-sources="${safe}" data-idx="0" alt="${esc(c.name)}" onerror="imageFailover(this)" ${extra}><div class="cardplaceholder" style="display:none">${esc(c.name)}<br><span class="muted tiny">Artwork unavailable</span></div>`;
}

function normalizedCardCategory(rawCategory,rawStage){
 const value=String(rawCategory||"").trim();
 const t=value.toLowerCase();
 if(/trainer|item|supporter|tool|stadium/.test(t))return "Trainer";
 if(/pokemon|pokémon/.test(t))return "Pokémon";
 if(rawStage!==undefined&&rawStage!==null&&String(rawStage).trim()!=="")return "Pokémon";
 return value;
}
function normalizedEvolutionStage(value,category){
 if(String(category||"").toLowerCase()==="trainer")return "";
 if(value===undefined||value===null)return "";
 const t=String(value).trim().toLowerCase();
 if(!t)return "";
 if(t==="basic"||t==="0"||t==="stage 0"||t==="stage0")return "Basic";
 if(t==="1"||t==="stage 1"||t==="stage1")return "Stage 1";
 if(t==="2"||t==="stage 2"||t==="stage2")return "Stage 2";
 return String(value).trim();
}
function normalize(raw,i){
 const setObj=raw.set&&typeof raw.set==="object"?raw.set:{};
 const setCode=raw.set_id||raw.setId||raw.set_code||raw.setCode||setObj.id||setObj.code||raw.expansion||(typeof raw.set==="string"?raw.set:"")||"";
 const number=raw.number||raw.card_number||raw.cardNumber||raw.id||i;
 const name=raw.name||raw.card_name||raw.cardName||raw.label?.eng||raw.label?.en||`Card ${i+1}`;
 const rawCategory=raw.type||raw.category||raw.card_type||raw.cardType||"";
 const rawStage=raw.stage??raw.evolution_stage??raw.evolutionStage??"";
 const category=normalizedCardCategory(rawCategory,rawStage);
 const stage=normalizedEvolutionStage(rawStage,category);
 const rarity=raw.rarity&&typeof raw.rarity==="object"?(raw.rarity.text||raw.rarity.symbol||""):(raw.rarity||raw.rarityCode||"");
 const pack=raw.pack||raw.pack_name||raw.packName||setObj.pack||raw.packs?.[0]||"";
 const setName=raw.set_name||raw.setName||setObj.name||String(setCode||"");
 const hp=raw.health||raw.hp||"";
 const id=`${slug(setCode)||"set"}-${slug(number)||i}-${slug(name)}`;

 // IMPORTANT: pokemon-tcg-pocket-database's raw.image is usually a FILENAME,
 // not a browser-loadable URL. Preserve it for diagnostics only.
 const rawImageName=typeof raw.image==="string"&&!/^https?:\/\//i.test(raw.image)?raw.image:(raw.imageName||"");
 const absolute=imageFieldCandidates(raw);
 const lim=buildLimitlessImageCandidates(setCode,number);

 // Grid: small Limitless image first, then any absolute dataset URL, then full art fallbacks.
 const thumbnailImageSources=uniqueUrls([...absolute,...lim.thumb,...lim.full]);
 // Detail popup: use any dataset-provided absolute URL first, then predictable Limitless full/small fallbacks.
 const fullImageSources=uniqueUrls([...absolute,...lim.full,...lim.thumb]);

 const thumbnailUrl=thumbnailImageSources[0]||"";
 const fullImageUrl=fullImageSources[0]||thumbnailUrl;
 // Legacy alias retained so old V5/V6 rendering code stays compatible.
 const image=thumbnailUrl;

 return {id,name,category,stage,rarity,image,thumbnailUrl,fullImageUrl,thumbnailImageSources,fullImageSources,rawImageName,pack,setCode:String(setCode||""),setName:String(setName||setCode||""),number:String(number??""),hp:String(hp||""),raw};
}
async function loadCards(force=false){
 if(cardsLoadedOnline&&!force)return true;
 if(cardLoadPromise&&!force)return cardLoadPromise;
 if(cardsRequested&&!force&&window.cardLoadMode==="fallback")return false;
 cardsRequested=true;window.cardLoadMode="loading";window.cardLoadError="";
 if(["decks","collection","trade","meta"].includes(state.page))try{render()}catch(e){}
 cardLoadPromise=(async()=>{
   const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12000);
   try{
     const res=await fetch(DATA_URL,{cache:"no-store",mode:"cors",signal:ctrl.signal});
     if(!res.ok)throw new Error(`Card database request failed (${res.status})`);
     const data=await res.json();let arr=[];
     if(Array.isArray(data))arr=data;
     else if(Array.isArray(data?.cards))arr=data.cards;
     else if(data&&typeof data==="object"){
       const vals=Object.values(data);arr=vals.flatMap(v=>Array.isArray(v)?v:(v&&Array.isArray(v.cards)?v.cards:[]));
     }
     if(!arr.length)throw new Error("No cards found in dataset");
     writeCardCache(arr);
     CARDS=arr.map(normalize);cardMap=new Map(CARDS.map(c=>[c.id,c]));rebuildCardNameLookup();
     // V8.51.9: keep the original cards.json as the canonical deck/card source so
     // saved deck IDs, artwork lookup, and deck UI remain stable. Enrich only the
     // metadata fields used by Collection filters from cards.extra.json.
     try{
       const metaRes=await fetch(CARD_METADATA_URL,{cache:"no-store",mode:"cors",signal:ctrl.signal});
       if(metaRes.ok){
         const metaData=await metaRes.json();let metaArr=[];
         if(Array.isArray(metaData))metaArr=metaData;
         else if(Array.isArray(metaData?.cards))metaArr=metaData.cards;
         else if(metaData&&typeof metaData==="object"){
           const vals=Object.values(metaData);metaArr=vals.flatMap(v=>Array.isArray(v)?v:(v&&Array.isArray(v.cards)?v.cards:[]));
         }
         const metaMap=new Map();
         for(let mi=0;mi<metaArr.length;mi++){
           const mr=metaArr[mi]||{},setObj=mr.set&&typeof mr.set==="object"?mr.set:{};
           const mSet=String(mr.set_id||mr.setId||mr.set_code||mr.setCode||setObj.id||setObj.code||mr.expansion||(typeof mr.set==="string"?mr.set:"")||"").trim().toLowerCase();
           const mNum=String(mr.number||mr.card_number||mr.cardNumber||mr.id||"").trim().toLowerCase();
           const mName=normalizedCardName(mr.name||mr.card_name||mr.cardName||mr.label?.eng||mr.label?.en||"");
           if(mSet&&mNum)metaMap.set(`sn:${mSet}|${mNum}`,mr);
           if(mName)metaMap.set(`n:${mName}`,mr);
         }
         CARDS=CARDS.map(c=>{
           const key=`sn:${String(c.setCode||"").trim().toLowerCase()}|${String(c.number||"").trim().toLowerCase()}`;
           const mr=metaMap.get(key)||metaMap.get(`n:${normalizedCardName(c.name)}`);
           if(!mr)return c;
           const rawCategory=mr.type||mr.category||mr.card_type||mr.cardType||c.category||"";
           const rawStage=mr.stage??mr.evolution_stage??mr.evolutionStage??c.stage??"";
           return {...c,category:normalizedCardCategory(rawCategory,rawStage)||c.category,stage:normalizedEvolutionStage(rawStage,rawCategory)||c.stage};
         });
         cardMap=new Map(CARDS.map(c=>[c.id,c]));rebuildCardNameLookup();
       }
     }catch(metaError){console.warn("Collection metadata enrichment unavailable; core card/deck data preserved.",metaError)}
     repairDeckCardReferences();
     cardsLoadedOnline=true;window.cardLoadMode="online";window.cardLoadError="";
     if(["decks","collection","trade","meta"].includes(state.page))render();
     return true;
   }catch(e){
     window.cardLoadError=e?.name==="AbortError"?"Card database request timed out after 12 seconds.":(e?.message||String(e));
     const cached=readCardCache();
     if(cached?.length){CARDS=cached.map(normalize);cardMap=new Map(CARDS.map(c=>[c.id,c]));rebuildCardNameLookup();repairDeckCardReferences();window.cardLoadMode="cached";window.cardLoadError="Live card database unavailable — using the last saved local card catalog.";cardsLoadedOnline=false;}
     else{window.cardLoadMode="fallback";cardsLoadedOnline=false;}
     if(["decks","collection","trade","meta"].includes(state.page))render();
     return false;
   }finally{clearTimeout(timer);cardLoadPromise=null}
 })();
 return cardLoadPromise;
}
async function ensureCardDatabaseReady(){
 if(cardsLoadedOnline)return true;
 const ok=await loadCards(false);return !!ok;
}
function retryCardDatabase(){cardsRequested=false;cardLoadPromise=null;return loadCards(true)}
function repairDeckCardReferences(){
 let changed=false;
 for(const d of state.decks||[]){
   const next={};
   for(const [id,q0] of Object.entries(d.cards||{})){
     const q=Number(q0)||0;if(q<=0)continue;
     let target=id;
     if(!cardMap.has(id)){
       const name=BUNDLED_ID_TO_NAME.get(id)||LEGACY_NAMES[id]||"";
       const found=name?getCardByName(name):null;if(found)target=found.id;
     }
     next[target]=(next[target]||0)+q;if(target!==id)changed=true;
   }
   d.cards=next;
 }
 if(changed)safeStorageSet(STORE,JSON.stringify(state));
 return changed;
}

function card(id){
 if(cardMap.has(id)) return cardMap.get(id);
 const knownName=BUNDLED_ID_TO_NAME.get(id)||LEGACY_NAMES[id]||(String(id).startsWith("fallback-")?BUNDLED_ID_TO_NAME.get(id):"");
 if(knownName){const found=getCardByName(knownName);if(found)return found;return unresolvedCard(id,knownName)}
 return unresolvedCard(id);
}
function deckItems(d){return Object.entries(d.cards||{}).filter(([,q])=>Number(q)>0).map(([id,q])=>({card:card(id),qty:Number(q),id}))}
function deckCount(d){return deckItems(d).reduce((n,x)=>n+x.qty,0)}
function nameCount(d,name){const k=normalizedCardName(name);return deckItems(d).filter(x=>normalizedCardName(x.card.name)===k).reduce((n,x)=>n+x.qty,0)}
function stats(){const c=completedMatches();let w=c.filter(m=>m.result==="win").length,l=c.filter(m=>m.result==="loss").length,t=w+l;return{w,l,t,wr:t?w/t*100:0}}
function analyze(d){
 let it=deckItems(d),total=deckCount(d),basics=it.filter(x=>/basic/i.test(x.card.stage)).reduce((n,x)=>n+x.qty,0),trainers=it.filter(x=>/trainer|item|supporter|tool|stadium/i.test(x.card.category+" "+x.card.stage)).reduce((n,x)=>n+x.qty,0),score=40;
 if(total===20)score+=25;else score-=Math.min(20,Math.abs(20-total)*4);if(basics)score+=15;else score-=15;if(trainers>=6)score+=10;if(new Set(it.map(x=>x.card.name)).size>=8)score+=10;return Math.max(0,Math.min(100,score))
}
function issues(d){
 let o=[],it=deckItems(d),total=deckCount(d),basics=it.filter(x=>/basic/i.test(x.card.stage)).reduce((n,x)=>n+x.qty,0);
 if(total!==20)o.push(`Deck has ${total}/20 cards.`);
 if(!basics)o.push("Deck needs at least one Basic Pokémon.");
 const names={};it.forEach(x=>{const k=normalizedCardName(x.card.name);names[k]=names[k]||{name:x.card.name,q:0};names[k].q+=x.qty});Object.values(names).filter(x=>x.q>2).forEach(x=>o.push(`${x.name} has ${x.q} copies across prints; max is 2.`));return o
}
function goPage(page){state.page=page;render()}
function ppcNotice(message,options){if(window.PPCUI?.notice)return window.PPCUI.notice(String(message??""),options||{title:"PocketNexus"});console.info("PocketNexus:",message);return false}
// Navigation moved to js/core/navigation-v8.33.js in V8.33.

// ============================================================
// V8.10.3 — Global Search / Command Palette
// Search pages, tools, analytics, decks, cards, archetypes,
// opponents, and sessions from one place. Ctrl/Cmd + K opens it.
// ============================================================
let globalSearchSelected=0;
let globalSearchCardLoadStarted=false;
const GLOBAL_SEARCH_RECENT_KEY="ppc_global_search_recent";

const GLOBAL_SEARCH_FEATURES=[
 {title:"Home Dashboard",category:"Pages",description:"Overview, recent matches, saved decks, rank, and live meta.",page:"dashboard",keywords:"home dashboard overview recent matches quick tools"},
 {title:"Deck Lab",category:"Pages",description:"Build, import, edit, duplicate, and analyze decks.",page:"decks",keywords:"deck builder cards import decklist build"},
 {title:"New Deck",category:"Actions",description:"Create a new deck in Deck Lab.",action:"newDeck",keywords:"create build new deck"},
 {title:"Collection",category:"Pages",description:"Track owned, missing, wanted, and tradeable cards.",page:"collection",keywords:"collection cards owned missing wishlist want tradeable"},
 {title:"Simulation Lab",category:"Pages",description:"Test deck draw consistency and simulation readiness.",page:"optimizer",keywords:"simulation simulator optimizer consistency draws"},
 {title:"Pocket Coach",category:"Pages",description:"Ask grounded questions about your decks, matches, Meta, rank, collection, and simulations.",page:"coach",keywords:"ai assistant chatbot coach advice meta deck rank"},
 {title:"Battle Tracker",category:"Pages",description:"Record wins, losses, rank changes, turn order, and notes.",page:"matches",keywords:"battle match tracker win loss record game ranked"},
 {title:"Record Match",category:"Actions",description:"Jump directly to the Battle Tracker.",page:"matches",keywords:"record win loss battle game"},
 {title:"Performance Overview",category:"Analytics",description:"Win rate, record, streaks, recent form, and trends.",page:"stats",statsTab:"overview",keywords:"statistics performance overview win rate record streak"},
 {title:"Coaching Insights",category:"Analytics",description:"Automatic takeaways from your recorded matches.",page:"stats",statsTab:"coaching",keywords:"insights strongest deck hardest matchup rp leak improvement coaching"},
 {title:"Actionable Coaching",category:"Analytics",description:"See what to focus on next from deck, matchup, turn-order, recent-form, and RP data.",page:"stats",statsTab:"coaching",keywords:"coaching focus next recommendation practice deck matchup turn order recent form rp"},
 {title:"Deck Performance + RP",category:"Analytics",description:"Compare each deck's record, win rate, and ranked-point results.",page:"stats",statsTab:"decks",keywords:"deck performance rp ranked points win rate"},
 {title:"Opponent Matchups",category:"Analytics",description:"See your record against each opposing archetype.",page:"stats",statsTab:"intelligence",keywords:"matchups opponent record matrix"},
 {title:"Matchup Report",category:"Analytics",description:"Best matchups, hardest matchups, Net RP, and sample filters.",page:"stats",statsTab:"intelligence",keywords:"best hardest matchup intelligence rp leak report"},
 {title:"Turn Order Analysis",category:"Analytics",description:"Compare going first versus going second.",page:"stats",statsTab:"overview",keywords:"first second turn order analysis"},
 {title:"RP Progression",category:"Analytics",description:"Graph your ranked points over tracked matches.",page:"stats",statsTab:"rank",keywords:"rp progression rank graph climb points"},
 {title:"Session Analytics",category:"Analytics",description:"Compare performance across tracked play sessions.",page:"stats",statsTab:"overview",keywords:"sessions grind tournament practice analytics"},
 {title:"Win Rate Trends",category:"Analytics",description:"View win-rate and performance changes over time.",page:"stats",statsTab:"overview",keywords:"trend win rate over time improvement graph"},
 {title:"Meta Center",category:"Meta",description:"Live competitive archetypes, tournament data, and matchup stats.",page:"meta",keywords:"meta live tournament decks archetypes limitless"},
 {title:"Meta Archetypes",category:"Meta",description:"Browse competitive archetypes and verified samples.",page:"meta",metaTab:"archetypes",keywords:"archetypes meta decks tier"},
 {title:"Top Meta Decks",category:"Meta",description:"See the leading decks in the current competitive window.",page:"meta",metaTab:"decks",keywords:"top decks meta ranking usage"},
 {title:"Meta Matchups",category:"Meta",description:"Competitive archetype-versus-archetype matchup data.",page:"meta",metaTab:"matchups",keywords:"meta matchups matrix win rate"},
 {title:"Tournament Leaderboards",category:"Pages",description:"Placings, decks, event snapshots, and Pairing Lab scouting.",page:"tournaments",keywords:"tournaments leaderboard standings events players decks limitless"},
 {title:"My Meta Results",category:"Meta",description:"Compare your personal results against the competitive field.",page:"meta",metaTab:"mine",keywords:"my results personal meta record"},
 {title:"Rank Border Intelligence",category:"Rank",description:"Top 100 / 1K / 5K / 10K ranked-border forecasts and safe targets.",page:"rank",keywords:"rank border prediction forecast top 100 top 1k 5k 10k rp"},
 {title:"Trade Center",category:"Pages",description:"See cards you have available and cards you want.",page:"trade",keywords:"trade have want cards"},
 {title:"What’s This Card?",category:"Training",description:"Daily five-guess card artwork challenge and competitive training hub.",page:"training",keywords:"whats this card daily puzzle brain teaser training artwork guess"},
 {title:"Profiles",category:"Social",description:"Public competitive profiles, achievements, stats, and deck showcases.",page:"profile",keywords:"profile public player stats achievements badges showcase username"},
 {title:"Team Wars",category:"Social",description:"Team ladder, ranked queue, rosters, public teams, seasons, and war history.",page:"teamwars",keywords:"team wars ranked queue rating rp roster public team season league"},
 {title:"Pocket Sync",category:"Utilities",description:"V8.59 source readiness for Collection, Rank, and Battle History automation.",page:"sync",keywords:"pocket sync collection automatic import rank rp battle history nintendo"},
 {title:"Streamer Control Center",category:"Pages",description:"Control OBS overlays, stream sessions, rank, record, and matchups.",page:"streamer",keywords:"streamer obs overlay browser source twitch stream"},
 {title:"Account & Cloud Sync",category:"Settings",description:"Sign in, cloud-sync data, and manage your account.",page:"account",keywords:"account login cloud sync supabase profile"},
 {title:"Diagnostics & Backup",category:"Settings",description:"Run diagnostics, backup data, restore, and export Battle Tracker logs.",page:"more",keywords:"diagnostics backup restore export json csv settings"},
 {title:"Theme Picker",category:"Settings",description:"Switch between Dark, Light, Light Blue, and Pink themes.",action:"theme",keywords:"theme appearance dark light blue pink colors"}
];

function globalSearchNormalize(v){return String(v||"").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g," ").trim()}
function globalSearchRecent(){try{return JSON.parse(localStorage.getItem(GLOBAL_SEARCH_RECENT_KEY)||"[]").filter(Boolean).slice(0,5)}catch(e){return[]}}
function globalSearchSaveRecent(q){q=String(q||"").trim();if(!q)return;const next=[q,...globalSearchRecent().filter(x=>x.toLowerCase()!==q.toLowerCase())].slice(0,5);try{localStorage.setItem(GLOBAL_SEARCH_RECENT_KEY,JSON.stringify(next))}catch(e){}}
function globalSearchScore(item,q){
 const n=globalSearchNormalize(q);if(!n)return 1;
 const title=globalSearchNormalize(item.title),desc=globalSearchNormalize(item.description),keys=globalSearchNormalize(item.keywords),cat=globalSearchNormalize(item.category);
 const tokens=n.split(/\s+/).filter(Boolean);let score=0;
 if(title===n)score+=120;if(title.startsWith(n))score+=80;if(title.includes(n))score+=55;if(keys.includes(n))score+=30;if(desc.includes(n))score+=20;if(cat.includes(n))score+=8;
 for(const t of tokens){if(title.split(" ").some(w=>w.startsWith(t)))score+=18;else if(title.includes(t))score+=12;if(keys.includes(t))score+=7;if(desc.includes(t))score+=3}
 return tokens.every(t=>(title+" "+keys+" "+desc+" "+cat).includes(t))?score:0;
}
function globalSearchDynamicItems(q){
 const items=[];
 for(const d of state.decks||[])items.push({title:d.name||"Untitled Deck",category:"Your Decks",description:`${deckCount(d)}/20 cards • ${isDeckLegal(d)?"Legal":"Needs work"}`,keywords:`deck ${d.name||""} ${d.energy||""}`,action:"deck",id:d.id});
 const arch=ArchetypeService?.getArchetypes?.()||[];
 for(const a of arch)items.push({title:a.name,category:"Archetypes",description:`${a.type||""}${a.tier?` • Tier ${a.tier}`:""}`,keywords:[a.shortName,a.type,a.tier,...(a.pokemon||[])].filter(Boolean).join(" "),action:"archetype",id:a.id});
 const seenOpp=new Set();for(const m of completedMatches().slice().reverse()){const name=String(m.opponentArchetype||m.opponent||"").trim();if(!name||name==="Unknown"||seenOpp.has(name.toLowerCase()))continue;seenOpp.add(name.toLowerCase());items.push({title:name,category:"Your Opponents",description:"Open your matchup analytics for this opponent.",keywords:`opponent matchup battle ${name}`,action:"opponent",id:name});if(seenOpp.size>=30)break}
 for(const s of (state.sessions||[]).slice().reverse().slice(0,20)){const name=String(s.name||"Battle Session");items.push({title:name,category:"Sessions",description:s.end?"Completed Battle Tracker session":"Active Battle Tracker session",keywords:`session ${name}`,action:"session",id:s.id});}
 const nq=globalSearchNormalize(q);
 if(nq.length>=2){
  for(const c of CARDS){const hay=globalSearchNormalize(`${c.name} ${c.category||""} ${c.stage||""} ${c.setCode||""} ${c.setName||""} ${c.number||""}`);if(!hay.includes(nq)&&!nq.split(" ").every(t=>hay.includes(t)))continue;items.push({title:c.name,category:"Cards",description:[c.category,c.stage,c.setCode&&`${c.setCode}-${c.number}`].filter(Boolean).join(" • "),keywords:hay,action:"card",id:c.id});if(items.filter(x=>x.category==="Cards").length>=30)break}
 }
 return items;
}
function globalSearchResults(q){
 let items=[...GLOBAL_SEARCH_FEATURES,...globalSearchDynamicItems(q)];
 const scored=items.map((item,i)=>({item,score:globalSearchScore(item,q),i})).filter(x=>q?x.score>0:x.item.category==="Pages"||x.item.category==="Analytics").sort((a,b)=>b.score-a.score||a.i-b.i);
 const seen=new Set(),out=[];for(const x of scored){const k=`${x.item.category}|${x.item.title}|${x.item.id||x.item.page||x.item.action||""}`;if(seen.has(k))continue;seen.add(k);out.push(x.item);if(out.length>=18)break}return out;
}
function globalSearchIcon(category){return {Pages:"▦",Actions:"＋",Analytics:"▥",Meta:"◆",Rank:"▲",Settings:"⚙","Your Decks":"▤",Archetypes:"◇",Cards:"▣","Your Opponents":"◉",Sessions:"◷"}[category]||"•"}
function globalSearchRender(){
 const input=document.getElementById("globalSearchInput");if(!input)return;const q=input.value.trim(),results=globalSearchResults(q);globalSearchSelected=Math.max(0,Math.min(globalSearchSelected,Math.max(0,results.length-1)));
 const root=document.getElementById("globalSearchResults");if(!root)return;
 if(!q){const recent=globalSearchRecent();root.innerHTML=`${recent.length?`<div class="globalSearchSectionLabel">Recent searches</div><div class="globalRecentChips">${recent.map(x=>`<button onclick="globalSearchUseRecent('${esc(x).replaceAll("'","&#39;")}')">${esc(x)}</button>`).join("")}</div>`:""}<div class="globalSearchSectionLabel">Quick access</div>${results.slice(0,10).map((x,i)=>globalSearchResultHtml(x,i)).join("")}`;return}
 root.innerHTML=results.length?results.map((x,i)=>globalSearchResultHtml(x,i)).join(""):`<div class="globalSearchEmpty"><strong>No results for “${esc(q)}”</strong><span>Try a page, feature, deck, card, archetype, matchup, or analytics term.</span></div>`;
}
function globalSearchResultHtml(item,i){return `<button class="globalSearchResult ${i===globalSearchSelected?"selected":""}" data-global-result="${i}" onclick="globalSearchExecute(${i})"><span class="globalSearchResultIcon">${globalSearchIcon(item.category)}</span><span class="globalSearchResultText"><strong>${esc(item.title)}</strong><small>${esc(item.description||"")}</small></span><span class="globalSearchCategory">${esc(item.category)}</span></button>`}
function openGlobalSearch(prefill=""){
 if(!state.user&&!cloudSession?.user)return;
 closeGlobalSearch();const wrap=document.createElement("div");wrap.id="globalSearchOverlay";wrap.className="globalSearchOverlay";wrap.innerHTML=`<div class="globalSearchBackdrop" onclick="closeGlobalSearch()"></div><section class="globalSearchPanel" role="dialog" aria-modal="true" aria-label="Search everything"><div class="globalSearchInputRow"><span>⌕</span><input id="globalSearchInput" autocomplete="off" placeholder="Search everything…" value="${esc(prefill)}" oninput="globalSearchInputChanged()"><kbd>Esc</kbd></div><div class="globalSearchHint">Pages · tools · analytics · decks · cards · archetypes · matchups · sessions</div><div id="globalSearchResults" class="globalSearchResults"></div><footer><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Ctrl K</kbd> search</span></footer></section>`;document.body.appendChild(wrap);globalSearchSelected=0;globalSearchRender();setTimeout(()=>{const i=document.getElementById("globalSearchInput");i?.focus();i?.select()},0);
}
function closeGlobalSearch(){document.getElementById("globalSearchOverlay")?.remove()}
function globalSearchUseRecent(q){const i=document.getElementById("globalSearchInput");if(!i)return;i.value=q;globalSearchSelected=0;globalSearchRender();i.focus()}
function globalSearchInputChanged(){globalSearchSelected=0;const q=document.getElementById("globalSearchInput")?.value||"";globalSearchRender();if(q.trim().length>=2&&!cardsRequested&&!globalSearchCardLoadStarted){globalSearchCardLoadStarted=true;Promise.resolve(loadCards()).catch(()=>{}).finally(()=>{globalSearchCardLoadStarted=false;if(document.getElementById("globalSearchInput"))globalSearchRender()})}}
function globalSearchMove(delta){const q=document.getElementById("globalSearchInput")?.value||"",r=globalSearchResults(q);if(!r.length)return;globalSearchSelected=(globalSearchSelected+delta+r.length)%r.length;globalSearchRender();document.querySelector(`[data-global-result="${globalSearchSelected}"]`)?.scrollIntoView({block:"nearest"})}
function globalSearchExecute(index){
 const input=document.getElementById("globalSearchInput"),q=input?.value||"",item=globalSearchResults(q)[Number(index)];if(!item)return;globalSearchSaveRecent(q||item.title);closeGlobalSearch();
 if(item.action==="newDeck"){state.page="decks";render();return setTimeout(()=>newDeck(),0)}
 if(item.action==="theme"){document.getElementById("themeControl")?.querySelector("button")?.click();return}
 if(item.action==="deck"){state.page="decks";render();return setTimeout(()=>openDeck(item.id),0)}
 if(item.action==="card"){if(!cardsRequested)loadCards().then(()=>openCardModal(item.id)).catch(()=>{});else openCardModal(item.id);return}
 if(item.action==="archetype"){state.page="meta";render();return setTimeout(()=>openArchetype(item.id),0)}
 if(item.action==="opponent"){state.page="stats";state.battlePrefs.statsTab="intelligence";save();render();return}
 if(item.action==="session"){state.page="stats";state.battlePrefs.statsTab="sessions";save();render();return}
 if(item.statsTab){state.battlePrefs.statsTab=item.statsTab;state.page="stats";save();render();return}
 if(item.metaTab){state.meta=state.meta||{};state.meta.tab=item.metaTab;state.page="meta";save();render();return}
 if(item.page){state.page=item.page;save();render()}
}
document.addEventListener("keydown",e=>{
 const open=document.getElementById("globalSearchOverlay");
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();open?closeGlobalSearch():openGlobalSearch();return}
 if(!open)return;
 if(e.key==="Escape"){e.preventDefault();closeGlobalSearch();return}
 if(e.key==="ArrowDown"){e.preventDefault();globalSearchMove(1);return}
 if(e.key==="ArrowUp"){e.preventDefault();globalSearchMove(-1);return}
 if(e.key==="Enter"){e.preventDefault();globalSearchExecute(globalSearchSelected)}
});

function entryMessage(msg,bad=false){
 const el=document.getElementById("entryMessage");
 if(!el)return;
 el.className=bad?"dangerBox":"successBox";
 el.textContent=msg||"";
}
function ppcAuthRedirectUrl(){
 if(location.protocol!=="http:"&&location.protocol!=="https:")return "";
 if(location.hostname==="beta.pocketnexus.app")return "https://beta.pocketnexus.app/";
 if(location.hostname==="pocketnexus.app"||location.hostname==="www.pocketnexus.app")return "https://pocketnexus.app/";
 if(window.PPCMobile?.authRedirectUrl)return window.PPCMobile.authRedirectUrl();
 return location.origin+location.pathname;
}
function cleanupAuthReturnUrl(){
 try{const u=new URL(location.href),keys=["code","error","error_code","error_description","access_token","refresh_token","token_type","expires_in"];let changed=false;keys.forEach(k=>{if(u.searchParams.has(k)){u.searchParams.delete(k);changed=true}});if(/access_token|refresh_token/i.test(u.hash||"")){u.hash="";changed=true}if(changed)history.replaceState(history.state,"",u.pathname+(u.searchParams.toString()?`?${u.searchParams}`:"")+u.hash)}catch{}
}
function setEntryBusy(busy,label="Signing in…"){
 const buttons=[...document.querySelectorAll("[data-entry-action]")];
 buttons.forEach(b=>{b.disabled=!!busy;b.setAttribute("aria-busy",busy?"true":"false")});
 const btn=document.querySelector('[data-entry-action="email-signin"]');
 if(btn){if(!btn.dataset.idleLabel)btn.dataset.idleLabel=btn.textContent;btn.textContent=busy?label:(btn.dataset.idleLabel||"Sign in")}
}
async function ensureCloudClientReady(timeoutMs=3500){
 if(cloudClient)return cloudClient;
 const started=Date.now();
 while(!window.supabase?.createClient&&Date.now()-started<timeoutMs){await new Promise(r=>setTimeout(r,80))}
 if(!window.supabase?.createClient)return null;
 initCloudAuth();
 return cloudClient;
}
async function applyEntrySession(session){
 if(!session?.user)return false;
 cleanupAuthReturnUrl();
 cloudSession=session;
 if(state.user&&state.user!=="Guest"&&state.sessionMode!=="cloud")state.localProfileName=state.user;
 state.user=session.user.email||"Account";
 state.sessionMode="cloud";
 state.page="dashboard";
 safeStorageSet(STORE,JSON.stringify(state));
 render();
 return true;
}

async function entryGoogleSignIn(){
 const redirectTo=ppcAuthRedirectUrl();
 if(!redirectTo)return entryMessage("Google sign-in needs the hosted website (http/https). Email/password still works in the local browser test.",true);
 if(!cloudConfigured())return entryMessage("Google sign-in is not connected yet.",true);
 setEntryBusy(true,"Opening Google…");
 try{
   const client=await ensureCloudClientReady();
   if(!client)return entryMessage("The account service could not load. Check your connection and try again.",true);
   const {error}=await client.auth.signInWithOAuth({provider:"google",options:{redirectTo}});
   if(error)entryMessage(error.message,true);
 }catch(e){entryMessage(e?.message||"Google sign-in could not start.",true)}finally{setEntryBusy(false)}
}
async function entryAppleSignIn(){
 const redirectTo=ppcAuthRedirectUrl();
 if(!redirectTo)return entryMessage("Apple sign-in needs the hosted website (http/https). Email/password still works in the local browser test.",true);
 if(!cloudConfigured())return entryMessage("Apple sign-in is not connected yet.",true);
 setEntryBusy(true,"Opening Apple…");
 try{
   const client=await ensureCloudClientReady();
   if(!client)return entryMessage("The account service could not load. Check your connection and try again.",true);
   const {error}=await client.auth.signInWithOAuth({provider:"apple",options:{redirectTo}});
   if(error)entryMessage(error.message,true);
 }catch(e){entryMessage(e?.message||"Apple sign-in could not start.",true)}finally{setEntryBusy(false)}
}
function handleEntryAction(action){
 if(action==="guest")return continueAsGuest();
 if(action==="google")return entryGoogleSignIn();
 if(action==="apple")return entryAppleSignIn();
 if(action==="email-signin")return entryEmailSignIn();
 if(action==="forgot")return entryForgotPassword();
 if(action==="register")return entryRegister();
}
document.addEventListener("click",e=>{
 const btn=e.target.closest?.("[data-entry-action]");
 if(!btn)return;
 e.preventDefault();
 e.stopPropagation();
 handleEntryAction(btn.dataset.entryAction);
});

function continueAsGuest(){
 state.user="Guest";
 state.sessionMode="guest";
 state.page="dashboard";
 save();
 render();
}
async function entryEmailSignIn(){
 const email=(document.getElementById("entryEmail")?.value||"").trim().toLowerCase();
 const password=document.getElementById("entryPassword")?.value||"";
 if(!email||!password)return entryMessage("Enter your email and password.",true);
 if(!cloudConfigured())return entryMessage("Cloud sign-in is not connected yet.",true);
 setEntryBusy(true);
 entryMessage("Checking your account…");
 try{
   const client=await ensureCloudClientReady();
   if(!client)return entryMessage("The account service could not load. Check your connection and try again.",true);
   const {data,error}=await client.auth.signInWithPassword({email,password});
   if(error)return entryMessage(error.message,true);
   if(data?.session){await applyEntrySession(data.session);return}
   entryMessage("Signed in. Loading your account…");
 }catch(e){entryMessage(e?.message||"Could not sign in. Try again.",true)}finally{setEntryBusy(false)}
}
async function entryRegister(){
 const email=(document.getElementById("entryEmail")?.value||"").trim().toLowerCase();
 const password=document.getElementById("entryPassword")?.value||"";
 if(!email||password.length<8)return entryMessage("Enter an email and a password of at least 8 characters.",true);
 if(!cloudConfigured())return entryMessage("Cloud registration is not connected yet.",true);
 setEntryBusy(true,"Creating account…");
 try{
   const client=await ensureCloudClientReady();
   if(!client)return entryMessage("The account service could not load. Check your connection and try again.",true);
   const redirectTo=ppcAuthRedirectUrl();
   const options=redirectTo?{emailRedirectTo:redirectTo}:undefined;
   const {data,error}=await client.auth.signUp({email,password,options});
   if(error)return entryMessage(error.message,true);
   if(data?.session){await applyEntrySession(data.session);return}
   entryMessage("Account created. Check your email to confirm your address, then sign in.");
 }catch(e){entryMessage(e?.message||"Could not create the account.",true)}finally{setEntryBusy(false)}
}
async function entryForgotPassword(){
 const email=(document.getElementById("entryEmail")?.value||"").trim().toLowerCase();
 if(!email)return entryMessage("Enter your email first.",true);
 const redirectTo=ppcAuthRedirectUrl();
 if(!redirectTo)return entryMessage("Password recovery links need the hosted website (http/https), not the local file test.",true);
 setEntryBusy(true,"Sending reset…");
 try{
   const client=await ensureCloudClientReady();
   if(!client)return entryMessage("The account service could not load. Check your connection and try again.",true);
   const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo});
   entryMessage(error?error.message:"Password reset email sent. Open the newest message from Supabase.",!!error);
 }catch(e){entryMessage(e?.message||"Could not send the reset email.",true)}finally{setEntryBusy(false)}
}
function entryScreen(){
 const root=document.getElementById("app");if(!root)return;
 root.innerHTML=`<div class="foundationEntryShell">
  <section class="foundationEntryStory" aria-label="PocketNexus overview">
   <div class="foundationEntryBrand"><span class="pocketBallMark" aria-hidden="true"><i></i></span><span>POCKETNEXUS</span></div>
   <h1>Your Pocket game plan, in one place.</h1>
   <p>Build 20-card decks, track real battles, understand the competitive field, and turn your own results into better decisions.</p>
   <div class="entryFeatureGrid">
    <article><span>PLAY</span><strong>Battle + Rank</strong><small>Fast match logging and ranked progress.</small></article>
    <article><span>BUILD</span><strong>Decks + Collection</strong><small>Know what you can build and what you're missing.</small></article>
    <article><span>COMPETE</span><strong>Meta + Tournaments</strong><small>Scout the field and prepare your deck pair.</small></article>
    <article><span>IMPROVE</span><strong>Performance</strong><small>Use your own matches for coaching and matchup reads.</small></article>
   </div>
   <p class="entryIndependent">Independent third-party companion • Not affiliated with The Pokémon Company</p>
  </section>
  <section class="entryCard foundationEntryCard">
   <span class="eyebrow">WELCOME</span><h2>Sign in or play locally</h2><p class="muted">Guest mode works immediately. Sign in when you want supported cloud sync.</p>
   <button class="oauthBtn googleBtn" type="button" data-entry-action="google"><span class="oauthIcon">G</span><span>Continue with Google</span></button>
   <button class="oauthBtn appleBtn" type="button" data-entry-action="apple"><span class="oauthIcon">●</span><span>Sign in with Apple</span></button>
   <div class="entryDivider"><span>or</span></div>
   <label for="entryEmail" class="entryFieldLabel">Email address</label><input id="entryEmail" type="email" placeholder="you@example.com" autocomplete="email" inputmode="email">
   <label for="entryPassword" class="entryFieldLabel">Password</label><input id="entryPassword" type="password" placeholder="Password" autocomplete="current-password" onkeydown="if(event.key==='Enter'){event.preventDefault();entryEmailSignIn()}">
   <button class="entrySignIn" type="button" data-entry-action="email-signin">Sign in</button>
   <div class="entryLinkRow"><button class="entryLink" type="button" data-entry-action="forgot">Forgot password?</button><button class="entryLink" type="button" data-entry-action="register">Create account</button></div>
   <div class="entryDivider"><span>or</span></div>
   <button class="guestBtn" type="button" data-entry-action="guest">Continue as guest</button>
   <p class="entryNote">Your local data stays in this browser unless you explicitly use cloud sync.</p>${location.protocol==="file:"?`<div class="entryLocalAuthNote"><strong>Local test:</strong> email/password works here; Google, Apple, confirmation links, and password recovery require the hosted site.</div>`:""}<div id="entryMessage" role="status" aria-live="polite"></div>
  </section>
 </div>`;
}

function runtimeErrorScreen(error,pageName=state.page){
 console.error("PocketNexus render error",pageName,error);
 const root=document.getElementById("app");if(!root)return;
 root.innerHTML=`<div class="panel runtimeError" style="max-width:760px;margin:30px auto"><span class="badge">Runtime Recovery</span><h1>This page hit an error</h1><p class="muted">Your saved data was not deleted. The error was contained instead of blanking the whole app.</p><div class="dangerBox"><strong>${esc(pageName||"page")}</strong><br>${esc(error?.message||String(error))}</div><div class="row" style="margin-top:12px"><button onclick="state.page='dashboard';render()">Go Home</button><button class="secondary" onclick="render()">Retry Page</button><button class="secondary" onclick="runFullDiagnostics()">Run Diagnostics</button></div></div>`;
}
function render(){
 try{
   state.page=VALID_PAGES.has(state.page)?state.page:"dashboard";
   nav();
   if(!state.user&&!cloudSession?.user)return entryScreen();
   if(["decks","collection","trade"].includes(state.page)&&!cardsRequested)loadCards();
   const pages={dashboard,decks,collection:collectionPage,optimizer:optimizerPage,matches,stats:statsPage,meta:metaPage,tournaments:window.tournamentsPage||dashboard,rank:rankBorderPage,trade:tradePage,streamer:streamerPage,coach:window.pocketCoachPage||dashboard,training:window.trainingPage||dashboard,profile:window.profilePage||accountPage,teamwars:window.teamWarsPage||dashboard,sync:window.pocketSyncPage||accountPage,account:accountPage,about:aboutPage,more:morePage};
   (pages[state.page]||dashboard)();
   const pageRoot=document.getElementById('app');
   if(pageRoot){pageRoot.classList.remove('ppcPageEnter');void pageRoot.offsetWidth;pageRoot.classList.add('ppcPageEnter');}
   if(state.user||cloudSession?.user)setTimeout(()=>{onboardingMaybeShow();setTimeout(()=>window.PPCWhatsNew?.maybeShow?.(),90)},0);
 }catch(e){runtimeErrorScreen(e,state.page)}
}
function auth(){
 const root=document.getElementById("app");if(!root)return;
 root.innerHTML=`<div class="panel" style="max-width:520px;margin:50px auto"><span class="badge">LOCAL PROFILE</span><h1>Welcome</h1><p class="muted">Create a local profile to enter PocketNexus. Your Supabase account can be connected later from Account.</p>${!storageAvailable?`<div class="dangerBox"><strong>Browser storage is blocked.</strong><br>The app can still open, but changes may not persist after you close this page. Hosting the site on GitHub Pages is recommended.</div>`:""}<label>Local Profile Name</label><input id="name" placeholder="Username" autocomplete="nickname"><button onclick="login()">Continue to PocketNexus</button><p class="muted tiny" style="margin-top:12px">Already used this app before? Your existing local data is loaded automatically when browser storage is available.</p></div>`;
}
function login(){let n=document.getElementById("name").value.trim();if(!n)return ppcNotice("Enter a username.");state.user=n;state.page="dashboard";save();render()}
function logout(){return signOutEverywhere()}
