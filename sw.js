/* PocketNexus V8.67.5 — deployment freshness + safe offline caching */
const VERSION='v8.67.5-autoupdate1';
const SHELL_CACHE=`pocket-companion-shell-${VERSION}`;
const RUNTIME_CACHE=`pocket-companion-runtime-${VERSION}`;
const DATA_CACHE=`pocket-companion-data-${VERSION}`;
const ART_CACHE=`pocket-companion-art-${VERSION}`;

// Do not precache index.html. Navigations should always try the deployed HTML first.
// Offline fallback remains available without pinning an old app shell forever.
const APP_SHELL=[
 './offline.html','./privacy.html','./terms.html','./support.html','./manifest.webmanifest',
 './icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'
];

const CARD_DATA_HOST='cdn.jsdelivr.net';
const ART_HOSTS=new Set(['limitlesstcg.nyc3.cdn.digitaloceanspaces.com']);

async function trim(cacheName,max){
  const c=await caches.open(cacheName),keys=await c.keys();
  if(keys.length>max)await Promise.all(keys.slice(0,keys.length-max).map(k=>c.delete(k)));
}

async function freshFetch(req){
  // cache:no-store prevents the browser HTTP cache from hiding a freshly deployed
  // GitHub Pages asset behind an older local response.
  return fetch(req,{cache:'no-store'});
}

async function staleWhileRevalidate(req,cacheName,max=80){
  const c=await caches.open(cacheName);
  const cached=await c.match(req);
  const fresh=freshFetch(req).then(res=>{
    if(res&&res.ok){c.put(req,res.clone());trim(cacheName,max);}
    return res;
  }).catch(()=>null);
  return cached||await fresh||Response.error();
}

async function cacheFirst(req,cacheName,max=180){
  const c=await caches.open(cacheName),cached=await c.match(req);
  if(cached)return cached;
  try{
    const res=await freshFetch(req);
    if(res&&res.ok){c.put(req,res.clone());trim(cacheName,max);}
    return res;
  }catch{return Response.error();}
}

async function networkFirst(req,cacheName=RUNTIME_CACHE){
  const c=await caches.open(cacheName);
  try{
    const res=await freshFetch(req);
    if(res&&res.ok)await c.put(req,res.clone());
    return res;
  }catch{
    return await c.match(req)||await caches.match(req,{ignoreSearch:false})||Response.error();
  }
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(SHELL_CACHE);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys
      .filter(k=>k.startsWith('pocket-companion-')&&![SHELL_CACHE,RUNTIME_CACHE,DATA_CACHE,ART_CACHE].includes(k))
      .map(k=>caches.delete(k)));
    await self.clients.claim();
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    clients.forEach(client=>client.postMessage({type:'POCKETNEXUS_SW_ACTIVATED',version:VERSION}));
  })());
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
  if(event.data?.type==='GET_VERSION')event.source?.postMessage?.({type:'POCKETNEXUS_SW_VERSION',version:VERSION});
  if(event.data?.type==='CLEAR_OLD_CACHES'){
    event.waitUntil(caches.keys().then(keys=>Promise.all(keys
      .filter(k=>k.startsWith('pocket-companion-')&&![SHELL_CACHE,RUNTIME_CACHE,DATA_CACHE,ART_CACHE].includes(k))
      .map(k=>caches.delete(k)))));
  }
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

  // HTML + JavaScript are deployment-critical: always ask the network first and
  // bypass the browser HTTP cache. This keeps markup and handlers on the same build.
  if(req.mode==='navigate'||req.destination==='script'){
    event.respondWith((async()=>{
      const res=await networkFirst(req);
      if(res&&res.ok)return res;
      if(req.mode==='navigate')return await caches.match('./offline.html')||res;
      return res;
    })());
    return;
  }

  // CSS also uses network-first now. The previous stale-while-revalidate strategy
  // was fast, but it intentionally showed one old render before refreshing.
  if(req.destination==='style'){
    event.respondWith(networkFirst(req));
    return;
  }

  // Other same-origin assets can remain cache-friendly.
  event.respondWith(caches.match(req,{ignoreSearch:false}).then(cached=>cached||freshFetch(req).then(res=>{
    if(res&&res.ok)caches.open(RUNTIME_CACHE).then(c=>{c.put(req,res.clone());trim(RUNTIME_CACHE,120);});
    return res;
  }).catch(()=>Response.error())));
});
