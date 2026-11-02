import {chromium} from 'playwright';
import {radarFrames,radarTile} from '../dist/weather.mjs';
// Unmocked requests from a browser origin verify CORS as well as current API formats.
const browser=await chromium.launch();
try{
 const page=await browser.newPage();
 const origin='https://tosilabs.github.io/ev-balkan-web/weather-health-check';
 await page.route(origin,route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Weather service check</title>'}));
 await page.goto(origin);
 const request=url=>page.evaluate(async url=>{try{const r=await fetch(url,{signal:AbortSignal.timeout(12000),cache:'no-store'});if(!r.ok)return {ok:false,status:r.status};return {ok:true,data:await r.json()};}catch(error){return {ok:false,error:error.message};}},url);
 const [radar,forecast]=await Promise.all([request('https://api.rainviewer.com/public/weather-maps.json'),request('https://api.open-meteo.com/v1/forecast?latitude=41.9981&longitude=21.4254&hourly=temperature_2m,precipitation,weather_code,wind_gusts_10m&timeformat=unixtime&forecast_days=1')]);
 if(radar.ok){
  const frames=radarFrames(radar.data),url=radarTile(frames,frames.frames.length-1).replace('{z}','6').replace('{x}','35').replace('{y}','23');
  const tile=await page.evaluate(async url=>{try{const r=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!r.ok)return {ok:false,status:r.status};const image=await createImageBitmap(await r.blob());return {ok:true,width:image.width,height:image.height};}catch(error){return {ok:false,error:error.message};}},url);
  console.log('LIVE RADAR:',JSON.stringify({frames:frames.frames.length,latest:frames.frames.at(-1),tile}));
  if(tile.ok&&(!tile.width||!tile.height))throw Error('Empty radar tile');
 }else console.log('UPSTREAM RADAR UNAVAILABLE:',JSON.stringify(radar));
 if(forecast.ok){if(!forecast.data.hourly?.time?.length)throw Error('Unexpected forecast API format');console.log('LIVE FORECAST: browser CORS succeeded, hours='+forecast.data.hourly.time.length);}
 else console.log('UPSTREAM FORECAST UNAVAILABLE:',JSON.stringify(forecast));
}finally{await browser.close();}
