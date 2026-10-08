import assert from 'node:assert/strict';
import { createReadStream, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, resolve, sep } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lessonPath = '/learning/speed-distance-time/';
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
};
const viewports = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 390, height: 844 },
];

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
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
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

async function setRange(page, selector, value) {
  await page.locator(selector).evaluate((input, nextValue) => {
    input.value = String(nextValue);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

async function tapRange(page, selector, fraction) {
  const slider = page.locator(selector);
  const box = await slider.boundingBox();
  assert.ok(box, `${selector} should be visible`);
  await slider.tap({
    position: {
      x: Math.max(1, Math.min(box.width - 1, box.width * fraction)),
      y: box.height / 2,
    },
  });
}

async function readState(page) {
  return page.evaluate(() => {
    const text = id => document.getElementById(id).textContent.trim();
    const carTransform = document.getElementById('car').getAttribute('transform');
    const carX = Number(carTransform.match(/translate\(([-\d.]+)/)?.[1]);
    const point = document.getElementById('graphPoint');
    return {
      speed: Number(text('speedValue')),
      speedText: text('speedValue'),
      time: Number(text('timeValue')),
      timeText: text('timeValue'),
      distance: Number(text('distanceValue')),
      distanceText: text('distanceValue'),
      speedInput: Number(document.getElementById('speed').value),
      timeInput: Number(document.getElementById('time').value),
      speedOutput: document.getElementById('speedOut').textContent.trim(),
      timeOutput: document.getElementById('timeOut').textContent.trim(),
      carX,
      roadTrailEnd: Number(document.getElementById('roadTrail').getAttribute('d').match(/H([-\d.]+)$/)?.[1]),
      graphX: Number(point.getAttribute('cx')),
      graphY: Number(point.getAttribute('cy')),
      pointText: document.getElementById('pointText').textContent.trim(),
      explanation: text('explain'),
      playing: document.getElementById('play').getAttribute('aria-pressed') === 'true',
    };
  });
}

function assertValuesSynced(state) {
  const roundedDistance = Math.round((state.speed * state.time + Number.EPSILON) * 10) / 10;
  assert.equal(state.distance, roundedDistance, 'distance metric should equal speed × displayed time');
  assert.equal(state.speedInput, state.speed, 'speed slider should match the displayed speed');
  assert.equal(state.timeInput, state.time, 'time slider should match the displayed time');
}

function assertVisualsSynced(state) {
  assertValuesSynced(state);
  const unroundedDistance = state.speed * state.time;
  const expectedCarX = 20 + 280 * unroundedDistance / 50;
  const expectedGraphX = 32 + 272 * state.time / 10;
  const expectedGraphY = 150 - 130 * unroundedDistance / 50;
  assert.ok(Math.abs(state.carX - expectedCarX) < 0.01, 'car position should match displayed distance');
  assert.ok(Math.abs(state.roadTrailEnd - expectedCarX) < 0.01, 'road trail should match displayed distance');
  assert.ok(Math.abs(state.graphX - expectedGraphX) < 0.01, 'graph point time should match displayed time');
  assert.ok(Math.abs(state.graphY - expectedGraphY) < 0.01, 'graph point distance should match displayed distance');
  assert.ok(state.pointText.includes(`${state.timeText}秒 / ${state.distanceText}m`), 'graph point label should match numeric readouts');
  if (state.speed === 0) {
    assert.match(state.explanation, /距離は増えない/);
  } else {
    assert.equal(state.explanation, `距離＝速さ×時間。${state.speed}m/秒×${state.timeText}秒＝${state.distanceText}m。`);
  }
}

async function assertMobileLayout(page, viewport, textScale) {
  const layout = await page.evaluate(() => {
    const controls = [...document.querySelectorAll('input[type="range"], button')];
    const road = document.querySelector('.road').getBoundingClientRect();
    const chart = document.querySelector('.chart').getBoundingClientRect();
    const main = document.querySelector('main').getBoundingClientRect();
    const labels = [...document.querySelectorAll('#grid text, #pointText')].map(node => {
      const box = node.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
    });
    const car = document.getElementById('car').getBoundingClientRect();
    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      mainBottom: main.bottom,
      controlSizes: controls.map(node => {
        const box = node.getBoundingClientRect();
        return { height: box.height, left: box.left, right: box.right };
      }),
      road: { left: road.left, right: road.right },
      chart: { left: chart.left, right: chart.right },
      car: { left: car.left, right: car.right },
      labels,
    };
  });

  assert.ok(layout.scrollWidth <= layout.innerWidth, 'page should not scroll horizontally');
  assert.ok(layout.scrollHeight <= layout.innerHeight + 2, 'controls and explanation should fit without vertical scrolling');
  assert.ok(layout.mainBottom <= viewport.height + 2, 'main content should fit in the emulated screen');
  assert.ok(layout.controlSizes.every(control => control.height >= 44), 'touch controls should be at least 44 CSS px high');
  assert.ok(layout.controlSizes.every(control => control.left >= 0 && control.right <= viewport.width), 'touch controls should remain inside the screen');
  assert.ok(layout.road.left >= 0 && layout.road.right <= viewport.width, 'road illustration should remain in the viewport');
  assert.ok(layout.chart.left >= 0 && layout.chart.right <= viewport.width, 'chart should remain in the viewport');
  assert.ok(layout.car.left >= layout.road.left - 1 && layout.car.right <= layout.road.right + 1, 'car should remain inside the road illustration');
  assert.ok(layout.labels.every(label => label.left >= layout.chart.left - 1 && label.right <= layout.chart.right + 1), 'graph labels should not be clipped');

  if (textScale === 1.25) {
    const enlarged = await page.locator('#explain').evaluate(el => Number.parseFloat(getComputedStyle(el).fontSize));
    assert.ok(enlarged >= 15, 'text enlargement should be applied to explanatory text');
  }
}

test('mobile touch, viewport, text enlargement, playback, and synchronized visuals', async t => {
  for (const viewport of viewports) {
    for (const textScale of [1, 1.25]) {
      await t.test(`${viewport.width}×${viewport.height}, text ${Math.round(textScale * 100)}%`, async () => {
        const context = await browser.newContext({
          viewport,
          deviceScaleFactor: 3,
          isMobile: true,
          hasTouch: true,
        });
        const page = await context.newPage();

        try {
          await page.goto(`${baseUrl}${lessonPath}`, { waitUntil: 'networkidle' });
          await page.locator('#graphPoint').waitFor();

          if (textScale > 1) {
            await page.evaluate(scale => {
              const selectors = [
                'h1', '.hint', '.metric small', '.metric strong', '.metric em', '.label',
                '.control-row label', '.control-row output', 'button', '.explain',
                'details summary', 'details p', '#grid text', '#pointText',
              ].join(',');
              document.querySelectorAll(selectors).forEach(element => {
                const fontSize = Number.parseFloat(getComputedStyle(element).fontSize);
                element.style.setProperty('font-size', `${fontSize * scale}px`, 'important');
              });
            }, textScale);
          }

          await assertMobileLayout(page, viewport, textScale);

          // Use actual mobile-emulated taps on both range controls.
          await tapRange(page, '#speed', 0.9);
          assert.ok(Number(await page.locator('#speed').inputValue()) >= 4.5, 'touching the speed range should change its value');
          await tapRange(page, '#time', 0.75);
          assert.ok(Number(await page.locator('#time').inputValue()) >= 6.5, 'touching the time range should change its value');

          // Deterministic boundary checks through the same input event used by the UI.
          await setRange(page, '#speed', 0);
          await setRange(page, '#time', 0);
          let state = await readState(page);
          assertVisualsSynced(state);
          assert.equal(state.distance, 0);
          assert.equal(state.carX, 20);

          await setRange(page, '#speed', 5);
          await setRange(page, '#time', 10);
          state = await readState(page);
          assertVisualsSynced(state);
          assert.equal(state.distance, 50);
          assert.equal(state.carX, 300);
          assert.equal(state.roadTrailEnd, 300);
          assert.equal(state.graphX, 304);
          assert.equal(state.graphY, 20);
          assert.match(state.pointText, /10\.0秒 \/ 50\.0m/);
          assert.match(state.explanation, /5m\/秒×10\.0秒＝50\.0m/);
          await assertMobileLayout(page, viewport, textScale);

          // Starting at the end restarts from zero; touch pause/resume must keep every readout in sync.
          await page.locator('#play').tap();
          assert.equal((await readState(page)).playing, true);
          await page.waitForTimeout(300);
          state = await readState(page);
          assert.ok(state.time > 0 && state.time < 10, 'play from 10 seconds should restart at zero and advance');
          assertVisualsSynced(state);

          // Changing speed while playing updates the displayed distance immediately.
          await tapRange(page, '#speed', 0.5);
          state = await readState(page);
          assertVisualsSynced(state);
          assert.ok(state.speed > 0 && state.speed < 5, 'touch speed change should work while playing');
          await tapRange(page, '#time', 0.6);
          state = await readState(page);
          assertVisualsSynced(state);
          assert.ok(state.time > 5 && state.time < 7, 'touch time seek should work while playing');
          await page.locator('#play').tap();
          assert.equal((await readState(page)).playing, false);
          const pausedTime = (await readState(page)).time;
          await page.waitForTimeout(250);
          assert.equal((await readState(page)).time, pausedTime, 'time should remain fixed while paused');
          await page.locator('#play').tap();
          await page.waitForTimeout(250);
          state = await readState(page);
          assert.ok(state.time > pausedTime, 'resume should advance from the paused time');
          assertVisualsSynced(state);
          await page.locator('#play').tap();

          await page.locator('#reset').tap();
          state = await readState(page);
          assert.equal(state.time, 0);
          assert.equal(state.playing, false);
          assertVisualsSynced(state);
        } finally {
          await context.close();
        }
      });
    }
  }
});

test('learning catalog mobile layout, filters, lesson links, and return path', async t => {
  for (const viewport of viewports) {
    for (const textScale of [1, 1.25]) {
      await t.test(`${viewport.width}×${viewport.height}, text ${Math.round(textScale * 100)}%`, async () => {
        const context = await browser.newContext({
          viewport,
          deviceScaleFactor: 3,
          isMobile: true,
          hasTouch: true,
        });
        const page = await context.newPage();

        try {
          await page.goto(`${baseUrl}/learning/`, { waitUntil: 'networkidle' });
          if (textScale > 1) {
            await page.evaluate(scale => {
              document.querySelectorAll('.breadcrumbs, h1, .intro p, h2, .filter, .lesson-meta, .lesson-copy h3, .lesson-description').forEach(element => {
                const fontSize = Number.parseFloat(getComputedStyle(element).fontSize);
                element.style.setProperty('font-size', `${fontSize * scale}px`, 'important');
              });
            }, textScale);
          }

          const initial = await page.evaluate(() => ({
            width: window.innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
            filters: [...document.querySelectorAll('[data-filter]')].map(element => {
              const box = element.getBoundingClientRect();
              return { height: box.height, left: box.left, right: box.right };
            }),
            card: (() => {
              const box = document.querySelector('[data-learning-card]').getBoundingClientRect();
              return { height: box.height, left: box.left, right: box.right };
            })(),
            visibleLessons: [...document.querySelectorAll('[data-learning-item]')].filter(item => !item.hidden).length,
          }));
          assert.ok(initial.scrollWidth <= initial.width, 'catalog should not scroll horizontally');
          assert.ok(initial.filters.every(filter => filter.height >= 44 && filter.left >= 0 && filter.right <= viewport.width), 'filter buttons should be visible 44px tap targets');
          assert.ok(initial.card.height >= 44 && initial.card.left >= 0 && initial.card.right <= viewport.width, 'lesson card should be a visible tap target');
          assert.equal(initial.visibleLessons, 1);

          await page.locator('#subject-math').tap();
          assert.equal(await page.locator('#subject-math').getAttribute('aria-pressed'), 'true');
          assert.equal(new URL(page.url()).hash, '#subject-math');
          assert.equal(await page.locator('[data-learning-item]:visible').count(), 1);
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'filtered catalog should not scroll horizontally');

          await Promise.all([
            page.waitForURL(url => url.pathname === lessonPath),
            page.locator('[data-learning-card]').tap(),
          ]);
          assert.equal(new URL(page.url()).pathname, lessonPath);
          assert.equal(await page.locator('h1').textContent(), '動きとグラフはどうつながる？');
          assert.equal(await page.locator('.breadcrumbs a[href="/learning/"]').count(), 1);
          await Promise.all([
            page.waitForURL(url => url.pathname === '/learning/'),
            page.locator('.lesson-exit a').tap(),
          ]);
          assert.equal(new URL(page.url()).pathname, '/learning/');
          assert.equal(await page.locator('[data-filter="all"]').getAttribute('aria-pressed'), 'true');
          assert.equal(await page.locator('[data-learning-item]:visible').count(), 1);
        } finally {
          await context.close();
        }
      });
    }
  }
});

test('home presents one latest lesson and links to the catalog and lesson; unknown lesson is 404', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('[data-featured-learning]').count(), 1);
    await Promise.all([
      page.waitForURL(url => url.pathname === '/learning/'),
      page.locator('#learning a[href="/learning/"]').tap(),
    ]);
    assert.equal(new URL(page.url()).pathname, '/learning/');
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await Promise.all([
      page.waitForURL(url => url.pathname === lessonPath),
      page.locator('[data-featured-learning]').tap(),
    ]);
    assert.equal(new URL(page.url()).pathname, lessonPath);
    const missing = await page.goto(`${baseUrl}/learning/not-a-real-lesson/`);
    assert.equal(missing.status(), 404);
  } finally {
    await context.close();
  }
});
