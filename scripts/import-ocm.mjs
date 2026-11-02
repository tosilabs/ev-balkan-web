// Import the publisher's Git export, never scrape a map or use an API without a key.
import {readFile,readdir,writeFile} from 'node:fs/promises';
const directory='.source-cache/ocm-export/data',records=[],countries=['AL','BA','BG','GR','HR','ME','MK','RO','RS','SI','XK'];
try{
 const reference=JSON.parse(await readFile(directory+'/referencedata.json','utf8'));
 for(const country of countries){
  let files;try{files=await readdir(directory+'/'+country);}catch{continue;}
  for(const file of files.filter(f=>/^OCM-\d+\.json$/.test(f))){const record=JSON.parse(await readFile(directory+'/'+country+'/'+file,'utf8'));records.push(record);}
 }
 if(!records.length)throw Error('No country records found in the publisher export');
 await writeFile('.source-cache/ocm.json',JSON.stringify({data:{records,reference},url:'https://github.com/openchargemap/ocm-export'}));
 console.log('OCM_EXPORT_READ',records.length);
}catch(error){await writeFile('.source-cache/ocm.json',JSON.stringify({error:error.message}));console.log('OCM_EXPORT_UNAVAILABLE',error.message);}
