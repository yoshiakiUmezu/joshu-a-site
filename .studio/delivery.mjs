import { createHash, randomBytes } from 'node:crypto';
import { access, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ART_IDS, MAX_HTML_BYTES } from './engine.mjs';
import { chromiumOptions } from './chromium.mjs';

const idPattern = /^[a-f0-9]{48}$/;
const fail = (status, message) => Object.assign(new Error(message), { status });
const notFound = () => fail(404, '確認対象が見つかりません。');
const privateFile = { mode: 0o600 };

async function launchBrowser() {
  const { chromium } = await import('playwright');
  return chromium.launch(await chromiumOptions());
}

async function compose(browser, html, choice) {
  if (choice === 'auto') return html;
  // Run the same editor code against three in-memory resources. The draft is
  // an argument to DOMParser inside composeArtwork, never an active document.
  const origin = 'http://studio.invalid';
  const modulePath = '/studio/artwork.js';
  const artPath = '/studio/art/' + choice + '.webp';
  const resources = new Map([
    [origin + '/', { contentType: 'text/html', body: '<!doctype html><title>Studio</title>' }],
    [origin + modulePath, { contentType: 'text/javascript', body: await readFile(new URL('./ui/artwork.js', import.meta.url)) }],
    [origin + artPath, { contentType: 'image/webp', body: await readFile(new URL('./art/' + choice + '.webp', import.meta.url)) }],
  ]);
  const context = await browser.newContext({ serviceWorkers: 'block' });
  try {
    await context.route('**/*', route => {
      const resource = resources.get(route.request().url());
      return resource ? route.fulfill(resource) : route.abort();
    });
    const page = await context.newPage();
    await page.goto(origin);
    return await page.evaluate(async ({ html, choice, modulePath }) => {
      const { composeArtwork } = await import(modulePath);
      return composeArtwork(html, choice);
    }, { html, choice, modulePath });
  } finally {
    await context.close();
  }
}

async function screenshot(browser, html, viewport) {
  const context = await browser.newContext({ viewport, javaScriptEnabled: false, offline: true, serviceWorkers: 'block' });
  try {
    await context.route('**/*', route => route.abort());
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const size = await page.evaluate(async () => {
      await Promise.all([document.fonts.ready, ...Array.from(document.images, image => image.decode())]);
      return {
        width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, window.innerHeight),
      };
    });
    if (size.width > viewport.width || size.height > 16_000) {
      throw fail(422, 'プレビューが表示幅または保存可能なページ高（16,000px）を超えています。');
    }
    return await page.screenshot({ type: 'jpeg', quality: 85, fullPage: true, animations: 'disabled', timeout: 10_000 });
  } finally {
    await context.close();
  }
}

async function hasMarker(path) {
  try { await access(path); return true; }
  catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function mark(path) {
  try { await writeFile(path, '', { ...privateFile, flag: 'wx' }); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
}

export function createDeliveryStore(root) {
  let rendering = false;

  async function get(id) {
    if (!idPattern.test(id)) throw notFound();
    const dir = join(root, id);
    let info;
    try { info = JSON.parse(await readFile(join(dir, 'offer.json'), 'utf8')); }
    catch (error) {
      if (error.code === 'ENOENT') throw notFound();
      throw error;
    }
    const status = await hasMarker(join(dir, 'released')) ? 'released'
      : await hasMarker(join(dir, 'confirmed')) ? 'confirmed' : 'review';
    return { ...info, status };
  }

  return {
    async create({ name, html, choice = 'auto' }, expectedHash) {
      if (typeof name !== 'string' || !name.trim() || name.length > 120 ||
          typeof html !== 'string' || !html || Buffer.byteLength(html) > MAX_HTML_BYTES ||
          (choice !== 'auto' && !ART_IDS.includes(choice))) throw fail(400, '制作内容または素材を確認してください。');
      if (rendering) throw fail(409, '別のプレビューを作成しています。少し待ってから再実行してください。');
      rendering = true;
      let browser;
      let timer;
      let staging;
      try {
        try { browser = await launchBrowser(); }
        catch { throw fail(503, 'プレビュー用のChromiumを起動できません。ブラウザーの設定を確認してください。'); }
        timer = setTimeout(() => { browser.close().catch(() => {}); }, 30_000);
        const finalHtml = await compose(browser, html, choice);
        if (Buffer.byteLength(finalHtml) > MAX_HTML_BYTES) throw fail(413, '納品用HTMLがサイズ上限を超えています。');
        if (expectedHash !== undefined && createHash('sha256').update(finalHtml).digest('hex') !== expectedHash) {
          throw fail(409, '表示内容が更新されています。制作画面で確認し直してください。');
        }
        const desktop = await screenshot(browser, finalHtml, { width: 1280, height: 768 });
        const mobile = await screenshot(browser, finalHtml, { width: 390, height: 844 });
        clearTimeout(timer);
        const info = { id: randomBytes(24).toString('hex'), name: name.trim(), createdAt: new Date().toISOString() };
        await mkdir(root, { recursive: true, mode: 0o700 });
        staging = await mkdtemp(join(root, '.snapshot-'));
        await writeFile(join(staging, 'index.html'), finalHtml, privateFile);
        await writeFile(join(staging, 'desktop.jpg'), desktop, privateFile);
        await writeFile(join(staging, 'mobile.jpg'), mobile, privateFile);
        await writeFile(join(staging, 'offer.json'), JSON.stringify(info), privateFile);
        await rename(staging, join(root, info.id));
        staging = undefined;
        return { ...info, status: 'review' };
      } catch (error) {
        if (error.status) throw error;
        throw fail(500, '確認用の画像またはHTMLを保存できませんでした。ページの内容と保存先を確認してください。');
      } finally {
        clearTimeout(timer);
        try {
          await browser?.close();
          if (staging) await rm(staging, { recursive: true, force: true });
        } finally {
          rendering = false;
        }
      }
    },
    async list() {
      let entries;
      try { entries = await readdir(root, { withFileTypes: true }); }
      catch (error) { if (error.code === 'ENOENT') return []; throw error; }
      const items = await Promise.all(entries.filter(e => e.isDirectory() && idPattern.test(e.name)).map(e => get(e.name)));
      return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
    },
    get,
    async confirm(id) {
      const offer = await get(id);
      if (offer.status === 'review') await mark(join(root, id, 'confirmed'));
      return get(id);
    },
    async release(id) {
      const offer = await get(id);
      if (offer.status === 'review') throw fail(409, '購入前確認を完了してください。');
      if (offer.status === 'confirmed') await mark(join(root, id, 'released'));
      return get(id);
    },
    async asset(id, kind) {
      const offer = await get(id);
      if (kind === 'download' && offer.status !== 'released') throw fail(403, 'このHTMLはまだダウンロードできません。');
      if (kind !== 'desktop' && kind !== 'mobile' && kind !== 'download') throw notFound();
      return readFile(join(root, id, kind === 'download' ? 'index.html' : kind + '.jpg'));
    },
  };
}
