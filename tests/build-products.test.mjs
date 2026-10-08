import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildProducts } from '../scripts/build-products.mjs';
import { checkSite } from '../scripts/check-release.mjs';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'joshu-a-product-build-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const file of ['index.html', '404.html', 'robots.txt', 'sitemap.xml', '_headers']) fs.copyFileSync(path.join(source, file), path.join(root, file));
  fs.cpSync(path.join(source, 'assets'), path.join(root, 'assets'), { recursive: true });
  fs.cpSync(path.join(source, 'learning', 'speed-distance-time'), path.join(root, 'learning', 'speed-distance-time'), { recursive: true });
  fs.copyFileSync(path.join(source, 'learning', 'index.html'), path.join(root, 'learning', 'index.html'));
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  fs.copyFileSync(path.join(source, 'docs', 'product-page-template.md'), path.join(root, 'docs', 'product-page-template.md'));
  return root;
}

function productData(slug = 'fixture', overrides = {}) {
  return {
    slug,
    publish: true,
    productType: 'SoftwareApplication',
    name: `Fixture ${slug}`,
    oneLineValue: '検証用の一文価値',
    audience: 'テスト環境の利用者',
    description: '生成結果をrelease checkerで検証するfixtureです。',
    status: '公開中',
    priceDisplay: '無料',
    priceAmount: 0,
    currency: 'JPY',
    platforms: ['Windows 11'],
    ctaLabel: '入手する',
    ctaUrl: 'https://itch.io/fixture-download',
    ogImage: `/assets/${slug}-og.png`,
    ogAlt: `Fixture ${slug} の共有画像`,
    screenshot: { src: `/assets/${slug}-screen.png`, alt: 'テスト画面', caption: 'テスト用の実画面fixture', width: 1200, height: 630 },
    features: [{ title: 'fixture機能', description: 'テスト用機能の説明。' }],
    releaseDate: '2026-01-10',
    lastModified: '2026-01-10',
    ...overrides
  };
}

function writeProduct(root, data, filename = `${data.slug}.json`) {
  const directory = path.join(root, 'data', 'products');
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, filename), JSON.stringify(data, null, 2));
}

function addAssets(root, slug) {
  fs.copyFileSync(path.join(source, 'assets', 'og-home.png'), path.join(root, 'assets', `${slug}-og.png`));
  fs.copyFileSync(path.join(source, 'assets', 'og-home.png'), path.join(root, 'assets', `${slug}-screen.png`));
}

test('zero products preserves the preparation message and passes release checker', t => {
  const root = fixture(t);
  const result = buildProducts({ root });
  assert.deepEqual(result.publishedSlugs, []);
  assert.deepEqual(result.removedSlugs, []);
  assert.match(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), /現在は公開準備中です/);
  assert.equal(fs.existsSync(path.join(root, 'products')), false);
  assert.deepEqual(checkSite(root).errors, []);
});

test('publish:false accepts an incomplete draft but generates no public artifacts', t => {
  const root = fixture(t);
  writeProduct(root, { slug: 'draft-tool', publish: false });
  const result = buildProducts({ root });
  assert.deepEqual(result.publishedSlugs, []);
  assert.equal(fs.existsSync(path.join(root, 'products')), false);
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8'), /draft-tool/);
  assert.deepEqual(checkSite(root).errors, []);
});

test('one complete product generates page, homepage card and sitemap then passes release checker', t => {
  const root = fixture(t);
  const data = productData();
  addAssets(root, data.slug);
  writeProduct(root, data);
  const result = buildProducts({ root });
  const page = fs.readFileSync(path.join(root, 'products', data.slug, 'index.html'), 'utf8');
  const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  assert.deepEqual(result.publishedSlugs, ['fixture']);
  assert.match(home, /data-generated-product="fixture"/);
  assert.match(home, /href="\/products\/fixture\/"/);
  assert.match(sitemap, /<loc>https:\/\/joshu-a\.com\/products\/fixture\/<\/loc>\s*<lastmod>2026-01-10<\/lastmod>/);
  assert.match(page, /"@type"\s*:\s*"SoftwareApplication"/);
  assert.doesNotMatch(page, /\{\{|TODO|TBD|\.pages\.dev/);
  assert.deepEqual(checkSite(root).errors, []);
});

test('multiple products support VideoGame schema, optional sections and legal/support links', t => {
  const root = fixture(t);
  const app = productData('small-app');
  const game = productData('small-game', {
    productType: 'VideoGame',
    video: { src: 'https://media.itch.zone/video.mp4' },
    faq: [{ question: '質問 fixture', answer: '回答 fixture' }],
    updates: [{ date: '2026-02-01', summary: 'fixtureの更新情報' }],
    relatedArticles: [{ title: '関連記事 fixture', url: 'https://joshu-a.com/' }],
    legalLinks: { privacy: 'https://joshu-a.com/', support: 'mailto:contact@joshu-a.com' }
  });
  addAssets(root, app.slug);
  addAssets(root, game.slug);
  writeProduct(root, app);
  writeProduct(root, game);
  const result = buildProducts({ root });
  const gamePage = fs.readFileSync(path.join(root, 'products', game.slug, 'index.html'), 'utf8');
  const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  assert.deepEqual(result.publishedSlugs, ['small-app', 'small-game']);
  assert.equal((home.match(/data-generated-product=/g) ?? []).length, 2);
  assert.equal((sitemap.match(/<loc>https:\/\/joshu-a\.com\/products\//g) ?? []).length, 2);
  assert.match(gamePage, /"@type"\s*:\s*\[\s*"VideoGame"\s*,\s*"SoftwareApplication"\s*\]/);
  assert.match(gamePage, /質問 fixture/);
  assert.match(gamePage, /修正情報|更新情報/);
  assert.match(gamePage, /mailto:contact@joshu-a.com/);
  assert.deepEqual(checkSite(root).errors, []);
});

test('turning publish off removes only a generator-owned product and restores empty state', t => {
  const root = fixture(t);
  const data = productData();
  addAssets(root, data.slug);
  writeProduct(root, data);
  buildProducts({ root });
  writeProduct(root, { slug: 'fixture', publish: false });
  const result = buildProducts({ root });
  assert.deepEqual(result.removedSlugs, ['fixture']);
  assert.equal(fs.existsSync(path.join(root, 'products', 'fixture')), false);
  assert.match(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), /現在は公開準備中です/);
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8'), /products\/fixture/);
  assert.deepEqual(checkSite(root).errors, []);
});

for (const { name, mutate, expected } of [
  { name: 'required product information is missing', mutate: data => { delete data.audience; }, expected: /audience is required/ },
  { name: 'slug rejects path and uppercase input', mutate: data => { data.slug = '../Fixture'; }, expected: /invalid slug/ },
  { name: 'unsupported product type fails', mutate: data => { data.productType = 'Book'; }, expected: /productType must be/ },
  { name: 'published product requires releaseDate', mutate: data => { delete data.releaseDate; }, expected: /releaseDate is required/ },
  { name: 'http CTA fails', mutate: data => { data.ctaUrl = 'http://itch.io/fixture'; }, expected: /ctaUrl must use HTTPS/ },
  { name: 'broken internal CTA fails', mutate: data => { data.ctaUrl = 'https://joshu-a.com/missing-destination/'; }, expected: /points to a missing local page/ },
  { name: 'empty CTA fails', mutate: data => { data.ctaUrl = ''; }, expected: /ctaUrl is required/ },
  { name: 'price amount and display mismatch fails', mutate: data => { data.priceAmount = 500; }, expected: /priceDisplay does not match priceAmount/ },
  { name: 'price currency and display mismatch fails', mutate: data => { data.currency = 'USD'; }, expected: /priceDisplay does not match currency/ },
  { name: 'invalid currency fails', mutate: data => { data.currency = 'ZZZ'; }, expected: /currency is not supported/ },
  { name: 'missing OG image fails', mutate: data => { data.ogImage = '/assets/not-found.png'; }, expected: /does not reference an existing asset/ },
  { name: 'missing screenshot fails', mutate: data => { data.screenshot.src = '/assets/not-found.png'; }, expected: /does not reference an existing asset/ },
  { name: 'placeholder fails before writing outputs', mutate: data => { data.description = 'TODO: fill later'; }, expected: /contains a placeholder/ },
  { name: 'preview CTA fails', mutate: data => { data.ctaUrl = 'https://preview.joshu-a-site.pages.dev/download'; }, expected: /placeholder or preview value|preview or local URL/ },
  { name: 'lastModified cannot precede releaseDate', mutate: data => { data.lastModified = '2025-01-01'; }, expected: /cannot be earlier/ }
]) {
  test(name, t => {
    const root = fixture(t);
    const data = productData();
    mutate(data);
    addAssets(root, 'fixture');
    writeProduct(root, data, data.slug.includes('/') || data.slug.startsWith('.') ? 'fixture.json' : `${data.slug}.json`);
    const beforeHome = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    assert.throws(() => buildProducts({ root }), expected);
    assert.equal(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), beforeHome);
    assert.equal(fs.existsSync(path.join(root, 'products')), false);
  });
}

test('duplicate slugs fail before any static output is written', t => {
  const root = fixture(t);
  writeProduct(root, { slug: 'duplicate', publish: false });
  writeProduct(root, { slug: 'duplicate', publish: false }, 'duplicate-copy.json');
  assert.throws(() => buildProducts({ root }), /duplicate product slug: duplicate/);
  assert.equal(fs.existsSync(path.join(root, 'products')), false);
});

test('generator refuses to overwrite a hand-authored product page', t => {
  const root = fixture(t);
  const product = productData();
  addAssets(root, product.slug);
  writeProduct(root, product);
  fs.mkdirSync(path.join(root, 'products', 'fixture'), { recursive: true });
  fs.writeFileSync(path.join(root, 'products', 'fixture', 'index.html'), '<!doctype html><title>hand authored</title>');
  assert.throws(() => buildProducts({ root }), /refusing to overwrite an unmanaged product page/);
});
