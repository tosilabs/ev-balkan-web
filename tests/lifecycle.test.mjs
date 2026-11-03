import test from 'node:test';
import assert from 'node:assert/strict';
import {createPageTimer} from '../dist/lifecycle.mjs';
test('Periodic checks pause at pagehide, resume once on BFCache return and refresh expired state immediately',()=>{
 const target=new EventTarget(),scheduled=new Map();let next=0,calls=0;
 const dispose=createPageTimer(()=>calls++,30000,{target,schedule:callback=>{scheduled.set(++next,callback);return next;},cancel:id=>scheduled.delete(id)});
 assert.equal(scheduled.size,1);target.dispatchEvent(new Event('pagehide'));assert.equal(scheduled.size,0);
 const restored=new Event('pageshow');Object.defineProperty(restored,'persisted',{value:true});target.dispatchEvent(restored);assert.equal(scheduled.size,1);assert.equal(calls,1);
 target.dispatchEvent(new Event('pageshow'));assert.equal(scheduled.size,1);assert.equal(calls,1);
 dispose();assert.equal(scheduled.size,0);target.dispatchEvent(restored);assert.equal(scheduled.size,0);assert.equal(calls,1);
});
