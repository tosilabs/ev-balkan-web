from project_info import USER_AGENT
"""Read visual identity and store links published on the operator's own pages.
Only external references are stored: logos remain on the official publisher's host.
Failures retain the curated profile; a failed image falls back to initials in the UI.
"""
import json, urllib.request, concurrent.futures
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin,urlparse
from datetime import datetime,timezone
class Page(HTMLParser):
 def __init__(self):super().__init__();self.icons=[];self.logos=[];self.links=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='link' and 'icon' in a.get('rel','').lower() and a.get('href'):self.icons.append(a['href'])
  if tag=='img' and 'logo' in (a.get('alt','')+' '+a.get('class','')+' '+a.get('src','')).lower() and a.get('src'):self.logos.append(a['src'])
  if tag=='a' and a.get('href'):self.links.append(a['href'])
def url(base,raw):
 value=urljoin(base,raw);p=urlparse(value)
 return value if p.scheme=='https' and p.hostname and not p.username and not p.password else ''
def update(profile):
 p=dict(profile)
 try:
  target=p.get('appPage') or p['website']
  req=urllib.request.Request(target,headers={'User-Agent':USER_AGENT})
  with urllib.request.urlopen(req,timeout=18) as response:
   # A redirect to an unrelated domain does not establish an official identity.
   if urlparse(response.url).hostname.removeprefix('www.')!=urlparse(target).hostname.removeprefix('www.'):return p
   raw=response.read(2*1024*1024).decode('utf-8','replace');base=response.url
  page=Page();page.feed(raw)
  if not p.get('logo'):
   for candidate in page.icons+page.logos:
    image=url(base,candidate)
    if image:p['logo']=image;p['logoSource']=base;break
  for href in page.links:
   value=url(base,href);parsed=urlparse(value)
   if parsed.hostname=='play.google.com' and parsed.path=='/store/apps/details':p.setdefault('android',value)
   if parsed.hostname=='apps.apple.com' and '/app/' in parsed.path:p.setdefault('ios',value)
   if parsed.path.lower().endswith('.apk') and parsed.hostname==urlparse(p['website']).hostname:p.setdefault('apk',value)
  p['checkedAt']=datetime.now(timezone.utc).isoformat()
  print('PROVIDER_DIRECTORY',p['id'],'logo' if p.get('logo') else 'initials',flush=True)
 except Exception as error:print('PROVIDER_DIRECTORY',p['id'],'curated fallback',type(error).__name__,flush=True)
 return p
profiles=json.loads(Path('dist/providers.json').read_text())['providers']
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:result=list(pool.map(update,profiles))
Path('dist/data').mkdir(exist_ok=True)
Path('dist/data/providers.json').write_text(json.dumps({'providers':result},ensure_ascii=False))
