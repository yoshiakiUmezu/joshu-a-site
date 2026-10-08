import test from 'node:test';import assert from 'node:assert/strict';import {distance,clampTime,describe} from '../learning/speed-distance/motion.mjs';
test('代表値・端点・停止',()=>{for(const [v,t,d] of [[2,3,6],[0,10,0],[5,10,50],[0,0,0],[.5,2.5,1.25],[5,0,0]])assert.equal(distance(v,t),d)});
test('全グリッドで距離とグラフ用モデルが一致',()=>{for(let v=0;v<=5;v+=.5)for(let i=0;i<=100;i++){const t=i/10;assert.ok(Math.abs(distance(v,t)-v*t)<1e-10)}});
test('シーク境界',()=>{assert.equal(clampTime(-2),0);assert.equal(clampTime(12),10)});
test('停止説明・速さ説明',()=>{assert.match(describe(0,4),/水平/);assert.match(describe(2,3),/1秒ごとに2m/);assert.match(describe(2,3),/6.0m/)});
test('範囲外は拒否',()=>{for(const [v,t] of [[-1,1],[6,1],[2,-1],[2,11]])assert.throws(()=>distance(v,t),RangeError)});
