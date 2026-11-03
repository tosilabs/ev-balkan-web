import {createKeyVault} from './key-vault.mjs?v=3.6';

export function createKeyVaultUI(){
 const $=id=>document.getElementById(id),dialog=$('api-key-dialog');
 const listeners=new Set(),vaults=new Map();let provider='api-ninjas';
 const names={'api-ninjas':'API Ninjas','openwebninja-waze':'OpenWeb Ninja · Waze'};
 const getVault=id=>{if(!vaults.has(id))vaults.set(id,createKeyVault({provider:id,storage:{getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value),removeItem:key=>localStorage.removeItem(key)},onLock:()=>{for(const callback of listeners)callback(id);}}));return vaults.get(id);};
 let vault=getVault(provider);
 let busy=false,idle=null;
 const fields=['api-key-value','api-key-password','api-key-confirm','api-unlock-password'];
 const clear=()=>{for(const id of fields)$(id).value='';};
 function render(){
  try{$('api-key-provider-name').textContent=names[provider];$('api-key-usage-note').textContent=provider==='api-ninjas'?'Kjo ruan çelësin; kërkimi me API Ninjas nuk është aktivizuar ende.':'Për raportimet, hape “Raportimet Waze” dhe kërko zonën. Një rifreskim përdor një kërkesë.';const state=vault.status();$('api-key-state').textContent=!state.supported?'Ruajtja e enkriptuar nuk mbështetet këtu.':!state.saved?'Nuk ka çelës të ruajtur.':!state.valid?'Të dhënat janë dëmtuar. Fshije dhe vendose përsëri.':state.unlocked?'I ruajtur · i zhbllokuar në këtë sesion':'I ruajtur · i bllokuar';
   $('api-key-save-form').hidden=state.saved;$('api-key-unlock-form').hidden=!state.saved||state.unlocked||!state.valid;
   $('api-key-lock').hidden=!state.unlocked;$('api-key-delete').hidden=!state.saved;
   for(const element of dialog.querySelectorAll('input,button[type=submit]'))element.disabled=busy||!state.supported;
   $('api-key-provider').disabled=busy;$('api-key-delete').disabled=busy;$('api-key-lock').disabled=busy;
  }catch(error){$('api-key-state').textContent=error.message;$('api-key-save-form').hidden=true;$('api-key-unlock-form').hidden=true;$('api-key-lock').hidden=true;$('api-key-delete').hidden=true;}
 }
 function autoLock(message='Çelësi u bllokua.'){for(const item of vaults.values())item.lock();clearTimeout(idle);clear();if(dialog.open)$('api-key-feedback').textContent=message;render();}
 function activity(){clearTimeout(idle);try{if([...vaults.values()].some(v=>v.status().unlocked))idle=setTimeout(()=>autoLock('Çelësi u bllokua pas 5 minutash pa aktivitet.'),5*60000);}catch{}}
 function open(id=provider){if(!names[id])return;if(dialog.open)dialog.close();provider=id;vault=getVault(id);$('api-key-provider').value=id;clear();$('api-key-feedback').textContent='';render();dialog.showModal();}
 $('api-key-open').addEventListener('click',()=>open());
 $('api-key-provider').addEventListener('change',()=>{vault.lock();provider=$('api-key-provider').value;vault=getVault(provider);clear();$('api-key-feedback').textContent='';render();});
 dialog.addEventListener('close',()=>{clear();if(busy)autoLock('Veprimi u anulua.');});
 async function operate(task,success){if(busy)return;busy=true;$('api-key-feedback').textContent='Duke përpunuar…';render();
  try{await task();$('api-key-feedback').textContent=success;activity();}
  catch(error){$('api-key-feedback').textContent=error.message;}
  finally{busy=false;clear();render();}
 }
 $('api-key-save-form').addEventListener('submit',event=>{event.preventDefault();
  const apiKey=$('api-key-value').value,password=$('api-key-password').value,confirm=$('api-key-confirm').value;
  if(password!==confirm){$('api-key-feedback').textContent='Fjalëkalimet nuk përputhen.';$('api-key-password').value='';$('api-key-confirm').value='';return;}
  clear();operate(()=>vault.save(apiKey,password),'Çelësi u ruajt i enkriptuar vetëm në këtë shfletues.');
 });
 $('api-key-unlock-form').addEventListener('submit',event=>{event.preventDefault();const password=$('api-unlock-password').value;clear();operate(()=>vault.unlock(password),'Çelësi u zhbllokua për këtë sesion.');});
 $('api-key-lock').addEventListener('click',()=>autoLock());
 $('api-key-delete').addEventListener('click',()=>{if(!confirm('Ta fshij çelësin e ruajtur nga ky shfletues?'))return;try{vault.remove();clearTimeout(idle);clear();$('api-key-feedback').textContent='Çelësi u fshi nga ky shfletues.';}catch(error){$('api-key-feedback').textContent=error.message;}render();});
 window.addEventListener('storage',event=>{let changed=false;for(const item of vaults.values())changed=item.storageChanged(event)||changed;if(changed){clear();$('api-key-feedback').textContent='Ruajtja ndryshoi në një skedë tjetër.';render();}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)autoLock('Çelësi u bllokua kur faqja kaloi në sfond.');});
 window.addEventListener('pagehide',()=>autoLock());
 for(const name of ['pointerdown','keydown'])document.addEventListener(name,activity,{passive:true});
 render();
 return {open,status:id=>getVault(id).status(),withKey:(id,callback)=>getVault(id).withKey(callback),onLock(callback){listeners.add(callback);return ()=>listeners.delete(callback);}};
}
