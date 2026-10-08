import test from 'node:test';import assert from 'node:assert/strict';import {pointAt,areaAt,positionOf} from '../learning/point-p/point-p.mjs';
test('A/B/C endpoint coordinates',()=>{assert.deepEqual(pointAt(0),{x:0,y:0});assert.deepEqual(pointAt(6),{x:6,y:0});assert.deepEqual(pointAt(9),{x:6,y:3})});
test('triangle APC area at boundaries',()=>{assert.equal(areaAt(0),0);assert.equal(areaAt(6),9);assert.equal(areaAt(9),0)});
test('piecewise area across both edges',()=>{for(let i=0;i<=900;i++){const t=i/100,p=positionOf(t),det=Math.abs(3*p.x-6*p.y)/2;assert.ok(Math.abs(p.area-det)<1e-10);assert.ok(Math.abs(p.area-(t<=6?1.5*t:3*(9-t)))<1e-9)}});
test('continuous at corner',()=>{assert.ok(Math.abs(areaAt(6-1e-7)-9)<1e-6);assert.ok(Math.abs(areaAt(6+1e-7)-9)<1e-6)});
test('invalid values rejected',()=>{for(const t of [-1,10,NaN,Infinity])assert.throws(()=>pointAt(t),RangeError)});
