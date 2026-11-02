import json,urllib.request,collections
from datetime import datetime,timezone
url='https://evaround.me/v1/download?format=json&bbox=21.2,41.8,21.7,42.2'
with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Udhembare charging source compatibility review'}),timeout=30) as response:
 data=json.load(response)
items=data.get('items',[]);countries=collections.Counter(i.get('location',{}).get('country','unknown') for i in items)
boxes={'Skopje':[41.8,21.2,42.2,21.7],'Prishtina':[42.4,21.0,42.8,21.4],'Sofia':[42.5,23.1,42.9,23.5],'BalkanRegistryBounds':[34,12,48.5,30]}
counts={}
for name,(south,west,north,east) in boxes.items():
 count=0
 for i in items:
  p=i.get('location',{});lat,lon=p.get('latitude'),p.get('longitude')
  if isinstance(lat,(int,float)) and isinstance(lon,(int,float)) and south<=lat<=north and west<=lon<=east:count+=1
 counts[name]=count
print('EVAROUND_COVERAGE '+json.dumps({'checkedAt':datetime.now(timezone.utc).isoformat(),'generatedAt':data.get('generatedAt'),'returned':len(items),'countries':dict(countries),'withinActualCoordinates':counts,'providers':data.get('providers')},ensure_ascii=False),flush=True)
