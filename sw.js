/* Pocket Companion V8.64.0 — closed beta validation service worker */
const VERSION='v8.64.0';
const SHELL_CACHE=`pocket-companion-shell-${VERSION}`;
const RUNTIME_CACHE=`pocket-companion-runtime-${VERSION}`;
const DATA_CACHE=`pocket-companion-data-${VERSION}`;
const ART_CACHE=`pocket-companion-art-${VERSION}`;
const APP_SHELL=[
 './','./index.html','./offline.html','./privacy.html','./terms.html','./support.html','./manifest.webmanifest',
 './css/app.css','./css/base.css','./css/navigation.css','./css/responsive.css','./css/responsive-v8.50.9.css','./css/styles.css','./css/tokens.css',
 './icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png',
 './js/services/storage-service.js','./js/services/card-service.js','./js/services/image-service.js','./js/services/ui-service.js','./js/services/theme-service.js',
 './js/data/meta-data.js','./js/data/meta-content.js','./js/services/meta-service.js','./js/services/tournament-service.js','./js/services/rank-border-service.js','./js/services/rank-session-service.js',
 './js/features/ui-dialogs.js','./js/features/whats-new-v8.33.js','./js/features/tournament-leaderboards-v8.31.js','./js/app/bootstrap.js','./js/core/navigation-v8.33.js',
 './js/app/home.js','./js/app/decks_meta.js','./js/app/collection.js','./js/app/performance.js','./js/app/battle_gym.js','./js/app/streamer_rank_tools.js','./js/app/ai_coach.js','./js/app/profile_teamwars.js','./js/app/training.js',
 './js/services/pocket-sync-adapter-service.js','./js/services/pocket-sync-orchestrator-service.js','./js/app/pocket_sync.js','./js/features/experience-v8.36.js','./js/features/battle-streamer-v8.43.js','./js/app/account_startup.js','./js/features/expansion-v8.49.js','./js/features/stability-v8.50.js','./js/app/pwa.js'
];
const CARD_DATA_HOST='cdn.jsdelivr.net';
const ART_HOSTS=new Set(['limitlesstcg.nyc3.cdn.digitaloceanspaces.com']);
async function trim(cacheName,max){const c=await caches.open(cacheName),keys=await c.keys();if(keys.length>max)await Promise.all(keys.slice(0,keys.length-max).map(k=>c.delete(k)));}
async function staleWhileRevalidate(req,cacheName){const c=await caches.open(cacheName),cached=await c.match(req);const fresh=fetch(req).then(res=>{if(res&&res.ok){c.put(req,res.clone());trim(cacheName,cacheName===ART_CACHE?180:12);}return res;}).catch(()=>null);return cached||await fresh||Response.error();}
async function cacheFirst(req,cacheName){const c=await caches.open(cacheName),cached=await c.match(req);if(cached)return cached;try{const res=await fetch(req);if(res&&res.ok){c.put(req,res.clone());trim(cacheName,180);}return res;}catch{return Response.error();}}
self.addEventListener('install',e=>e.waitUntil(caches.open(SHELL_CACHE).then(c=>c.addAll(APP_SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('pocket-companion-')&&![SHELL_CACHE,RUNTIME_CACHE,DATA_CACHE,ART_CACHE].includes(k)).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);
 if(url.hostname===CARD_DATA_HOST && /pokemon-tcg-pocket-database\/dist\/cards(?:\.extra)?\.json$/.test(url.pathname)){event.respondWith(staleWhileRevalidate(req,DATA_CACHE));return;}
 if(ART_HOSTS.has(url.hostname) && req.destination==='image'){event.respondWith(cacheFirst(req,ART_CACHE));return;}
 if(url.origin!==self.location.origin)return;
 if(req.mode==='navigate'){event.respondWith(fetch(req).then(res=>{if(res.ok)caches.open(RUNTIME_CACHE).then(c=>c.put(req,res.clone()));return res;}).catch(async()=>await caches.match(req)||await caches.match('./index.html')||caches.match('./offline.html')));return;}
 event.respondWith(caches.match(req,{ignoreSearch:true}).then(cached=>cached||fetch(req).then(res=>{if(res.ok)caches.open(RUNTIME_CACHE).then(c=>c.put(req,res.clone()));return res;}).catch(()=>Response.error())));
});
