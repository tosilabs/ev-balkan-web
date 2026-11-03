const DB='udhembare-offline-v1';
async function database(){
 if(!globalThis.indexedDB)throw Error('Ruajtja offline nuk mbështetet në këtë shfletues.');
 return new Promise((resolve,reject)=>{
  let settled=false;const r=indexedDB.open(DB,1);
  const fail=message=>{if(settled)return;settled=true;clearTimeout(timer);reject(Error(message));};
  const timer=setTimeout(()=>fail('Ruajtja nuk u hap. Mbyll skedat e tjera dhe provo përsëri.'),5000);
  r.onupgradeneeded=()=>r.result.createObjectStore('records',{keyPath:'id'});
  r.onsuccess=()=>{if(settled){r.result.close();return;}settled=true;clearTimeout(timer);resolve(r.result);};
  r.onerror=()=>fail('Shfletuesi nuk lejoi ruajtjen lokale. Kontrollo hapësirën dhe cilësimet e privatësisë.');
  r.onblocked=()=>fail('Ruajtja është e bllokuar nga një skedë tjetër. Mbylle dhe provo përsëri.');
 });
}
export async function offlinePut(id,value){
 const db=await database();
 try{await new Promise((resolve,reject)=>{
  const tx=db.transaction('records','readwrite');tx.objectStore('records').put({id,value,at:Date.now()});
  tx.oncomplete=resolve;tx.onerror=()=>reject(Error('Të dhënat nuk u ruajtën. Kontrollo hapësirën në telefon.'));tx.onabort=()=>reject(Error('Ruajtja u ndërpre. Provo përsëri.'));
 });}finally{db.close();}
}
export async function offlineGet(id){
 const db=await database();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction('records'),r=tx.objectStore('records').get(id);
  r.onsuccess=()=>resolve(r.result?.value??null);r.onerror=()=>reject(Error('Kopja lokale nuk u lexua.'));tx.onabort=()=>reject(Error('Leximi i kopjes u ndërpre.'));
 });}finally{db.close();}
}
export async function cacheSearch(box,data){try{await offlinePut('last-search',{box,data});}catch{}}
export async function cachedSearch(box){
 try{const old=await offlineGet('last-search');if(old&&box[0]>=old.box[0]&&box[1]>=old.box[1]&&box[2]<=old.box[2]&&box[3]<=old.box[3])return {...old.data,offline:true};}catch{}return null;
}
