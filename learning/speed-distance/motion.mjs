export function distance(speed,time){if(!Number.isFinite(speed)||!Number.isFinite(time)||speed<0||speed>5||time<0||time>10)throw new RangeError('範囲外');return speed*time}
export function clampTime(time){return Math.min(10,Math.max(0,time))}
export function describe(speed,time){const d=distance(speed,time);if(speed===0)return '時間が進んでも距離は増えない。車は止まり、グラフは水平。';return '1秒ごとに'+speed+'m進む。'+time.toFixed(1)+'秒で'+d.toFixed(1)+'m。速いほどグラフの傾きは大きい。'}
