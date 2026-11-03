import test from 'node:test';
import assert from 'node:assert/strict';
import {settings,parseStations,routeProjection,point} from '../dist/core.mjs';
import {miniTiles} from '../dist/mini-map.mjs';
const line=[point(42,21),point(42,21.1),point(42,21.2)];
const node=(id,lat,lon)=>({type:'node',id,lat,lon,tags:{name:'Station '+id,'socket:type2_combo':'1','socket:type2_combo:output':'150 kW'}});
const elements=[node(2,42,21.18),node(1,42.003,21.01)];
test('Route list starts with the first station on the journey, not the one closest to the line',()=>{
 const rows=parseStations({elements},settings({radius:1,connector:'all'}),line.at(-1),line,line[0]);assert.deepEqual(rows.map(s=>s.id),['node/1','node/2']);assert.ok(rows[0].routePosition<rows[1].routePosition);assert.ok(rows[0].routeOffset>rows[1].routeOffset);assert.ok(rows[0].fromOrigin<rows[1].fromOrigin);
 const offset=parseStations({elements},settings({radius:1,connector:'all',routeSort:'offset'}),line.at(-1),line,line[0]);assert.equal(offset[0].id,'node/2');
});
test('Narrow route corridor removes stations outside 300 m and retains the whole route',()=>{
 const rows=parseStations({elements},settings({radius:.3,connector:'all'}),line.at(-1),line,line[0]);assert.deepEqual(rows.map(s=>s.id),['node/2']);
 assert.doesNotThrow(()=>settings({radius:.3}));assert.throws(()=>settings({radius:.29}));assert.throws(()=>settings({routeSort:'invented'}));
});
test('Progress follows bends and duplicate vertices',()=>{
 const bend=[point(42,21),point(42,21.1),point(42,21.1),point(42.1,21.1)],p=routeProjection(point(42.05,21.1),bend);assert.ok(p.alongKm>10);assert.ok(p.offsetKm<.001);assert.equal(routeProjection(bend[0],[bend[0],bend[0]]).alongKm,0);
});
test('Physical proximity and route order can be selected separately on a returning route',()=>{
 const returning=[point(42,21),point(42,21.2),point(42.1,21.2),point(42.1,21),point(42.001,21)],sites=[node(1,42,21.05),node(2,42.003,21)];
 const parse=routeSort=>parseStations({elements:sites},settings({radius:.5,connector:'all',routeSort}),returning.at(-1),returning,returning[0]);assert.equal(parse('progress')[0].id,'node/1');assert.equal(parse('near')[0].id,'node/2');
});
test('Preview uses the actual Web Mercator location and wraps dateline tiles correctly',()=>{
 for(const lon of [21.4254,179.999,-179.999]){
  const tiles=miniTiles(point(41.9981,lon),380,116);assert.ok(tiles.length>=2&&tiles.length<=6);assert.ok(tiles.every(t=>t.x>=0&&t.x<2**t.zoom&&t.y>=0&&t.y<2**t.zoom));assert.ok(tiles.some(t=>t.left<=0&&t.left+256>=0&&t.top<=0&&t.top+256>=0));
 }
});
