import assert from 'node:assert/strict';
import { test } from 'node:test';
import { countSuccesses, simulateDie, theoreticalProbability } from '../learning/probability/model.mjs';

test('fair die outcomes and probability boundaries', () => {
  assert.equal(theoreticalProbability(1), 1 / 6);
  assert.equal(theoreticalProbability(3), 0.5);
  assert.equal(theoreticalProbability(6), 1);
  assert.throws(() => theoreticalProbability(-1), RangeError);
  assert.throws(() => theoreticalProbability(7), RangeError);
});

test('observed relative frequency counts exactly the selected faces', () => {
  assert.equal(countSuccesses([1, 2, 3, 4, 5, 6], 1), 1);
  assert.equal(countSuccesses([1, 2, 3, 4, 5, 6], 3), 3);
  assert.deepEqual(simulateDie(2, 4, () => 0), { rolls: [1, 1, 1, 1], hits: 4, observedProbability: 1 });
  assert.deepEqual(simulateDie(1, 4, () => 0.99), { rolls: [6, 6, 6, 6], hits: 0, observedProbability: 0 });
});
