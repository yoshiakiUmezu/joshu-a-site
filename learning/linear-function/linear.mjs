export function validate(a,b){if(!Number.isFinite(a)||!Number.isFinite(b)||a < -4||a>4||b < -5||b>5)throw new RangeError('a or b out of range')}
export function valueAt(a,b,x){validate(a,b);if(!Number.isFinite(x))throw new RangeError('x out of range');return a*x+b}
export function samples(a,b){return [{x:0,y:valueAt(a,b,0)},{x:1,y:valueAt(a,b,1)}]}
export function description(a,b){validate(a,b);const up=a===0?'右に1進んでも高さは変わらない':`右に1進むと${a>0?'上':'下'}に${Math.abs(a)}進む`;const cut=b===0?'y軸の0（原点）を通る':`y軸の${b}を通る`;return {slope:up,intercept:cut}}
export function expression(a,b){validate(a,b);if(a===0)return 'y = '+b;const x=a===1?'x':a===-1?'−x':a+'x';return 'y = '+x+(b===0?'':b>0?' + '+b:' − '+Math.abs(b))}
