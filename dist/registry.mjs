const tiles=new Map();let manifest=null,manifestAt=0;
export async function regionalRegistry(box,{signal,request}={}){
 if(!manifest||Date.now()-manifestAt>600000){const next=await request(new URL('./data/registry-index.json',import.meta.url).href,{signal,timeout:5000});if(manifest?.builtAt!==next.builtAt)tiles.clear();manifest=next;manifestAt=Date.now();}
 if(manifest.schema!==1||!Array.isArray(manifest.bounds)||!manifest.tiles||!manifest.fetchedAt)throw Error('Indeksi rajonal nuk është i vlefshëm.');
 const b=manifest.bounds;if(box[0]<b[0]||box[1]<b[1]||box[2]>b[2]||box[3]>b[3])throw Error('Jashtë mbulimit rajonal.');
 const keys=[];for(let lat=Math.floor(box[0]);lat<=Math.floor(box[2]);lat++)for(let lon=Math.floor(box[1]);lon<=Math.floor(box[3]);lon++){const key=`${lat}_${lon}`;if(manifest.tiles[key])keys.push(key);}
 const result=[];let next=0;
 await Promise.all(Array.from({length:Math.min(4,keys.length)},async()=>{while(next<keys.length){const key=keys[next++];if(signal?.aborted)throw signal.reason||new DOMException('Anuluar','AbortError');let data=tiles.get(key);if(!data){data=await request(new URL(`./data/tiles/${key}.json`,import.meta.url).href,{signal,timeout:10000});if(!Array.isArray(data.elements)||data.builtAt!==manifest.builtAt)throw Error('Pjesa rajonale nuk përputhet me indeksin.');if(tiles.size>100)tiles.delete(tiles.keys().next().value);tiles.set(key,data);}result.push(...data.elements);}}));
 return {bounds:b,fetchedAt:manifest.fetchedAt,builtAt:manifest.builtAt,elements:result.filter(e=>{const p=e.center??e;return p.lat>=box[0]&&p.lat<=box[2]&&p.lon>=box[1]&&p.lon<=box[3];}),cached:true,regional:true};
}
