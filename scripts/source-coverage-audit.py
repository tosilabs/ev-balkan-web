import json,urllib.request,urllib.error,concurrent.futures
URLS=[
 ('evaround-skopje','https://evaround.me/v1/download?format=json&bbox=21.2,41.8,21.7,42.2'),
 ('evaround-prishtina','https://evaround.me/v1/download?format=json&bbox=21.0,42.4,21.4,42.8'),
 ('evaround-sofia','https://evaround.me/v1/download?format=json&bbox=23.1,42.5,23.5,42.9'),
 ('evaround-london','https://evaround.me/v1/download?format=json&bbox=-0.14,51.49,-0.10,51.53'),
 ('india-api-skopje','https://ev-charging-stations-api.vercel.app/v1/stations/near?lat=41.9981&lng=21.4254&radius=100&limit=100')]
def inspect(item):
 name,url=item
 try:
  req=urllib.request.Request(url,headers={'User-Agent':'Udhembare public data compatibility review/2026-11-02','Accept':'application/json'})
  with urllib.request.urlopen(req,timeout=25) as response:
   raw=response.read(40*1024*1024);status=response.status;cors=response.headers.get('Access-Control-Allow-Origin')
  data=json.loads(raw);items=data.get('items',data.get('data',[]));result={'name':name,'status':status,'cors':cors,'keys':list(data),'count':len(items) if isinstance(items,list) else None,'meta':data.get('meta'),'attribution':data.get('attribution'),'license':data.get('license'),'updated':data.get('updated'),'first':items[0] if isinstance(items,list) and items else None}
  print('REVIEW_API_CHECK '+json.dumps(result,ensure_ascii=False),flush=True)
 except urllib.error.HTTPError as e:print('REVIEW_API_CHECK '+json.dumps({'name':name,'status':e.code,'error':e.read(800).decode('utf-8',errors='replace')}),flush=True)
 except Exception as e:print('REVIEW_API_CHECK '+json.dumps({'name':name,'error':str(e)}),flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(inspect,URLS))
