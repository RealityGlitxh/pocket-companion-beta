/* PocketNexus V8.64.1 Hotfix 12 — fast cached assets + background update */
const VERSION='v8.64.1-hotfix12';
const SHELL_CACHE=`pocket-companion-shell-${VERSION}`;
const RUNTIME_CACHE=`pocket-companion-runtime-${VERSION}`;
const DATA_CACHE=`pocket-companion-data-${VERSION}`;
const ART_CACHE=`pocket-companion-art-${VERSION}`;

// Keep the install shell intentionally small. Heavy app JS/CSS is cached at runtime
// so a service-worker update does not re-download the entire application up front.
const APP_SHELL=[
 './','./index.html','./offline.html','./privacy.html','./terms.html','./support.html','./manifest.webmanifest',
 './icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'
];

const CARD_DATA_HOST='cdn.jsdelivr.net';
const ART_HOSTS=new Set(['limitlesstcg.nyc3.cdn.digitaloceanspaces.com']);

async function trim(cacheName,max){
 const c=await caches.open(cacheName),keys=await c.keys();
 if(keys.length>max)await Promise.all(keys.slice(0,keys.length-max).map(k=>c.delete(k)));
}

async function staleWhileRevalidate(req,cacheName,max=80){
 const c=await caches.open(cacheName);
 const cached=await c.match(req);
 const fresh=fetch(req).then(res=>{
   if(res&&res.ok){c.put(req,res.clone());trim(cacheName,max);}
   return res;
 }).catch(()=>null);
 return cached||await fresh||Response.error();
}

async function cacheFirst(req,cacheName,max=180){
 const c=await caches.open(cacheName),cached=await c.match(req);
 if(cached)return cached;
 try{
   const res=await fetch(req);
   if(res&&res.ok){c.put(req,res.clone());trim(cacheName,max);}
   return res;
 }catch{return Response.error();}
}

async function networkFirst(req){
 const c=await caches.open(RUNTIME_CACHE);
 try{
   const res=await fetch(req,{cache:'no-store'});
   if(res&&res.ok)c.put(req,res.clone());
   return res;
 }catch{
   return await c.match(req)||await caches.match(req,{ignoreSearch:true})||Response.error();
 }
}

self.addEventListener('install',e=>e.waitUntil(
 caches.open(SHELL_CACHE).then(c=>c.addAll(APP_SHELL)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',e=>e.waitUntil(Promise.all([
 caches.keys().then(keys=>Promise.all(keys
   .filter(k=>k.startsWith('pocket-companion-')&&![SHELL_CACHE,RUNTIME_CACHE,DATA_CACHE,ART_CACHE].includes(k))
   .map(k=>caches.delete(k)))),
 self.clients.claim()
])));

self.addEventListener('message',e=>{
 if(e.data?.type==='SKIP_WAITING')self.skipWaiting();
});

self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET')return;
 const url=new URL(req.url);

 if(url.hostname===CARD_DATA_HOST && /pokemon-tcg-pocket-database\/dist\/cards(?:\.extra)?\.json$/.test(url.pathname)){
   event.respondWith(staleWhileRevalidate(req,DATA_CACHE,12));
   return;
 }

 if(ART_HOSTS.has(url.hostname) && req.destination==='image'){
   event.respondWith(cacheFirst(req,ART_CACHE,180));
   return;
 }

 if(url.origin!==self.location.origin)return;

 // HTML stays network-first so deployments are discovered quickly.
 if(req.mode==='navigate'){
   event.respondWith(networkFirst(req).catch(async()=>await caches.match('./index.html')||caches.match('./offline.html')));
   return;
 }

 // JS/CSS should feel instant on repeat visits. Serve cache immediately and
 // refresh it in the background for the next navigation.
 if(req.destination==='script'||req.destination==='style'){
   event.respondWith(staleWhileRevalidate(req,RUNTIME_CACHE,120));
   return;
 }

 event.respondWith(caches.match(req,{ignoreSearch:true}).then(cached=>cached||fetch(req).then(res=>{
   if(res&&res.ok)caches.open(RUNTIME_CACHE).then(c=>{c.put(req,res.clone());trim(RUNTIME_CACHE,120);});
   return res;
 }).catch(()=>Response.error())));
});
