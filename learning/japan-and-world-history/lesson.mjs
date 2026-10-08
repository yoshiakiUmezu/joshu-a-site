import {events, historyAt} from './model.mjs';

const $ = id => document.getElementById(id);
const range = $('eventIndex');
const buttons = document.querySelector('.buttons');
buttons.style.gridTemplateColumns = 'repeat(4,minmax(0,1fr))';

const sourceButton = document.createElement('button');
sourceButton.id = 'showSources';
sourceButton.type = 'button';
sourceButton.textContent = '出典';
sourceButton.setAttribute('aria-label', '現在の出来事の出典');
buttons.append(sourceButton);

const sourceDialog = document.createElement('dialog');
sourceDialog.id = 'sourceDialog';
sourceDialog.setAttribute('aria-labelledby', 'sourceHeading');
sourceDialog.innerHTML = '<h2 id="sourceHeading"></h2><p>選択中の出来事に対応する日本と世界の資料です。</p><div id="sourceLinks"></div><button id="closeSources" type="button">閉じる</button>';
document.body.append(sourceDialog);
const sourceStyle = document.createElement('style');
sourceStyle.textContent = `#sourceDialog{box-sizing:border-box;width:min(380px,calc(100vw - 24px));max-height:calc(100svh - 24px);padding:14px;border:1px solid #64748b;border-radius:14px;background:#111d30;color:#eff6ff;box-shadow:0 14px 48px #000a}#sourceDialog::backdrop{background:#020617c9}#sourceDialog h2{font-size:18px;margin:0 0 6px}#sourceDialog p{font-size:13px;line-height:1.4;margin:0 0 8px}#sourceLinks{display:grid;gap:5px;margin-bottom:10px}#sourceLinks a{display:flex;align-items:center;min-height:44px;padding:5px 9px;border:1px solid #475569;border-radius:8px;color:#c7eaff;font-size:12px;line-height:1.25;overflow-wrap:anywhere}#closeSources{width:100%}`;
document.head.append(sourceStyle);
sourceButton.addEventListener('click', () => sourceDialog.showModal());
$('closeSources').addEventListener('click', () => sourceDialog.close());
sourceDialog.addEventListener('click', event => { if (event.target === sourceDialog) sourceDialog.close(); });
sourceDialog.addEventListener('close', () => sourceButton.focus());

function updateSources(event, index) {
  $('sourceHeading').textContent = `出典 ${index + 1} / ${events.length}`;
  const links = $('sourceLinks');
  links.replaceChildren();
  for (const [side, citations] of [['日本', event.sources.japan], ['世界', event.sources.world]]) {
    for (const citation of citations) {
      const anchor = document.createElement('a');
      anchor.href = citation.url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.textContent = `${side}・${citation.region}：${citation.label}`;
      links.append(anchor);
    }
  }
}

function draw() {
  const index = Number(range.value);
  const event = historyAt(index);
  $('eventOut').textContent = `${index + 1} / ${events.length}`;
  $('eraValue').textContent = event.era;
  $('yearValue').textContent = event.jpDate;
  $('worldYearValue').textContent = event.worldDate;
  $('jpTitle').textContent = event.jp;
  $('worldTitle').textContent = event.world;
  $('historyNote').textContent = event.note;
  $('periodLabel').textContent = event.era;
  const dotX = String(100 + index / (events.length - 1) * 210);
  $('jpDot').setAttribute('cx', dotX);
  $('worldDot').setAttribute('cx', dotX);
  $('explain').textContent = `${event.jpDate}：${event.jp}。世界では${event.worldDate}ごろに${event.world}。年代の幅や史料上の注意も確認してください。`;
  updateSources(event, index);
}

range.addEventListener('input', draw);
$('prev').addEventListener('click', () => { range.value = String(Math.max(0, Number(range.value) - 1)); draw(); });
$('next').addEventListener('click', () => { range.value = String(Math.min(events.length - 1, Number(range.value) + 1)); draw(); });
$('reset').addEventListener('click', () => { range.value = '0'; draw(); });
draw();
