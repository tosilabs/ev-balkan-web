const CACHE='udhembare-shell-v9';
const SHELL=['./navigation-core.mjs?v=3.4','./navigation-map.mjs?v=3.4','./navigation.mjs?v=3.4','./navigation.css?v=3.4','./key-vault.mjs?v=3.4','./key-vault-ui.mjs?v=3.4','./driving.mjs?v=3.4','./driving-core.mjs?v=3.4','./driving.css?v=3.4','./','./index.html','./styles.css?v=3.4','./app.mjs?v=3.4','./core.mjs?v=3.4','./services.mjs?v=3.4','./cities.mjs?v=3.4','./details.mjs?v=3.4','./photos.mjs?v=3.4','./sources-ui.mjs?v=3.4','./operating.mjs?v=3.4','./terrain.mjs?v=3.4','./terrain-ui.mjs?v=3.4','./history.mjs?v=3.4','./travel.mjs?v=3.4','./basemap.mjs?v=3.4','./weather.mjs?v=3.4','./weather-ui.mjs?v=3.4','./storage.mjs?v=3.4','./mini-map.mjs?v=3.4','./location.mjs?v=3.4','./interface.mjs?v=3.4','./journey-ui.mjs?v=3.4','./journey.css?v=3.4','./alerts.mjs?v=3.4','./energy.mjs?v=3.4','./planner.mjs?v=3.4','./roads.mjs?v=3.4','./offline.mjs?v=3.4','./registry.mjs?v=3.4','./community.mjs?v=3.4','./query.mjs?v=3.4','./providers.json','./icon.svg?v=3.4','./manifest.webmanifest'];
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
