import test from 'node:test';
import assert from 'node:assert/strict';
import {chargingClass,bestClass,providerInfo,photoInfo,webUrl,externalLocationUrl} from '../dist/details.mjs';
import {parseStations,settings,point} from '../dist/core.mjs';
test('EAFO AC boundaries classify slow, medium and fast exactly',()=>{
 for(const [kw,key] of [[0,'unknown'],[3.7,'slow'],[7.39,'slow'],[7.4,'medium'],[22,'medium'],[22.1,'fast'],[43,'fast']])assert.equal(chargingClass(kw,'AC').key,key);
});
test('EAFO DC boundaries distinguish slow, fast and ultra',()=>{
 for(const [kw,key] of [[0,'unknown'],[25,'slow'],[49.9,'slow'],[50,'fast'],[149.9,'fast'],[150,'ultra'],[350,'ultra']])assert.equal(chargingClass(kw,'DC').key,key);
 assert.equal(chargingClass(150,'').key,'unknown');
 assert.match(chargingClass(350,'DC').label,/350/);
});
test('Station category follows the strongest known connector, not an assumed current type',()=>{
 assert.equal(bestClass([{power:22,current:'AC'},{power:150,current:'DC'}]).key,'ultra');
 assert.equal(bestClass([{power:22,current:'AC'},{power:25,current:'DC'}]).label,'I ngadaltë · DC');
});
test('Unsafe provider/image URLs cannot become active links',()=>{
 for(const raw of ['javascript:alert(1)','data:text/html,test','file:///etc/passwd','https://user:password@example.com'])assert.equal(webUrl(raw),'');
 assert.equal(webUrl('www.eldrive.eu'),'https://www.eldrive.eu/');
 assert.equal(providerInfo({'operator:website':'javascript:alert(1)'}).website,'');
 assert.equal(photoInfo({image:'javascript:alert(1)'}).url,'');
});
test('Provider directory does not confuse regional EVN/Petrol operators',()=>{
 assert.match(providerInfo({operator:'Eldrive'}).android,/com.fortum.eldrive/);
 assert.match(providerInfo({operator:'charge&GO'}).website,/chargego.rs/);
 assert.match(providerInfo({operator:'EVN Macedonia'}).website,/evn.mk/);
 assert.equal(providerInfo({operator:'EVN'}).website,'');
 assert.equal(providerInfo({operator:'Petrol AD','addr:country':'BG'}).appPage,'');
 assert.match(providerInfo({network:'OneCharge'}).appPage,/petrol/);
});
test('Photo references preserve the actual Commons source without inventing an image',()=>{
 const p=photoInfo({wikimedia_commons:'File:Charging Station.jpg'});
 assert.equal(p.commonsFile,'File:Charging Station.jpg');assert.match(p.url,/File%3ACharging%20Station.jpg/);
 assert.equal(photoInfo({}).url,'');
 assert.equal(photoInfo({wikimedia_commons:'Category:Charging stations'}).commonsFile,'');
});
test('Connector details, provider links and speed filters survive station parsing',()=>{
 const element={type:'node',id:1,lat:42,lon:21,tags:{operator:'Eldrive','operator:website':'https://www.eldrive.eu/','socket:type2':'2','socket:type2:output':'22 kW','socket:type2_combo':'1','socket:type2_combo:output':'150 kW',wikimedia_commons:'File:Test.jpg',description:'Near the entrance'}};
 const parse=o=>parseStations({elements:[element]},settings({connector:'all',...o}),point(42,21));
 assert.equal(parse({})[0].speed.key,'ultra');
 assert.equal(parse({connector:'Type 2'})[0].speed.key,'medium');
 assert.equal(parse({speed:'fast'}).length,1);assert.equal(parse({speed:'medium'}).length,0);
 const s=parse({})[0];assert.equal(s.connections[0].count,2);assert.equal(s.info.provider.website,'https://www.eldrive.eu/');assert.equal(s.info.description,'Near the entrance');assert.equal(s.info.photo.commonsFile,'File:Test.jpg');
 assert.throws(()=>settings({speed:'invented'}));
});
test('Reviews are an external search tied to the actual name and coordinates',()=>{
 const url=externalLocationUrl({name:'Eldrive',address:'Shkup',point:point(42,21)},'reviews');
 assert.match(decodeURIComponent(url),/Eldrive Shkup 42,21/);
 assert.match(externalLocationUrl({point:point(42,21)},'streetview'),/viewpoint=42,21/);
});
