import json, urllib.request, math
base='https://tosilabs.github.io/ev-balkan-web/data/'
def fetch(path):
    req=urllib.request.Request(base+path,headers={'User-Agent':'UdhembareAndroidBuild/0.1'})
    with urllib.request.urlopen(req,timeout=20) as res:
        assert res.status==200
        raw=res.read(8_000_001)
        assert len(raw)<=8_000_000
        return json.loads(raw)
index=fetch('registry-index.json')
assert index['schema']==1 and len(index['bounds'])==4 and isinstance(index['tiles'],dict)
key='41_21'
assert key in index['tiles']
tile=fetch('tiles/'+key+'.json')
assert tile['builtAt']==index['builtAt'] and isinstance(tile['elements'],list)
assert any((e.get('tags',{}).get('socket:type2_combo') not in (None,'0','no','') or any(c.get('label')=='CCS2' for c in e.get('connections',[]))) for e in tile['elements'])
print('PUBLIC_ANDROID_REGISTRY_OK',json.dumps({'fetchedAt':index['fetchedAt'],'tile':key,'records':len(tile['elements'])}))
