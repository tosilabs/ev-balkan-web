const CACHE='udhembare-shell-v2';
const SHELL=['./','./index.html','./styles.css?v=2.1','./app.mjs?v=2.1','./core.mjs?v=2.1','./services.mjs?v=2.1','./cities.mjs?v=2.1','./details.mjs?v=2.1','./photos.mjs?v=2.1','./sources-ui.mjs?v=2.1','./operating.mjs?v=2.1','./terrain.mjs?v=2.1','./terrain-ui.mjs?v=2.1','./history.mjs?v=2.1','./travel.mjs?v=2.1','./basemap.mjs?v=2.1','./weather.mjs?v=2.1','./weather-ui.mjs?v=2.1','./storage.mjs?v=2.1','./mini-map.mjs?v=2.1','./providers.json','./icon.svg?v=2.1','./manifest.webmanifest'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('udhembare-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
// Cache the shell and the public regional registry, never personal searches or map tiles.
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  const registry=url.pathname===new URL('./data/charging-balkans.json',self.registration.scope).pathname;
  if(!registry&&!SHELL.some(path=>new URL(path,self.registration.scope).pathname===url.pathname))return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}
    return response;
  }).catch(()=>caches.match(event.request)));
});
