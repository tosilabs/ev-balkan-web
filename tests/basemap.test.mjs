import test from 'node:test';
import assert from 'node:assert/strict';
import {initBasemap} from '../dist/basemap.mjs';
test('MapLibre 4 without a supported() export starts and keeps raster until the vector map is ready',()=>{
 const oldGL=globalThis.maplibregl,oldDocument=globalThis.document;globalThis.maplibregl={};globalThis.document={body:{dataset:{}}};
 const layers=new Set(),map={hasLayer:l=>layers.has(l),removeLayer:l=>layers.delete(l)};let loaded;
 const raster={addTo(){layers.add(this);return this;}},vector={addTo(){layers.add(this);return this;},getMaplibreMap:()=>({getContainer:()=>({style:{}}),once:(event,callback)=>{loaded=callback;}})};
 try{initBasemap(map,{tileLayer:()=>raster,maplibreGL:()=>vector});assert.ok(layers.has(raster));assert.ok(layers.has(vector));loaded();assert.ok(!layers.has(raster));assert.equal(globalThis.document.body.dataset.basemap,'vector');}
 finally{globalThis.maplibregl=oldGL;globalThis.document=oldDocument;}
});
test('A failed vector/WebGL initialization preserves the working raster map',()=>{
 const old=globalThis.maplibregl;globalThis.maplibregl={};const layers=new Set(),map={hasLayer:l=>layers.has(l),removeLayer:l=>layers.delete(l)},raster={addTo(){layers.add(this);return this;}};
 try{assert.doesNotThrow(()=>initBasemap(map,{tileLayer:()=>raster,maplibreGL:()=>{throw Error('WebGL disabled');}}));assert.ok(layers.has(raster));}finally{globalThis.maplibregl=old;}
});
