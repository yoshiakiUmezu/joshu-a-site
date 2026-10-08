import assert from 'node:assert/strict';
import { createReadStream, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, resolve, sep } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const viewports = [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 390, height: 844 }];
const lessons = [
  { path: '/learning/proportion/', slider: '#x', value: '10', result: '#xValue', expected: '10.0', reset: '#reset' },
  { path: '/learning/current-voltage/', slider: '#voltage', value: '12', result: '#vValue', expected: '12.0', reset: '#reset' },
  { path: '/learning/geometry-nets/', slider: '#fold', value: '100', result: '#foldValue', expected: '100', reset: '#reset' },
  { path: '/learning/japan-and-world-history/', slider: '#eventIndex', value: '5', result: '#eventOut', expected: '6 / 30', reset: '#reset' },
];
let server, browser, baseUrl;

before(async () => {
  server = createServer((request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    const relative = pathname.endsWith('/') ? `${pathname.slice(1)}index.html` : pathname.slice(1);
    const file = resolve(root, relative);
    if (file !== root && !file.startsWith(root + sep)) return response.writeHead(403).end();
    if (!existsSync(file)) return response.writeHead(404).end();
    response.writeHead(200, { 'content-type': extname(file) === '.mjs' ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8' });
    createReadStream(file).pipe(response);
  });
  await new Promise((resolveListen, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolveListen); });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  const configured = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  const system = process.platform === 'win32' ? ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe','C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'] : [];
  const executablePath = configured && existsSync(configured) ? configured : system.find(existsSync);
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
});
after(async () => { await browser?.close(); if (server?.listening) await new Promise(resolveClose => server.close(resolveClose)); });

for (const lesson of lessons) test(`${lesson.path}: six portrait conditions and synchronized interaction`, async t => {
  for (const viewport of viewports) for (const scale of [1, 1.25]) await t.test(`${viewport.width}×${viewport.height}, ${scale * 100}% text`, async () => {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    try {
      await page.goto(`${baseUrl}${lesson.path}`, { waitUntil: 'networkidle', timeout: 8000 });
      if (scale > 1) await page.evaluate(factor => document.querySelectorAll('h1,.crumb,.row label,.row output,.explain,.foot,.stats small,.stats strong,button,svg text').forEach(el => el.style.setProperty('font-size', `${parseFloat(getComputedStyle(el).fontSize) * factor}px`, 'important')), scale);
      const layout = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, iw: innerWidth, ih: innerHeight, touch: [...document.querySelectorAll('input[type=range],button,.exit a')].map(el => el.getBoundingClientRect().height), bottoms: [...document.querySelectorAll('main > *')].map(el => el.getBoundingClientRect().bottom) }));
      assert.ok(layout.w <= layout.iw, 'no horizontal scrolling');
      assert.ok(layout.h <= layout.ih + 2, 'lesson fits in one screen');
      assert.ok(layout.touch.every(height => height >= 44), 'range and buttons have 44px touch areas');
      assert.ok(layout.bottoms.every(bottom => bottom <= layout.ih + 2), 'all main sections fit within the viewport');
      await page.locator(lesson.slider).evaluate((el, value) => { el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); }, lesson.value);
      assert.equal(await page.locator(lesson.result).textContent(), lesson.expected);
      if (lesson.path.includes('geometry-nets')) {
        assert.equal(await page.locator('#cubeShape').getAttribute('opacity'), '1');
        assert.equal(await page.locator('#netShape').getAttribute('opacity'), '0');
        assert.equal(await page.locator('#foldLabel').textContent(), '立方体');
      }
      if (lesson.path.includes('japan-and-world-history')) {
        assert.equal(await page.locator('#eraValue').textContent(), '飛鳥');
        assert.ok((await page.locator('#jpTitle').textContent()).length > 0);
        assert.ok((await page.locator('#worldTitle').textContent()).length > 0);
        assert.ok((await page.locator('#historyNote').textContent()).length > 0);
        await page.locator('#next').tap();
        assert.equal(await page.locator('#eventOut').textContent(), '7 / 30');
        await page.locator('#prev').tap();
        assert.equal(await page.locator('#eventOut').textContent(), '6 / 30');
      }
      if (lesson.path.includes('current-voltage')) {
        assert.equal(await page.locator('#iValue').textContent(), '4.00');
        assert.match(await page.locator('#explain').textContent(), /I=V\/R/);
      }
      if (lesson.path.includes('proportion')) {
        assert.equal(await page.locator('#yValue').textContent(), '20.00');
        assert.equal(await page.locator('#plotPoint').getAttribute('cx'), '305');
        assert.equal(await page.locator('#plotPoint').getAttribute('cy'), '107');
        assert.ok((await page.locator('#curve').getAttribute('d')).length > 0);
        await page.locator('[data-mode="inverse"]').tap();
        assert.equal(await page.locator('#yValue').textContent(), '0.20');
        assert.match(await page.locator('#explain').textContent(), /y=a\/x/);
      }
      await page.locator(lesson.reset).tap();
    } finally { await context.close(); }
  });
});
