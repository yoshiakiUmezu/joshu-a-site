import { simulateDie, theoreticalProbability } from './model.mjs';
const $ = id => document.getElementById(id);
const success = $('success'), trials = $('trials'), pips = $('pips');
const points = [[30,30],[90,30],[30,90],[90,90],[60,60],[60,30]];
let seed = 20261008;
function seededRandom() { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2 ** 32; }
function draw() {
  const k = Number(success.value), n = Number(trials.value), probability = theoreticalProbability(k);
  $('successValue').textContent = String(k);
  $('probValue').textContent = `${k}/6`;
  $('fraction').textContent = `${k} / 6`;
  $('successOut').textContent = `${k} / 6`;
  $('trialsOut').textContent = `${n}回`;
  pips.replaceChildren(...points.slice(0, k).map(([cx, cy]) => { const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); dot.setAttribute('cx', cx); dot.setAttribute('cy', cy); dot.setAttribute('r', '8'); return dot; }));
  $('probValue').dataset.probability = String(probability);
  $('explain').textContent = `${k}/6の目を当たりとすると、理論上の確率は${k}/6（約${(probability * 100).toFixed(1)}%）。実験結果は毎回ゆれます。`;
}
success.addEventListener('input', draw);
trials.addEventListener('input', () => { $('resultValue').textContent = '—'; draw(); });
$('roll').addEventListener('click', () => { const result = simulateDie(Number(success.value), Number(trials.value), seededRandom); $('resultValue').textContent = `${result.hits}/${Number(trials.value)}`; $('resultValue').dataset.probability = String(result.observedProbability); });
$('reset').addEventListener('click', () => { success.value = '1'; trials.value = '100'; seed = 20261008; $('resultValue').textContent = '—'; delete $('resultValue').dataset.probability; draw(); });
draw();
