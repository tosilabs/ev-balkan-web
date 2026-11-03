const cancelled=signal=>{if(signal?.aborted)throw signal.reason||new DOMException('Anuluar','AbortError');};
const validBox=box=>Array.isArray(box)&&box.length===4&&box.every(Number.isFinite)&&box[0]<=box[2]&&box[1]<=box[3];
export function createRegionalRegistry({now=Date.now}={}){
 const tiles=new Map();let manifest=null,manifestAt=0;
 return async function load(box,{signal,request}={}){
  cancelled(signal);
  if(!validBox(box))throw Error('Kufijtë e kërkimit nuk janë të vlefshëm.');
  if(!manifest||now()-manifestAt>600000){
   const next=await request(new URL('./data/registry-index.json',import.meta.url).href,{signal,timeout:5000});
   cancelled(signal);
   if(next?.schema!==1||!validBox(next.bounds)||!next.tiles||Array.isArray(next.tiles)||typeof next.tiles!=='object'||!Number.isFinite(Date.parse(next.fetchedAt))||!Number.isFinite(Date.parse(next.builtAt)))throw Error('Indeksi rajonal nuk është i vlefshëm.');
   if(manifest?.builtAt!==next.builtAt)tiles.clear();manifest=next;manifestAt=now();
  }
  // Keep this request's index even if a concurrent caller refreshes the global one.
  const snapshot=manifest,b=snapshot.bounds;
  if(box[0]<b[0]||box[1]<b[1]||box[2]>b[2]||box[3]>b[3])throw Error('Jashtë mbulimit rajonal.');
  const keys=[];
  for(let lat=Math.floor(box[0]);lat<=Math.floor(box[2]);lat++)for(let lon=Math.floor(box[1]);lon<=Math.floor(box[3]);lon++){
   const key=`${lat}_${lon}`;if(Object.hasOwn(snapshot.tiles,key))keys.push(key);
  }
  const result=[];let next=0,failed=false;
  const worker=async()=>{
   while(!failed&&next<keys.length){
    cancelled(signal);const key=keys[next++],cacheKey=snapshot.builtAt+':'+key;
    try{
     let data=tiles.get(cacheKey);
     if(!data){
      data=await request(new URL(`./data/tiles/${key}.json`,import.meta.url).href,{signal,timeout:10000});cancelled(signal);
      if(!Array.isArray(data?.elements)||data.builtAt!==snapshot.builtAt)throw Error('Pjesa rajonale nuk përputhet me indeksin.');
      if(tiles.size>=100)tiles.delete(tiles.keys().next().value);tiles.set(cacheKey,data);
     }
     result.push(...data.elements);
    }catch(error){failed=true;throw error;}
   }
  };
  await Promise.all(Array.from({length:Math.min(4,keys.length)},worker));cancelled(signal);
  return {bounds:b,fetchedAt:snapshot.fetchedAt,builtAt:snapshot.builtAt,elements:result.filter(e=>{const p=e?.center??e;return p&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&p.lat>=box[0]&&p.lat<=box[2]&&p.lon>=box[1]&&p.lon<=box[3];}),cached:true,regional:true};
 };
}
export const regionalRegistry=createRegionalRegistry();
