const finite=(v,min,max,name)=>{const n=typeof v==='number'?v:typeof v==='string'&&v.trim()?Number(v):NaN;if(!Number.isFinite(n)||n<min||n>max)throw Error(name+' nuk është brenda kufijve.');return n;};
export function vehicleProfile(raw){
 return {name:String(raw.name||'Audi im').slice(0,80),capacity:finite(raw.capacity,10,250,'Bateria e përdorshme'),soc:finite(raw.soc,0,100,'Bateria aktuale'),reserve:finite(raw.reserve??15,5,50,'Rezerva'),consumption:finite(raw.consumption,5,60,'Konsumi'),maxDC:finite(raw.maxDC,10,500,'Fuqia DC'),maxAC:finite(raw.maxAC??11,1,43,'Fuqia AC'),efficiency:.9,mass:raw.mass?finite(raw.mass,500,5000,'Masa'):null,temperature:raw.temperature!==''&&raw.temperature!=null?finite(raw.temperature,-50,55,'Temperatura'):null};
}
export function energyForKm(km,p,{ascent=0,descent=0,temperature=p.temperature}={}){
 if(!Number.isFinite(km)||km<0)throw Error('Mungon distanca rrugore.');
 const cold=Number.isFinite(temperature)?1+Math.min(.35,Math.max(0,15-temperature)*.012):1;
 const base=km*p.consumption/100*cold;
 if(!Number.isFinite(p.consumption)||p.consumption<=0||![ascent,descent].every(x=>Number.isFinite(x)&&x>=0))throw Error('Të dhënat e energjisë janë të paplota.');
 const gravity=p.mass?Math.max(0,ascent)*p.mass*9.80665/(.9*3600000)-Math.max(0,descent)*p.mass*9.80665*.6/3600000:0;
 return Math.max(base*.15,base+gravity);
}
export function compatiblePower(station,p){
 const choices=(station.allConnections||station.connections||[]).filter(c=>['CCS2','Type 2'].includes(c.label)&&Number.isFinite(c.power)&&c.power>0).map(c=>({power:Math.min(c.power,c.label==='Type 2'?p.maxAC:p.maxDC),dc:c.label==='CCS2',label:c.label}));
 return choices.sort((a,b)=>b.power-a.power)[0]||null;
}
export function chargingMinutes(p,connection,from,to){
 if(!connection||connection.power<=0||!Number.isFinite(from)||!Number.isFinite(to)||from<0||to>100||to<from)throw Error('Mungojnë të dhënat për karikimin.');
 const tiers=connection.dc?[[0,50,.95],[50,80,.8],[80,90,.45],[90,100,.2]]:[[0,100,1]];let minutes=0;
 for(const [a,b,factor] of tiers){const delta=Math.max(0,Math.min(to,b)-Math.max(from,a));minutes+=p.capacity*delta/100/(connection.power*factor*p.efficiency)*60;}
 return minutes;
}
export function parseTariff(value){
 const s=String(value||'').replace(/(\d),(\d)/g,'$1.$2');if(/^(?:pa pages[eë](?:,\s*sipas regjistrit)?|free(?: charging)?|gratis)[.!]?$/i.test(s.trim()))return {currency:'EUR',energy:0,minute:0,session:0,complete:true,sourceText:s};
 if(/(?:^|\s)-\s*\d/.test(s))return null;
 if(/\d\s*[–—-]\s*\d|member|subscription|abonim|roaming|\bfrom\b|nga\s+\d/i.test(s))return null;
 const unit='(EUR|€|RSD|BGN|MKD|ALL|BAM|RON|HRK|GBP|£)',read=suffix=>s.match(new RegExp('(\\d+(?:\\.\\d+)?)\\s*'+unit+'\\s*\\/\\s*'+suffix,'i'));
 if((s.match(/(?:EUR|€|RSD|BGN|MKD|ALL|BAM|RON|HRK|GBP|£)\s*\/\s*kWh/gi)||[]).length>1)return null;
 const energy=read('kWh'),minute=read('(?:min|minute|minut)'),hour=read('(?:hour|or[eë]|h\\b)'),session=read('(?:session|seanc|start)');
 const first=energy||minute||hour||session;if(!first)return null;const currencyOf=x=>({'€':'EUR','£':'GBP'}[x[2]]||x[2].toUpperCase()),currency=currencyOf(first);
 if([energy,minute,hour,session].some(x=>x&&currencyOf(x)!==currency))return null;
 const remainder=[energy,minute,hour,session].filter(Boolean).reduce((text,match)=>text.replace(match[0],''),s);
 const extraUnparsed=/park|idle|vat|tvsh|tax|only|vet[eë]m|discount|additional|shtes[eë]/i.test(remainder)||/[+]\s*\d|\d+(?:\.\d+)?\s*(?:EUR|€|RSD|BGN|MKD|ALL|BAM|RON|GBP|£)/i.test(remainder);
 return {currency,energy:energy?Number(energy[1]):0,minute:minute?Number(minute[1]):hour?Number(hour[1])/60:0,session:session?Number(session[1]):0,complete:!extraUnparsed&&Boolean(energy||minute||hour),sourceText:s};
}
export function sessionCost(tariff,kwh,minutes){
 if(!tariff||!Number.isFinite(kwh)||kwh<0||!Number.isFinite(minutes)||minutes<0)return null;
 return {amount:kwh*tariff.energy+minutes*tariff.minute+tariff.session,currency:tariff.currency,complete:tariff.complete};
}
export function terrainBetween(profile,from,to){
 let ascent=0,descent=0,known=0,total=0;const points=profile?.points||[];
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];const overlap=Math.max(0,Math.min(to,b.km)-Math.max(from,a.km));if(!overlap)continue;total+=overlap;if(!Number.isFinite(a.elevation)||!Number.isFinite(b.elevation)||!Number.isFinite(a.km)||!Number.isFinite(b.km)||b.km<=a.km)continue;known+=overlap;const change=(b.elevation-a.elevation)*overlap/(b.km-a.km);if(change>0)ascent+=change;else descent-=change;}
 return {ascent,descent,coverage:total?known/total:0};
}

export function weatherBetween(points,from,to){
 const known=(points||[]).filter(p=>p&&Number.isFinite(p.temperature)&&Number.isFinite(p.km));if(!known.length)return null;
 const inside=known.filter(p=>p.km>=from&&p.km<=to);const nearest=target=>known.reduce((a,b)=>Math.abs(a.km-target)<Math.abs(b.km-target)?a:b);const samples=inside.length?inside:[nearest(from),nearest(to)];return samples.reduce((sum,p)=>sum+p.temperature,0)/samples.length;
}
