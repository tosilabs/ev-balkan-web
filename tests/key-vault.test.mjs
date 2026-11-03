import test from 'node:test';
import assert from 'node:assert/strict';
import {createKeyVault} from '../dist/key-vault.mjs';

const secret='test-only-personal-key-1234567890';
const password='Fjalekalim prove 2026!';
function memory(){const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key),data};}
test('Personal vault survives reload encrypted, requires password and deletes only its own record',async()=>{
 const storage=memory();storage.setItem('udhembare-history-v1','["my route"]');let vault=createKeyVault({storage});
 await vault.save(secret,password);assert.equal(vault.status().unlocked,true);
 const [key,record]=[...storage.data].find(([key])=>key.includes('vault'));
 assert.ok(!record.includes(secret));assert.ok(!record.includes(password));assert.equal(JSON.parse(record).iterations,600000);
 vault=createKeyVault({storage});assert.equal(vault.status().saved,true);assert.equal(vault.status().unlocked,false);
 await assert.rejects(vault.unlock('Wrong password 2026!'),/nuk përputhet/);assert.equal(vault.status().unlocked,false);
 await vault.unlock(password);assert.equal(vault.status().unlocked,true);vault.lock();assert.equal(vault.status().unlocked,false);
 vault.remove();assert.equal(storage.getItem(key),null);assert.equal(storage.getItem('udhembare-history-v1'),'["my route"]');assert.equal(vault.status().saved,false);
});
test('Fresh random salt/IV and authenticated encryption reject tampering and malicious KDF parameters',async()=>{
 const storage=memory(),vault=createKeyVault({storage});await vault.save(secret,password);const [key,first]=[...storage.data][0];
 await vault.save(secret,password);const second=storage.getItem(key);assert.notEqual(JSON.parse(first).salt,JSON.parse(second).salt);assert.notEqual(JSON.parse(first).iv,JSON.parse(second).iv);assert.notEqual(JSON.parse(first).data,JSON.parse(second).data);
 const damaged=JSON.parse(second);damaged.data=(damaged.data[0]==='A'?'B':'A')+damaged.data.slice(1);storage.setItem(key,JSON.stringify(damaged));
 await assert.rejects(vault.unlock(password),/nuk përputhet/);assert.equal(vault.status().unlocked,false);
 damaged.iterations=999999999;storage.setItem(key,JSON.stringify(damaged));assert.equal(vault.status().valid,false);await assert.rejects(vault.unlock(password),/dëmtuar/);
});
test('Lock, page hiding or cross-tab deletion cannot be undone by an in-flight decryption',async()=>{
 const storage=memory(),vault=createKeyVault({storage});await vault.save(secret,password);const key=[...storage.data.keys()][0];
 const pending=vault.unlock(password);vault.lock();await assert.rejects(pending,/anulua/);assert.equal(vault.status().unlocked,false);
 await vault.unlock(password);assert.equal(vault.storageChanged({key:'unrelated'}),false);assert.equal(vault.status().unlocked,true);
 storage.removeItem(key);assert.equal(vault.storageChanged({key}),true);assert.equal(vault.status().saved,false);assert.equal(vault.status().unlocked,false);
});
test('Unsupported crypto, unavailable storage and write failures never fall back to plaintext',async()=>{
 const storage=memory();await assert.rejects(createKeyVault({storage,crypto:{}}).save(secret,password),/Web Crypto/);assert.equal(storage.data.size,0);
 const blocked=createKeyVault({storage:{getItem(){throw Error('blocked');}}});assert.throws(()=>blocked.status(),/leximin/);
 const rejected=createKeyVault({storage:{getItem:()=>null,setItem(){throw Error('full');}}});await assert.rejects(rejected.save(secret,password),/nuk u ruajt/);assert.equal(rejected.status().unlocked,false);
 await assert.rejects(createKeyVault({storage}).save(secret,'short'),/12–256/);assert.equal(storage.data.size,0);
});
