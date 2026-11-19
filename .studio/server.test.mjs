import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { startStudio } from './server.mjs';
import { openLedger } from './ledger.mjs';

const password = 'only-for-local-tests';
const authorization = 'Basic ' + Buffer.from('developer:' + password).toString('base64');
const brief = { name: '試作', purpose: '開発テスト' };
const usage = { input_tokens: 80, output_tokens: 200, total_tokens: 280 };
const response = {
  status: 'completed', usage,
  output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify({
    title: '試作', html: '<main><h1>試作</h1></main>', css: 'main{padding:2rem}',
  }) }] }],
};

async function setup(t, fetchImpl, limits) {
  const dir = await mkdtemp(join(tmpdir(), 'studio-test-'));
  const options = { password, apiKey: 'local-fixture', ledgerPath: join(dir, 'usage.json'), fetchImpl, limits };
  const app = await startStudio(options);
  t.after(async () => {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  });
  return { ...app, options };
}

function send(origin, body = { brief }, headers = {}) {
  return fetch(origin + '/api/generate', { method: 'POST',
    headers: { authorization, origin, 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body) });
}

test('authentication, origin and input checks happen before reservation or provider access', async t => {
  let sent = 0;
  const { origin } = await setup(t, () => { sent++; throw new Error(); });
  assert.equal((await fetch(origin + '/studio/')).status, 401);
  assert.equal((await send(origin, { brief }, { authorization: '' })).status, 401);
  assert.equal((await send(origin, { brief }, { origin: '' })).status, 403);
  assert.equal((await send(origin, { brief }, { 'content-type': 'text/plain' })).status, 415);
  assert.equal((await send(origin, { brief, revision: '修正' })).status, 400);
  const status = await (await fetch(origin + '/api/status', { headers: { authorization } })).json();
  assert.equal(status.ledger.calls, 0);
  assert.equal(sent, 0);
});

test('examples-only mode opens all recorded examples without a key or a paid reservation', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'studio-examples-'));
  const app = await startStudio({ password, examplesOnly: true, ledgerPath: join(dir, 'usage.json'),
    fetchImpl: () => assert.fail('unexpected provider request') });
  t.after(async () => { await app.close(); await rm(dir, { recursive: true, force: true }); });
  const { origin } = app;
  const status = () => fetch(origin + '/api/status', { headers: { authorization } }).then(r => r.json());
  const { examples, liveEnabled } = await status();
  assert.equal(liveEnabled, false);
  assert.equal(examples.length, 3);
  for (const { id, name } of examples) {
    const res = await fetch(origin + '/api/examples', { method: 'POST',
      headers: { authorization, origin, 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
    assert.equal(res.status, 200);
    const value = await res.json();
    assert.equal(value.brief.name, name);
    assert.ok(value.draftId && value.html.startsWith('<!doctype html>'));
  }
  assert.equal((await send(origin)).status, 403);
  assert.equal((await status()).ledger.calls, 0);
});

test('a pending generation consumes the last slot, and its final usage survives restart', async t => {
  const started = Promise.withResolvers();
  const release = Promise.withResolvers();
  const { origin, close, options } = await setup(t, async () => {
    started.resolve();
    await release.promise;
    return Response.json(response);
  }, { maxCalls: 1, maxTotalTokens: 240000, maxHtmlBytes: 49152, maxOutputTokens: 6000 });
  const first = send(origin);
  await started.promise;
  try {
    const blocked = await send(origin);
    assert.equal(blocked.status, 429);
    assert.ok((await blocked.json()).ledger.reservedTokens > 6000);
  } finally { release.resolve(); }
  const { html, ledger } = await (await first).json();
  assert.equal(ledger.reservedTokens, 0);
  assert.equal(ledger.totalTokens, 280);
  const [record] = JSON.parse(await readFile(options.ledgerPath, 'utf8'));
  assert.equal(record.htmlBytes, Buffer.byteLength(html));
  assert.equal(record.status, 'ok');
  await close();
  const restarted = await startStudio(options);
  try { assert.equal((await send(restarted.origin)).status, 429); }
  finally { await restarted.close(); }
});

test('unknown provider usage keeps the reservation and can exhaust tokens before the call limit', async t => {
  let sent = 0;
  const { origin } = await setup(t, async () => { sent++; throw new Error('offline'); },
    { maxCalls: 6, maxTotalTokens: 16000, maxHtmlBytes: 49152, maxOutputTokens: 6000 });
  const failed = await send(origin);
  assert.equal(failed.status, 502);
  const { ledger } = await failed.json();
  assert.equal(ledger.totalTokens, 0);
  assert.ok(ledger.reservedTokens > 8000);
  assert.equal((await send(origin)).status, 429);
  assert.equal(sent, 1);
});

test('legacy rows preserve totals and mixed ledgers distinguish untracked cache writes', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'studio-ledger-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = join(dir, 'usage.json');
  const usage = { inputTokens: 100, cachedInputTokens: 10, outputTokens: 50, totalTokens: 150 };
  const row = { budget: 9000, status: 'ok', usage };
  await writeFile(file, JSON.stringify([row, { ...row, usage: { ...usage, write30mTokens: 30, write12hTokens: 20 } }]));
  const ledger = openLedger(file, {});
  assert.deepEqual(ledger.summary(), { calls: 2, inputTokens: 200, cachedInputTokens: 20, write30mTokens: 30,
    write12hTokens: 20, unknownCacheWriteCalls: 1, outputTokens: 100, totalTokens: 300, reservedTokens: 0 });
});
