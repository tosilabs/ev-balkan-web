import test from 'node:test';
import assert from 'node:assert/strict';
import {migrateLegacyStorage} from '../dist/storage.mjs';
import {siteUrl,publishedDataUrls} from '../scripts/project.mjs';
test('Udhëmbarë copies known legacy history and favourites without removing or overwriting data',()=>{
 const map=new Map([['evb-history-v1','[{"mode":"place"}]'],['evb-favourites','[{"id":"node/1"}]'],['udhembare-settings-v2','{"radius":25}'],['evb-settings-v2','{"radius":10}'],['evb-origin','bad json'],['unrelated-account','private']]);
 const storage={getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};
 assert.equal(migrateLegacyStorage(storage),true);assert.equal(map.get('udhembare-history-v1'),map.get('evb-history-v1'));assert.equal(map.get('udhembare-favourites'),map.get('evb-favourites'));assert.equal(map.get('udhembare-settings-v2'),'{"radius":25}');assert.equal(map.has('udhembare-origin'),false);assert.equal(map.has('udhembare-unrelated-account'),false);
 assert.equal(migrateLegacyStorage(storage),true);assert.equal(map.get('unrelated-account'),'private');
});
test('Blocked browser storage does not prevent startup',()=>{
 assert.equal(migrateLegacyStorage({getItem(){throw Error('not allowed');}}),false);
});
test('Published dataset references follow the configured/current repository rather than a legacy site',()=>{
 assert.ok(siteUrl.startsWith('https://'));assert.equal(publishedDataUrls('osm-base.json')[0],new URL('data/osm-base.json',siteUrl).href);assert.throws(()=>publishedDataUrls('../private'));
});
