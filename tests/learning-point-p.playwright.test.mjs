import assert from 'node:assert/strict';
import { createReadStream, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, resolve, sep } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lessonPath = '/learning/point-p/';
const viewports = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 390, height: 844 },
];
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8' };

let server;
let browser;
let baseUrl;

function chromiumLaunchOptions() {
  const configuredPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  if (configuredPath) {
    assert.ok(existsSync(configuredPath), `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH does not exist: ${configuredPath}`);
    return { headless: true, executablePath: configuredPath };
  }

  if (existsSync(chromium.executablePath())) return { headless: true };
  const systemBrowsers = process.platform === 'win32'
    ? [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ]
    : [];
  const executablePath = systemBrowsers.find(existsSync);
  return executablePath ? { headless: true, executablePath } : { headless: true };
}

before(async () => {
  server = createServer((request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    const relativePath = pathname.endsWith('/')
      ? `${pathname.replace(/^\/+|\/+$/g, '')}/index.html`.replace(/^\/index\.html$/, 'index.html')
      : pathname.replace(/^\/+/, '');
    const filePath = resolve(root, relativePath);

    if (filePath !== root && !filePath.startsWith(root + sep)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    if (!existsSync(filePath)) {
      response.writeHead(404).end('Not found');
      return;
    }

    response.writeHead(200, {
      'content-type': mimeTypes[extname(filePath)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    createReadStream(filePath).pipe(response);
  });

  await new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch(chromiumLaunchOptions());
});

after(async () => {
  await browser?.close();
  if (server?.listening) {
    await new Promise((resolveClose, reject) => {
      server.close(error => error ? reject(error) : resolveClose());
    });
  }
});

async function setTime(page, time) {
  await page.locator('#time').evaluate((input, nextValue) => {
    input.value = String(nextValue);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, time);
}

async function tapTime(page, fraction) {
  const slider = page.locator('#time');
  const bounds = await slider.boundingBox();
  assert.ok(bounds, 'time slider should be visible');
  await slider.tap({ position: { x: Math.max(1, Math.min(bounds.width - 1, bounds.width * fraction)), y: bounds.height / 2 } });
}

async function readState(page) {
  return page.evaluate(() => {
    const point = document.querySelector('#point');
    const graphPoint = document.querySelector('#graphPoint');
    const trianglePoints = document.querySelector('#triangle').getAttribute('points').split(' ').map(pair => pair.split(',').map(Number));
    return {
      time: Number(document.querySelector('#time').value),
      displayedTime: Number(document.querySelector('#timeValue').textContent),
      area: Number(document.querySelector('#areaValue').textContent),
      slider: Number(document.querySelector('#time').value),
      output: document.querySelector('#timeOut').textContent,
      point: { x: Number(point.getAttribute('cx')), y: Number(point.getAttribute('cy')) },
      trianglePoints,
      graphPoint: { x: Number(graphPoint.getAttribute('cx')), y: Number(graphPoint.getAttribute('cy')) },
      guide: document.querySelector('#guide').getAttribute('d'),
      explanation: document.querySelector('#explain').textContent,
      button: document.querySelector('#play').textContent,
    };
  });
}

function assertSynced(state) {
  const t = state.time;
  const x = Math.min(t, 6);
  const y = Math.max(0, t - 6);
  const area = Math.abs(3 * x - 6 * y) / 2;
  assert.ok(Math.abs(state.area - Math.round(area * 10) / 10) <= 0.1, 'rounded area readout should match point P');
  assert.equal(state.slider, t, 'slider should match displayed time');
  assert.ok(Math.abs(state.displayedTime - Number(t.toFixed(1))) <= 0.1, 'rounded time readout should match slider time');
  assert.equal(state.output, state.displayedTime.toFixed(1) + '秒', 'time output should match displayed time');
  assert.ok(Math.abs(state.point.x - (55 + 38 * x)) <= 0.2, 'point P x should match its position');
  assert.ok(Math.abs(state.point.y - (132 - 38 * y)) <= 0.2, 'point P y should match its position');
  const expectedTriangle = [[55, 132], [55 + 38 * x, 132 - 38 * y], [283, 18]];
  for (const [index, expected] of expectedTriangle.entries()) {
    assert.ok(Math.abs(state.trianglePoints[index][0] - expected[0]) <= 0.2, 'triangle x coordinates should use point P');
    assert.ok(Math.abs(state.trianglePoints[index][1] - expected[1]) <= 0.2, 'triangle y coordinates should use point P');
  }
  assert.ok(Math.abs(state.graphPoint.x - (42 + 30 * t)) <= 0.2, 'graph x should match time');
  assert.ok(Math.abs(state.graphPoint.y - (145 - 14 * area)) <= 0.2, 'graph y should match area');
  const guideValues = state.guide.match(/[-\d.]+/g).map(Number);
  const expectedGuide = [42 + 30 * t, 145, 145 - 14 * area, 42];
  assert.equal(guideValues.length, expectedGuide.length, 'graph guide should have the expected coordinates');
  expectedGuide.forEach((value, index) => assert.ok(Math.abs(guideValues[index] - value) <= 0.2, 'graph guide should match time and area'));
  assert.match(state.explanation, t <= 6 ? /面積が増える/ : /面積が減る/);
}
async function assertFits(page, viewport, textScale) {
  const layout = await page.evaluate(() => {
    const svgBounds = [...document.querySelectorAll('.figure, .graph')].map(svg => {
      const box = svg.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
    });
    const controls = [...document.querySelectorAll('input[type="range"], button')].map(control => {
      const box = control.getBoundingClientRect();
      return { width: box.width, height: box.height, left: box.left, right: box.right };
    });
    const graphLabels = [...document.querySelectorAll('#grid text')].map(label => {
      const box = label.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
    });
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      mainBottom: document.querySelector('main').getBoundingClientRect().bottom,
      svgBounds,
      controls,
      graphLabels,
      point: document.querySelector('#point').getBoundingClientRect().toJSON(),
    };
  });
  assert.ok(layout.scrollWidth <= layout.width, 'page should not scroll horizontally');
  assert.ok(layout.scrollHeight <= layout.height + 2, `page should fit without vertical scroll: ${JSON.stringify(layout)}`);
  assert.ok(layout.mainBottom <= viewport.height + 2, 'main content should fit within the viewport');
  assert.ok(layout.svgBounds.every(box => box.left >= 0 && box.right <= viewport.width), 'figures should fit horizontally');
  assert.ok(layout.controls.every(box => box.height >= 44 && box.left >= 0 && box.right <= viewport.width), 'controls should be visible 44px tap targets');
  assert.ok(layout.graphLabels.every(label => label.left >= layout.svgBounds[1].left - 1 && label.right <= layout.svgBounds[1].right + 1), 'graph labels should not be clipped');
  assert.ok(layout.point.left >= layout.svgBounds[0].left - 1 && layout.point.right <= layout.svgBounds[0].right + 1, 'point P should remain inside the figure');
  if (textScale > 1) {
    const scaled = await page.locator('#explain').evaluate(el => Number.parseFloat(getComputedStyle(el).fontSize));
    assert.ok(scaled >= 16, '125% explanatory text should remain readable');
  }
}

test('Point P touch, six mobile conditions, interval boundary, playback, and synchronized displays', async t => {
  for (const viewport of viewports) {
    for (const textScale of [1, 1.25]) {
      await t.test(`${viewport.width}×${viewport.height}, text ${Math.round(textScale * 100)}%`, async () => {
        const context = await browser.newContext({ viewport, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
        const page = await context.newPage();
        try {
          await page.goto(`${baseUrl}${lessonPath}`, { waitUntil: 'networkidle' });
          if (textScale > 1) {
            await page.evaluate(scale => {
              const selectors = 'h1,.sub,.metrics small,.metrics strong,.label,.control label,.control output,button,.desc,details,summary,svg text';
              document.querySelectorAll(selectors).forEach(element => {
                const size = Number.parseFloat(getComputedStyle(element).fontSize);
                element.style.setProperty('font-size', `${size * scale}px`, 'important');
              });
            }, textScale);
          }

          await setTime(page, 6);
          let state = await readState(page);
          assertSynced(state);
          assert.equal(state.area, 9, 'at six seconds P is at B and area reaches nine');
          assert.deepEqual(state.point, { x: 283, y: 132 });
          assert.equal(state.graphPoint.x, 222);
          assert.equal(state.graphPoint.y, 19);
          await assertFits(page, viewport, textScale);

          await setTime(page, 5.99);
          state = await readState(page);
          assertSynced(state);
          assert.match(state.explanation, /増える/);
          await setTime(page, 6.01);
          state = await readState(page);
          assertSynced(state);
          assert.match(state.explanation, /減る/);

          await tapTime(page, 0.45);
          assert.ok(Number(await page.locator('#time').inputValue()) > 3, 'touch should move the time slider');
          await page.locator('#play').tap();
          assert.equal(await page.locator('#play').textContent(), 'Ⅱ 一時停止');
          await page.waitForTimeout(250);
          state = await readState(page);
          assert.ok(state.time > 3, 'playback should advance');
          assertSynced(state);
          await page.locator('#play').tap();
          assert.equal(await page.locator('#play').textContent(), '▶ 再生');
          const stoppedAt = (await readState(page)).time;
          await page.waitForTimeout(180);
          assert.equal((await readState(page)).time, stoppedAt, 'pause should hold time');
          await page.locator('#play').tap();
          await page.waitForTimeout(180);
          state = await readState(page);
          assert.ok(state.time > stoppedAt, 'resume should continue from the pause');
          assertSynced(state);
          await page.locator('#reset').tap();
          state = await readState(page);
          assert.equal(state.time, 0);
          assert.equal(state.area, 0);
          assertSynced(state);

          await setTime(page, 8.8);
          await page.locator('#play').tap();
          await page.waitForFunction(() => document.querySelector('#play').textContent === '▶ 再生', null, { timeout: 1500 });
          assert.equal(await page.locator('#play').textContent(), '▶ 再生', 'playback should stop at nine seconds');
          state = await readState(page);
          assertSynced(state);
          assert.equal(state.area, 0, 'at nine seconds P reaches C and area returns to zero');
          assert.deepEqual(state.point, { x: 283, y: 18 });
          await assertFits(page, viewport, textScale);
          await page.locator('#play').tap();
          assert.equal((await readState(page)).time, 0, 'play after the end should restart at zero');
          assert.equal(await page.locator('#play').textContent(), 'Ⅱ 一時停止');
          await page.locator('#play').tap();
        } finally {
          await context.close();
        }
      });
    }
  }
});
