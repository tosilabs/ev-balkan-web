import {trafficFeatures} from './traffic-core.mjs?v=3.6';
export function createNavigationMap(container,{changed=()=>{},onDrag=()=>{}}={}){
 let map=null,leaflet=null,routeLayer=null,marker=null,endMarker=null,timer=null,route=null,last=null,tilted=true,closed=false,ready=false,traffic=null,trafficLayer=null;
 const feature=coordinates=>({type:'Feature',properties:{},geometry:{type:'LineString',coordinates}});
 function draw(){if(!route)return;
  if(leaflet){if(routeLayer)leaflet.removeLayer(routeLayer);if(endMarker)endMarker.remove();const end=route.line.at(-1);endMarker=L.circleMarker([end.lat,end.lon],{radius:8,color:'#fff',weight:3,fillColor:'#178565',fillOpacity:1}).addTo(leaflet);routeLayer=L.polyline(route.line.map(p=>[p.lat,p.lon]),{color:'#0758d6',weight:7,opacity:.95}).addTo(leaflet);return;}
  if(!map||!ready)return;
  const data=feature(route.line.map(p=>[p.lon,p.lat]));
  if(endMarker)endMarker.remove();const end=route.line.at(-1),flag=document.createElement('div');flag.className='navigation-destination';flag.textContent='⚑';flag.setAttribute('aria-label','Destinacioni');endMarker=new maplibregl.Marker({element:flag}).setLngLat([end.lon,end.lat]).addTo(map);
  if(map.getSource('nav-route'))map.getSource('nav-route').setData(data);
  else{map.addSource('nav-route',{type:'geojson',data});map.addLayer({id:'nav-route-halo',type:'line',source:'nav-route',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#fff','line-width':12}});map.addLayer({id:'nav-route-line',type:'line',source:'nav-route',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#0758d6','line-width':7}});}
 }

 function drawTraffic(){
  if(leaflet){trafficLayer?.remove();trafficLayer=L.layerGroup().addTo(leaflet);if(!traffic)return;
   for(const alert of traffic.alerts)L.circleMarker([alert.point.lat,alert.point.lon],{radius:7,color:'#fff',weight:2,fillColor:alert.color,fillOpacity:1}).addTo(trafficLayer).bindTooltip(alert.label);
   for(const jam of traffic.jams)L.polyline(jam.line.map(p=>[p.lat,p.lon]),{color:jam.level>=4?'#c74637':'#d68016',weight:5,opacity:.85}).addTo(trafficLayer);return;
  }
  if(!map||!ready)return;const data=trafficFeatures(traffic);
  if(map.getSource('nav-traffic-data'))map.getSource('nav-traffic-data').setData(data);
  else{map.addSource('nav-traffic-data',{type:'geojson',data});map.addLayer({id:'nav-traffic-jams',type:'line',source:'nav-traffic-data',filter:['==',['geometry-type'],'LineString'],paint:{'line-color':['get','color'],'line-width':5,'line-opacity':.85}});map.addLayer({id:'nav-traffic-points',type:'circle',source:'nav-traffic-data',filter:['==',['geometry-type'],'Point'],paint:{'circle-radius':8,'circle-color':['get','color'],'circle-stroke-color':'#fff','circle-stroke-width':2}});map.addLayer({id:'nav-traffic-labels',type:'symbol',source:'nav-traffic-data',filter:['==',['geometry-type'],'Point'],layout:{'text-field':['get','label'],'text-font':['Noto Sans Regular'],'text-size':10,'text-allow-overlap':true},paint:{'text-color':'#fff'}});}
 }

 function fallback(){if(closed||leaflet)return;clearTimeout(timer);marker?.remove?.();marker=null;endMarker?.remove?.();endMarker=null;map?.remove();map=null;container.replaceChildren();
  if(!globalThis.L){changed('none');return;}
  leaflet=L.map(container,{zoomControl:false}).setView([last?.point.lat??42,last?.point.lon??21.43],16);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(leaflet);
  leaflet.on('dragstart',onDrag);draw();drawTraffic();if(last)position(last,true);changed('2d');
 }
 function position(fix,follow,bearing=0){last=fix;const p=fix.point;
  if(leaflet){if(!marker)marker=L.circleMarker([p.lat,p.lon],{radius:9,color:'#fff',weight:4,fillColor:fix.preview?'#73859a':'#0758d6',fillOpacity:1}).addTo(leaflet);else{marker.setLatLng([p.lat,p.lon]);marker.setStyle({fillColor:fix.preview?'#73859a':'#0758d6'});}if(follow)leaflet.setView([p.lat,p.lon],16,{animate:false});return;}
  if(!map)return;
  if(!marker){const element=document.createElement('div');element.className='navigation-position';element.textContent='➤';element.setAttribute('aria-label','Vendndodhja ime');marker=new maplibregl.Marker({element,rotationAlignment:'map'}).setLngLat([p.lon,p.lat]).addTo(map);}
  else marker.setLngLat([p.lon,p.lat]);
  const element=marker.getElement();element.textContent=fix.preview?'○':'➤';element.setAttribute('aria-label',fix.preview?'Nisja e parapamjes':'Vendndodhja ime');element.classList.toggle('preview',Boolean(fix.preview));marker.setRotation(bearing-90);
  if(follow)map.easeTo({center:[p.lon,p.lat],zoom:17,pitch:tilted?55:0,bearing:tilted?bearing:0,duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:450,padding:(()=>{const scale=Math.max(0,Math.min(1,(container.clientHeight-120)/270));return {top:100*scale,bottom:170*scale,left:0,right:0};})()});
 }
 try{if(!globalThis.maplibregl)throw Error('WebGL');
  map=new maplibregl.Map({container,style:'https://tiles.openfreemap.org/styles/positron',center:[21.43,42],zoom:15,pitch:55,bearing:0,attributionControl:true});
  map.on('dragstart',onDrag);map.on('zoomstart',event=>{if(event.originalEvent)onDrag();});map.on('rotatestart',event=>{if(event.originalEvent)onDrag();});
  map.once('load',()=>{if(closed)return;ready=true;clearTimeout(timer);
   const building=map.getStyle().layers.find(layer=>layer['source-layer']==='building'&&layer.type==='fill');
   if(building)try{map.addLayer({id:'nav-buildings',source:building.source,'source-layer':'building',type:'fill-extrusion',minzoom:14,paint:{'fill-extrusion-color':'#becbd9','fill-extrusion-height':['to-number',['get','render_height'],0],'fill-extrusion-base':['to-number',['get','render_min_height'],0],'fill-extrusion-opacity':.7}});}catch{/* Tilted map remains usable without building heights. */}
   draw();drawTraffic();if(last)position(last,true);changed('3d');
  });
  map.on('error',()=>{/* A style timeout selects the 2D fallback. */});timer=setTimeout(fallback,12000);
 }catch{fallback();}
 return {setRoute(value){route=value;draw();},setTraffic(value){traffic=value;drawTraffic();},focus(p){if(leaflet)leaflet.setView([p.lat,p.lon],16,{animate:false});else map?.easeTo({center:[p.lon,p.lat],zoom:16,duration:0});},position,
  toggle(){if(!map)return false;tilted=!tilted;map.easeTo({pitch:tilted?55:0,bearing:tilted?map.getBearing():0,duration:300});return tilted;},
  remove(){closed=true;clearTimeout(timer);marker?.remove?.();endMarker?.remove?.();map?.remove();leaflet?.remove();container.replaceChildren();}
 };
}
