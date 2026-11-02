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
   return {'source':name,'bytes':len(raw),'scripts':re.findall(r'<script[^>]+src=[\"\']([^\"\']+)',raw),'iframes':re.findall(r'<iframe[^>]+src=[\"\']([^\"\']+)',raw),'coordinates':re.findall(r'.{0,80}(?:[Ll]atitude|[Ll]ongitude|[Ll]at[Ll]ng|maps/embed|new google|data-lat).{0,200}',raw)[:12], 'tableSample':re.findall(r'<tr[^>]*>.*?</tr>',raw,re.S)[:2]}
  data=json.loads(raw)
  if name=='published':return {'source':name,'count':len(data['elements']),'sources':data.get('sources'),'report':data.get('mergeReport')}
  entries=data if isinstance(data,list) else next((v for v in data.values() if isinstance(v,list)),[])
  return {'source':name,'rootkeys':list(data)[:15] if isinstance(data,dict) else 'array','count':len(entries),'first':entries[:2]}
 except Exception as e:return {'source':name,'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 for r in pool.map(inspect,[('evn','https://emobility.evn.mk/charging-stations/ChargerMap.aspx?lang=en'),('blokvolt','https://www.blokvolt.rs/assets/map/punjaci.json'),('published','https://tosilabs.github.io/ev-balkan-web/data/charging-balkans.json')]):print('SOURCE_AUDIT '+json.dumps(r,ensure_ascii=False),flush=True)
root=Path('.source-cache/ocm-export/data');ref=json.loads((root/'referencedata.json').read_text());providers={p['ID']:p for p in ref['DataProviders']}
for country in ['AL','BA','BG','GR','HR','ME','MK','RO','RS','SI','XK','AT','HU','IT','TR']:
 records=[json.loads(f.read_text()) for f in (root/country).glob('OCM-*.json')];openrecords=[r for r in records if providers.get(r.get('DataProviderID'),{}).get('IsOpenDataLicensed') is True]
 old=[r for r in records if r.get('DataProviderID')==1 and r.get('SubmissionStatusTypeID')==200 and r.get('StatusTypeID') not in [100,150,200,210] and r.get('UsageTypeID') not in [2,3,6]]
 usable=[r for r in openrecords if r.get('SubmissionStatusTypeID') in [100,200] and r.get('StatusTypeID') not in [100,150,200,210] and r.get('UsageTypeID') not in [2,3,6]]
 print('OCM_COUNTRY_AUDIT '+json.dumps({'country':country,'total':len(records),'open':len(openrecords),'oldImport':len(old),'eligible':len(usable),'providers':dict(collections.Counter(str(r.get('DataProviderID')) for r in usable))}),flush=True)
