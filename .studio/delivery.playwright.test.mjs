import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { chromium } from 'playwright';
import { startStudio } from './server.mjs';
import { fixturePlan } from './test-plan.mjs';

test('only a confirmed and released version delivers its frozen HTML after restart', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'studio-delivery-'));
  const password = 'delivery-test-fixture';
  let calls = 0;
  const options = { password, apiKey: 'offline-fixture', designInstructions: () => fixturePlan(), ledgerPath: join(dir, 'usage.json'),
    fetchImpl: async () => {
      const site = { title: '喫茶室', html: '<main><h1>喫茶室</h1><p>本文の検証用テキスト' + (++calls) + '</p></main>',
        css: 'main{max-width:50rem;margin:auto}' };
      return Response.json({ status: 'completed', usage: { input_tokens: 20, output_tokens: 30, total_tokens: 50 },
        output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify(site) }] }] });
    } };
  let app = await startStudio(options);
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  t.after(async () => { await browser.close(); await app.close(); await rm(dir, { recursive: true, force: true }); });
  const operator = await browser.newPage({ httpCredentials: { username: 'developer', password, origin: app.origin } });
  const buyer = await browser.newPage();
  const generateURL = app.origin + '/api/generate';
  assert.equal((await buyer.request.post(generateURL)).status(), 401);
  assert.equal(calls, 0);
  await operator.goto(app.origin + '/studio/');
  await operator.locator('#genre').selectOption('other');
  await operator.locator('#purpose').fill('喫茶店の案内');
  await operator.locator('#name').fill('喫茶室');
  await operator.locator('#generate').click();
  await operator.frameLocator('#preview').getByText('本文の検証用テキスト1').waitFor();
  await operator.locator('#artwork').selectOption('coffee');
  await operator.locator('#artwork:enabled').waitFor();
  const firstDownload = operator.waitForEvent('download');
  await operator.locator('#download').click();
  const expected = await readFile(await (await firstDownload).path());
  const expectedHash = createHash('sha256').update(expected).digest('hex');

  async function createOffer() {
    const reply = operator.waitForResponse(r => r.url() === app.origin + '/api/offers' && r.request().method() === 'POST');
    await operator.locator('#create-offer').click();
    const response = await reply;
    assert.ok(response.ok());
    const { offer } = await response.json();
    const path = '/review/' + offer.id + '/';
    await operator.waitForFunction(path => document.querySelector('#open-review')?.pathname === path, path);
    return { url: app.origin + path, id: offer.id, posted: response.request().postDataJSON() };
  }
  const first = await createOffer();
  assert.deepEqual(Object.keys(first.posted).sort(), ['choice', 'draftId', 'sha256']);
  assert.equal(first.posted.choice, 'coffee');
  assert.equal(first.posted.sha256, expectedHash);

  const response = await buyer.goto(first.url);
  assert.ok(response.ok());
  assert.doesNotMatch(await response.text(), /本文の検証用テキスト|data:text\/html|srcdoc=|data:image\/webp/);
  for (const [file, width] of [['desktop.jpg', 1280], ['mobile.jpg', 390]]) {
    const image = await buyer.request.get(first.url + file);
    assert.equal(image.headers()['content-type'], 'image/jpeg');
    assert.deepEqual((await image.body()).subarray(0, 2), Buffer.from([0xff, 0xd8]));
    const rendered = buyer.locator('img[src$="' + file + '"]');
    assert.equal(await rendered.evaluate(async el => { await el.decode(); return el.naturalWidth; }), width);
  }
  assert.equal(await buyer.locator('script,iframe,object,embed').count(), 0);
  assert.ok(!(await buyer.request.get(first.url + 'download')).ok());
  const releaseURL = app.origin + '/api/offers/' + first.id + '/release';
  assert.equal((await buyer.request.post(releaseURL, { headers: { Origin: app.origin }, data: {} })).status(), 401);
  assert.equal((await operator.request.post(releaseURL, { headers: { Origin: app.origin }, data: {} })).status(), 409);
  await buyer.locator('#confirm-version').click();
  await buyer.locator('#refresh-review').waitFor();
  assert.ok(!(await buyer.request.get(first.url + 'download')).ok());

  await operator.locator('#revision').fill('本文を差し替える');
  await operator.locator('#revise').click();
  await operator.frameLocator('#preview').getByText('本文の検証用テキスト2').waitFor();
  const second = await createOffer();
  assert.ok(first.id !== second.id);
  await operator.locator('#offer-list').selectOption(first.id);
  await operator.locator('#refresh-offers').click();
  const released = operator.waitForResponse(r => r.url() === releaseURL);
  await operator.locator('#release-offer').click();
  assert.ok((await released).ok());
  await buyer.reload();
  await buyer.locator('#download-offer').waitFor();
  assert.ok(!(await buyer.request.get(second.url + 'download')).ok());
  const repeat = await operator.request.post(app.origin + '/api/offers', { headers: { Origin: app.origin }, data: first.posted });
  assert.ok(repeat.ok());
  const { offer: fresh } = await repeat.json();
  assert.notEqual(fresh.id, first.id);
  assert.equal(fresh.status, 'review');
  assert.equal((await buyer.request.get(app.origin + '/review/' + fresh.id + '/download')).status(), 403);
  assert.equal(calls, 2);

  const port = Number(new URL(app.origin).port);
  await app.close();
  app = await startStudio({ ...options, port });
  await buyer.reload();
  const delivered = buyer.waitForEvent('download');
  await buyer.locator('#download-offer').click();
  const file = await delivered;
  assert.match(file.suggestedFilename(), /\.html$/);
  assert.ok((await readFile(await file.path())).equals(expected));
  assert.ok(!(await buyer.request.get(second.url + 'download')).ok());
  assert.equal(calls, 2);
});
