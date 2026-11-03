import test from 'node:test';
import assert from 'node:assert/strict';
import {drivingChoices} from '../dist/driving-core.mjs';
const now=Date.now();
const site=(id,lon,label='CCS2',power=150)=>({id,name:id,point:{lat:42,lon},connections:[{label,power}],allConnections:[{label,power}]});
test('Driving sorts using current GPS, rejects incompatible connectors and filters fast CCS per connector',()=>{
 const a=site('a',21),b=site('b',21.1,'Type 2',22),c=site('c',21.2,'CHAdeMO',150);
 const mixed=site('mixed',21.15,'CCS2',22);mixed.allConnections.push({label:'CHAdeMO',power:150});
 assert.deepEqual(drivingChoices([a,b,c,mixed],{origin:{lat:42,lon:21.1}}).map(c=>c.station.id),['b','mixed','a']);
 assert.deepEqual(drivingChoices([a,b,c,mixed],{origin:{lat:42,lon:21.1},fast:true}).map(c=>c.station.id),['a']);
});
test('Driving skips passed route points and rejects current confirmed outages without inventing availability',()=>{
 const line=[{lat:42,lon:21},{lat:42,lon:22}],behind=site('behind',21.1),ahead=site('ahead',21.8),offline=site('offline',21.7);
 behind.routePosition=8.26;ahead.routePosition=66.1;offline.routePosition=57.8;offline.operating={key:'offline',observedAt:new Date(now).toISOString()};
 assert.deepEqual(drivingChoices([behind,ahead,offline],{origin:{lat:42,lon:21.5},line,now}).map(c=>c.station.id),['ahead']);
 offline.operating.observedAt=new Date(now-3600000).toISOString();
 assert.deepEqual(drivingChoices([behind,ahead,offline],{origin:{lat:42,lon:21.5},line,now}).map(c=>c.station.id),['offline','ahead']);
});
test('Off-route GPS does not classify route points as already passed, and missing GPS does not invent distance',()=>{
 const a=site('a',21.1),b=site('b',21.8);a.routePosition=8;b.routePosition=66;
 assert.equal(drivingChoices([a,b],{origin:{lat:43,lon:21.5},line:[{lat:42,lon:21},{lat:42,lon:22}]}).length,2);
 assert.equal(drivingChoices([a])[0].km,null);
});
