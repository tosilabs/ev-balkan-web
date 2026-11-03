const CACHE='udhembare-shell-v4';
const SHELL=['./','./index.html','./styles.css?v=3.0','./app.mjs?v=3.0','./core.mjs?v=3.0','./services.mjs?v=3.0','./cities.mjs?v=3.0','./details.mjs?v=3.0','./photos.mjs?v=3.0','./sources-ui.mjs?v=3.0','./operating.mjs?v=3.0','./terrain.mjs?v=3.0','./terrain-ui.mjs?v=3.0','./history.mjs?v=3.0','./travel.mjs?v=3.0','./basemap.mjs?v=3.0','./weather.mjs?v=3.0','./weather-ui.mjs?v=3.0','./storage.mjs?v=3.0','./mini-map.mjs?v=3.0','./location.mjs?v=3.0','./journey-ui.mjs?v=3.0','./journey.css?v=3.0','./energy.mjs?v=3.0','./planner.mjs?v=3.0','./roads.mjs?v=3.0','./offline.mjs?v=3.0','./registry.mjs?v=3.0','./community.mjs?v=3.0','./query.mjs?v=3.0','./providers.json','./icon.svg?v=3.0','./manifest.webmanifest'];
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
    if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}
    return response;
  }).catch(()=>caches.match(event.request)));
});
