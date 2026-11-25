import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { startStudio } from './server.mjs';
import { fixturePlan } from './test-plan.mjs';
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

async function setup(t, fetchImpl, limits, designInstructions = () => fixturePlan()) {
  const dir = await mkdtemp(join(tmpdir(), 'studio-test-'));
  const options = { password, apiKey: 'local-fixture', designInstructions, ledgerPath: join(dir, 'usage.json'), fetchImpl, limits };
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

test('only a requested revision receives measured draft findings', async t => {
  const requests = [];
  const { origin } = await setup(t, async (_url, options) => {
    requests.push(JSON.parse(options.body));
    const fixture = structuredClone(response);
    fixture.output[0].content[0].text = JSON.stringify({
      design: 'Internal test direction', title: '試作',
      html: '<main><h1>試作</h1><h2 data-nav="施術">施術の内容を見る</h2></main>',
      css: requests.length === 1 ? 'main{width:600px}' : 'main{width:100%}',
    });
    return Response.json(fixture);
  });
  const first = await (await send(origin)).json();
  assert.equal(requests.length, 1);
  assert.ok(first.layout.issues.some(issue => issue.includes('390px')));
  assert.ok(!first.html.includes('Internal test direction'));
  assert.match(first.html, /<a href="#studio-section-1">施術<\/a>/);
  const second = await (await send(origin, { brief, revision: '整えて', previousHtml: first.html })).json();
  assert.ok(requests[1].instructions.includes(first.layout.issues[0]));
  assert.deepEqual(second.layout, { checked: true, issues: [] });
});

test('one click can review two rendered screens while preserving a draft at the call limit', async t => {
  for (const maxCalls of [1, 2]) {
    const requests = [];
    const { origin } = await setup(t, async (_url, options) => {
      requests.push(JSON.parse(options.body));
      return Response.json(response);
    }, { maxCalls, maxTotalTokens: 240000 }, () => ({ ...fixturePlan(), visualReview: '画面を確認して整える' }));
    const draft = await (await send(origin)).json();
    assert.ok(draft.html.includes('試作'));
    assert.equal(requests.length, maxCalls);
    assert.equal(draft.ledger.calls, maxCalls);
    if (maxCalls === 1) assert.match(draft.review, /残り枠/);
    else {
      assert.equal(requests[1].input[0].content.filter(part => part.type === 'input_image').length, 2);
      assert.equal(draft.reviewTokens, 280);
      assert.match(draft.review, /仕上げた版/);
    }
  }
});

test('the search sees only the public topic and the private plan reaches both implementation and review', async t => {
  const requests = [];
  const { origin } = await setup(t, async (_url, options) => {
    const body = JSON.parse(options.body);
    requests.push(body);
    if (requests.length === 3 || requests.length === 5) return Response.json(response);
    const raw = structuredClone(response);
    raw.output[0].content[0].text = body.tools ? 'reference observation' : requests.length === 4 ? 'mobile footer observation' : 'private layout specification';
    if (body.tools) raw.output.unshift({ type: 'web_search_call', status: 'completed' });
    return Response.json(raw);
  }, { maxCalls: 5, maxTotalTokens: 240000 }, () => ({ ...fixturePlan(), critique: 'inspect', planning: 'design', researchQuery: 'public topic', visualReview: 'review' }));
  const draft = await (await send(origin)).json();
  assert.equal(requests.length, 5);
  assert.equal(requests[0].input, 'public topic');
  assert.ok(!JSON.stringify(requests[0]).includes(brief.name));
  assert.ok(requests[1].input[0].content[0].text.includes('reference observation'));
  assert.equal(requests[3].input[0].content.filter(part => part.type === 'input_image').length, 3);
  assert.match(requests[4].input[0].content[0].text, /mobile footer observation/);
  assert.ok(!JSON.stringify(draft).includes('mobile footer observation'));
  for (const body of [requests[2], requests[4]]) assert.match(body.instructions, /private layout specification/);
  assert.ok(!JSON.stringify(draft).includes('private layout specification'));
  assert.deepEqual(draft.stages, ['research', 'design-plan', 'visual-critique']);
  assert.equal(draft.preparationTokens, 840);
});

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

test('rejected markup retains its source for metered-once offline recovery', async t => {
  const fixture = structuredClone(response);
  const content = fixture.output[0].content[0];
  const site = JSON.parse(content.text);
  site.html = '<main><h1>切符座</h1>\n<a href="#schedule">上映時間</a></main>';
  content.text = JSON.stringify(site);
  let calls = 0;
  const app = await setup(t, () => { calls++; return Response.json(fixture); });
  const failed = await send(app.origin);
  assert.equal(failed.status, 502);
  const { error, ledger } = await failed.json();
  assert.match(error, /2行1列：参照先/);
  assert.equal(ledger.totalTokens, usage.total_tokens);
  const dir = dirname(app.options.ledgerPath);
  const source = join(dir, error.match(/recovery\/[a-f0-9-]+\.json/)[0]);
  const record = JSON.parse(await readFile(source, 'utf8'));
  assert.equal(record.site.html, site.html);
  const output = join(dir, 'preview.html');
  const recover = () => execFileSync(process.execPath,
    [fileURLToPath(new URL('./recover.mjs', import.meta.url)), source, output], { stdio: 'pipe' });
  assert.throws(recover);
  await assert.rejects(readFile(output), { code: 'ENOENT' });
  record.site.html = site.html.replace('<h1>', '<h1 id=schedule>');
  await writeFile(source, JSON.stringify(record));
  recover();
  assert.match(await readFile(output, 'utf8'), /<h1 id="schedule">切符座/);
  assert.throws(recover);
  assert.equal(calls, 1);
});
test('visual finishing keeps the fuller draft when the candidate collapses the visible text', async t => {
  let calls = 0;
  const { origin } = await setup(t, () => {
    const fixture = structuredClone(response);
    const paragraph = '二本の見どころを比べる。'.repeat(++calls === 1 ? 30 : 1);
    fixture.output[0].content[0].text = JSON.stringify({ title: '上映', html: '<main><h1>上映</h1><p>' + paragraph + '</p></main>', css: 'main{padding:1em}' });
    return Response.json(fixture);
  }, { maxCalls: 2, maxTotalTokens: 240000 }, () => ({ ...fixturePlan(), visualReview: 'review', visibleTarget: 1440 }));
  const draft = await (await send(origin)).json();
  assert.ok(draft.comparison.initial.visibleChars > draft.comparison.candidate.visibleChars);
  assert.equal(draft.layout.visibleChars, draft.comparison.initial.visibleChars);
  assert.match(draft.review, /要調整/);
  assert.equal(calls, 2);
});
test('editorial copy from planning survives missing implementation slots and visual polish', async t => {
  const text = '映画の短い感想を持ち帰る。'.repeat(29);
  const sections = Array.from({ length: 5 }, (_, i) => ({ heading: '特集' + i, paragraphs: [text] }));
  const { origin } = await setup(t, async (_url, options) => {
    const body = JSON.parse(options.body);
    const fixture = structuredClone(response);
    fixture.output[0].content[0].text = body.text?.format?.name === 'editorial_plan'
      ? JSON.stringify({ direction: '紙の映画誌', sections })
      : JSON.stringify({ title: '映画', html: '<main><h1>映画</h1><section class="studio-feature studio-sequence"><h2 id="story">余分な見出し</h2><div class="studio-copy-1"></div></section><details open><summary>時間</summary><p>正午</p></details></main>', css: 'main{padding:1rem}' });
    return Response.json(fixture);
  }, { maxCalls: 3, maxTotalTokens: 240000 }, () => ({ ...fixturePlan(), visibleTarget: 1440, planning: 'plan', visualReview: 'review' }));
  const draft = await (await send(origin)).json();
  assert.equal(draft.ledger.calls, 3);
  assert.doesNotMatch(draft.html, /余分な見出し/);
  assert.match(draft.html, /<h2 id="story">特集0/);
  assert.equal(draft.html.split(text).length - 1, 5);
  assert.ok(draft.comparison.initial.visibleChars >= 1600);
  assert.equal(draft.comparison.candidate.visibleChars, draft.layout.visibleChars);
  assert.ok(draft.layout.motion.every(band => band.length));
});
