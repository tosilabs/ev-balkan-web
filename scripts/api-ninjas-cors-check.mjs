// Check public preflight policy only. Never send a key or fetch station results.
try{
 const response=await fetch('https://api.api-ninjas.com/v1/evcharger?lat=41.9981&lon=21.4254&distance=10',{
  method:'OPTIONS',redirect:'manual',signal:AbortSignal.timeout(10000),
  headers:{Origin:'https://tosilabs.github.io','Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'x-api-key'}
 });
 const origin=response.headers.get('access-control-allow-origin'),headers=response.headers.get('access-control-allow-headers'),methods=response.headers.get('access-control-allow-methods');
 console.log('API NINJAS PREFLIGHT (no key):',JSON.stringify({status:response.status,origin,headers,methods}));
 console.log('This checks preflight only; authenticated EV results and their CORS headers remain unverified.');
}catch{console.log('API NINJAS PREFLIGHT UNAVAILABLE: no credentials were sent.');}
