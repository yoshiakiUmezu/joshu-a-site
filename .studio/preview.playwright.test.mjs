import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { chromium } from 'playwright';
import { startStudio } from './server.mjs';

test('an in-page link scrolls the generated preview without leaving the sandbox', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'preview-'));
  const password = 'local-preview-test';
  const site = { title: '喫茶店', html: '<main><h1>喫茶店</h1><a href="#menu">メニュー</a><section id="menu">珈琲</section></main>',
    css: 'section{margin-top:200vh;min-height:100vh}' };
  const app = await startStudio({ password, apiKey: 'local-fixture', ledgerPath: join(dir, 'usage.json'),
    fetchImpl: async () => Response.json({ status: 'completed', usage: { input_tokens: 20, output_tokens: 30, total_tokens: 50 },
      output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify(site) }] }] }) });
  t.after(async () => { await app.close(); await rm(dir, { recursive: true, force: true }); });
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  t.after(() => browser.close());
  const page = await browser.newPage({ httpCredentials: { username: 'developer', password, origin: app.origin } });
  await page.goto(app.origin + '/studio/');
  await page.getByLabel(/用途/).fill('喫茶');
  await page.getByLabel(/サイト名/).fill(site.title);
  await page.getByRole('button', { name: 'サイトを生成' }).click();
  const iframe = page.frameLocator('#preview');
  await iframe.getByRole('link', { name: 'メニュー' }).click();
  const heading = iframe.getByRole('heading', { name: '喫茶店' });
  await heading.waitFor();
  assert.equal(await page.locator('#preview').getAttribute('sandbox'), '');
  assert.ok(await heading.evaluate(() => location.hash === '#menu' && scrollY > 0));
  assert.equal(page.url(), app.origin + '/studio/');
});
