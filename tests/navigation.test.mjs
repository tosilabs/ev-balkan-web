import test from 'node:test';
import assert from 'node:assert/strict';
import {navigationRoute,navigationProgress,freshNavigationFix,fetchNavigation,turnInstruction} from '../dist/navigation-core.mjs';
const a=[21,42],b=[21.01,42],c=[21.01,42.01];
function data(){return {code:'Ok',waypoints:[{distance:0},{distance:0}],routes:[{distance:2000,duration:180,legs:[{steps:[
 {name:'Rruga A',maneuver:{type:'depart'},geometry:{coordinates:[a,b]}},
 {name:'Rruga B',maneuver:{type:'turn',modifier:'left'},geometry:{coordinates:[b,c]}},
 {maneuver:{type:'arrive'},geometry:{coordinates:[c,c]}}
 ]}]}]};}
test('Navigation builds steps from road geometry and gives Albanian directions without inventing missing turns',()=>{
 const route=navigationRoute(data());assert.equal(route.turns[0].text,'Kthehu majtas · Rruga B');assert.equal(route.turns.at(-1).type,'arrive');assert.equal(route.line.length,3);assert.ok(route.turns[0].atKm>.8);
 const missing=data();missing.routes[0].legs[0].steps=[];assert.throws(()=>navigationRoute(missing),/udhëzime/);
 const snapped=data();snapped.waypoints[0].distance=500;assert.throws(()=>navigationRoute(snapped),/tepër larg/);
 assert.match(turnInstruction({type:'roundabout',exit:3}).text,/daljen 3/);assert.match(turnInstruction({type:'turn',modifier:'uturn'}).text,/kundërt/);
});
test('GPS progress follows the next maneuver, detects deviation and requires real remaining geometry for arrival',()=>{
 const route=navigationRoute(data());const first=navigationProgress(route,{point:{lat:42,lon:21.005}},0);assert.ok(first.toTurn>.3&&first.toTurn<.5);assert.equal(first.turn.type,'turn');assert.equal(first.arrived,false);
 const off=navigationProgress(route,{point:{lat:42.007,lon:21.02}},first.progress);assert.ok(off.offset>.1);
 const end=navigationProgress(route,{point:{lat:42.01,lon:21.01},heading:0,speed:5},first.progress);assert.equal(end.arrived,true);assert.equal(end.turn.type,'arrive');assert.equal(end.bearing,0);
});
test('At a loop crossing the matcher keeps the current route segment instead of jumping to a later visit',()=>{
 const route={line:[{lat:42,lon:21},{lat:42,lon:21.005},{lat:42.005,lon:21.005},{lat:42.005,lon:21},{lat:42,lon:21}],measures:[0,.413,.969,1.382,1.938],km:1.938,distance:1938,duration:240,turns:[{atKm:1.938,type:'arrive'}]};
 const state=navigationProgress(route,{point:{lat:42,lon:21}},0);assert.equal(state.progress,0);assert.equal(state.arrived,false);
});
test('Old, inaccurate or unspecified GPS cannot enable live navigation',()=>{
 const now=100000,fix={point:{lat:42,lon:21},at:99000,accuracy:10};assert.equal(freshNavigationFix(fix,now),true);assert.equal(freshNavigationFix({...fix,at:60000},now),false);assert.equal(freshNavigationFix({...fix,accuracy:150},now),false);assert.equal(freshNavigationFix({...fix,accuracy:null},now),false);
});
test('Navigation requests actual maneuver steps and stops after cancellation',async()=>{
 const requests=[];const result=await fetchNavigation([{lat:42,lon:21},{lat:42.01,lon:21.01}],{request:async url=>{requests.push(url);return data();}});assert.ok(result.turns.length);assert.match(requests[0],/steps=true/);assert.match(requests[0],/geometries=geojson/);
 const controller=new AbortController();controller.abort();await assert.rejects(fetchNavigation([{lat:42,lon:21},{lat:42.01,lon:21.01}],{signal:controller.signal,request:async()=>{throw controller.signal.reason;}}));
});
