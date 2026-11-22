import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { chromium } from 'playwright';
import { buildResponseRequest, renderSite } from './engine.mjs';
import { startStudio } from './server.mjs';
import { fixturePlan } from './test-plan.mjs';

test('the sandbox decodes the embedded editorial art and keeps fragment navigation inside', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'preview-'));
  const password = 'local-preview-test';
  const site = { title: '喫茶店', html: '<main><h1>喫茶店</h1><img src="art:coffee" alt="窓辺の珈琲"><a href="#menu">メニュー</a><section id="menu">珈琲</section></main>',
    css: 'section{margin-top:200vh;min-height:100vh}' };
  const app = await startStudio({ password, apiKey: 'local-fixture', designInstructions: () => fixturePlan('coffee'), ledgerPath: join(dir, 'usage.json'),
    fetchImpl: async () => Response.json({ status: 'completed', usage: { input_tokens: 20, output_tokens: 30, total_tokens: 50 },
      output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify(site) }] }] }) });
  t.after(async () => { await app.close(); await rm(dir, { recursive: true, force: true }); });
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  t.after(() => browser.close());
  const page = await browser.newPage({ httpCredentials: { username: 'developer', password, origin: app.origin } });
  await page.goto(app.origin + '/studio/');
  await page.locator('#genre').selectOption('food');
  await page.locator('#name').fill(site.title);
  await page.getByRole('button', { name: 'サイトを生成' }).click();
  const iframe = page.frameLocator('#preview');
  const width = await iframe.getByRole('img', { name: '窓辺の珈琲' }).evaluate(async image => {
    await image.decode();
    return image.naturalWidth;
  });
  assert.ok(width > 0);
  await iframe.getByRole('link', { name: 'メニュー' }).click();
  const heading = iframe.getByRole('heading', { name: '喫茶店' });
  await heading.waitFor();
  assert.equal(await page.locator('#preview').getAttribute('sandbox'), '');
  await iframe.locator(':target').waitFor();
  assert.ok(await heading.evaluate(() => location.hash === '#menu'));
  assert.equal(page.url(), app.origin + '/studio/');
  const original = await page.locator('#preview').getAttribute('src');
  await page.getByLabel('表紙素材').selectOption('concert');
  await page.locator('#artwork:enabled').waitFor();
  const edited = await page.locator('#preview').getAttribute('src');
  assert.ok(edited !== original);
  await iframe.locator('img').evaluate(image => image.decode());
  await page.getByLabel('表紙素材').selectOption('auto');
  await page.locator('#artwork:enabled').waitFor();
  assert.ok(await page.locator('#preview').getAttribute('src') === original);
  const status = await (await page.request.get(app.origin + '/api/status')).json();
  assert.equal(status.ledger.calls, 1);
});

test('site navigation reaches real headings on desktop and mobile and stays out of revisions', async t => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  t.after(() => browser.close());
  const page = await browser.newPage({ javaScriptEnabled: false });
  const html = renderSite({ title: '試験', html: '<main id="studio-top"><h1>A</h1><section><h2>作品</h2></section><section><h2 id="info">ご案内</h2></section></main>',
    css: 'section{min-height:110vh}' }, 'A & B');
  await page.setContent(html);
  const mast = page.getByRole('banner');
  await mast.getByRole('link', { name: 'ご案内' }).click();
  // The saved document runs with scripts disabled. Poll layout from the driver.
  const target = page.locator('#info');
  const deadline = Date.now() + 5000;
  while (await target.evaluate(el => el.getBoundingClientRect().top > 140)) {
    assert.ok(Date.now() < deadline, 'the anchor did not reach the top of the viewport');
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.equal(await mast.evaluate(el => el.getBoundingClientRect().top), 0);
  assert.ok(await page.locator('#info').evaluate(el => el.getBoundingClientRect().top >= document.querySelector('header').offsetHeight));
  await page.setViewportSize({ width: 320, height: 720 });
  await mast.getByRole('link', { name: '目次' }).click();
  await page.getByRole('contentinfo').getByRole('link', { name: '作品' }).click();
  assert.ok(await page.evaluate(() => document.querySelector(location.hash).textContent === '作品'));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 320);
  const body = buildResponseRequest({ brief: {}, previousHtml: html, instruction: '色を変更' });
  assert.doesNotMatch(JSON.parse(body.input).previousHtml, /studio-frame-start|studio-mast/);
});

test('exported motion follows the selected theme and the reader preference without scripts', async t => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  t.after(() => browser.close());
  const page = await browser.newPage({ javaScriptEnabled: false, reducedMotion: 'no-preference' });
  for (const [motion, expected] of Object.entries({ soft: 'studio-drift', editorial: 'studio-unfold', rhythmic: 'studio-beat', still: 'studio-drift' })) {
    const html = renderSite({ title: '作品', html: '<main><h1>作品</h1><section><h2>一覧</h2></section></main>', css: 'section{margin-top:110vh;height:80vh}', motion }, '作品');
    await page.setContent(html);
    assert.equal(await page.locator('h1').evaluate(el => getComputedStyle(el).fontWeight), '300');
    assert.match(await page.locator('h1').evaluate(el => getComputedStyle(el).fontFamily), /^.Noto Serif JP/);
    assert.match(await page.locator('body').evaluate(el => getComputedStyle(el).fontFamily), /^.Noto Serif JP/);
    assert.equal(await page.locator('h1').evaluate(el => getComputedStyle(el).animationName), expected);
    assert.equal(await page.locator('h2').evaluate(el => getComputedStyle(el).animationName), expected);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('h1').evaluate(el => getComputedStyle(el).animationName), 'none');
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const body = buildResponseRequest({ brief: {}, instruction: '色を変える', previousHtml: html });
    const previous = JSON.parse(body.input).previousHtml;
    assert.ok(!previous.includes('@keyframes') && previous.includes('data-motion="' + (motion === 'still' ? 'soft' : motion) + '"'));
  }
});
