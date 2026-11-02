import {requestJson} from './services.mjs?v=2.0';
import {webUrl} from './details.mjs?v=2.0';
const cache=new Map();
const plain=value=>String(value??'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').slice(0,200);
async function lookup(file){
 if(!cache.has(file))cache.set(file,(async()=>{
  const url='https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',origin:'*',prop:'imageinfo',titles:file,iiprop:'url|extmetadata|mime',iiurlwidth:'640'});
  const data=await requestJson(url,{timeout:8000});
  const info=Object.values(data.query?.pages??{}).find(p=>p.imageinfo?.[0])?.imageinfo?.[0];
  if(!info)throw Error('Fotoja nuk është e disponueshme.');
  const meta=info.extmetadata??{},license=plain(meta.LicenseShortName?.value||meta.UsageTerms?.value),artist=plain(meta.Artist?.value||meta.Attribution?.value);
  const image=webUrl(info.thumburl||info.url);
  if(!image||new URL(image).hostname!=='upload.wikimedia.org'||!/^image\/(jpeg|png|webp|avif)$/.test(info.mime||'')||!/(CC[- ]|CC0|Public domain|\bPD\b)/i.test(license)||(!artist&&/CC[- ]BY/i.test(license)))throw Error('Shiko foton dhe licencën në burimin origjinal.');
  return {image,artist,license,licenseUrl:webUrl(meta.LicenseUrl?.value)};
 })().catch(error=>{cache.delete(file);throw error;}));
 return cache.get(file);
}
function link(label,url){const a=document.createElement('a');a.textContent=label;a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
export function photoSection(station){
 const section=document.createElement('section');section.className='location-photo';
 const photo=station.info?.photo;
 if(photo?.commonsFile){
  const button=document.createElement('button');button.type='button';button.className='secondary photo-load';button.textContent='Ngarko foton e regjistruar';
  const message=document.createElement('p');message.className='field-note';
  button.addEventListener('click',async()=>{
   button.disabled=true;message.textContent='Duke ngarkuar foton…';
   try{const info=await lookup(photo.commonsFile);const image=document.createElement('img');image.alt=`Foto e regjistruar për ${station.name}`;image.loading='lazy';image.referrerPolicy='no-referrer';image.src=info.image;
    image.addEventListener('error',()=>{image.remove();message.textContent='Fotoja nuk u ngarkua. Hape burimin më poshtë.';},{once:true});
    section.prepend(image);button.remove();message.textContent=`Foto: ${info.artist||'autori te burimi'} · ${info.license}. `;
    if(info.licenseUrl)message.append(link('Licenca',info.licenseUrl));
   }catch(error){message.textContent=error.name==='TimeoutError'?'Fotoja vonoi. Mund ta hapësh burimin origjinal.':error.message;button.disabled=false;}
  });
  section.append(button,message,link('Fotoja dhe autori në Wikimedia Commons ↗',photo.url));
 }else if(photo?.url){section.append(link('Hape foton e regjistruar ↗',photo.url));}
 else{const p=document.createElement('p');p.className='field-note';p.textContent='Nuk ka foto të lidhur në regjistër. Mund të kërkosh foto në Maps më poshtë.';section.append(p);}
 if(photo?.mapillary)section.append(link('Pamje në Mapillary ↗',photo.mapillary));
 return section;
}
