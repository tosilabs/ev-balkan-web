import {readFile,mkdir,writeFile} from 'node:fs/promises';
const data=JSON.parse(await readFile('dist/data/charging-balkans.json','utf8')),groups=new Map();
for(const e of data.elements){const p=e.center??e;if(!Number.isFinite(p.lat)||!Number.isFinite(p.lon))continue;const key=`${Math.floor(p.lat)}_${Math.floor(p.lon)}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(e);}
await mkdir('dist/data/tiles',{recursive:true});const tiles={};
for(const [key,elements] of groups){const content=JSON.stringify({elements,builtAt:data.builtAt});await writeFile(`dist/data/tiles/${key}.json`,content);tiles[key]={count:elements.length,bytes:Buffer.byteLength(content)};}
await writeFile('dist/data/registry-index.json',JSON.stringify({schema:1,bounds:data.bounds,fetchedAt:data.fetchedAt,builtAt:data.builtAt,tiles}));
console.log('REGIONAL_SHARDS',JSON.stringify({count:groups.size,total:data.elements.length}));
