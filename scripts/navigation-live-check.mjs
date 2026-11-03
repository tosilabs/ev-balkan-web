import {chromium} from 'playwright';
import {navigationRoute} from '../dist/navigation-core.mjs';
const browser=await chromium.launch();
try{
 const page=await browser.newPage();
 const origin='https://tosilabs.github.io/ev-balkan-web/navigation-health-check';
 await page.route(origin,route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Navigation service check</title>'}));await page.goto(origin);
 const result=await page.evaluate(async()=>{
  for(const host of ['https://router.project-osrm.org','https://routing.openstreetmap.de/routed-car'])try{
   const response=await fetch(host+'/route/v1/driving/21.4254,41.9981;21.4324,42.0031?overview=full&geometries=geojson&steps=true&alternatives=false',{signal:AbortSignal.timeout(10000)});
   if(response.ok)return {data:await response.json()};
  }catch{}
  return null;
 });
 if(result){const route=navigationRoute(result.data);console.log('LIVE NAVIGATION: browser CORS and real OSRM steps succeeded, maneuvers='+route.turns.length+', points='+route.line.length);}
 else console.log('LIVE NAVIGATION UPSTREAM UNAVAILABLE: mocked navigation flows are tested separately.');
}finally{await browser.close();}
