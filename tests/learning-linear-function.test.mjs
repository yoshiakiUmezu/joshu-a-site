import test from 'node:test';import assert from 'node:assert/strict';import {valueAt,samples,expression,description} from '../learning/linear-function/linear.mjs';
test('zero and negative boundaries',()=>{assert.equal(valueAt(0,0,9),0);assert.equal(valueAt(-4,-5,1),-9);assert.equal(valueAt(4,5,1),9)});
test('slope rise and intercept for grid',()=>{for(let a=-4;a<=4;a+=.5)for(let b=-5;b<=5;b+=.5){const p=samples(a,b);assert.equal(p[0].y,b);assert.equal(p[1].y-p[0].y,a)}});
test('display sign cases',()=>{assert.equal(expression(2,3),'y = 2x + 3');assert.equal(expression(-2,-3),'y = -2x − 3');assert.equal(expression(0,0),'y = 0');assert.equal(expression(1,0),'y = x')});
test('zero slope simplifies to a constant and keeps the intercept',()=>{assert.equal(expression(0,3),'y = 3');assert.equal(expression(0,-5),'y = -5');assert.equal(valueAt(0,3,-4),3);assert.equal(description(0,3).slope,'右に1進んでも高さは変わらない')});
test('inclusive slope and intercept limits are valid at both ends',()=>{for(const a of [-4,4])for(const b of [-5,5]){assert.equal(valueAt(a,b,0),b);assert.equal(valueAt(a,b,1),a+b)}assert.equal(valueAt(-0.5,-0.5,1),-1)});
test('descriptions track values',()=>{assert.match(description(-2,-3).slope,/下に2/);assert.match(description(0,0).slope,/変わらない/);assert.match(description(2,3).intercept,/3/)});
test('invalid values just outside the inclusive limits are rejected',()=>{for(const [a,b] of [[4.5,0],[-4.5,0],[0,5.5],[0,-5.5],[NaN,0],[0,Infinity]])assert.throws(()=>valueAt(a,b,1),RangeError);assert.throws(()=>valueAt(0,0,NaN),RangeError)});
