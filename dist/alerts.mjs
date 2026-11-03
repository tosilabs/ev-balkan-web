import {freshStatus} from './operating.mjs?v=3.6';
export function reportedFinesPrice(data,id,now=Date.now()){
 if(!freshStatus(data?.generated_at,now)||!Array.isArray(data?.features))return null;
 const location=data.features.find(f=>String(f.id??f.properties?.id)===String(id)),price=location?.properties?.price_range;
 if(price?.currency!=='EUR'||price.unit!=='kWh'||!Number.isFinite(price.min)||!Number.isFinite(price.max)||price.min<0||price.max<price.min)return null;
 return {minimum:price.min,maximum:price.max,currency:'EUR',observedAt:data.generated_at};
}
export function watchMessages(watch,state,price){
 const messages=[];const available=state.key==='working'&&state.available>0;
 if(state.key!=='unknown'){if(watch.freeEnabled&&available&&watch.available!==true)messages.push(watch.station.name+': operatori raporton lidhës të lirë.');watch.available=available;}
 if(Number.isFinite(watch.priceThreshold)&&price){const below=price.maximum<=watch.priceThreshold;if(below&&watch.below!==true)messages.push(`${watch.station.name}: diapazoni i raportuar ${price.minimum.toFixed(2)}–${price.maximum.toFixed(2)} EUR/kWh është brenda pragut tënd. Kontrollo kushtet te operatori.`);watch.below=below;}
 return messages;
}
