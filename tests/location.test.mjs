import test from 'node:test';
import assert from 'node:assert/strict';
import {locationFix} from '../dist/location.mjs';
test('GPS retains source time and accuracy, so a cached location is not presented as new',()=>{
 const p=locationFix({coords:{latitude:42,longitude:21,accuracy:38},timestamp:100000},160000);
 assert.deepEqual(p,{point:{lat:42,lon:21},accuracy:38,at:100000});
 assert.equal(locationFix({coords:{latitude:42,longitude:21,accuracy:NaN},timestamp:170000},160000).at,160000);
 assert.equal(locationFix({coords:{latitude:42,longitude:21,accuracy:null}},160000).accuracy,null);
 assert.throws(()=>locationFix({coords:{latitude:142,longitude:21}}));
});
