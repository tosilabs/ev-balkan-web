import json,urllib.request,re,concurrent.futures,collections
from pathlib import Path

def get(url):
 req=urllib.request.Request(url,headers={'User-Agent':'Udhembare/2.2 public-source-coverage-check'})
 with urllib.request.urlopen(req,timeout=25) as r:return r.read(45*1024*1024).decode('utf-8-sig')
def inspect(item):
 name,url=item
 try:
  raw=get(url)
  if name=='evn':
   return {'source':name,'bytes':len(raw),'scripts':re.findall(r'<script[^>]+src=[\"\']([^\"\']+)',raw),'iframes':re.findall(r'<iframe[^>]+src=[\"\']([^\"\']+)',raw),'coordinates':re.findall(r'.{0,80}(?:[Ll]atitude|[Ll]ongitude|[Ll]at[Ll]ng|maps/embed|new google|data-lat).{0,200}',raw)[:12], 'mapLinks':re.findall(r'href=[\"\']([^\"\']*(?:maps.app.goo.gl|goo.gl/maps|google.com/maps)[^\"\']*)',raw)[:5], 'tableSample':[re.sub('<[^>]+>',' ',raw[raw.find('Main road'):raw.find('Main road')+1000])]}
  data=json.loads(raw)
  if name=='published':return {'source':name,'count':len(data['elements']),'sources':data.get('sources'),'report':data.get('mergeReport')}
  entries=data if isinstance(data,list) else data.get('stations',data.get('data',next((v for v in data.values() if isinstance(v,list)),[])))
  return {'source':name,'rootkeys':list(data)[:15] if isinstance(data,dict) else 'array','count':len(entries),'first':entries[:2]}
 except Exception as e:return {'source':name,'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 for r in pool.map(inspect,[('evn','https://emobility.evn.mk/charging-stations/ChargerMap.aspx?lang=en'),('blokvolt','https://www.blokvolt.rs/assets/map/punjaci.json'),('chargealong','https://api.chargealong.io/v1/nearby?lat=41.9981&lng=21.4254&radius_km=100&limit=100'),('chargealong-countries','https://api.chargealong.io/v1/countries'),('published','https://tosilabs.github.io/ev-balkan-web/data/charging-balkans.json')]):print('SOURCE_AUDIT '+json.dumps(r,ensure_ascii=False),flush=True)
