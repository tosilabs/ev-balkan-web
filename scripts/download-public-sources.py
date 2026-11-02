from project_info import USER_AGENT
"""Download only published, anonymous feeds. Never upload or extract private OCPI APIs."""
import io,json,urllib.request,zipfile,concurrent.futures
from pathlib import Path
SOURCES={
 'myfah':'https://electrokinisi.yme.gov.gr/public/static_files/GR.IDRO.static.data.latest.json.zip',
 'fines':'https://public.finescharging.com/v1/locations.geojson',
 'fines-live':'https://public.finescharging.com/v1/live.json',
 'zagreb':'https://opendata.arcgis.com/api/v3/datasets/4a4fc728724b4d319c27a9f647a0bb62_0/downloads/data?format=geojson&spatialRefId=4326&where=1%3D1'
}
def fetch(item):
 name,url=item
 try:
  req=urllib.request.Request(url,headers={'User-Agent':USER_AGENT})
  with urllib.request.urlopen(req,timeout=45) as response:raw=response.read(60*1024*1024)
  if url.endswith('.zip'):
   with zipfile.ZipFile(io.BytesIO(raw)) as archive:
    f=next(x for x in archive.infolist() if x.filename.lower().endswith('.json') and not x.is_dir())
    if f.file_size>100*1024*1024:raise ValueError('Uncompressed data exceeds limit')
    raw=archive.read(f)
  data=json.loads(raw.decode('utf-8-sig'))
  return name,{'data':data,'url':url}
 except Exception as error:return name,{'error':str(error),'url':url}
Path('.source-cache').mkdir(exist_ok=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
 for name,result in executor.map(fetch,SOURCES.items()):
  Path(f'.source-cache/{name}.json').write_text(json.dumps(result,ensure_ascii=False))
  print('PUBLIC_FEED',name,'downloaded' if 'data' in result else 'unavailable: '+result['error'],flush=True)
