import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { applyMaterialPlan, buildResponseRequest, callResponses, compactPreviousHtml, MAX_SOURCE_BYTES, MODEL, renderSite } from './engine.mjs';

const site = {
  title: '紙と活字',
  html: '<main><h1>紙と活字</h1><a href="#access">会場</a><section id="access"><p>週末の紙市</p></section></main>',
  css: 'main{padding:2rem}@media(max-width:600px){main{padding:1rem}}',
};
const usage = { input_tokens: 100, input_tokens_details: { cached_tokens: 20, cache_write_tokens: 50,
  cache_write_tokens_details: { ttl_30m_tokens: 40, ttl_12h_tokens: 10 } }, output_tokens: 90, total_tokens: 190 };
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
  assert.deepEqual(result.usage, { inputTokens: 100, cachedInputTokens: 20, write30mTokens: 40, write12hTokens: 10,
    outputTokens: 90, totalTokens: 190 });
});

test('export only accepts bounded passive markup, embedded CSS and working fragment links', () => {
  const schedule = '<main><h1>公演案内</h1><time datetime="17:00">17時</time><div role="img" aria-label="音の図版"></div></main>';
  assert.ok(renderSite({ ...site, html: schedule }).includes(schedule));
  for (const partial of [
    { html: '<main><h1>連絡</h1><form></form></main>' },
    { html: '<main><h1>資料</h1><a href="#missing">こちら</a></main>' },
    { html: '<main><h1>通信</h1><a href="https://example.org/">リンク</a></main>' },
    { css: '@import "print.css";' },
    { css: 'main{background-image:url(texture.png)}' },
    { html: 'あ'.repeat(Math.ceil(MAX_SOURCE_BYTES / 3)) },
  ]) assert.throws(() => renderSite({ ...site, ...partial }));
});

test('a visual input stays with the provider and only the specified catalog material reaches the HTML', async () => {
  const privateReference = 'data:image/jpeg;base64,/9j/VEVTVA==';
  const material = { art: 'architecture', placement: 'wide', position: '52% 48%' };
  const body = buildResponseRequest({ brief: { name: '庭' } }, 'fixture', privateReference);
  const [text, reference] = body.input[0].content;
  assert.equal(JSON.parse(text.text).brief.name, '庭');
  assert.deepEqual(reference, { type: 'input_image', detail: 'high', image_url: privateReference });
  const result = await callResponses(body, { apiKey: 'fixture', material, fetchImpl: async () => Response.json(payload) });
  assert.ok(!result.html.includes(privateReference));
  const editable = compactPreviousHtml(result.html);
  assert.match(editable, /<figure class="studio-hero-visual"><img src="art:architecture"/);
  assert.ok(editable.includes('52% 48%'));
  const next = applyMaterialPlan({ ...site, html: '<main><h1>庭</h1><img src="art:coffee" id="cover" alt="珈琲"><a href="#cover">表紙</a></main>' }, { ...material, art: null });
  assert.doesNotMatch(renderSite(next), /<img\b/);
  assert.ok(next.html.includes('id="cover"'));
});

test('standalone art matches local WebP, and only its catalog reference is sent for revisions', () => {
  const withImage = tag => ({ ...site, html: '<main><h1>紙と活字</h1>' + tag + '</main>' });
  for (const id of ['coffee', 'concert', 'architecture']) {
    const reference = 'art:' + id;
    const html = renderSite(withImage('<img class="cover" alt="イメージ" src="' + reference + '">'));
    const base64 = html.match(/src="data:image\/webp;base64,([^"]+)"/)[1];
    assert.deepEqual(Buffer.from(base64, 'base64'), readFileSync(new URL('./art/' + id + '.webp', import.meta.url)));
    const request = buildResponseRequest({ brief: { name: '紙と活字' }, instruction: '余白を調整', previousHtml: html });
    const previous = JSON.parse(request.input).previousHtml;
    assert.ok(previous.includes('src="' + reference + '"'));
    assert.ok(!request.input.includes(base64));
    assert.throws(() => compactPreviousHtml(html.replace(base64, 'unknown')), { status: 400 });
  }
  for (const tag of [
    '<img src="art:missing" alt="イメージ">',
    '<img src="art:coffee">',
    '<img src="https://example.org/cover.webp" alt="イメージ">',
    '<img src="art:haircut" alt="髪"><img src="art:haircut" alt="髪"><img src="art:haircut" alt="髪"><img src="art:haircut" alt="髪">',
  ]) assert.throws(() => renderSite(withImage(tag)));

  const prior = '  ' + renderSite(site) + '\n';
  assert.equal(compactPreviousHtml(prior), prior);
  assert.throws(() => compactPreviousHtml('a'.repeat(MAX_SOURCE_BYTES + 1)), { status: 400 });
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

test('verbatim private direction in a generated page is withheld with its usage recorded', async () => {
  const privateNotes = 'This is a private test sentence for the local design fixture.';
  const copy = { ...site, html: '<main><h1>' + privateNotes + '</h1></main>' };
  const data = { ...payload, output: [{ type: 'message', role: 'assistant',
    content: [{ type: 'output_text', text: JSON.stringify(copy) }] }] };
  await assert.rejects(callResponses({}, { apiKey: 'fixture', privateNotes, fetchImpl: async () => Response.json(data) }),
    error => error.usage?.totalTokens === 190 && !error.message.includes(privateNotes));
});

test('three distinct materials survive export and revision, including omitted slots', () => {
  const plan = { art: 'salonroom', supporting: ['hairwave', 'haircut'], placement: 'split', position: '50% 50%' };
  const partial = { ...site, html: site.html.replace('<p>', '<img src="art:hairwave" alt="ウェーブ"><p>') };
  const html = renderSite(applyMaterialPlan(partial, plan));
  const editable = compactPreviousHtml(html);
  assert.equal((html.match(/src="data:image/g) || []).length, 3);
  for (const id of [plan.art, ...plan.supporting]) assert.equal(editable.split('src="art:' + id + '"').length, 2);
  assert.doesNotMatch(editable, /base64/);
  assert.throws(() => applyMaterialPlan(site, { ...plan, supporting: ['missing'] }));
});

test('an authored closing keeps its own content and gains working studio navigation', () => {
  const html = renderSite({ ...site, html: '<main><h1>題名</h1><h2>案内</h2><footer class="closing"><p>また明日</p></footer></main>' }, '題名');
  assert.equal((html.match(/<footer\b/g) || []).length, 1);
  assert.match(html, /<footer[^>]* class="closing"><p>また明日<\/p>/);
  assert.match(html, /id="studio-index" class="studio-closing-links"/);
  const prior = JSON.parse(buildResponseRequest({ brief: {}, previousHtml: html }).input).previousHtml;
  assert.match(prior, /<footer[^>]* class="closing"><p>また明日<\/p><\/footer>/);
});
