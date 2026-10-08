export const WIDTH=6,HEIGHT=3,DURATION=9;
export function pointAt(t){if(!Number.isFinite(t)||t<0||t>9)throw new RangeError('time out of range');return t<=6?{x:t,y:0}:{x:6,y:t-6}}
export function areaAt(t){const p=pointAt(t);return Math.abs(p.x*HEIGHT-WIDTH*p.y)/2}
export function positionOf(t){const p=pointAt(t);return {x:p.x,y:p.y,area:areaAt(t)}}
export function explain(t){const p=positionOf(t);return t<=6?'Pが右へ進み、面積が増える。':'Pが上へ進み、面積が減る。'}
