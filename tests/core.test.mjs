import test from 'node:test';
import assert from 'node:assert/strict';
import {point,coordinates,distance,corridorDistance,bounds,settings,parseStations,destinationUrl,shareData,navigationUrl} from '../dist/core.mjs';
const center=point(42,21);
const opts=settings({includeUnknown:true});
function node(id,tags={},p=center){return {type:'node',id,lat:p.lat,lon:p.lon,tags:{amenity:'charging_station',...tags}};}
function parse(elements,options=opts){return parseStations({elements},options,center);}
test('Coordinates reject invalid values and preserve signs',()=>{
  assert.deepEqual(coordinates('42.6629, 21.1655'),point(42.6629,21.1655));
  assert.equal(coordinates('Shkup'),null);
  assert.throws(()=>coordinates('91,0'));assert.throws(()=>point(NaN,0));assert.throws(()=>point(0,Infinity));
});
test('Distance and corridor use actual segments, including duplicate points',()=>{
  assert.ok(Math.abs(distance(point(42.6629,21.1655),point(41.3275,19.8187))-185.8)<1);
  const line=[point(42,20),point(42,21)];
  assert.equal(corridorDistance(point(42,20.5),line),0);
  assert.ok(Math.abs(corridorDistance(point(42.1,20.5),line)-11.12)<.03);
  assert.equal(corridorDistance(center,[center,center]),0);
  assert.throws(()=>corridorDistance(center,[]));
});
test('Corridor bounds include intermediate bends and padding',()=>{
  const box=bounds([point(41,20),point(43,22),point(42,21)],10);
  assert.ok(box[0]<41&&box[1]<20&&box[2]>43&&box[3]>22);
  // Long route geometry must not overflow JS function argument limits.
  assert.equal(bounds(Array.from({length:150000},()=>center),10).length,4);
});
test('Invalid filters are rejected rather than silently broadening the search',()=>{
  for(const raw of [{radius:0},{radius:101},{minPower:-1},{minPower:NaN},{connector:'CHAdeMO'}])assert.throws(()=>settings(raw));
  assert.doesNotThrow(()=>settings({radius:1,minPower:1000,connector:'CCS2'}));
});
test('Power filter applies to the selected connector, not the largest incompatible connector',()=>{
  const mixed=node(1,{'socket:type2':'2','socket:type2:output':'22 kW','socket:type2_combo':'1','socket:type2_combo:output':'150000 W'});
  assert.equal(parse([mixed],settings({connector:'Type 2',minPower:50})).length,0);
  const rows=parse([mixed],settings({connector:'CCS2',minPower:100}));
  assert.equal(rows.length,1);assert.equal(rows[0].power,150);assert.equal(rows[0].connectors,'CCS2');
});
test('Unknown sockets are optional and incompatible known sockets are excluded',()=>{
  const unknown=node(1),chademo=node(2,{'socket:chademo':'1'});
  assert.equal(parse([unknown,chademo]).length,1);
  assert.equal(parse([unknown],settings({includeUnknown:false})).length,0);
  assert.equal(parse([unknown],settings({includeUnknown:true,minPower:22})).length,0);
});
test('Private chargers, invalid coordinates and duplicate records do not appear',()=>{
  const good=node(1,{'socket:type2_combo':'1','socket:type2_combo:output':'150 kW'});
  const invalid=node(2,{}, {lat:null,lon:21});
  const rows=parse([good,good,node(3,{access:'private'}),node(4,{access:'no'}),invalid,node(5,{},point(40,20))]);
  assert.equal(rows.length,1);assert.equal(rows[0].id,'node/1');
});
test('Ways use their center and unknown tariffs remain unknown',()=>{
  const rows=parse([{type:'way',id:8,center,tags:{amenity:'charging_station',name:'Station',fee:'yes'}}]);
  assert.equal(rows[0].price,'');assert.equal(rows[0].source,'https://www.openstreetmap.org/way/8');
});
test('Route search removes points outside the corridor even inside the bounding box',()=>{
  const route=[point(42,20),point(42,22)];
  const rows=parseStations({elements:[node(1,{},point(42.01,21)),node(2,{},point(42.5,21))]},settings({radius:5,includeUnknown:true}),center,route);
  assert.equal(rows.length,1);
});
test('Shared destinations preserve exact coordinates and do not claim delivery',()=>{
  const station={name:'Karikuesi',address:'Shkup',point:point(41.9981,21.4254)};
  assert.equal(destinationUrl(station),'https://www.google.com/maps/search/?api=1&query=41.9981%2C21.4254');
  assert.deepEqual(shareData(station),{title:'Karikuesi',text:'Karikuesi — Shkup',url:destinationUrl(station)});
  assert.match(navigationUrl(station,'osmand'),/finish=41.9981,21.4254/);
  assert.match(navigationUrl(station,'waze'),/ll=41.9981,21.4254&navigate=yes/);
});
