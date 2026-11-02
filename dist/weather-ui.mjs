const text=(tag,value,cls)=>{const n=document.createElement(tag);n.textContent=value;if(cls)n.className=cls;return n;};
const fmt=(value,suffix,digits=0)=>value===null?'—':value.toFixed(digits)+suffix;
const time=value=>value===null?'Koha e panjohur':new Date(value).toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'});
export function renderWeatherRows(container,points,onPick){
 container.replaceChildren();
 for(const [index,p] of points.entries()){
  const row=document.createElement('article');row.className='weather-row'+(p.advisories.some(a=>a.level==='high')?' weather-high':p.advisories.length?' weather-notice':'');
  const open=document.createElement('button');open.className='weather-row-main';open.type='button';open.setAttribute('aria-label',`Moti në ${p.km.toFixed(0)} km`);
  open.append(text('span',p.kind.icon,'weather-symbol'),text('strong',fmt(p.temperature,'°'),'weather-temperature'));
  const label=document.createElement('span');label.append(text('strong',p.label||(p.km===0?'Nisja':`${p.km.toFixed(0)} km përgjatë rrugës`)),text('small',`${p.kind.name} · rreth ${time(p.target)}`));open.append(label);open.addEventListener('click',()=>onPick?.(p,index));row.append(open);
  const metrics=document.createElement('div');metrics.className='weather-metrics';metrics.append(text('span',`Reshje ${fmt(p.precipitation,' mm/orë',1)}`),text('span',`Mundësi ${fmt(p.probability,'%')}`),text('span',`Erë ${fmt(p.wind,' km/h')}`),text('span',`Rafale ${fmt(p.gusts,' km/h')}`));
  if(p.snowfall!==null&&p.snowfall>0)metrics.append(text('span',`Borë ${fmt(p.snowfall,' cm/orë',1)}`));
  if(p.visibility!==null&&p.visibility<5000)metrics.append(text('span',`Dukshmëri ${fmt(p.visibility,' m')}`));row.append(metrics);
  for(const a of p.advisories)row.append(text('p','△ '+a.label,'weather-advisory'));
  if(p.time===null||p.temperature===null)row.append(text('p','Të dhëna të paplota për këtë pikë/orë.','field-note'));
  container.append(row);
 }
}
