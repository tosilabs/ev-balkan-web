export function initBasemap(map,L){
 const raster=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',className:'quiet-raster'}).addTo(map);
 if(!globalThis.maplibregl||!L.maplibreGL||!globalThis.maplibregl.supported())return raster;
 let vector,timer,ready=false;
 const fallback=()=>{if(ready)return;clearTimeout(timer);if(vector&&map.hasLayer(vector))map.removeLayer(vector);};
 try{
  vector=L.maplibreGL({style:'https://tiles.openfreemap.org/styles/positron',interactive:false,attributionControl:false,attribution:'<a href="https://openfreemap.org/">OpenFreeMap</a> · <a href="https://openmaptiles.org/">OpenMapTiles</a> · © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
  const engine=vector.getMaplibreMap(),container=engine.getContainer();container.style.opacity='0';
  engine.once('load',()=>{ready=true;clearTimeout(timer);container.style.opacity='1';map.removeLayer(raster);document.body.dataset.basemap='vector';});
  timer=setTimeout(fallback,14000);
 }catch{fallback();}
 return vector||raster;
}
