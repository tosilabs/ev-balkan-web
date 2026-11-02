"""Read-only diagnostics for explicitly public official charging data feeds."""
import io,json,urllib.request,zipfile,concurrent.futures
URLS={
 'myfah_static':'https://electrokinisi.yme.gov.gr/public/static_files/GR.IDRO.static.data.latest.json.zip',
 'fines_locations':'https://public.finescharging.com/v1/locations.geojson',
 'fines_live':'https://public.finescharging.com/v1/live.json',
}
def shape(value,depth=0):
 if depth>6:return type(value).__name__
 if isinstance(value,list):return {'count':len(value),'first':shape(value[0],depth+1) if value else None}
 if isinstance(value,dict):return {k:('redacted' if any(s in k.lower() for s in ['token','password','deddie']) else shape(v,depth+1)) for k,v in list(value.items())[:45]}
 return value[:100] if isinstance(value,str) else value
def inspect(item):
 name,url=item
 try:
  req=urllib.request.Request(url,headers={'User-Agent':'EVBalkan/1.4 public-data integration (github.com/tosilabs/ev-balkan-web)'})
  with urllib.request.urlopen(req,timeout=45) as response:
   raw=response.read(60*1024*1024)
  if url.endswith('.zip'):
   with zipfile.ZipFile(io.BytesIO(raw)) as archive:
    file=next(x for x in archive.infolist() if x.filename.lower().endswith('.json') and not x.is_dir())
    if file.file_size>100*1024*1024:raise ValueError('JSON too large')
    raw=archive.read(file)
  data=json.loads(raw.decode('utf-8-sig'))
  return {'source':name,'url':url,'shape':shape(data)}
 except Exception as error:return {'source':name,'error':str(error)}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
 for result in executor.map(inspect,URLS.items()):print('OPEN_DATA_INSPECT '+json.dumps(result,ensure_ascii=False),flush=True)
