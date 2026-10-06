import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkSite } from '../scripts/check-release.mjs';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'joshu-a-release-check-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const file of ['index.html', '404.html', 'robots.txt', 'sitemap.xml', '_headers']) fs.copyFileSync(path.join(source, file), path.join(root, file));
  fs.mkdirSync(path.join(root, 'assets'));
  for (const file of ['og-home.png', 'brand-mark.png']) fs.copyFileSync(path.join(source, 'assets', file), path.join(root, 'assets', file));
  return root;
}

function addTestProduct(root) {
  const product = path.join(root, 'products', 'fixture');
  fs.mkdirSync(product, { recursive: true });
  const url = 'https://joshu-a.com/products/fixture/';
  const title = '検証用製品 | 助手A';
  const description = '公開チェックのテスト専用。';
  const image = 'https://joshu-a.com/assets/fixture-og.png';
  fs.copyFileSync(path.join(root, 'assets', 'og-home.png'), path.join(root, 'assets', 'fixture-og.png'));
  fs.copyFileSync(path.join(root, 'assets', 'og-home.png'), path.join(root, 'assets', 'fixture-screen.png'));
  fs.writeFileSync(path.join(product, 'index.html'), `<!doctype html><html lang="ja"><head>
  <title>${title}</title><meta name="description" content="${description}">
  <link rel="canonical" href="${url}"><meta name="robots" content="index,follow">
  <meta property="og:url" content="${url}"><meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}"><meta property="og:image" content="${image}">
  <meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="検証用画像">
  <meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${image}">
  <meta name="twitter:image:alt" content="検証用画像">
  <script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: '検証用製品', description, url, operatingSystem: 'Web', image, offers: { '@type': 'Offer', url: 'https://joshu-a.com/', price: '0', priceCurrency: 'JPY' } })}</script>
  </head><body><h1>検証用製品</h1><p>対象：テスト利用者</p>
  <dl><dt>公開状況</dt><dd>公開</dd><dt>価格</dt><dd>無料</dd><dt>対応環境</dt><dd>Web</dd></dl>
  <img data-screenshot src="/assets/fixture-screen.png" alt="検証画面">
  <a data-primary-cta href="https://joshu-a.com/">利用する</a></body></html>`);
  let home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  home = home.replace('現在は公開準備中です。', '製品を公開しています。').replace('現在、購入・ダウンロードできる製品はありません。', '製品を公開しています。').replace('最初の製品を準備しています', '製品はこちら');
  home = home.replace('</main>', '<a href="/products/fixture/">検証用製品</a></main>');
  fs.writeFileSync(path.join(root, 'index.html'), home);
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8').replace('</urlset>', `<url><loc>${url}</loc></url></urlset>`);
  fs.writeFileSync(path.join(root, 'sitemap.xml'), sitemap);
  return path.join(product, 'index.html');
}

test('current unpublished site passes and stays product-free', t => {
  const root = fixture(t);
  const result = checkSite(root);
  assert.deepEqual(result.errors, []);
  assert.equal(result.productCount, 0);
});

test('valid temporary product passes and missing sitemap/CTA/OG are caught', t => {
  const root = fixture(t);
  const product = addTestProduct(root);
  assert.deepEqual(checkSite(root).errors, []);
  fs.writeFileSync(path.join(root, 'sitemap.xml'), fs.readFileSync(path.join(source, 'sitemap.xml')));
  fs.writeFileSync(product, fs.readFileSync(product, 'utf8').replace('data-primary-cta href="https://joshu-a.com/"', 'data-primary-cta href=""').replace('assets/fixture-og.png', 'assets/missing-og.png'));
  const errors = checkSite(root).errors.join('\n');
  assert.match(errors, /sitemap.xml: missing/);
  assert.match(errors, /primary CTA required/);
  assert.match(errors, /OG image missing/);
});

test('documented HTML template can be filled into a passing product page', t => {
  const root = fixture(t);
  const product = addTestProduct(root);
  const markdown = fs.readFileSync(path.join(source, 'docs', 'product-page-template.md'), 'utf8');
  let template = markdown.match(/```html\s*([\s\S]*?)```/)?.[1];
  assert.ok(template, 'HTML code block exists');
  template = template.replace(/<section aria-labelledby="(?:video|faq|updates|related)-heading">[\s\S]*?<\/section>/g, '');
  const values = {
    TITLE: '検証用製品 | 助手A', DESCRIPTION: '公開チェックのテスト専用。',
    SLUG: 'fixture', OG_ALT: '検証用画像', SCHEMA_TYPE_JSON: '"SoftwareApplication"',
    PRODUCT_NAME: '検証用製品', OS_SCHEMA: 'Web', CTA_URL: 'https://joshu-a.com/',
    PRICE_AMOUNT: '0', PRICE_CURRENCY: 'JPY', ONE_LINE_VALUE: 'テスト用の一言。',
    WHAT_IT_DOES: 'テストの構造を検証する。', AUDIENCE: 'テスト利用者',
    PUBLIC_STATUS: '公開', PRICE_DISPLAY: '無料', OS_DISPLAY: 'Web',
    CTA_LABEL: '利用する', FEATURE_TITLE: '検証機能', FEATURE_DESCRIPTION: '検証用。',
    SCREENSHOT_WIDTH: '1200', SCREENSHOT_HEIGHT: '630', SCREENSHOT_ALT: '検証画面',
    SCREENSHOT_CAPTION: '検証画面の説明'
  };
  template = template.replace(/\{\{([A-Z_]+)\}\}/g, (whole, key) => {
    assert.ok(Object.hasOwn(values, key), `unmapped token ${key}`);
    return values[key];
  });
  fs.copyFileSync(path.join(root, 'assets', 'fixture-screen.png'), path.join(root, 'assets', 'fixture-screenshot.png'));
  fs.writeFileSync(product, template);
  assert.deepEqual(checkSite(root).errors, []);
  fs.writeFileSync(product, template.replace('"@type": "SoftwareApplication"', '"@type": ["VideoGame", "SoftwareApplication"]'));
  assert.deepEqual(checkSite(root).errors, []);
  fs.writeFileSync(product, template.replace('"@type": "SoftwareApplication"', '"@type": "VideoGame"'));
  assert.match(checkSite(root).errors.join('\n'), /VideoGame should also include SoftwareApplication/);
});
