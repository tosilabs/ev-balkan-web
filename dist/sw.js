const CACHE='udhembare-shell-v8';
const SHELL=['./key-vault.mjs?v=3.3','./key-vault-ui.mjs?v=3.3','./driving.mjs?v=3.3','./driving-core.mjs?v=3.3','./driving.css?v=3.3','./','./index.html','./styles.css?v=3.3','./app.mjs?v=3.3','./core.mjs?v=3.3','./services.mjs?v=3.3','./cities.mjs?v=3.3','./details.mjs?v=3.3','./photos.mjs?v=3.3','./sources-ui.mjs?v=3.3','./operating.mjs?v=3.3','./terrain.mjs?v=3.3','./terrain-ui.mjs?v=3.3','./history.mjs?v=3.3','./travel.mjs?v=3.3','./basemap.mjs?v=3.3','./weather.mjs?v=3.3','./weather-ui.mjs?v=3.3','./storage.mjs?v=3.3','./mini-map.mjs?v=3.3','./location.mjs?v=3.3','./interface.mjs?v=3.3','./journey-ui.mjs?v=3.3','./journey.css?v=3.3','./alerts.mjs?v=3.3','./energy.mjs?v=3.3','./planner.mjs?v=3.3','./roads.mjs?v=3.3','./offline.mjs?v=3.3','./registry.mjs?v=3.3','./community.mjs?v=3.3','./query.mjs?v=3.3','./providers.json','./icon.svg?v=3.3','./manifest.webmanifest'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('udhembare-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
// Cache the shell and the public regional registry, never personal searches or map tiles.
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  const registry=url.pathname===new URL('./data/charging-balkans.json',self.registration.scope).pathname;
  const regional=url.pathname.startsWith(new URL('./data/tiles/',self.registration.scope).pathname)||['registry-index.json','community.json'].some(name=>url.pathname===new URL('./data/'+name,self.registration.scope).pathname);
  if(!registry&&!regional&&!SHELL.some(path=>new URL(path,self.registration.scope).pathname===url.pathname))return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(async cache=>{await cache.put(event.request,copy);if(regional&&url.pathname.includes('/data/tiles/')){const keys=(await cache.keys()).filter(request=>new URL(request.url).pathname.includes('/data/tiles/'));await Promise.all(keys.slice(0,Math.max(0,keys.length-120)).map(key=>cache.delete(key)));}}).catch(()=>{}));}
    return response;
  }).catch(()=>caches.match(event.request)));
});
