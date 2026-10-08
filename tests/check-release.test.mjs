import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkSite } from '../scripts/check-release.mjs';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtureCta = 'https://joshu-a.com/products/fixture/use/';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'joshu-a-release-check-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const file of ['index.html', '404.html', 'robots.txt', 'sitemap.xml', '_headers']) fs.copyFileSync(path.join(source, file), path.join(root, file));
  fs.mkdirSync(path.join(root, 'assets'));
  for (const file of ['og-home.png', 'og-learning-speed-distance-time.png', 'og-learning-point-p.png', 'brand-mark.png']) fs.copyFileSync(path.join(source, 'assets', file), path.join(root, 'assets', file));
  const learning = path.join(root, 'learning', 'speed-distance-time');
  fs.mkdirSync(learning, { recursive: true });
  fs.mkdirSync(path.join(root, 'learning'), { recursive: true });
  fs.copyFileSync(path.join(source, 'learning', 'index.html'), path.join(root, 'learning', 'index.html'));
  for (const file of ['index.html', 'motion.mjs']) fs.copyFileSync(path.join(source, 'learning', 'speed-distance-time', file), path.join(learning, file));
  const pointP = path.join(root, 'learning', 'point-p');
  fs.mkdirSync(pointP, { recursive: true });
  for (const file of ['index.html', 'point-p.mjs']) fs.copyFileSync(path.join(source, 'learning', 'point-p', file), path.join(pointP, file));
  const linear = path.join(root, 'learning', 'linear-function');
  fs.mkdirSync(linear, { recursive: true });
  for (const file of ['index.html', 'linear.mjs']) fs.copyFileSync(path.join(source, 'learning', 'linear-function', file), path.join(linear, file));
  return root;
}

function addTestProduct(root) {
  const product = path.join(root, 'products', 'fixture');
  fs.mkdirSync(product, { recursive: true });
  const url = 'https://joshu-a.com/products/fixture/';
  const title = '検証用製品 | 助手A';
  const description = '公開チェックのテスト専用。';
  const image = 'https://joshu-a.com/assets/fixture-og.png';
  fs.mkdirSync(path.join(product, 'use'));
  fs.writeFileSync(path.join(product, 'use', 'index.html'), '<!doctype html><title>Test-only destination</title>');
  fs.copyFileSync(path.join(root, 'assets', 'og-home.png'), path.join(root, 'assets', 'fixture-og.png'));
  fs.copyFileSync(path.join(root, 'assets', 'og-home.png'), path.join(root, 'assets', 'fixture-screen.png'));
  fs.writeFileSync(path.join(product, 'index.html'), `<!doctype html><html lang="ja"><head>
  <title>${title}</title><meta name="description" content="${description}">
  <link rel="canonical" href="${url}"><meta name="robots" content="index,follow">
  <meta property="og:type" content="product"><meta property="og:url" content="${url}"><meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}"><meta property="og:image" content="${image}">
  <meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="検証用画像">
  <meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${image}">
  <meta name="twitter:image:alt" content="検証用画像">
  <script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: '検証用製品', description, url, operatingSystem: 'Web', image, offers: { '@type': 'Offer', url: fixtureCta, price: '0', priceCurrency: 'JPY' } })}</script>
  </head><body><h1>検証用製品</h1><p>対象：テスト利用者</p>
  <dl><dt>公開状況</dt><dd>公開</dd><dt>価格</dt><dd>無料</dd><dt>対応環境</dt><dd>Web</dd></dl>
  <img data-screenshot src="/assets/fixture-screen.png" alt="検証画面">
  <a data-primary-cta href="${fixtureCta}">利用する</a></body></html>`);
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
  assert.equal(result.learningCount, 3);
  assert.equal(result.pages.includes('learning/point-p/index.html'), true);
});

test('valid temporary product passes and missing sitemap/CTA/OG are caught', t => {
  const root = fixture(t);
  const product = addTestProduct(root);
  assert.deepEqual(checkSite(root).errors, []);
  fs.writeFileSync(path.join(root, 'sitemap.xml'), fs.readFileSync(path.join(source, 'sitemap.xml')));
  fs.writeFileSync(product, fs.readFileSync(product, 'utf8').replace(`data-primary-cta href="${fixtureCta}"`, 'data-primary-cta href=""').replace('assets/fixture-og.png', 'assets/missing-og.png'));
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
    TITLE: '検証用製品 | 助手A', DESCRIPTION: '公開チェックのテスト専用。', OG_IMAGE_URL: 'https://joshu-a.com/assets/fixture-og.png',
    SLUG: 'fixture', OG_ALT: '検証用画像', SCHEMA_TYPE_JSON: '"SoftwareApplication"',
    PRODUCT_NAME_JSON: JSON.stringify('検証用製品'), DESCRIPTION_JSON: JSON.stringify('公開チェックのテスト専用。'),
    CANONICAL_JSON: JSON.stringify('https://joshu-a.com/products/fixture/'), OG_IMAGE_JSON: JSON.stringify('https://joshu-a.com/assets/fixture-og.png'), OS_SCHEMA_JSON: JSON.stringify('Web'),
    RELEASE_DATE_JSON: JSON.stringify('2026-01-01'), CTA_URL_JSON: JSON.stringify(fixtureCta),
    PRODUCT_NAME: '検証用製品', OS_SCHEMA: 'Web', CTA_URL: fixtureCta,
    PRICE_AMOUNT: '0', PRICE_CURRENCY: 'JPY', ONE_LINE_VALUE: 'テスト用の一言。',
    WHAT_IT_DOES: 'テストの構造を検証する。', AUDIENCE: 'テスト利用者',
    PUBLIC_STATUS: '公開', PRICE_DISPLAY: '無料', OS_DISPLAY: 'Web',
    CTA_LABEL: '利用する', FEATURE_TITLE: '検証機能', FEATURE_DESCRIPTION: '検証用。',
    SCREENSHOT_SRC: '/assets/fixture-screenshot.png', SCREENSHOT_WIDTH: '1200', SCREENSHOT_HEIGHT: '630', SCREENSHOT_ALT: '検証画面',
    SCREENSHOT_CAPTION: '検証画面の説明', LEGAL_LINKS: ''
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

for (const { name, change, error, also } of [
  {
    name: 'prelaunch page without Offer cannot pass the release gate',
    change: html => html.replace(/,"offers":\{[^}]+\}/, '').replace('<dd>公開</dd>', '<dd>公開準備中</dd>'),
    error: /release gate requires real Offer URL\/price\/currency/,
    also: /released product needs actual 公開状況/
  },
  {
    name: 'CTA to homepage cannot pass as an actionable destination',
    change: html => html.replaceAll(fixtureCta, 'https://joshu-a.com/'),
    error: /release CTA must lead beyond the homepage/
  },
  {
    name: 'CTA to the same product cannot pass as an actionable destination',
    change: html => html.replaceAll(fixtureCta, 'https://joshu-a.com/products/fixture/'),
    error: /release CTA must lead beyond the homepage/
  },
  {
    name: 'reserved example destination is rejected',
    change: html => html.replaceAll(fixtureCta, 'https://example.org/product'),
    error: /placeholder, localhost, or preview URL remains/
  },
  {
    name: 'CTA and Offer destinations must agree',
    change: html => html.replace(`data-primary-cta href="${fixtureCta}"`, 'data-primary-cta href="https://joshu-a.com/assets/fixture-screen.png"'),
    error: /CTA and Offer URLs differ/
  },
  {
    name: 'empty CTA label is rejected',
    change: html => html.replace('>利用する</a>', '></a>'),
    error: /primary CTA label is empty/
  },
  {
    name: 'empty price and audience are rejected',
    change: html => html.replace('<dd>無料</dd>', '<dd></dd>').replace('対象：テスト利用者', '対象：'),
    error: /released product needs actual 価格/,
    also: /audience must be visible and nonempty/
  },
  {
    name: 'wrong canonical is rejected',
    change: html => html.replace('rel="canonical" href="https://joshu-a.com/products/fixture/"', 'rel="canonical" href="https://joshu-a.com/"'),
    error: /canonical must be https:\/\/joshu-a.com\/products\/fixture\//
  },
  {
    name: 'noindex and duplicate h1 are rejected',
    change: html => html.replace('content="index,follow"', 'content="noindex,follow"').replace('</h1>', '</h1><h1>重複</h1>'),
    error: /noindex on published page/,
    also: /expected exactly one h1/
  },
  {
    name: 'invalid JSON-LD is rejected',
    change: html => html.replace('<script type="application/ld+json">{', '<script type="application/ld+json">{oops'),
    error: /JSON-LD is not parseable/
  },
  {
    name: 'X image mismatch and placeholder are rejected',
    change: html => html.replace('name="twitter:image" content="https://joshu-a.com/assets/fixture-og.png"', 'name="twitter:image" content="https://joshu-a.com/assets/og-home.png"').replace('</body>', '<p>TODO</p></body>'),
    error: /X\/OG image mismatch/,
    also: /placeholder, localhost, or preview URL remains/
  },
  {
    name: 'broken internal link is rejected',
    change: html => html.replace('</body>', '<a href="/missing/">リンク</a></body>'),
    error: /internal link missing \/missing\//
  }
]) {
  test(name, t => {
    const root = fixture(t);
    const product = addTestProduct(root);
    fs.writeFileSync(product, change(fs.readFileSync(product, 'utf8')));
    const errors = checkSite(root).errors.join('\n');
    assert.match(errors, error);
    if (also) assert.match(errors, also);
  });
}

test('published product requires an actual homepage link', t => {
  const root = fixture(t);
  addTestProduct(root);
  const home = path.join(root, 'index.html');
  fs.writeFileSync(home, fs.readFileSync(home, 'utf8').replace('<a href="/products/fixture/">検証用製品</a>', ''));
  assert.match(checkSite(root).errors.join('\n'), /index.html: product link missing/);
});

test('sitemap cannot announce an unpublished product URL', t => {
  const root = fixture(t);
  const file = path.join(root, 'sitemap.xml');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('</urlset>', '<url><loc>https://joshu-a.com/products/coming-soon/</loc></url></urlset>'));
  assert.match(checkSite(root).errors.join('\n'), /sitemap.xml: unpublished or noncanonical URL/);
});


test('published learning page requires indexability, sitemap entry, and homepage link', t => {
  const root = fixture(t);
  const learning = path.join(root, 'learning', 'speed-distance-time', 'index.html');
  const home = path.join(root, 'index.html');
  const sitemap = path.join(root, 'sitemap.xml');
  fs.writeFileSync(learning, fs.readFileSync(learning, 'utf8').replace('content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"', 'content="noindex,nofollow"'));
  fs.writeFileSync(home, fs.readFileSync(home, 'utf8').replace('<a data-featured-learning href="/learning/point-p/">教材を開く</a>', ''));
  fs.writeFileSync(sitemap, fs.readFileSync(sitemap, 'utf8').replace(/\s*<url>\s*<loc>https:\/\/joshu-a\.com\/learning\/speed-distance-time\/<\/loc>[\s\S]*?<\/url>/, ''));
  const errors = checkSite(root).errors.join('\n');
  assert.match(errors, /noindex on published page/);
  assert.match(errors, /index.html: exactly one valid latest learning link required/);
  assert.match(errors, /sitemap.xml: missing https:\/\/joshu-a\.com\/learning\/speed-distance-time\//);
});

test('learning page requires a return link to the catalog', t => {
  const root = fixture(t);
  const learning = path.join(root, 'learning', 'speed-distance-time', 'index.html');
  fs.writeFileSync(learning, fs.readFileSync(learning, 'utf8').replace('<a href="/learning/">← 教材一覧へ戻る</a>', ''));
  assert.match(checkSite(root).errors.join('\n'), /return link to \/learning\/ missing/);
});

test('learning page shares a lesson-specific social image', t => {
  const root = fixture(t);
  const page = fs.readFileSync(path.join(root, 'learning', 'speed-distance-time', 'index.html'), 'utf8');
  assert.match(page, /property="og:image" content="https:\/\/joshu-a\.com\/assets\/og-learning-speed-distance-time\.png"/);
  assert.match(page, /name="twitter:image" content="https:\/\/joshu-a\.com\/assets\/og-learning-speed-distance-time\.png"/);
  assert.match(page, /"image":"https:\/\/joshu-a\.com\/assets\/og-learning-speed-distance-time\.png"/);
});

test('point P lesson has public metadata and a dedicated OG image', t => {
  const root = fixture(t);
  const page = fs.readFileSync(path.join(root, 'learning', 'point-p', 'index.html'), 'utf8');
  assert.match(page, /name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"/);
  assert.match(page, /rel="canonical" href="https:\/\/joshu-a\.com\/learning\/point-p\/"/);
  assert.match(page, /property="og:image" content="https:\/\/joshu-a\.com\/assets\/og-learning-point-p\.png"/);
  assert.match(page, /name="twitter:image" content="https:\/\/joshu-a\.com\/assets\/og-learning-point-p\.png"/);
  assert.match(page, /"@type": "WebPage"/);
  assert.match(fs.readFileSync(path.join(root, 'learning', 'index.html'), 'utf8'), /data-learning-card href="\/learning\/point-p\/"/);
  assert.match(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), /data-featured-learning href="\/learning\/linear-function\/"/);
  assert.deepEqual(checkSite(root).errors, []);
});

test('linear function lesson has public metadata and catalog/home integration', t => {
  const root = fixture(t);
  const page = fs.readFileSync(path.join(root, 'learning', 'linear-function', 'index.html'), 'utf8');
  assert.match(page, /name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"/);
  assert.match(page, /rel="canonical" href="https:\/\/joshu-a\.com\/learning\/linear-function\/"/);
  assert.match(page, /property="og:image" content="https:\/\/joshu-a\.com\/assets\/og-home\.png"/);
  assert.match(page, /name="twitter:image" content="https:\/\/joshu-a\.com\/assets\/og-home\.png"/);
  assert.match(page, /"@type":"WebPage"/);
  assert.match(page, /data-learning-subject="math"/);
  assert.match(fs.readFileSync(path.join(root, 'learning', 'index.html'), 'utf8'), /data-learning-card href="\/learning\/linear-function\/"/);
  assert.match(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), /data-featured-learning href="\/learning\/linear-function\/"/);
  assert.deepEqual(checkSite(root).errors, []);
});

test('learning catalog links only published lessons and exposes only published subjects', t => {
  const root = fixture(t);
  const catalog = path.join(root, 'learning', 'index.html');
  const html = fs.readFileSync(catalog, 'utf8');
  assert.match(html, /data-filter="all"/);
  assert.match(html, /data-filter="math"/);
  assert.match(html, /data-learning-card href="\/learning\/speed-distance-time\/"/);
  assert.match(html, /data-learning-card href="\/learning\/point-p\/"/);
  assert.match(html, /data-learning-card href="\/learning\/linear-function\/"/);
  assert.deepEqual(checkSite(root).errors, []);
  fs.writeFileSync(catalog, html.replace(/\s*<button class="filter" id="subject-math"[\s\S]*?<\/button>/, ''));
  assert.match(checkSite(root).errors.join('\n'), /filter missing for published subject math/);
});

test('learning catalog rejects placeholder and unapproved sample lessons', t => {
  const root = fixture(t);
  const catalog = path.join(root, 'learning', 'index.html');
  fs.writeFileSync(catalog, fs.readFileSync(catalog, 'utf8').replace('</main>', '<p>光と植物の成長</p></main>'));
  assert.match(checkSite(root).errors.join('\n'), /placeholder or unpublished learning content remains/);
});

test('learning category anchor targets are checked', t => {
  const root = fixture(t);
  const catalog = path.join(root, 'learning', 'index.html');
  fs.writeFileSync(catalog, fs.readFileSync(catalog, 'utf8').replace('id="subject-math"', ''));
  const errors = checkSite(root).errors.join('\n');
  assert.match(errors, /missing anchor \/learning\/#subject-math/);
});
