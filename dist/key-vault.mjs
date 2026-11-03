const STORAGE_KEY='udhembare-api-ninjas-vault-v1';
const ITERATIONS=600000;
const AAD=new TextEncoder().encode('udhembare:api-ninjas:v1');
const encode=bytes=>btoa(String.fromCharCode(...bytes));
function decode(value,size){if(typeof value!=='string'||value.length>1000||!/^[A-Za-z0-9+/]+={0,2}$/.test(value))throw Error('record');const bytes=Uint8Array.from(atob(value),c=>c.charCodeAt(0));if(size&&bytes.length!==size)throw Error('record');return bytes;}
function validKey(value){if(typeof value!=='string'||!/^[\x21-\x7e]{16,512}$/.test(value))throw Error('Vendos një çelës API të vlefshëm, pa hapësira.');return value;}
function validPassword(value){if(typeof value!=='string'||value.length<12||value.length>256)throw Error('Fjalëkalimi duhet të ketë 12–256 karaktere.');}
function recordFrom(raw){
 if(typeof raw!=='string'||raw.length>2000)throw Error('record');const record=JSON.parse(raw);
 if(!record||record.v!==1||record.kdf!=='PBKDF2-SHA256'||record.iterations!==ITERATIONS||record.cipher!=='AES-GCM-256'||Object.keys(record).sort().join(',')!=='cipher,data,iterations,iv,kdf,salt,v')throw Error('record');
 const salt=decode(record.salt,16),iv=decode(record.iv,12),data=decode(record.data);
 if(data.length<32||data.length>528)throw Error('record');return {salt,iv,data};
}
async function derive(password,salt,crypto){
 const input=new TextEncoder().encode(password);
 try{const material=await crypto.subtle.importKey('raw',input,'PBKDF2',false,['deriveKey']);return await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
 finally{input.fill(0);}
}
export function createKeyVault({storage,crypto=globalThis.crypto}={}){
 let unlockedKey=null,generation=0;
 const read=()=>{try{return storage.getItem(STORAGE_KEY);}catch{throw Error('Telefoni nuk lejon leximin e ruajtjes lokale.');}};
 function lock(){generation++;unlockedKey=null;}
 function checkCrypto(){if(!crypto?.subtle||!crypto?.getRandomValues)throw Error('Ruajtja e enkriptuar kërkon HTTPS dhe një shfletues me Web Crypto.');}
 function status(){const raw=read();let valid=true;if(raw!==null)try{recordFrom(raw);}catch{valid=false;}return {saved:raw!==null,valid,unlocked:unlockedKey!==null,supported:Boolean(crypto?.subtle&&crypto?.getRandomValues)};}
 function current(token,raw){if(token!==generation||raw!==undefined&&read()!==raw)throw Error('Veprimi u anulua. Provo përsëri.');}
 return {status,lock,
  async save(apiKey,password){lock();const token=generation;checkCrypto();apiKey=validKey(apiKey.trim());validPassword(password);const original=read();
   const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),key=await derive(password,salt,crypto);
   const input=new TextEncoder().encode(apiKey);let encrypted;
   try{encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:AAD,tagLength:128},key,input);}finally{input.fill(0);}
   current(token,original);const record={v:1,kdf:'PBKDF2-SHA256',iterations:ITERATIONS,cipher:'AES-GCM-256',salt:encode(salt),iv:encode(iv),data:encode(new Uint8Array(encrypted))};
   try{storage.setItem(STORAGE_KEY,JSON.stringify(record));}catch{throw Error('Çelësi nuk u ruajt. Telefoni nuk lejoi shkrimin lokal.');}
   unlockedKey=apiKey;
  },
  async unlock(password){lock();const token=generation;checkCrypto();validPassword(password);const raw=read();let record;
   try{record=recordFrom(raw);}catch{throw Error('Çelësi i ruajtur mungon ose të dhënat janë dëmtuar.');}
   const key=await derive(password,record.salt,crypto);let decrypted;
   try{decrypted=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:record.iv,additionalData:AAD,tagLength:128},key,record.data));}
   catch{throw Error('Fjalëkalimi nuk përputhet ose të dhënat janë dëmtuar.');}
   try{current(token,raw);unlockedKey=validKey(new TextDecoder().decode(decrypted));}finally{decrypted.fill(0);}
  },
  remove(){lock();try{storage.removeItem(STORAGE_KEY);}catch{throw Error('Çelësi nuk u fshi. Telefoni nuk lejoi ndryshimin lokal.');}},
  storageChanged(event){const changed=event.key===STORAGE_KEY||event.key===null;if(changed)lock();return changed;}
 };
}
