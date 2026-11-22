import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { chromium } from 'playwright';
import { startStudio } from './server.mjs';
import { fixturePlan } from './test-plan.mjs';

test('beginners can select a genre, revise their choices and reuse earlier examples without stale settings', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'studio-brief-'));
  const password = 'local-test-password';
  const marker = 'server-only-fixture-marker';
  const requests = [];
  const app = await startStudio({
    password, apiKey: 'local-fixture', ledgerPath: join(dir, 'usage.json'),
    designInstructions: brief => fixturePlan(null, marker + '/' + (brief.genre || 'legacy')),
    fetchImpl: async (_url, options) => {
      const body = JSON.parse(options.body);
      requests.push(body);
      const title = 'テストページ' + requests.length;
      const site = { title, html: '<main><h1>' + title + '</h1></main>', css: 'main{padding:1rem}' };
      return Response.json({ status: 'completed', usage: { input_tokens: 30, output_tokens: 50, total_tokens: 80 },
        output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify(site) }] }] });
    },
  });
  t.after(async () => { await app.close(); await rm(dir, { recursive: true, force: true }); });
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  t.after(() => browser.close());
  const page = await browser.newPage({
    httpCredentials: { username: 'developer', password, origin: app.origin }, viewport: { width: 320, height: 780 },
  });
  await page.goto(app.origin + '/studio/');
  await page.locator('#genre').selectOption('service');
  await page.locator('#name').fill('灯修理室');
  assert.ok(await page.locator('#purpose').isHidden());
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));

  async function submit(button) {
    const reply = page.waitForResponse(res => res.url() === app.origin + '/api/generate');
    await page.locator(button).click();
    const response = await reply;
    assert.ok(response.ok());
    assert.ok(!response.request().postData().includes(marker));
    assert.ok(!(await response.text()).includes(marker));
    await page.frameLocator('#preview').getByRole('heading', { name: 'テストページ' + requests.length }).waitFor();
    const payload = requests.at(-1);
    const json = typeof payload.input === 'string' ? payload.input
      : payload.input.flatMap(item => item.content).find(part => part.type === 'input_text').text;
    const input = JSON.parse(json);
    assert.ok(payload.instructions.includes(marker + '/' + (input.brief.genre || 'legacy')));
    return input;
  }
  await page.locator('#designId').selectOption('press');
  assert.equal(await page.locator('#design-page').getAttribute('href'), '/studio/designs/press.html');
  assert.ok((await page.request.get(app.origin + '/studio/designs/press.html')).ok());
  let release;
  const hold = new Promise(resolve => { release = resolve; });
  await page.route('**/api/generate', async route => {
    await hold;
    await route.continue();
  }, { times: 1 });
  const firstRequest = submit('#generate');
  try {
    await page.locator('#production-wait').waitFor();
    assert.equal(await page.locator('#stage').getAttribute('aria-busy'), 'true');
    assert.ok(await page.locator('#generate').isDisabled());
  } finally {
    release();
  }
  const initial = await firstRequest;
  await page.locator('#production-wait').waitFor({ state: 'hidden' });
  await page.locator('#edit-draft').click();
  assert.ok(await page.locator('#revision').evaluate(field => field === document.activeElement));
  assert.equal(requests.length, 1);
  assert.equal(initial.previousHtml, '');
  assert.equal(initial.brief.designId, 'press');
  assert.ok(requests[0].input[0].content.some(part => part.type === 'input_text' && part.text.includes('余白通信')));
  assert.equal(initial.brief.mainColor, '');
  assert.equal(initial.brief.purpose, '教室・サービスの案内');
  assert.equal(initial.brief.name, '灯修理室');
  assert.equal(initial.brief.genre, 'service');
  assert.equal(initial.brief.request, '');
  await page.locator('#artwork').selectOption('coffee');
  await page.locator('#artwork-status').filter({ hasText: '表紙素材を反映しました' }).waitFor();
  await page.locator('#visual-settings > summary').click();
  await page.locator('#mainColor').selectOption('#305B47');
  await page.locator('#subColor').selectOption('#FAF8F2');
  await page.locator('#photoPreference').selectOption('no');
  await page.locator('#request').fill('料金は要相談');
  await page.locator('#revision').fill('修理の受付方法を先に');
  const revised = await submit('#revise');
  assert.equal(revised.brief.mainColor, '#305B47');
  assert.equal(revised.brief.subColor, '#FAF8F2');
  assert.equal(revised.brief.photoPreference, 'no');
  assert.equal(await page.locator('#artwork').inputValue(), 'auto');
  assert.equal(revised.brief.request, '料金は要相談');
  assert.ok(revised.previousHtml.includes('テストページ1'));
  assert.equal(revised.instruction, '修理の受付方法を先に');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  assert.ok(!(await page.content()).includes(marker));

  const download = page.waitForEvent('download');
  await page.locator('#download').click();
  const exported = await readFile(await (await download).path(), 'utf8');
  assert.ok(exported.includes('テストページ2') && !exported.includes(marker));

  await page.locator('#example-list').selectOption('kissaten');
  await page.locator('#load-example').click();
  await page.locator('#custom-purpose:not([hidden])').waitFor();
  assert.equal(await page.locator('#genre').inputValue(), 'other');
  assert.equal(await page.locator('#purpose').inputValue(), '喫茶店の紹介');
  assert.equal(await page.locator('#mainColor').inputValue(), '');
  assert.equal(await page.locator('#subColor').inputValue(), '');
  assert.equal(await page.locator('#photoPreference').inputValue(), '');
  await page.locator('#motion-volume').selectOption('subtle');
  const fromExample = await submit('#revise');
  assert.equal(fromExample.brief.motionVolume, 'subtle');
  assert.ok(fromExample.instruction.includes('アニメーションの量'));
  assert.equal(await page.locator('#motion-volume').inputValue(), 'subtle');
  assert.ok(fromExample.brief.mood);
  assert.equal(fromExample.brief.purpose, '喫茶店の紹介');
  await page.locator('#genre').selectOption('event');
  await page.locator('#name').fill('町の音楽会');
  await page.locator('#request').fill('');
  const fresh = await submit('#generate');
  assert.equal(fresh.previousHtml, '');
  assert.equal(fresh.brief.motionVolume, 'strong');
  assert.equal(fresh.brief.mood, '');
  assert.equal(fresh.brief.purpose, 'イベント・公演');

  const legacy = await page.request.post(app.origin + '/api/generate', {
    headers: { Origin: app.origin }, data: { brief: { name: '旧形式', purpose: '作品紹介' } },
  });
  assert.ok(legacy.ok());
  assert.ok(requests.at(-1).instructions.includes(marker + '/legacy'));
  assert.equal(requests.length, 5);
  await page.route('**/api/generate', route => route.fulfill({
    status: 503, json: { error: 'テスト用エラー' },
  }), { times: 1 });
  await page.locator('#generate').click();
  await page.locator('#generate-status.error').waitFor();
  await page.locator('#production-wait').waitFor({ state: 'hidden' });
  assert.equal(await page.locator('#stage').getAttribute('aria-busy'), 'false');
  assert.ok(await page.locator('#download').isEnabled());
  const status = await page.request.get(app.origin + '/api/status');
  assert.ok(!(await status.text()).includes(marker));
});
