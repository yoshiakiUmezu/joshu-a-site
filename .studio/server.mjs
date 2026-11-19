import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import http from 'node:http';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ART_IDS, buildResponseRequest, callResponses, MAX_HTML_BYTES, MAX_OUTPUT_TOKENS, renderSite } from './engine.mjs';
import { openLedger } from './ledger.mjs';
import { createDeliveryStore } from './delivery.mjs';
import { reviewPage } from './review.mjs';

const defaults = { maxCalls: 6, maxTotalTokens: 240_000, maxOutputTokens: MAX_OUTPUT_TOKENS, maxHtmlBytes: MAX_HTML_BYTES };
const files = new Map([
  ['/studio/', ['ui/index.html', 'text/html; charset=utf-8']],
  ['/studio/studio.css', ['ui/studio.css', 'text/css; charset=utf-8']],
  ['/studio/studio.js', ['ui/studio.js', 'text/javascript; charset=utf-8']],
  ['/studio/artwork.js', ['ui/artwork.js', 'text/javascript; charset=utf-8']],
  ...ART_IDS.map(id => ['/studio/art/' + id + '.webp', ['art/' + id + '.webp', 'image/webp']]),
  ['/assets/brand-mark.png', ['../assets/brand-mark.png', 'image/png']],
]);
const fail = (status, message) => Object.assign(new Error(message), { status });
const digest = value => createHash('sha256').update(value).digest();
const directions = ['', 'editorial', 'showcase', 'graphic', 'guide'];

async function loadDesignInstructions() {
  try {
    const root = await realpath(fileURLToPath(new URL('../', import.meta.url)));
    const file = await realpath(process.env.STUDIO_DESIGN_FILE || join(dirname(root), 'studio-design-policy.mjs'));
    const inside = relative(root, file);
    if (!isAbsolute(inside) && !inside.startsWith('..' + sep)) throw new Error();
    const module = await import(pathToFileURL(file).href);
    if (typeof module.designInstructions === 'function') return module.designInstructions;
  } catch { /* Never include the private module or its contents in diagnostics. */ }
  throw new Error('非公開の制作設定を読み込めません。リポジトリ外の設定ファイルを確認してください。');
}

async function readJson(req, maxBytes) {
  if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') {
    throw fail(415, 'JSON形式で送信してください。');
  }
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > maxBytes) throw fail(413, 'リクエストが大きすぎます。');
    chunks.push(chunk);
  }
  let data;
  try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw fail(400, '入力内容を読み取れません。'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw fail(400, '入力内容を読み取れません。');
  return data;
}

async function readInput(req) {
  const data = await readJson(req, MAX_HTML_BYTES + 128 * 1024);
  const brief = {};
  for (const [key, max] of Object.entries({ purpose: 120, name: 120, mood: 160, request: 1200,
    audience: 160, action: 160, highlight: 360, direction: 16, color: 100,
    genre: 16, mainColor: 7, subColor: 7, photoPreference: 3 })) {
    const value = data?.brief?.[key] ?? '';
    if (typeof value !== 'string' || value.length > max) throw fail(400, '制作条件の形式または文字数を確認してください。');
    brief[key] = value.trim();
  }
  if (!brief.purpose || !brief.name) throw fail(400, '用途と名称を入力してください。');
  if (!directions.includes(brief.direction)) throw fail(400, 'デザインの方向を選び直してください。');
  if (!['', 'food', 'portfolio', 'event', 'service', 'shop', 'other'].includes(brief.genre)
      || !['', 'yes', 'no'].includes(brief.photoPreference)
      || [brief.mainColor, brief.subColor].some(color => color && !/^#[\da-f]{6}$/i.test(color))) {
    throw fail(400, 'ジャンル・色・写真の選択を確認してください。');
  }
  const instruction = data.revision ?? '';
  const previousHtml = data.previousHtml ?? '';
  if (typeof instruction !== 'string' || instruction.length > 800 || typeof previousHtml !== 'string'
      || Buffer.byteLength(previousHtml) > MAX_HTML_BYTES || !!instruction.trim() !== !!previousHtml.trim()) {
    throw fail(400, '修正には現在のHTMLと800字以内の追加指示が必要です。');
  }
  return { brief, instruction: instruction.trim(), previousHtml: previousHtml.trim() };
}

export async function startStudio({ password, apiKey, ledgerPath, port = 0, fetchImpl = fetch, limits = defaults, examplesOnly = false, designInstructions }) {
  if ((!examplesOnly && !apiKey?.trim()) || typeof password !== 'string' || password.length < 16) {
    throw new Error('OPENAI_API_KEY と16文字以上の STUDIO_PASSWORD をサーバーに設定してください。');
  }
  if (!examplesOnly) designInstructions ??= await loadDesignInstructions();
  const auth = digest('Basic ' + Buffer.from('developer:' + password).toString('base64'));
  const store = createDeliveryStore(join(dirname(ledgerPath), 'deliveries'));
  const drafts = new Map();
  const pendingOffers = new Map();
  const examples = JSON.parse(await readFile(new URL('./examples.json', import.meta.url), 'utf8'));
  let ledger;
  let origin;
  const server = http.createServer(async (req, res) => {
    function json(status, data) {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(data));
    }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-src data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    try {
      if (('http://' + req.headers.host) !== origin) throw fail(403, 'このホストからは利用できません。');
      if (req.url.startsWith('/review/')) {
        const match = /^\/review\/([0-9a-f]{48})\/(|desktop\.jpg|mobile\.jpg|confirm|download)$/.exec(req.url);
        if (!match) throw fail(404, '確認ページが見つかりません。');
        const [, id, action] = match;
        res.setHeader('Referrer-Policy', 'strict-origin');
        res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
        if (action === 'confirm') {
          if (req.method !== 'POST') throw fail(405, '確認画面から送信してください。');
          if (req.headers.origin !== origin) throw fail(403, '確認画面から送信してください。');
          await store.confirm(id);
          res.writeHead(303, { Location: '/review/' + id + '/' });
          return res.end();
        }
        if (req.method !== 'GET') throw fail(405, 'この操作は利用できません。');
        if (!action) {
          const offer = await store.get(id);
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          return res.end(reviewPage(offer));
        }
        const kind = action === 'download' ? 'download' : action.split('.')[0];
        const content = await store.asset(id, kind);
        if (kind === 'download') res.setHeader('Content-Disposition', 'attachment; filename="index.html"');
        res.writeHead(200, { 'Content-Type': kind === 'download' ? 'text/html; charset=utf-8' : 'image/jpeg' });
        return res.end(content);
      }
      if (!timingSafeEqual(digest(req.headers.authorization ?? ''), auth)) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Joshu A Studio", charset="UTF-8"');
        throw fail(401, '開発者の認証が必要です。');
      }
      if (req.method === 'GET' && files.has(req.url)) {
        const [name, type] = files.get(req.url);
        const content = await readFile(new URL(name, import.meta.url));
        res.writeHead(200, { 'Content-Type': type });
        return res.end(content);
      }
      if (req.method === 'GET' && req.url === '/api/status') return json(200, {
        limits, ledger: ledger.summary(), liveEnabled: !examplesOnly,
        examples: examples.map(({ id, brief }) => ({ id, name: brief.name, brief })),
      });
      if (req.method === 'GET' && req.url === '/api/offers') return json(200, { offers: await store.list() });
      if (req.method === 'POST' && req.headers.origin !== origin) throw fail(403, '制作画面から送信してください。');
      if (req.method === 'POST' && req.url === '/api/examples') {
        const { id } = await readJson(req, 512);
        const example = examples.find(item => item.id === id);
        if (!example) throw fail(404, '作例が見つかりません。');
        const html = renderSite(example.site);
        const draftId = 'example-' + id;
        drafts.set(draftId, { html, name: example.brief.name });
        return json(200, { draftId, html, brief: example.brief, choice: example.choice });
      }
      if (req.url === '/api/offers' && req.method === 'POST') {
        const { draftId, choice, sha256 } = await readJson(req, 2048);
        const draft = drafts.get(draftId);
        if (!draft) throw fail(404, 'この制作結果が見つかりません。');
        if (!['auto', ...ART_IDS].includes(choice) || typeof sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(sha256)) {
          throw fail(400, '使用する表紙画像とHTMLの版を確認してください。');
        }
        const key = [draftId, choice, sha256].join('/');
        if (!pendingOffers.has(key)) {
          const creation = store.create({ ...draft, choice }, sha256).finally(() => pendingOffers.delete(key));
          pendingOffers.set(key, creation);
        }
        return json(200, { offer: await pendingOffers.get(key) });
      }
      const release = /^\/api\/offers\/([a-f0-9]{48})\/release$/.exec(req.url);
      if (release) {
        if (req.method !== 'POST') throw fail(405, 'POSTで送信してください。');
        await readJson(req, 2048);
        return json(200, { offer: await store.release(release[1]) });
      }
      if (req.url !== '/api/generate') throw fail(404, 'ページが見つかりません。');
      if (req.method !== 'POST') throw fail(405, 'POSTで送信してください。');
      if (examplesOnly) throw fail(403, '作例モードです。実際のAI生成は通常の制作室で利用できます。');
      const input = await readInput(req);
      const plan = designInstructions(input.brief, { instruction: input.instruction });
      const notes = plan?.notes;
      if (typeof notes !== 'string' || !notes.trim() || Buffer.byteLength(notes) > 16 * 1024) {
        throw fail(503, '非公開の制作設定を確認してください。');
      }
      if (typeof plan.reference !== 'string' || plan.reference.length > 210_000
          || !/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+=*$/.test(plan.reference)
          || !(plan.art === null || ART_IDS.includes(plan.art))
          || !['wide', 'split', 'poster'].includes(plan.placement)
          || !/^(?:100|[1-9]?\d)% (?:100|[1-9]?\d)%$/.test(plan.position)) {
        throw fail(503, '非公開の参照画像と素材設定を確認してください。');
      }
      const body = buildResponseRequest(input, notes, plan.reference);
      // Deliberately reserve the full serialized payload, including the image
      // transport. The provider's measured token counts replace this reservation.
      const budget = Buffer.byteLength(JSON.stringify(body)) + 1024 + MAX_OUTPUT_TOKENS;
      const id = ledger.reserve(input.previousHtml ? 'revise' : 'generate', budget);
      let result;
      try {
        result = await callResponses(body, { apiKey, fetchImpl, privateNotes: notes, material: plan });
      } catch (error) {
        ledger.finish(id, 'failed', error.usage ?? null, 0);
        return json(502, { error: error.message, ledger: ledger.summary() });
      }
      ledger.finish(id, 'ok', result.usage, Buffer.byteLength(result.html));
      const draftId = randomUUID();
      drafts.set(draftId, { name: input.brief.name, html: result.html });
      return json(200, { ...result, draftId, ledger: ledger.summary() });
    } catch (error) {
      const message = error.status ? error.message : '制作サーバーの処理に失敗しました。';
      return json(error.status ?? 500, error.status === 429 ? { error: message, ledger: ledger.summary() } : { error: message });
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      try {
        // The fixed CLI port grants one operator process ownership of the ledger.
        // Read it only after the previous server has released its port.
        ledger = openLedger(ledgerPath, limits);
        origin = 'http://127.0.0.1:' + server.address().port;
        resolve();
      } catch (error) {
        server.close();
        reject(error);
      }
    });
  });
  return { server, origin, close: () => new Promise(resolve => server.close(resolve)) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const state = process.env.LOCALAPPDATA || process.env.XDG_STATE_HOME || join(homedir(), '.local', 'state');
  const examplesOnly = process.argv.includes('--examples-only');
  const sessionPassword = examplesOnly || process.argv.includes('--session-password');
  const password = sessionPassword ? randomBytes(18).toString('base64url') : process.env.STUDIO_PASSWORD;
  // All operator sessions use one port and one private, persistent allowance.
  startStudio({ port: examplesOnly ? 4313 : 4312, ledgerPath: join(state, examplesOnly ? 'joshu-a-studio-examples' : 'joshu-a-studio', 'usage.json'),
    password, examplesOnly, apiKey: examplesOnly ? undefined : process.env.OPENAI_API_KEY })
    .then(({ origin }) => {
      if (examplesOnly) console.log('作例モード（API利用なし）');
      if (sessionPassword) console.log('ログイン名 developer\n今回のローカルパスワード ' + password);
      console.log('制作画面 ' + origin + '/studio/');
    })
    .catch(error => {
      console.error(error.code === 'EADDRINUSE' ? '制作サーバーはすでに起動中です。' : error.message);
      process.exitCode = 1;
    });
}
