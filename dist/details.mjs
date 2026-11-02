export function webUrl(raw){
 if(typeof raw!=='string'||raw.length>2048)return '';
 let value=raw.trim();if(!value)return '';
 if(!/^[a-z][a-z0-9+.-]*:/i.test(value)&&/^[\w.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(value))value='https://'+value;
 try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password?url.href:'';}catch{return '';}
}
export function providerInfo(tags={}){
 const name=tags.operator||tags.network||tags.brand||'';
 const key=[tags.operator,tags.network,tags.brand].filter(Boolean).join(' ').toLowerCase();
 let known=null;
 if(/\beldrive\b/.test(key))known={website:'https://www.eldrive.eu/',appPage:'https://www.eldrive.eu/bg-en/charging',android:'https://play.google.com/store/apps/details?id=com.fortum.eldrive',ios:'https://apps.apple.com/app/id1382692672'};
 else if(/\bcharge\s*(?:&|and|\+)?\s*go\b/.test(key))known={website:'https://chargego.rs/',appPage:'https://chargego.rs/en/chargegoapp/',android:'https://play.google.com/store/apps/details?id=com.charge_and_go_mobile',ios:'https://apps.apple.com/app/id1662961378'};
 else if(/\btesla\b/.test(key))known={website:'https://www.tesla.com/findus',appPage:'https://www.tesla.com/app/landing'};
 else if((/\bonecharge\b/.test(key)||(/\bpetrol\b/.test(key)&&(['SI','HR'].includes(tags['addr:country'])||/ljubljana|petrol d\.d/.test(key)))))known={website:'https://onecharge.eu/',appPage:'https://go.petrol.si/mobilnost/onecharge'};
 else if(/\bevn\b|евн/.test(key)&&(tags['addr:country']==='MK'||/macedon|македон|маќедон/.test(key)))known={website:'https://emobility.evn.mk/',appPage:'https://emobility.evn.mk/Directpay.aspx?lang=en',appLabel:'Nisja e karikimit / roaming'};
 const tagged=webUrl(tags['operator:website']||tags['network:website']||tags['brand:website']);
 return {name,website:tagged||known?.website||'',websiteSource:tagged?'OpenStreetMap':known?'Direktoria e rrjeteve':'',locationWebsite:webUrl(tags.website||tags['contact:website']),appPage:known?.appPage||'',appLabel:known?.appLabel||'Aplikacioni i operatorit',android:known?.android||'',ios:known?.ios||''};
}
export function photoInfo(tags={}){
 let file=tags.wikimedia_commons||tags.image||'';
 if(typeof file!=='string')file='';
 if(file.startsWith('https://commons.wikimedia.org/wiki/')){try{file=decodeURIComponent(new URL(file).pathname.slice(6));}catch{file='';}}
 const commonsFile=/^File:[^<>\r\n]{1,250}$/i.test(file)?file:'';
 const direct=webUrl(tags.image);
 const mapillary=typeof tags.mapillary==='string'&&/^[A-Za-z0-9_-]{5,100}$/.test(tags.mapillary)?`https://www.mapillary.com/app/?pKey=${encodeURIComponent(tags.mapillary)}&focus=photo`:'';
 return {commonsFile,url:commonsFile?`https://commons.wikimedia.org/wiki/${encodeURIComponent(commonsFile)}`:direct,mapillary};
}
export function locationInfo(tags={}){
 const payments=[];
 for(const [key,label] of [['payment:credit_cards','Kartë krediti'],['payment:debit_cards','Kartë debiti'],['payment:contactless','Pa kontakt'],['payment:app','Aplikacion'],['authentication:app','Aplikacion'],['authentication:membership_card','Kartë anëtarësie'],['authentication:qr_code','Kod QR']])if(tags[key]==='yes'&&!payments.includes(label))payments.push(label);
 return {provider:providerInfo(tags),photo:photoInfo(tags),description:String(tags['description:sq']||tags['description:en']||tags.description||'').slice(0,1500),phone:String(tags['contact:phone']||tags.phone||'').slice(0,80),capacity:String(tags.capacity||'').slice(0,40),checkedAt:String(tags.check_date||tags['survey:date']||'').slice(0,40),payments};
}
export function externalLocationUrl(station,kind){
 const {lat,lon}=station.point;
 if(kind==='streetview')return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`;
 const query=[station.name,station.address,`${lat},${lon}`].filter(Boolean).join(' ');
 return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
export function chargingClass(kw,current){
 if(!Number.isFinite(kw)||kw<=0||!['AC','DC'].includes(current))return {key:'unknown',label:'Pa klasifikim',rank:0};
 if(current==='AC')return kw<7.4?{key:'slow',label:'I ngadaltë · AC',rank:1}:kw<=22?{key:'medium',label:'Mesatar · AC',rank:2}:{key:'fast',label:'I shpejtë · AC',rank:3};
 return kw<50?{key:'slow',label:'I ngadaltë · DC',rank:1}:kw<150?{key:'fast',label:'I shpejtë · DC',rank:3}:{key:'ultra',label:kw>=350?'Ultra · DC 350+':'Ultra i shpejtë · DC',rank:4};
}
export function socketCurrent(key){
 if(['type2','type1','schuko','tesla_destination','gb_ac','cee_blue','cee_red_16a','cee_red_32a','cee_red_63a'].includes(key))return 'AC';
 if(['type2_combo','type1_combo','chademo','tesla_supercharger','tesla_supercharger_ccs','gb_dc','chaoji'].includes(key))return 'DC';
 return '';
}
export function bestClass(connections){const known=connections.filter(c=>c.power>0&&['AC','DC'].includes(c.current)).sort((a,b)=>b.power-a.power);return known.length?chargingClass(known[0].power,known[0].current):chargingClass(0,'');}
