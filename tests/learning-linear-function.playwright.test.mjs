import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = process.env.LINEAR_FUNCTION_TEST_ROOT ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lessonDir = path.join(root, 'learning', 'linear-function');
const viewports = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 390, height: 844 },
];

async function serveLesson() {
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const file = pathname === '/' ? 'index.html' : pathname.slice(1);
    if (!['index.html', 'linear.mjs'].includes(file)) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.setHeader('Content-Type', file.endsWith('.mjs') ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8');
    response.end(await readFile(path.join(lessonDir, file)));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}/` };
}

async function setRange(page, id, value) {
  await page.locator(`#${id}`).evaluate((input, next) => {
    input.value = String(next);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function assertSynchronized(page, a, b) {
  const expectedEquation = a === 0
    ? `y = ${b}`
    : `y = ${a === 1 ? 'x' : a === -1 ? '−x' : `${a}x`}${b === 0 ? '' : b > 0 ? ` + ${b}` : ` − ${Math.abs(b)}`}`;
  assert.equal(await page.locator('#equation').innerText(), expectedEquation);
  assert.equal(await page.locator('#aValue').innerText(), String(a));
  assert.equal(await page.locator('#bValue').innerText(), String(b));
  assert.equal(Number(await page.locator('#intercept').getAttribute('cx')), 170);
  assert.equal(Number(await page.locator('#intercept').getAttribute('cy')), 125 - b * 20);
  assert.equal(Number(await page.locator('#next').getAttribute('cx')), 190);
  assert.equal(Number(await page.locator('#next').getAttribute('cy')), 125 - (a + b) * 20);
  assert.equal(await page.locator('#rise').getAttribute('d'), `M170 ${125 - b * 20}H190V${125 - (a + b) * 20}`);
  assert.equal(await page.locator('#riseLabel').textContent(), `${a > 0 ? '+' : ''}${a}`);
  assert.equal(await page.locator('#slopeText').innerText(), a === 0
    ? '右に1進んでも高さは変わらない'
    : `右に1進むと${a > 0 ? '上' : '下'}に${Math.abs(a)}進む`);
  assert.equal(await page.locator('#interceptText').innerText(), b === 0 ? 'y軸の0（原点）を通る' : `y軸の${b}を通る`);
  assert.equal(await page.locator('#function').getAttribute('x1'), '-10');
  assert.equal(Number(await page.locator('#function').getAttribute('y1')), 125 - (a * -9 + b) * 20);
  assert.equal(await page.locator('#function').getAttribute('x2'), '350');
  assert.equal(Number(await page.locator('#function').getAttribute('y2')), 125 - (a * 9 + b) * 20);
  assert.equal(await page.locator('#function').evaluate(line => line.parentElement.getAttribute('clip-path')), 'url(#clip)');
}

test('mobile layout and synchronized controls at six viewport/text-size conditions', async () => {
  const { server, url } = await serveLesson();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    for (const viewport of viewports) {
      for (const textScale of [1, 1.25]) {
        const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true });
        const page = await context.newPage();
        await page.goto(url);
        if (textScale > 1) {
          await page.evaluate(scale => {
            for (const element of document.querySelectorAll('h1,.sub,.formula,.legend,.control label,.control output,.explanations p,button,details,summary,svg text')) {
              const size = Number.parseFloat(getComputedStyle(element).fontSize);
              element.style.setProperty('font-size', `${size * scale}px`, 'important');
            }
          }, textScale);
        }

        const size = await page.evaluate(() => ({
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight,
          viewportWidth: innerWidth,
          viewportHeight: innerHeight,
          sliders: [...document.querySelectorAll('input[type=range]')].map(el => el.getBoundingClientRect().height),
          reset: document.querySelector('#reset').getBoundingClientRect().height,
        }));
        assert.ok(size.width <= size.viewportWidth, `${viewport.width}x${viewport.height} ${textScale}: horizontal overflow ${size.width}`);
        assert.ok(size.height <= size.viewportHeight, `${viewport.width}x${viewport.height} ${textScale}: vertical overflow ${size.height}`);
        assert.ok(size.sliders.every(height => height >= 44), 'slider touch target is at least 44px');
        assert.ok(size.reset >= 44, 'reset touch target is at least 44px');

        await assertSynchronized(page, 2, 3);
        await setRange(page, 'a', 0);
        await assertSynchronized(page, 0, 3);
        await setRange(page, 'b', 0);
        await assertSynchronized(page, 0, 0);
        await setRange(page, 'a', -4);
        await setRange(page, 'b', -5);
        await assertSynchronized(page, -4, -5);
        await setRange(page, 'a', 4);
        await setRange(page, 'b', 5);
        await assertSynchronized(page, 4, 5);

        const aBox = await page.locator('#a').boundingBox();
        await page.touchscreen.tap(aBox.x + aBox.width * 0.75, aBox.y + aBox.height / 2);
        const touchedA = Number(await page.locator('#a').inputValue());
        assert.ok(touchedA >= -4 && touchedA <= 4, 'touch input stays within slope limits');
        assert.notEqual(touchedA, 4, 'touching the slider changes its value');
        await assertSynchronized(page, touchedA, 5);
        await page.locator('#reset').click();
        await assertSynchronized(page, 2, 3);
        await context.close();
      }
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
