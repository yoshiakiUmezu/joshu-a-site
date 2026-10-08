import assert from 'node:assert/strict';
import { createReadStream, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, resolve, sep } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lessonPaths = ['/learning/probability/'];
const viewports = [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 390, height: 844 }];
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

after(async () => {
  await browser?.close();
  if (server?.listening) await new Promise(resolveClose => server.close(resolveClose));
});

for (const lessonPath of lessonPaths) {
  test(`${lessonPath}: portrait layout, text enlargement, touch and synchronized operation`, async t => {
    for (const viewport of viewports) for (const scale of [1, 1.25]) await t.test(`${viewport.width}×${viewport.height}, ${scale * 100}% text`, async () => {
      const context = await browser.newContext({ viewport, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      try {
        await page.goto(`${baseUrl}${lessonPath}`, { waitUntil: 'networkidle', timeout: 8000 });
        if (scale > 1) await page.evaluate(factor => document.querySelectorAll('h1,.crumb,.row label,.row output,.explain,.footnote,.stat small,.stat strong,button').forEach(el => el.style.setProperty('font-size', `${parseFloat(getComputedStyle(el).fontSize) * factor}px`, 'important')), scale);
        const layout = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, iw: innerWidth, ih: innerHeight, controls: [...document.querySelectorAll('input[type=range],button,.back')].map(el => { const b=el.getBoundingClientRect(); return {h:b.height,left:b.left,right:b.right}; }) }));
        assert.ok(layout.w <= layout.iw, 'no horizontal overflow');
        assert.ok(layout.h <= layout.ih + 2, 'no vertical scrolling in default lesson state');
        assert.ok(layout.controls.every(c => c.h >= 44 && c.left >= 0 && c.right <= layout.iw), 'touch targets are at least 44px and inside the viewport');
        const range = page.locator('#success');
        const box = await range.boundingBox();
        await range.tap({ position: { x: box.width - 2, y: box.height / 2 } });
        assert.equal(await page.locator('#successValue').textContent(), '6');
        await page.locator('#roll').tap();
        assert.match(await page.locator('#resultValue').textContent(), /^\d+\/100$/);
        assert.equal(Number(await page.locator('#resultValue').getAttribute('data-probability')), 1);
        await page.locator('#reset').tap();
        assert.equal(await page.locator('#successValue').textContent(), '1');
        assert.equal(await page.locator('#resultValue').textContent(), '—');
      } finally { await context.close(); }
    });
  });
}
