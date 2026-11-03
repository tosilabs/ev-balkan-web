const CACHE='udhembare-shell-v7';
const SHELL=['./driving.mjs?v=3.2','./driving-core.mjs?v=3.2','./driving.css?v=3.2','./','./index.html','./styles.css?v=3.2','./app.mjs?v=3.2','./core.mjs?v=3.2','./services.mjs?v=3.2','./cities.mjs?v=3.2','./details.mjs?v=3.2','./photos.mjs?v=3.2','./sources-ui.mjs?v=3.2','./operating.mjs?v=3.2','./terrain.mjs?v=3.2','./terrain-ui.mjs?v=3.2','./history.mjs?v=3.2','./travel.mjs?v=3.2','./basemap.mjs?v=3.2','./weather.mjs?v=3.2','./weather-ui.mjs?v=3.2','./storage.mjs?v=3.2','./mini-map.mjs?v=3.2','./location.mjs?v=3.2','./interface.mjs?v=3.2','./journey-ui.mjs?v=3.2','./journey.css?v=3.2','./alerts.mjs?v=3.2','./energy.mjs?v=3.2','./planner.mjs?v=3.2','./roads.mjs?v=3.2','./offline.mjs?v=3.2','./registry.mjs?v=3.2','./community.mjs?v=3.2','./query.mjs?v=3.2','./providers.json','./icon.svg?v=3.2','./manifest.webmanifest'];
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
