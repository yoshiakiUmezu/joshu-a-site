export function distance(speed, time) {
  if (!Number.isFinite(speed) || !Number.isFinite(time) || speed < 0 || speed > 5 || time < 0 || time > 10) {
    throw new RangeError('範囲外');
  }
  return speed * time;
}

export function formatValue(value) {
  return (Math.round((value + Number.EPSILON) * 10) / 10).toFixed(1);
}

export function clampTime(time) {
  return Math.min(10, Math.max(0, time));
}

export function createMotionState() {
  return { speed: 2, time: 3, playing: false, last: null };
}

export function setSpeed(state, speed) {
  if (!Number.isFinite(speed) || speed < 0 || speed > 5) throw new RangeError('範囲外');
  state.speed = speed;
  return state;
}

export function seekTime(state, time) {
  state.time = clampTime(time);
  state.last = null;
  return state;
}

export function pauseMotion(state) {
  state.playing = false;
  state.last = null;
  return state;
}

export function startMotion(state) {
  if (state.time >= 10) state.time = 0;
  state.playing = true;
  state.last = null;
  return state;
}

export function resetMotion(state) {
  seekTime(state, 0);
  return pauseMotion(state);
}

export function advanceMotion(state, now) {
  if (!state.playing) return state;
  if (state.last !== null) state.time = clampTime(state.time + Math.max(0, (now - state.last) / 1000));
  state.last = now;
  if (state.time >= 10) {
    state.time = 10;
    pauseMotion(state);
  }
  return state;
}

export function describe(speed, time) {
  const d = distance(speed, time);
  if (speed === 0) return '時間が進んでも距離は増えない。車は止まり、グラフは水平。';
  return '1秒ごとに' + speed + 'm進む。' + formatValue(time) + '秒で' + formatValue(d) + 'm。速いほどグラフの傾きは大きい。';
}
