import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ORIGIN = 'https://joshu-a.com';
const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const START = 'PRODUCTS:GENERATED:START';
const END = 'PRODUCTS:GENERATED:END';
const HOME_COPY_START = 'PRODUCTS:COPY:START';
const HOME_COPY_END = 'PRODUCTS:COPY:END';
const HOME_CARDS_START = 'PRODUCTS:CARDS:START';
const HOME_CARDS_END = 'PRODUCTS:CARDS:END';
const GENERATED_PAGE = '<!-- GENERATED:joshu-a-product:';
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PLACEHOLDER = /\{\{[^}]+\}\}|\b(?:TODO|TBD)\b|example\.(?:com|org|net)|localhost|127\.0\.0\.1|\.pages\.dev\b|https?:\/\/[^\s"'<>]*\.(?:test|invalid)\b/i;
const ALLOWED_FIELDS = new Set([
  'slug', 'publish', 'productType', 'name', 'oneLineValue', 'audience', 'description', 'title', 'ogAlt',
  'status', 'priceDisplay', 'priceAmount', 'currency', 'platforms', 'ctaLabel', 'ctaUrl', 'ogImage',
  'screenshot', 'features', 'releaseDate', 'lastModified', 'video', 'faq', 'updates', 'relatedArticles', 'legalLinks'
]);
const LINK_LABELS = {
  privacy: 'プライバシー',
  terms: '利用条件',
  license: 'ライセンス',
  refund: '返金について',
  sellerInformation: '販売者情報',
  support: 'サポート'
};

function fail(message) { throw new Error(message); }
function isRecord(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function requireString(value, label) {
  if (typeof value !== 'string' || !value.trim()) fail(`${label} is required`);
  if (PLACEHOLDER.test(value)) fail(`${label} contains a placeholder or preview value`);
  return value.trim();
}
function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
function jsonLiteral(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026');
}
function replaceMarkers(source, startMarker, endMarker, value, label) {
  const start = `<!-- ${startMarker} -->`;
  const end = `<!-- ${endMarker} -->`;
  if (source.split(start).length !== 2 || source.split(end).length !== 2) fail(`${label}: expected exactly one start and end marker`);
  const startIndex = source.indexOf(start) + start.length;
  const endIndex = source.indexOf(end);
  if (endIndex < startIndex) fail(`${label}: generated region markers are out of order`);
  return `${source.slice(0, startIndex)}${value}${source.slice(endIndex)}`;
}
function replaceSection(source, id, value) {
  const pattern = new RegExp(`<section\\b(?=[^>]*aria-labelledby=["']${id}["'])[^>]*>[\\s\\S]*?<\\/section>`, 'i');
  if (!pattern.test(source)) fail(`product template: ${id} section missing`);
  return source.replace(pattern, value);
}
function validateDate(value, label) {
  const date = requireString(value, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) fail(`${label} must be a real YYYY-MM-DD date`);
  return date;
}
function imagePath(value, root, label) {
  const image = requireString(value, label);
  if (!image.startsWith('/assets/') || image.startsWith('//') || image.includes('?') || image.includes('#')) fail(`${label} must be a root-relative /assets/ path`);
  const decoded = decodeURIComponent(image);
  if (decoded.split('/').some(part => part === '.' || part === '..') || decoded.includes('\\')) fail(`${label} contains an unsafe path`);
  const file = path.resolve(root, `.${decoded}`);
  if (!file.startsWith(`${path.resolve(root, 'assets')}${path.sep}`) || !fs.existsSync(file) || !fs.statSync(file).isFile()) fail(`${label} does not reference an existing asset: ${image}`);
  return { path: decoded, file, url: `${ORIGIN}${decoded}` };
}
function validateUrl(value, label, { allowMailto = false } = {}) {
  const source = requireString(value, label);
  if (source.startsWith('//')) fail(`${label} must not be protocol-relative`);
  let url;
  if (source.startsWith('/')) url = new URL(source, ORIGIN);
  else {
    try { url = new URL(source); } catch { fail(`${label} must be an absolute HTTPS URL or a root-relative site URL`); }
  }
  if (url.protocol === 'mailto:' && allowMailto && url.href === 'mailto:contact@joshu-a.com') return url.href;
  if (url.protocol !== 'https:') fail(`${label} must use HTTPS`);
  if (/(?:^|\.)pages\.dev$/i.test(url.hostname) || /^(?:localhost|127\.0\.0\.1)$/i.test(url.hostname)) fail(`${label} must not use a preview or local URL`);
  if (PLACEHOLDER.test(url.href)) fail(`${label} contains a placeholder or preview value`);
  return url.href;
}
function ensureInternalTarget(urlValue, root, label) {
  const url = new URL(urlValue, ORIGIN);
  if (url.origin !== ORIGIN) return;
  let file = path.join(root, decodeURIComponent(url.pathname.replace(/^\//, '')));
  if (url.pathname.endsWith('/')) file = path.join(file, 'index.html');
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) fail(`${label} points to a missing local page: ${url.pathname}`);
}
function validatePrice(product) {
  const amount = product.priceAmount;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0 || Math.round(amount * 100) !== amount * 100) fail('priceAmount must be a nonnegative number with at most two decimal places');
  const currency = requireString(product.currency, 'currency');
  if (!/^[A-Z]{3}$/.test(currency)) fail('currency must be an uppercase ISO currency code');
  if (typeof Intl.supportedValuesOf === 'function' && !Intl.supportedValuesOf('currency').includes(currency)) fail(`currency is not supported: ${currency}`);
  let parts;
  try { parts = new Intl.NumberFormat('en', { style: 'currency', currency }).formatToParts(amount); }
  catch { fail(`currency is not supported: ${currency}`); }
  const display = requireString(product.priceDisplay, 'priceDisplay');
  const normalizedDisplay = display.replace(/[\s,，]/g, '');
  const amountText = new Intl.NumberFormat('en-US', { useGrouping: false, maximumFractionDigits: 2 }).format(amount);
  const amountMatches = normalizedDisplay.includes(amountText);
  const freeLabel = /無料|\bfree\b|no cost/i.test(display);
  if (!amountMatches && !(amount === 0 && freeLabel)) fail('priceDisplay does not match priceAmount');
  const symbol = parts.find(part => part.type === 'currency')?.value ?? currency;
  const currencyMatches = display.includes(currency) || display.includes(symbol) || (currency === 'JPY' && /円|￥|¥/.test(display));
  if (!currencyMatches && !(amount === 0 && freeLabel && currency === 'JPY')) fail('priceDisplay does not match currency');
  return { amount: String(amount), currency, display };
}
function validateArray(value, label, minimum = 0) {
  if (!Array.isArray(value) || value.length < minimum) fail(`${label} must be an array${minimum ? ` with at least ${minimum} item(s)` : ''}`);
  return value;
}
function validateProduct(product, fileName, root) {
  if (!isRecord(product)) fail(`${fileName}: product data must be a JSON object`);
  for (const key of Object.keys(product)) if (!ALLOWED_FIELDS.has(key)) fail(`${fileName}: unsupported field ${key}`);
  const slug = requireString(product.slug, `${fileName}.slug`);
  if (!SLUG_PATTERN.test(slug)) fail(`${fileName}: invalid slug ${slug}`);
  if (path.basename(fileName, '.json') !== slug) fail(`${fileName}: filename must match slug ${slug}`);
  if (typeof product.publish !== 'boolean') fail(`${fileName}: publish must be true or false`);
  return { slug, publish: product.publish, ...(product.publish ? validatePublishedProduct(product, slug, root) : {}) };
}
function validatePublishedProduct(product, slug, root) {
  const name = requireString(product.name, `${slug}.name`);
  const oneLineValue = requireString(product.oneLineValue, `${slug}.oneLineValue`);
  const audience = requireString(product.audience, `${slug}.audience`);
  const description = requireString(product.description, `${slug}.description`);
  const title = requireString(product.title ?? `${name} | 助手A`, `${slug}.title`);
  const ogAlt = requireString(product.ogAlt ?? `${name} — ${oneLineValue}`, `${slug}.ogAlt`);
  const status = requireString(product.status, `${slug}.status`);
  if (/未定|未公開|準備中|近日公開|発売前|開発中|予約|プレリリース|予定|検討中|coming soon|\bTBA\b/i.test(status)) fail(`${slug}.status must describe an available product`);
  if (!['SoftwareApplication', 'VideoGame'].includes(product.productType)) fail(`${slug}.productType must be SoftwareApplication or VideoGame`);
  const price = validatePrice(product);
  const platforms = validateArray(product.platforms, `${slug}.platforms`, 1).map((item, index) => requireString(item, `${slug}.platforms[${index}]`));
  const ctaLabel = requireString(product.ctaLabel, `${slug}.ctaLabel`);
  const ctaUrl = validateUrl(product.ctaUrl, `${slug}.ctaUrl`);
  ensureInternalTarget(ctaUrl, root, `${slug}.ctaUrl`);
  const ogImage = imagePath(product.ogImage, root, `${slug}.ogImage`);
  if (!ogImage.path.toLowerCase().endsWith('.png')) fail(`${slug}.ogImage must be a PNG`);
  const screenshot = product.screenshot;
  if (!isRecord(screenshot)) fail(`${slug}.screenshot must include an asset, alt, caption and dimensions`);
  const screenshotImage = imagePath(screenshot.src, root, `${slug}.screenshot.src`);
  const screenshotAlt = requireString(screenshot.alt, `${slug}.screenshot.alt`);
  const screenshotCaption = requireString(screenshot.caption, `${slug}.screenshot.caption`);
  for (const dimension of ['width', 'height']) if (!Number.isSafeInteger(screenshot[dimension]) || screenshot[dimension] < 1 || screenshot[dimension] > 20000) fail(`${slug}.screenshot.${dimension} must be a positive integer`);
  const features = validateArray(product.features, `${slug}.features`, 1).map((feature, index) => {
    if (!isRecord(feature)) fail(`${slug}.features[${index}] must be an object`);
    return { title: requireString(feature.title, `${slug}.features[${index}].title`), description: requireString(feature.description, `${slug}.features[${index}].description`) };
  });
  const releaseDate = validateDate(product.releaseDate, `${slug}.releaseDate`);
  const lastModified = validateDate(product.lastModified, `${slug}.lastModified`);
  if (lastModified < releaseDate) fail(`${slug}.lastModified cannot be earlier than releaseDate`);

  let video;
  if (product.video !== undefined) {
    if (!isRecord(product.video)) fail(`${slug}.video must be an object`);
    const src = validateUrl(product.video.src, `${slug}.video.src`);
    if (!new URL(src).pathname.toLowerCase().endsWith('.mp4')) fail(`${slug}.video.src must point to an MP4`);
    ensureInternalTarget(src, root, `${slug}.video.src`);
    const poster = product.video.poster ? imagePath(product.video.poster, root, `${slug}.video.poster`).path : ogImage.path;
    video = { src, poster };
  }

  const faq = product.faq === undefined ? [] : validateArray(product.faq, `${slug}.faq`).map((item, index) => {
    if (!isRecord(item)) fail(`${slug}.faq[${index}] must be an object`);
    return { question: requireString(item.question, `${slug}.faq[${index}].question`), answer: requireString(item.answer, `${slug}.faq[${index}].answer`) };
  });
  const updates = product.updates === undefined ? [] : validateArray(product.updates, `${slug}.updates`).map((item, index) => {
    if (!isRecord(item)) fail(`${slug}.updates[${index}] must be an object`);
    const date = validateDate(item.date, `${slug}.updates[${index}].date`);
    return { date, summary: requireString(item.summary, `${slug}.updates[${index}].summary`) };
  });
  const relatedArticles = product.relatedArticles === undefined ? [] : validateArray(product.relatedArticles, `${slug}.relatedArticles`).map((item, index) => {
    if (!isRecord(item)) fail(`${slug}.relatedArticles[${index}] must be an object`);
    const url = validateUrl(item.url, `${slug}.relatedArticles[${index}].url`);
    ensureInternalTarget(url, root, `${slug}.relatedArticles[${index}].url`);
    return { title: requireString(item.title, `${slug}.relatedArticles[${index}].title`), url };
  });
  const legalLinks = [];
  if (product.legalLinks !== undefined) {
    if (!isRecord(product.legalLinks)) fail(`${slug}.legalLinks must be an object`);
    for (const key of Object.keys(product.legalLinks)) if (!Object.hasOwn(LINK_LABELS, key)) fail(`${slug}.legalLinks has unsupported field ${key}`);
    for (const [key, value] of Object.entries(product.legalLinks)) {
      const url = validateUrl(value, `${slug}.legalLinks.${key}`, { allowMailto: key === 'support' });
      ensureInternalTarget(url, root, `${slug}.legalLinks.${key}`);
      legalLinks.push({ label: LINK_LABELS[key], url });
    }
  }
  return {
    slug, name, oneLineValue, audience, description, title, ogAlt, status, price, platforms, ctaLabel, ctaUrl,
    ogImage, screenshot: { src: screenshotImage.path, alt: screenshotAlt, caption: screenshotCaption, width: screenshot.width, height: screenshot.height },
    features, releaseDate, lastModified, productType: product.productType, video, faq, updates, relatedArticles, legalLinks
  };
}
function readProducts(root) {
  const directory = path.join(root, 'data', 'products');
  if (!fs.existsSync(directory)) return [];
  if (!fs.statSync(directory).isDirectory()) fail('data/products must be a directory');
  const files = fs.readdirSync(directory, { withFileTypes: true }).filter(entry => entry.isFile() && entry.name.endsWith('.json')).map(entry => entry.name).sort();
  const records = files.map(file => {
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')); }
    catch (error) { fail(`${file}: invalid JSON (${error.message})`); }
    if (!isRecord(data) || typeof data.slug !== 'string' || !SLUG_PATTERN.test(data.slug)) fail(`${file}: invalid slug`);
    return { file, data };
  });
  const seen = new Set();
  for (const { data } of records) {
    if (seen.has(data.slug)) fail(`duplicate product slug: ${data.slug}`);
    seen.add(data.slug);
  }
  return records.map(({ file, data }) => validateProduct(data, file, root));
}
function cardHtml(product) {
  return `\n          <article class="product" data-generated-product="${escapeHtml(product.slug)}">\n            <span class="tag">${escapeHtml(product.status)}</span>\n            <h3><a href="/products/${escapeHtml(product.slug)}/">${escapeHtml(product.name)}</a></h3>\n            <p>${escapeHtml(product.oneLineValue)}</p>\n            <p>価格：${escapeHtml(product.price.display)} ／ 対応環境：${escapeHtml(product.platforms.join('、'))}</p>\n            <a class="btn secondary" href="/products/${escapeHtml(product.slug)}/">製品詳細を見る</a>\n          </article>`;
}
function productCopy(products) {
  return products.length
    ? '公開中の製品情報と、価格・対応環境・入手先をご案内します。'
    : '現在は公開準備中です。製品公開後は、価格・対応環境・更新方針・購入先をこのページから確認できるようにします。';
}
function productCards(products) {
  if (!products.length) return `\n          <article class="product">\n            <span class="tag">公開準備中</span>\n            <h3>最初の製品を準備しています</h3>\n            <p>現在、購入・ダウンロードできる製品はありません。公開できる製品ができ次第、ここからご案内します。</p>\n          </article>\n          `;
  return products.map(cardHtml).join('\n');
}
function renderProduct(template, product) {
  const canonical = `${ORIGIN}/products/${product.slug}/`;
  const schemaType = product.productType === 'VideoGame' ? ['VideoGame', 'SoftwareApplication'] : 'SoftwareApplication';
  const featureMarkup = product.features.map(feature => `<article class="card"><h3>${escapeHtml(feature.title)}</h3><p>${escapeHtml(feature.description)}</p></article>`).join('');
  template = template.replace(/<div class="cards">[\s\S]*?<\/div>/i, `<div class="cards">${featureMarkup}</div>`);
  if (product.video) {
    template = replaceSection(template, 'video-heading', `<section aria-labelledby="video-heading"><h2 id="video-heading">デモ動画</h2><video controls preload="none" poster="${escapeHtml(product.video.poster)}"><source src="${escapeHtml(product.video.src)}" type="video/mp4" />動画を再生できない場合は<a href="${escapeHtml(product.video.src)}">動画ファイル</a>をご覧ください。</video></section>`);
  } else template = replaceSection(template, 'video-heading', '');
  template = replaceSection(template, 'faq-heading', product.faq.length
    ? `<section aria-labelledby="faq-heading"><h2 id="faq-heading">よくある質問</h2>${product.faq.map(item => `<details><summary>${escapeHtml(item.question)}</summary><p>${escapeHtml(item.answer)}</p></details>`).join('')}</section>`
    : '');
  template = replaceSection(template, 'updates-heading', product.updates.length
    ? `<section aria-labelledby="updates-heading"><h2 id="updates-heading">更新情報</h2>${product.updates.map(item => `<p><time datetime="${item.date}">${item.date}</time>：${escapeHtml(item.summary)}</p>`).join('')}</section>`
    : '');
  template = replaceSection(template, 'related-heading', product.relatedArticles.length
    ? `<section aria-labelledby="related-heading"><h2 id="related-heading">関連記事</h2>${product.relatedArticles.map(item => `<p><a href="${escapeHtml(item.url)}">${escapeHtml(item.title)}</a></p>`).join('')}</section>`
    : '');
  const legalMarkup = product.legalLinks.length
    ? `<ul>${product.legalLinks.map(item => `<li><a href="${escapeHtml(item.url)}">${escapeHtml(item.label)}</a></li>`).join('')}</ul>`
    : '';
  const values = {
    SLUG: product.slug,
    TITLE: product.title,
    DESCRIPTION: product.description,
    OG_ALT: product.ogAlt,
    OG_IMAGE_URL: product.ogImage.url,
    PRODUCT_NAME: product.name,
    ONE_LINE_VALUE: product.oneLineValue,
    WHAT_IT_DOES: product.description,
    AUDIENCE: product.audience,
    PUBLIC_STATUS: product.status,
    PRICE_DISPLAY: product.price.display,
    PRICE_AMOUNT: product.price.amount,
    PRICE_CURRENCY: product.price.currency,
    OS_SCHEMA: product.platforms.join(', '),
    OS_DISPLAY: product.platforms.join('、'),
    CTA_URL: product.ctaUrl,
    CTA_LABEL: product.ctaLabel,
    SCREENSHOT_SRC: product.screenshot.src,
    SCREENSHOT_WIDTH: product.screenshot.width,
    SCREENSHOT_HEIGHT: product.screenshot.height,
    SCREENSHOT_ALT: product.screenshot.alt,
    SCREENSHOT_CAPTION: product.screenshot.caption,
    VIDEO_SRC: product.video?.src ?? '',
    VIDEO_POSTER: product.video?.poster ?? '',
    UPDATE_DATE: product.updates[0]?.date ?? '',
    UPDATE_SUMMARY: product.updates[0]?.summary ?? '',
    FAQ_QUESTION: product.faq[0]?.question ?? '',
    FAQ_ANSWER: product.faq[0]?.answer ?? '',
    RELATED_ARTICLE_URL: product.relatedArticles[0]?.url ?? '',
    RELATED_ARTICLE_TITLE: product.relatedArticles[0]?.title ?? '',
    LEGAL_LINKS: legalMarkup
  };
  const jsonValues = {
    SCHEMA_TYPE_JSON: schemaType,
    PRODUCT_NAME_JSON: product.name,
    DESCRIPTION_JSON: product.description,
    CANONICAL_JSON: canonical,
    OG_IMAGE_JSON: product.ogImage.url,
    OS_SCHEMA_JSON: product.platforms.join(', '),
    RELEASE_DATE_JSON: product.releaseDate,
    CTA_URL_JSON: product.ctaUrl
  };
  template = template.replace(/\{\{([A-Z_]+_JSON)\}\}/g, (token, key) => {
    if (!Object.hasOwn(jsonValues, key)) fail(`product template has unsupported token ${token}`);
    return jsonLiteral(jsonValues[key]);
  });
  template = template.replace(/\{\{([A-Z_]+)\}\}/g, (token, key) => {
    if (!Object.hasOwn(values, key)) fail(`product template has unsupported token ${token}`);
    return escapeHtml(values[key]);
  });
  if (/\{\{[^}]+\}\}/.test(template)) fail(`${product.slug}: unresolved template placeholder`);
  template = template.replace('<head>', `<head>\n  ${GENERATED_PAGE}${product.slug} -->`);
  return template;
}
function renderSitemap(sitemap, products) {
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1].trim());
  const generatedStart = sitemap.indexOf(`<!-- ${START} -->`);
  const generatedEnd = sitemap.indexOf(`<!-- ${END} -->`);
  const previous = generatedStart < 0 || generatedEnd < 0 ? [] : [...sitemap.slice(generatedStart, generatedEnd).matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1].trim());
  const previousSet = new Set(previous);
  const outside = urls.filter(url => !previousSet.has(url));
  const generated = products.map(product => {
    const url = `${ORIGIN}/products/${product.slug}/`;
    if (outside.includes(url)) fail(`sitemap.xml already contains generated URL outside the marker: ${url}`);
    return `\n  <url>\n    <loc>${url}</loc>\n    <lastmod>${product.lastModified}</lastmod>\n  </url>`;
  }).join('');
  return replaceMarkers(sitemap, START, END, generated ? `${generated}\n  ` : '\n  ', 'sitemap.xml');
}
function existingProducts(root) {
  const directory = path.join(root, 'products');
  if (!fs.existsSync(directory)) return [];
  if (!fs.statSync(directory).isDirectory()) fail('products must be a directory');
  return fs.readdirSync(directory, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => {
    const file = path.join(directory, entry.name, 'index.html');
    if (!fs.existsSync(file)) fail(`products/${entry.name}: refusing to overwrite or ignore an unmanaged product directory`);
    const html = fs.readFileSync(file, 'utf8');
    if (!html.includes(`${GENERATED_PAGE}${entry.name} -->`)) fail(`products/${entry.name}: refusing to overwrite an unmanaged product page`);
    return { slug: entry.name, directory: path.dirname(file), file };
  });
}
function atomicWrite(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, content, 'utf8');
  fs.renameSync(temp, file);
}

export function buildProducts({ root = DEFAULT_ROOT } = {}) {
  root = path.resolve(root);
  const products = readProducts(root);
  const published = products.filter(product => product.publish).sort((a, b) => a.slug.localeCompare(b.slug));
  const slugs = new Set();
  for (const product of published) {
    if (slugs.has(product.slug)) fail(`duplicate published slug: ${product.slug}`);
    slugs.add(product.slug);
  }
  const existing = existingProducts(root);
  const markdown = fs.readFileSync(path.join(root, 'docs', 'product-page-template.md'), 'utf8');
  let template = markdown.match(/```html\s*([\s\S]*?)```/)?.[1];
  if (!template) fail('docs/product-page-template.md: HTML template block missing');
  const rendered = published.map(product => ({ ...product, html: renderProduct(template, product) }));
  let home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  home = replaceMarkers(home, HOME_COPY_START, HOME_COPY_END, productCopy(rendered), 'index.html product copy');
  home = replaceMarkers(home, HOME_CARDS_START, HOME_CARDS_END, productCards(rendered), 'index.html product cards');
  let sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  sitemap = renderSitemap(sitemap, rendered);

  for (const product of rendered) {
    const output = path.join(root, 'products', product.slug, 'index.html');
    const directory = path.dirname(output);
    if (fs.existsSync(directory) && !fs.existsSync(output)) fail(`${product.slug}: output directory exists without a generator-owned page`);
  }
  const stale = existing.filter(item => !slugs.has(item.slug));
  for (const item of stale) {
    fs.rmSync(item.file);
    if (fs.readdirSync(item.directory).length === 0) fs.rmdirSync(item.directory);
  }
  for (const product of rendered) atomicWrite(path.join(root, 'products', product.slug, 'index.html'), product.html);
  atomicWrite(path.join(root, 'index.html'), home);
  atomicWrite(path.join(root, 'sitemap.xml'), sitemap);
  return { publishedSlugs: rendered.map(product => product.slug), removedSlugs: stale.map(product => product.slug) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const result = buildProducts();
    console.log(`Generated ${result.publishedSlugs.length} published product page(s)${result.publishedSlugs.length ? `: ${result.publishedSlugs.join(', ')}` : ''}${result.removedSlugs.length ? `; removed unpublished generated page(s): ${result.removedSlugs.join(', ')}` : ''}.`);
  } catch (error) {
    console.error(`Product generation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
