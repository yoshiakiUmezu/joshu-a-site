import assert from 'node:assert/strict';
import test from 'node:test';
import { buildResponseRequest, callResponses, MAX_HTML_BYTES, MODEL, renderSite } from './engine.mjs';

const site = {
  title: '紙と活字',
  html: '<main><h1>紙と活字</h1><a href="#access">会場</a><section id="access"><p>週末の紙市</p></section></main>',
  css: 'main{padding:2rem}@media(max-width:600px){main{padding:1rem}}',
};
const usage = { input_tokens: 100, input_tokens_details: { cached_tokens: 20 }, output_tokens: 90, total_tokens: 190 };
const payload = { status: 'completed', usage, output: [{ type: 'message', role: 'assistant', content: [
  { type: 'output_text', text: JSON.stringify(site) },
] }] };

test('revision sends the current page and receives one self-contained HTML file with metered usage', async () => {
  const previousHtml = renderSite(site);
  const changes = { brief: { name: site.title }, instruction: '余白を広げる', previousHtml };
  const body = buildResponseRequest(changes);
  const result = await callResponses(body, { apiKey: 'test-only', fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const sent = JSON.parse(options.body);
    assert.equal(sent.model, MODEL);
    assert.equal(sent.store, false);
    assert.deepEqual(JSON.parse(sent.input), changes);
    return Response.json(payload);
  } });
  assert.equal(result.html, previousHtml);
  assert.match(result.html, /Content-Security-Policy/);
  assert.match(result.html, /@media\(max-width:600px\)/);
  assert.deepEqual(result.usage, { inputTokens: 100, cachedInputTokens: 20, outputTokens: 90, totalTokens: 190 });
});

test('export only accepts bounded passive markup, embedded CSS and working fragment links', () => {
  for (const partial of [
    { html: '<main><h1>連絡</h1><form></form></main>' },
    { html: '<main><h1>資料</h1><a href="#missing">こちら</a></main>' },
    { html: '<main><h1>通信</h1><a href="https://example.org/">リンク</a></main>' },
    { css: '@import "print.css";' },
    { css: 'main{background-image:url(texture.png)}' },
    { html: 'あ'.repeat(Math.ceil(MAX_HTML_BYTES / 3)) },
  ]) assert.throws(() => renderSite({ ...site, ...partial }));
});

test('incomplete, refused and rejected outputs keep upstream usage; missing usage fails closed', async () => {
  for (const data of [
    { ...payload, status: 'incomplete' },
    { ...payload, output: [{ type: 'message', role: 'assistant', content: [{ type: 'refusal', refusal: 'fixture' }] }] },
    { ...payload, output: [] },
    { ...payload, usage: { ...usage, total_tokens: 0 } },
  ]) {
    const fetchImpl = async () => Response.json(data);
    await assert.rejects(callResponses({}, { apiKey: 'test-only', fetchImpl }), error =>
      data.usage.total_tokens ? error.usage?.totalTokens === 190 : error.usage === null);
  }
});
