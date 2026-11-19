import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { chromium } from 'playwright';
import { startStudio } from './server.mjs';

test('the mobile brief shapes the provider request on generation and revision while design instructions stay server-side', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'studio-brief-'));
  const password = 'local-test-password';
  const marker = 'server-only-fixture-marker';
  const requests = [];
  const app = await startStudio({
    password, apiKey: 'local-fixture', ledgerPath: join(dir, 'usage.json'),
    designInstructions: brief => marker + '/' + (brief.direction || 'auto'),
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
  const brief = {
    purpose: '修理サービスの案内', name: '灯修理室', audience: '腕時計を大切に使っている人', action: '修理の流れを読む',
    highlight: '受付から点検までの手順', direction: 'guide', mood: '落ち着いた', color: '濃紺', request: '料金は要相談',
  };
  await page.locator('#visual-settings > summary').click();
  for (const [key, value] of Object.entries(brief)) {
    const field = page.locator('#' + key);
    if (key === 'direction') await field.selectOption(value);
    else await field.fill(value);
  }
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
    assert.ok(payload.instructions.includes(marker + '/' + brief.direction));
    const input = JSON.parse(payload.input);
    assert.deepEqual(input.brief, brief);
    return input;
  }
  assert.equal((await submit('#generate')).previousHtml, '');
  brief.direction = 'editorial';
  brief.audience = '修理を初めて依頼する人';
  await page.locator('#direction').selectOption(brief.direction);
  await page.locator('#audience').fill(brief.audience);
  await page.locator('#revision').fill('冒頭の説明を短く');
  const revised = await submit('#revise');
  assert.ok(revised.previousHtml.includes('テストページ1'));
  assert.equal(revised.instruction, '冒頭の説明を短く');
  assert.ok(!(await page.content()).includes(marker));
  const download = page.waitForEvent('download');
  await page.locator('#download').click();
  const exported = await readFile(await (await download).path(), 'utf8');
  assert.ok(exported.includes('テストページ2') && !exported.includes(marker));

  // Earlier briefs and recorded examples lack every optional structured field.
  const legacy = await page.request.post(app.origin + '/api/generate', {
    headers: { Origin: app.origin }, data: { brief: { name: '旧形式', purpose: '作品紹介' } },
  });
  assert.ok(legacy.ok());
  assert.ok(requests.at(-1).instructions.includes(marker + '/auto'));
  assert.equal(requests.length, 3);
  const status = await page.request.get(app.origin + '/api/status');
  assert.ok(!(await status.text()).includes(marker));
});
