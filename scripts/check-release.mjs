import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ORIGIN = 'https://joshu-a.com';
const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLACEHOLDER = /\{\{[^}]+\}\}|\b(?:TODO|TBD)\b|example\.(?:com|invalid)|localhost|127\.0\.0\.1|\.pages\.dev\b/i;

function attrs(tag) {
  const result = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)) result[match[1].toLowerCase()] = match[3];
  for (const match of tag.matchAll(/\s(data-[\w-]+)(?=\s|\/?>)/g)) result[match[1].toLowerCase()] = true;
  return result;
}

function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(match => attrs(match[0]));
}

function meta(html, kind, key) {
  return tags(html, 'meta').find(item => item[kind] === key)?.content?.trim() ?? '';
}

function localFile(root, sitePath) {
  let decoded;
  try { decoded = decodeURIComponent(sitePath); } catch { return null; }
  if (!decoded.startsWith('/') || decoded.includes('\\') || decoded.split('/').includes('..')) return null;
  const relative = decoded.endsWith('/') ? `${decoded}index.html` : decoded;
  const absolute = path.resolve(root, `.${relative}`);
  return absolute.startsWith(`${root}${path.sep}`) ? absolute : null;
}

function pageUrl(relative) {
  return relative === 'index.html' ? `${ORIGIN}/` : `${ORIGIN}/${relative.replace(/\\/g, '/').replace(/index\.html$/, '')}`;
}

function discover(root) {
  const pages = ['index.html'];
  for (const group of ['products', 'journal']) {
    const base = path.join(root, group);
    if (!fs.existsSync(base)) continue;
    for (const item of fs.readdirSync(base, { withFileTypes: true })) {
      if (!item.isDirectory()) continue;
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.name)) throw new Error(`Invalid ${group} slug: ${item.name}`);
      const relative = `${group}/${item.name}/index.html`;
      if (!fs.existsSync(path.join(root, relative))) throw new Error(`${relative}: missing HTML`);
      pages.push(relative);
    }
  }
  return pages;
}

function checkPng(root, url, report, label) {
  let parsed;
  try { parsed = new URL(url); } catch { report(`${label}: image URL invalid`); return; }
  if (parsed.origin !== ORIGIN) { report(`${label}: OG image must use ${ORIGIN}`); return; }
  const file = localFile(root, parsed.pathname);
  if (!file || !fs.existsSync(file)) { report(`${label}: OG image missing: ${parsed.pathname}`); return; }
  const image = fs.readFileSync(file);
  if (image.length < 24 || image.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    report(`${label}: OG image is not a PNG`); return;
  }
  const width = image.readUInt32BE(16);
  const height = image.readUInt32BE(20);
  if (width !== 1200 || height !== 630) report(`${label}: OG image must be 1200x630 (found ${width}x${height})`);
  if (image.length > 5 * 1024 * 1024) report(`${label}: OG image exceeds 5 MiB`);
}

export function checkSite(root = DEFAULT_ROOT) {
  root = path.resolve(root);
  const errors = [];
  const report = message => errors.push(message);
  let pages;
  try { pages = discover(root); } catch (error) { report(error.message); pages = ['index.html']; }
  const productCount = pages.filter(file => file.startsWith('products/')).length;
  const pageUrls = new Set(pages.map(pageUrl));
  for (const relative of pages) {
    const file = path.join(root, relative);
    if (!fs.existsSync(file)) { report(`${relative}: missing HTML`); continue; }
    const html = fs.readFileSync(file, 'utf8');
    const expected = pageUrl(relative);
    const label = relative;
    const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? '';
    const title = head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1].trim() ?? '';
    const description = meta(head, 'name', 'description');
    const canonical = tags(head, 'link').find(item => item.rel === 'canonical')?.href;
    if (!title) report(`${label}: title is empty`);
    if (!description) report(`${label}: description is empty`);
    if (canonical !== expected) report(`${label}: canonical must be ${expected}`);
    if (/noindex/i.test(meta(head, 'name', 'robots'))) report(`${label}: noindex on published page`);
    if (PLACEHOLDER.test(html)) report(`${label}: placeholder, localhost, or preview URL remains`);
    const body = html.replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi, '');
    if ((body.match(/<h1\b/gi) ?? []).length !== 1) report(`${label}: expected exactly one h1`);
    const og = Object.fromEntries(tags(head, 'meta').filter(item => item.property?.startsWith('og:')).map(item => [item.property, item.content?.trim()]));
    if (og['og:url'] !== expected) report(`${label}: og:url must match canonical`);
    for (const key of ['og:title', 'og:description', 'og:image', 'og:image:alt']) if (!og[key]) report(`${label}: missing ${key}`);
    if (og['og:image']) checkPng(root, og['og:image'], report, label);
    if (og['og:image:width'] !== '1200' || og['og:image:height'] !== '630') report(`${label}: OG dimensions metadata must be 1200x630`);
    for (const key of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'twitter:image:alt']) if (!meta(head, 'name', key)) report(`${label}: missing ${key}`);
    if (meta(head, 'name', 'twitter:card') !== 'summary_large_image') report(`${label}: X card must be summary_large_image`);
    if (meta(head, 'name', 'twitter:image') !== og['og:image']) report(`${label}: X/OG image mismatch`);
    const jsonScripts = [...head.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    if (!jsonScripts.length) report(`${label}: missing JSON-LD`);
    let schemas = [];
    for (const match of jsonScripts) {
      try {
        const value = JSON.parse(match[1]);
        if (value['@context'] !== 'https://schema.org') report(`${label}: JSON-LD context must be schema.org`);
        schemas.push(...(value['@graph'] ?? [value]));
      } catch { report(`${label}: JSON-LD is not parseable`); }
    }
    if (relative.startsWith('products/')) {
      const schema = schemas.find(item => {
        const types = [item['@type']].flat();
        return types.includes('SoftwareApplication') || types.includes('VideoGame');
      });
      const h1 = body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1].replace(/<[^>]+>/g, '').trim();
      if (!schema) report(`${label}: SoftwareApplication or VideoGame JSON-LD missing`);
      else {
        const types = [schema['@type']].flat();
        if (types.includes('VideoGame') && !types.includes('SoftwareApplication')) report(`${label}: VideoGame should also include SoftwareApplication`);
        if (schema.url !== expected || !schema.name || !schema.description || !schema.operatingSystem) report(`${label}: JSON-LD identity/platform missing or URL mismatch`);
        if (schema.name !== h1) report(`${label}: JSON-LD name and h1 differ`);
        if (schema.image !== og['og:image']) report(`${label}: JSON-LD image mismatch`);
        if (!schema.offers || schema.offers['@type'] !== 'Offer' || !schema.offers.url || !/^\d+(?:\.\d{1,2})?$/.test(String(schema.offers.price ?? '')) || !/^[A-Z]{3}$/.test(schema.offers.priceCurrency ?? '')) report(`${label}: real Offer URL/price/currency required`);
        else if (!/^https:\/\//.test(schema.offers.url)) report(`${label}: Offer URL must use HTTPS`);
      }
      if (og['og:title'] !== title || og['og:description'] !== description || meta(head, 'name', 'twitter:title') !== title || meta(head, 'name', 'twitter:description') !== description) report(`${label}: title/description must match OG and X`);
      const ctas = tags(body, 'a').filter(item => Object.hasOwn(item, 'data-primary-cta'));
      if (ctas.length !== 1 || !ctas[0].href?.trim() || ctas[0].href === '#') report(`${label}: exactly one nonempty primary CTA required`);
      else if (!/^https:\/\//.test(ctas[0].href)) report(`${label}: primary CTA must use an absolute HTTPS URL`);
      else if (schema?.offers?.url && schema.offers.url !== ctas[0].href) report(`${label}: CTA and Offer URLs differ`);
      if (!/対象[：:]/.test(body) || !/価格/.test(body) || !/対応環境/.test(body) || !/公開状況/.test(body)) report(`${label}: audience/status/price/platform must be visible`);
      const screenshots = tags(body, 'img').filter(item => Object.hasOwn(item, 'data-screenshot'));
      if (!screenshots.length) report(`${label}: real screenshot required`);
      for (const screenshot of screenshots) if (!screenshot.alt?.trim()) report(`${label}: screenshot needs descriptive alt text`);
    }
    for (const image of tags(body, 'img')) if (!Object.hasOwn(image, 'alt')) report(`${label}: image alt attribute missing`);
    const ids = new Set([...body.matchAll(/\bid=["']([^"']+)["']/gi)].map(match => match[1]));
    for (const anchor of tags(body, 'a')) {
      const href = anchor.href;
      if (!href) { report(`${label}: empty link`); continue; }
      if (/^(?:javascript|data):/i.test(href)) { report(`${label}: unsafe link ${href}`); continue; }
      if (/^(?:mailto:|tel:|https?:\/\/)/i.test(href) && !href.startsWith(ORIGIN)) continue;
      let target;
      try { target = new URL(href, expected); } catch { report(`${label}: invalid link ${href}`); continue; }
      if (target.origin !== ORIGIN) continue;
      const targetFile = localFile(root, target.pathname);
      if (!targetFile || !fs.existsSync(targetFile)) { report(`${label}: internal link missing ${href}`); continue; }
      if (target.hash) {
        const targetIds = target.pathname === new URL(expected).pathname
          ? ids
          : new Set([...fs.readFileSync(targetFile, 'utf8').matchAll(/\bid=["']([^"']+)["']/gi)].map(match => match[1]));
        if (!targetIds.has(decodeURIComponent(target.hash.slice(1)))) report(`${label}: missing anchor ${href}`);
      }
    }
    for (const image of tags(body, 'img')) {
      if (image.src?.startsWith('/') && !fs.existsSync(localFile(root, new URL(image.src, ORIGIN).pathname) ?? '')) report(`${label}: image missing ${image.src}`);
    }
    for (const media of [...tags(body, 'source'), ...tags(body, 'video')]) {
      for (const src of [media.src, media.poster].filter(Boolean)) {
        if (src.startsWith('/') && !fs.existsSync(localFile(root, new URL(src, ORIGIN).pathname) ?? '')) report(`${label}: media missing ${src}`);
      }
    }
  }
  const sitemapFile = path.join(root, 'sitemap.xml');
  if (!fs.existsSync(sitemapFile)) report('sitemap.xml missing');
  else {
    const sitemap = fs.readFileSync(sitemapFile, 'utf8');
    if (!/<urlset\b[^>]*xmlns=["']http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9["']/i.test(sitemap) || !/<\/urlset>/i.test(sitemap)) report('sitemap.xml: invalid urlset');
    const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1].trim());
    if ((sitemap.match(/<url>/g) ?? []).length !== urls.length || (sitemap.match(/<\/url>/g) ?? []).length !== urls.length) report('sitemap.xml: malformed url entry');
    for (const url of pageUrls) if (!urls.includes(url)) report(`sitemap.xml: missing ${url}`);
    for (const url of urls) if (!pageUrls.has(url)) report(`sitemap.xml: unpublished or noncanonical URL ${url}`);
    if (new Set(urls).size !== urls.length) report('sitemap.xml: duplicate URL');
  }
  const robots = fs.existsSync(path.join(root, 'robots.txt')) ? fs.readFileSync(path.join(root, 'robots.txt'), 'utf8') : '';
  if (!robots.includes(`Sitemap: ${ORIGIN}/sitemap.xml`)) report('robots.txt: sitemap URL missing');
  if (/^\s*Disallow:\s*\/\s*$/mi.test(robots)) report('robots.txt: site-wide crawl block');
  const notFound = fs.existsSync(path.join(root, '404.html')) ? fs.readFileSync(path.join(root, '404.html'), 'utf8') : '';
  if (!/name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(notFound)) report('404.html: noindex missing');
  if (!fs.existsSync(path.join(root, '_headers')) || !/\/\*\.md[\s\S]*X-Robots-Tag:\s*noindex/i.test(fs.readFileSync(path.join(root, '_headers'), 'utf8'))) report('_headers: docs noindex rule missing');
  if (productCount > 0) {
    const home = fs.existsSync(path.join(root, 'index.html')) ? fs.readFileSync(path.join(root, 'index.html'), 'utf8') : '';
    if (/現在は公開準備中です|現在、購入・ダウンロードできる製品はありません|最初の製品を準備しています/.test(home)) report('index.html: prelaunch wording remains after product publication');
    for (const relative of pages.filter(file => file.startsWith('products/'))) {
      if (!home.includes(`/${relative.replace(/index\.html$/, '')}`)) report(`index.html: product link missing for ${relative}`);
    }
  }
  return { errors, pages, productCount };
}

async function checkLive(pages) {
  const errors = [];
  for (const relative of pages) {
    const url = pageUrl(relative);
    try {
      const response = await fetch(url);
      if (response.status !== 200 || response.url !== url) { errors.push(`${url}: expected direct 200, got ${response.status} ${response.url}`); continue; }
      if (/noindex/i.test(response.headers.get('x-robots-tag') ?? '')) errors.push(`${url}: live X-Robots-Tag noindex`);
      const html = await response.text();
      if (tags(html, 'link').find(item => item.rel === 'canonical')?.href !== url) errors.push(`${url}: live canonical not found`);
      if (/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) errors.push(`${url}: live robots noindex`);
      const image = meta(html, 'property', 'og:image');
      if (image) {
        const imageResponse = await fetch(image, { method: 'HEAD' });
        if (imageResponse.status !== 200) errors.push(`${url}: live OG image status ${imageResponse.status}`);
      }
    } catch (error) { errors.push(`${url}: ${error.message}`); }
  }
  for (const file of ['robots.txt', 'sitemap.xml']) {
    try {
      const response = await fetch(`${ORIGIN}/${file}`);
      if (response.status !== 200) errors.push(`${file}: live status ${response.status}`);
    } catch (error) { errors.push(`${file}: ${error.message}`); }
  }
  try {
    const response = await fetch(`${ORIGIN}/release-check-not-found-20261006`);
    if (response.status !== 404) errors.push(`404 route: live status ${response.status}`);
  } catch (error) { errors.push(`404 route: ${error.message}`); }
  try {
    const response = await fetch('http://joshu-a.com/', { redirect: 'manual' });
    if (response.status !== 301 || response.headers.get('location') !== `${ORIGIN}/`) errors.push('HTTP apex: expected 301 to HTTPS canonical');
  } catch (error) { errors.push(`HTTP apex: ${error.message}`); }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const live = args.includes('--live');
  const rootArg = args.filter(arg => arg !== '--live')[0];
  const root = rootArg ? path.resolve(rootArg) : DEFAULT_ROOT;
  const { errors, pages, productCount } = checkSite(root);
  if (live && !errors.length) errors.push(...await checkLive(pages));
  if (errors.length) {
    console.error(`FAIL: ${errors.length} issue(s) across ${pages.length} page(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${pages.length} page(s), ${productCount} product(s), sitemap/robots/metadata/links checked${live ? ', live HTTP checked' : ''}.`);
  }
}
