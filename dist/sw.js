const CACHE='udhembare-shell-v10';
const SHELL=['./traffic-core.mjs?v=3.5','./traffic.mjs?v=3.5','./navigation-core.mjs?v=3.5','./navigation-map.mjs?v=3.5','./navigation.mjs?v=3.5','./navigation.css?v=3.5','./key-vault.mjs?v=3.5','./key-vault-ui.mjs?v=3.5','./driving.mjs?v=3.5','./driving-core.mjs?v=3.5','./driving.css?v=3.5','./','./index.html','./styles.css?v=3.5','./app.mjs?v=3.5','./core.mjs?v=3.5','./services.mjs?v=3.5','./cities.mjs?v=3.5','./details.mjs?v=3.5','./photos.mjs?v=3.5','./sources-ui.mjs?v=3.5','./operating.mjs?v=3.5','./terrain.mjs?v=3.5','./terrain-ui.mjs?v=3.5','./history.mjs?v=3.5','./travel.mjs?v=3.5','./basemap.mjs?v=3.5','./weather.mjs?v=3.5','./weather-ui.mjs?v=3.5','./storage.mjs?v=3.5','./mini-map.mjs?v=3.5','./location.mjs?v=3.5','./interface.mjs?v=3.5','./journey-ui.mjs?v=3.5','./journey.css?v=3.5','./alerts.mjs?v=3.5','./energy.mjs?v=3.5','./planner.mjs?v=3.5','./roads.mjs?v=3.5','./offline.mjs?v=3.5','./registry.mjs?v=3.5','./community.mjs?v=3.5','./query.mjs?v=3.5','./providers.json','./icon.svg?v=3.5','./manifest.webmanifest'];
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
