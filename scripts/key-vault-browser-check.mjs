import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('dist'),types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{try{const p=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(p!==root&&!p.startsWith(root+'/')){res.writeHead(403).end();return;}const file=p===root?resolve(root,'index.html'):p;res.writeHead(200,{'Content-Type':types[extname(file)]||'text/plain'});res.end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(8083,'127.0.0.1',r));let browser,page;const errors=[];
const apiKey='test-only-personal-key-1234567890',password='Fjalekalim prove 2026!';const leaked=[];
try{
 browser=await chromium.launch();const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,permissions:['geolocation'],geolocation:{latitude:41.9981,longitude:21.4254},serviceWorkers:'block'});page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
 page.on('request',request=>{const value=request.url()+' '+(request.postData()||'')+' '+JSON.stringify(request.headers());if(value.includes(apiKey)||value.includes(password))leaked.push('Credential sent over network');});
 await context.route('**/data/registry-index.json',r=>r.fulfill({status:404,body:''}));await context.route('**/data/charging-balkans.json',r=>r.fulfill({json:{bounds:[34,12,48.5,30],fetchedAt:new Date().toISOString(),elements:[{type:'node',id:1,lat:41.999,lon:21.426,tags:{amenity:'charging_station',name:'Ndalesa prove','socket:type2_combo':'1','socket:type2_combo:output':'150 kW'}}]}}));await context.route('**/data/community.json',r=>r.fulfill({json:{reports:[]}}));
 await page.goto('http://127.0.0.1:8083/',{waitUntil:'networkidle',timeout:60000});await page.waitForFunction(()=>!document.body.classList.contains('busy'));
 const open=async()=>{await page.locator('#more-open').click();await page.locator('#api-key-open').click();await page.locator('#api-key-dialog').waitFor();};
 await open();await page.locator('#api-key-value').fill(apiKey);await page.locator('#api-key-password').fill(password);await page.locator('#api-key-confirm').fill(password);await page.locator('#api-key-save-form button[type=submit]').click();await page.getByText('I ruajtur · i zhbllokuar në këtë sesion',{exact:true}).waitFor();
 for(const id of ['api-key-value','api-key-password','api-key-confirm'])assert.equal(await page.locator('#'+id).inputValue(),'','Clear sensitive DOM input');
 let stored=await page.evaluate(()=>JSON.stringify({...localStorage}));assert.ok(!stored.includes(apiKey));assert.ok(!stored.includes(password));assert.ok(stored.includes('PBKDF2-SHA256'));
 await mkdir('browser-results',{recursive:true});await page.screenshot({path:'browser-results/personal-key-saved.png'});
 await page.locator('#api-key-lock').click();await page.getByText('I ruajtur · i bllokuar',{exact:true}).waitFor();await page.locator('#api-unlock-password').fill('Wrong password 2026!');await page.locator('#api-key-unlock-form button[type=submit]').click();await page.getByText('Fjalëkalimi nuk përputhet ose të dhënat janë dëmtuar.',{exact:true}).waitFor();assert.equal(await page.locator('#api-unlock-password').inputValue(),'');
 await page.locator('#api-unlock-password').fill(password);await page.locator('#api-key-unlock-form button[type=submit]').click();await page.getByText('I ruajtur · i zhbllokuar në këtë sesion',{exact:true}).waitFor();
 // Hiding the page revokes the unlocked session without deleting the encrypted record.
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;});await page.getByText('I ruajtur · i bllokuar',{exact:true}).waitFor();
 await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>!document.body.classList.contains('busy'));await open();await page.getByText('I ruajtur · i bllokuar',{exact:true}).waitFor();
 await page.locator('#api-unlock-password').fill(password);await page.locator('#api-key-unlock-form button[type=submit]').click();await page.getByText('I ruajtur · i zhbllokuar në këtë sesion',{exact:true}).waitFor();
 await page.locator('#api-key-lock').click();await page.evaluate(()=>{const original=crypto.subtle.deriveKey.bind(crypto.subtle);crypto.subtle.deriveKey=async(...args)=>{await new Promise(resolve=>setTimeout(resolve,500));return original(...args);};});await page.locator('#api-unlock-password').fill(password);
 await page.locator('#api-key-unlock-form button[type=submit]').click();await page.locator('[data-close="api-key-dialog"]').click();await open();await page.getByText('I ruajtur · i bllokuar',{exact:true}).waitFor();
 await page.evaluate(()=>localStorage.setItem('udhembare-history-v1','[]'));page.once('dialog',dialog=>dialog.accept());await page.locator('#api-key-delete').click();await page.getByText('Nuk ka çelës të ruajtur.',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('udhembare-history-v1')),'[]');
 assert.equal(await page.evaluate(()=>localStorage.getItem('udhembare-api-ninjas-vault-v1')),null);
 await page.setViewportSize({width:320,height:740});assert.equal(await page.locator('body').evaluate(el=>el.scrollWidth<=innerWidth),true);await page.screenshot({path:'browser-results/personal-key-form-small-phone.png'});
 assert.deepEqual(errors,[]);assert.deepEqual(leaked,[]);console.log('PASS PERSONAL KEY: encrypted persistence, empty credential inputs, reload locked, wrong password, auto-lock on hide, cancellation during unlock, scoped deletion, 320px phone, and no credential network traffic');await context.close();
}catch(error){console.error('VAULT ERRORS',errors);if(page)await page.screenshot({path:'browser-results/key-vault-failure.png'}).catch(()=>{});throw error;}
finally{await browser?.close();await new Promise(r=>server.close(r));}
