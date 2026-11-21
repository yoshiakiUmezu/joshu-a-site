import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { openStudioWindow } from './local-browser.mjs';
import { startStudio } from './server.mjs';
import { fixturePlan } from './test-plan.mjs';

for (const examplesOnly of [true, false]) {
  test('the local window opens ' + (examplesOnly ? 'examples' : 'live studio') + ' without a login prompt', async t => {
    const dir = await mkdtemp(join(tmpdir(), 'studio-window-'));
    const password = 'local-window-test-password';
    const app = await startStudio({
      password, examplesOnly, apiKey: examplesOnly ? undefined : 'offline-fixture',
      ledgerPath: join(dir, 'usage.json'), designInstructions: () => fixturePlan(),
      fetchImpl: () => assert.fail('opening the studio must not call the provider'),
    });
    let studio;
    t.after(async () => { await studio?.close(); await app.close(); await rm(dir, { recursive: true, force: true }); });
    const profileDirectory = join(dir, 'profile');
    // Isolate the native downloads destination without intercepting downloads via Playwright.
    const downloads = join(dir, 'downloads');
    await mkdir(downloads);
    await mkdir(join(profileDirectory, 'Default'), { recursive: true });
    await writeFile(join(profileDirectory, 'Default', 'Preferences'), JSON.stringify({
      download: { default_directory: downloads, prompt_for_download: false },
    }));

    studio = await openStudioWindow({ origin: app.origin, password, headless: true, profileDirectory });
    const { page } = studio;
    assert.equal(page.url(), app.origin + '/studio/');
    await page.locator('#load-example:enabled').waitFor();
    const status = await page.evaluate(() => fetch('/api/status').then(r => r.json()));
    assert.equal(status.liveEnabled, !examplesOnly);
    assert.equal(status.ledger.calls, 0);
    assert.equal((await fetch(app.origin + '/api/generate', { method: 'POST' })).status, 401);

    if (examplesOnly) {
      await page.selectOption('#example-list', 'atelier');
      const [reply] = await Promise.all([
        page.waitForResponse(r => r.url() === app.origin + '/api/examples'),
        page.click('#load-example'),
      ]);
      const example = await reply.json();
      await page.click('#download');
      const file = join(downloads, example.brief.name + '.html');
      const deadline = Date.now() + 8000;
      while (true) {
        try { if ((await readFile(file, 'utf8')) === example.html) break; }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
        assert.ok(Date.now() < deadline, 'native HTML download did not complete');
        await delay(100);
      }
      await studio.close();
      await studio.closed;
      assert.equal(await readFile(file, 'utf8'), example.html);
    }
  });
}
