import test from 'node:test';
import assert from 'node:assert/strict';
import {landingAngle, coastProgress} from '../games/wheel/wheel-motion.js';
import {newWheel, mutateWheel} from '../lib/wheel.mjs';

test('wheel lands with the selected segment center at the right-hand pointer after repeated spins', () => {
  let current = 0;
  for (const count of [1, 4, 7, 25, 200]) {
    for (let index = 0; index < count; index++) {
      const target = landingAngle(current, index, count);
      assert.ok(target - current >= 1800);
      const center = (index + .5) * 360 / count;
      const error = ((target + center - 90) % 360 + 360) % 360;
      assert.ok(Math.min(error, 360 - error) < 1e-7);
      current = target;
    }
  }
});

test('coasting slows continuously and reaches the exact endpoint', () => {
  assert.equal(coastProgress(0), 0);
  assert.equal(coastProgress(1), 1);
  let lastStep = Infinity;
  for (let i = 1; i <= 100; i++) {
    const step = coastProgress(i / 100) - coastProgress((i - 1) / 100);
    assert.ok(step > 0 && step <= lastStep);
    lastStep = step;
  }
  assert.ok(lastStep < 1e-6);
});

test('each spin has its own identity even when the same result repeats', () => {
  const w = newWheel('ABCDEF', 0);
  w.locked = true;
  w.lockedResult = w.options[2];
  mutateWheel(w, 'wheelSpin', {}, {role: 'player'}, 1);
  const first = w.public.spinRevision;
  assert.equal(w.public.resultIndex, 2);
  mutateWheel(w, 'wheelSpin', {}, {role: 'player'}, 2);
  assert.ok(w.public.spinRevision > first);
  assert.equal(w.public.options[w.public.resultIndex], w.public.result);
});
