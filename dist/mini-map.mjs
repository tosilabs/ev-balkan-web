import {point} from './core.mjs?v=3.1';
export function miniTiles(location,width,height,zoom=17){
 const p=point(location.lat,location.lon),n=2**zoom,lat=Math.max(-85.051128,Math.min(85.051128,p.lat)),sin=Math.sin(lat*Math.PI/180);
 const px=(p.lon+180)/360*n*256,py=(.5-Math.log((1+sin)/(1-sin))/(4*Math.PI))*n*256,tiles=[];
 for(let x=Math.floor((px-width/2)/256);x<=Math.floor((px+width/2)/256);x++)for(let y=Math.floor((py-height/2)/256);y<=Math.floor((py+height/2)/256);y++){
  if(y<0||y>=n)continue;const wrapped=((x%n)+n)%n;tiles.push({x:wrapped,y,zoom,left:x*256-px,top:y*256-py,url:`https://tile.openstreetmap.org/${zoom}/${wrapped}/${y}.png`});
 }
 return tiles;
}
export function stationMap(station,onOpen,{root=null}={}){
 const element=document.createElement('div');element.className='station-map';
 const button=document.createElement('button');button.type='button';button.className='mini-map-open';button.setAttribute('aria-label','Hap në hartë: '+station.name);button.addEventListener('click',onOpen);
 const tiles=document.createElement('span');tiles.className='mini-map-tiles';tiles.setAttribute('aria-hidden','true');
 const pin=document.createElement('span');pin.className='mini-map-pin';const logo=document.createElement('img');logo.src='./icon.svg?v=3.1';logo.alt='';pin.append(logo);pin.setAttribute('aria-hidden','true');
 const label=document.createElement('span');label.className='mini-map-label';label.textContent='Vendndodhja në hartë';
 button.append(tiles,pin,label);const credit=document.createElement('a');credit.className='mini-map-credit';credit.href='https://www.openstreetmap.org/copyright';credit.target='_blank';credit.rel='noopener noreferrer';credit.textContent='© OpenStreetMap';element.append(button,credit);
 let active=false,width=0,generation=0;
 function paint(){
  if(!active||!element.isConnected)return;const next=element.clientWidth;if(!next||Math.abs(next-width)<4)return;width=next;
  const current=++generation,items=miniTiles(station.point,width,element.clientHeight||116);tiles.replaceChildren();let errors=0;
  for(const tile of items){const img=document.createElement('img');img.alt='';img.draggable=false;img.decoding='async';img.width=256;img.height=256;img.style.left=`calc(50% + ${tile.left}px)`;img.style.top=`calc(50% + ${tile.top}px)`;
   img.addEventListener('error',()=>{if(current!==generation)return;errors++;label.textContent=errors===items.length?'Pamja nuk u ngarkua · '+station.point.lat.toFixed(3)+', '+station.point.lon.toFixed(3):'Pamje e pjesshme e hartës';});img.src=tile.url;tiles.append(img);
  }
 }
 let observer=null,resize=null;
 if('IntersectionObserver' in globalThis){observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){active=true;paint();observer.disconnect();}},{root,rootMargin:'0px',threshold:.05});observer.observe(element);}else{active=true;setTimeout(paint,0);}
 if('ResizeObserver' in globalThis){resize=new ResizeObserver(paint);resize.observe(element);}
 return {element,dispose(){generation++;observer?.disconnect();resize?.disconnect();}};
}
