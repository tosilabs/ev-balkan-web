import {requestJson} from './services.mjs?v=3.5';
import {webUrl} from './details.mjs?v=3.5';
import {availabilitySummary,finesLocation,connectorState} from './operating.mjs?v=3.5';
export {availabilitySummary} from './operating.mjs?v=3.5';
const node=(tag,value,className)=>{const n=document.createElement(tag);n.textContent=value;if(className)n.className=className;return n;};
const link=(label,url)=>{const a=node('a',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
export function finesLiveSection(id){
 const section=document.createElement('section');section.className='live-section';section.append(node('h4','Disponueshmëria nga Fines'));
 const button=node('button','Kontrollo disponueshmërinë','secondary');button.type='button';const message=node('p','Status nga operatori; ripërdoret deri në 2 minuta. Nuk rezervon vendin.','field-note');const list=document.createElement('div');
 section.append(button,message,list);
 button.addEventListener('click',async()=>{
  button.disabled=true;message.textContent='Duke kontrolluar operatorin…';list.replaceChildren();
  try{
   if(!/^\d+$/.test(id))throw Error('ID e pavlefshme');
   const data=await finesLocation(id);
   const summary=availabilitySummary(data),time=Number.isFinite(Date.parse(summary.generatedAt))?new Date(summary.generatedAt).toLocaleString('sq-AL'):'e panjohur';
   if(summary.fresh&&summary.total)message.textContent=`${summary.available} nga ${summary.total} lidhës të lirë sipas burimit. Të dhënat: ${time}.`;
   else message.textContent=`Statusi nuk mund të konfirmohet si aktual. Koha e burimit: ${time}.`;
   for(const c of summary.connectors){
    const status=connectorState(c).label;
    list.append(node('p',`${c.plug_type||c.name||'Lidhës'}${Number.isFinite(c.max_power_kw)?' · '+c.max_power_kw+' kW':''}: ${status}${summary.fresh?'':' (të dhëna jo aktuale)'}`));
   }
   button.textContent='Kontrollo përsëri';
  }catch{message.textContent='Statusi nuk u mor. Provo përsëri pas 2 minutash ose kontrollo aplikacionin e operatorit.';}
  finally{button.disabled=false;}
 });
 return section;
}
const statuses={on_demand:'Sipas itinerarit',active:'Integruar',cached:'Kopja e fundit',unavailable:'Përkohësisht i paarritshëm',authorization_required:'Kërkon autorizim',registration_required:'Kërkon regjistrim / API key',discovery_portal:'Katalog burimesh',catalogue_only:'Identifikuar · jo i integruar',aggregate_only:'Statistika · jo lokacione'};
export async function showSources(container,dialog){
 dialog.showModal();container.replaceChildren(node('p','Duke ngarkuar burimet…'));
 try{
  const data=await requestJson(new URL('./data/sources.json',import.meta.url).href,{timeout:10000});container.replaceChildren();
  if(data.report)container.append(node('p',`${data.report.totalLocations.toLocaleString('sq-AL')} lokacione pas bashkimit të regjistrave. Numrat e secilit burim më poshtë janë përpara heqjes së dublimeve. Koha e katalogut: ${new Date(data.checkedAt).toLocaleString('sq-AL')}.`,'field-note'));
  for(const s of data.sources??[]){
   const card=document.createElement('section');card.className='source-card';card.append(node('h3',s.name),node('p',`${s.country||''} · ${statuses[s.status]||s.status}`,'source-state'));
   if(Number.isFinite(s.count))card.append(node('p',`${s.count.toLocaleString('sq-AL')} lokacione në burim`));
   if(s.note)card.append(node('p',s.note));if(s.license)card.append(node('p','Licenca / kushtet: '+s.license,'field-note'));
   if(s.checkedAt)card.append(node('p','Regjistri i marrë më '+new Date(s.checkedAt).toLocaleString('sq-AL'),'field-note'));
   if(webUrl(s.url))card.append(link('Hape burimin ↗',webUrl(s.url)));container.append(card);
  }
 }catch{container.replaceChildren(node('p','Katalogu nuk u ngarkua. Burimin e çdo karikuesi mund ta hapësh te karta e tij.'));}
}
