const CACHE='ev-balkan-shell-v9';
const SHELL=['./','./index.html','./styles.css?v=1.7','./app.mjs?v=1.7','./core.mjs?v=1.7','./services.mjs?v=1.7','./cities.mjs?v=1.7','./details.mjs?v=1.7','./photos.mjs?v=1.7','./sources-ui.mjs?v=1.7','./operating.mjs?v=1.7','./terrain.mjs?v=1.7','./terrain-ui.mjs?v=1.7','./history.mjs?v=1.7','./providers.json','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('ev-balkan-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
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
