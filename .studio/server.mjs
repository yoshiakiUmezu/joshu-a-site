import { createHash, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildResponseRequest, callResponses, MAX_HTML_BYTES, MAX_OUTPUT_TOKENS } from './engine.mjs';
import { openLedger } from './ledger.mjs';

const defaults = { maxCalls: 6, maxTotalTokens: 240_000, maxOutputTokens: MAX_OUTPUT_TOKENS, maxHtmlBytes: MAX_HTML_BYTES };
const files = new Map([
  ['/studio/', ['ui/index.html', 'text/html; charset=utf-8']],
  ['/studio/studio.css', ['ui/studio.css', 'text/css; charset=utf-8']],
  ['/studio/studio.js', ['ui/studio.js', 'text/javascript; charset=utf-8']],
  ['/assets/brand-mark.png', ['../assets/brand-mark.png', 'image/png']],
]);
const fail = (status, message) => Object.assign(new Error(message), { status });
const digest = value => createHash('sha256').update(value).digest();

async function readInput(req) {
  if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') {
    throw fail(415, 'JSON形式で送信してください。');
  }
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 128 * 1024) throw fail(413, 'リクエストが大きすぎます。');
    chunks.push(chunk);
  }
  let data;
  try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw fail(400, '入力内容を読み取れません。'); }
  const brief = {};
  for (const [key, max] of Object.entries({ purpose: 120, name: 120, mood: 160, request: 1200 })) {
    const value = data?.brief?.[key] ?? '';
    if (typeof value !== 'string' || value.length > max) throw fail(400, '制作条件の形式または文字数を確認してください。');
    brief[key] = value.trim();
  }
  if (!brief.purpose || !brief.name) throw fail(400, '用途と名称を入力してください。');
  const instruction = data.revision ?? '';
  const previousHtml = data.previousHtml ?? '';
  if (typeof instruction !== 'string' || instruction.length > 800 || typeof previousHtml !== 'string'
      || Buffer.byteLength(previousHtml) > MAX_HTML_BYTES || !!instruction.trim() !== !!previousHtml.trim()) {
    throw fail(400, '修正には現在のHTMLと800字以内の追加指示が必要です。');
  }
  return { brief, instruction: instruction.trim(), previousHtml: previousHtml.trim() };
}

export async function startStudio({ password, apiKey, ledgerPath, port = 0, fetchImpl = fetch, limits = defaults }) {
  if (!apiKey?.trim() || typeof password !== 'string' || password.length < 16) {
    throw new Error('OPENAI_API_KEY と16文字以上の STUDIO_PASSWORD をサーバーに設定してください。');
  }
  const auth = digest('Basic ' + Buffer.from('developer:' + password).toString('base64'));
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
    res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self'; frame-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    try {
      if (('http://' + req.headers.host) !== origin) throw fail(403, 'このホストからは利用できません。');
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
      if (req.method === 'GET' && req.url === '/api/status') return json(200, { limits, ledger: ledger.summary() });
      if (req.url !== '/api/generate') throw fail(404, 'ページが見つかりません。');
      if (req.method !== 'POST') throw fail(405, 'POSTで送信してください。');
      if (req.headers.origin !== origin) throw fail(403, '制作画面から送信してください。');
      const input = await readInput(req);
      const body = buildResponseRequest(input);
      // UTF-8 byte count bounds text tokens conservatively. Include the schema,
      // a margin for protocol framing, and the entire possible output.
      const budget = Buffer.byteLength(JSON.stringify(body)) + 1024 + MAX_OUTPUT_TOKENS;
      const id = ledger.reserve(input.previousHtml ? 'revise' : 'generate', budget);
      let result;
      try {
        result = await callResponses(body, { apiKey, fetchImpl });
      } catch (error) {
        ledger.finish(id, 'failed', error.usage ?? null, 0);
        return json(502, { error: error.message, ledger: ledger.summary() });
      }
      ledger.finish(id, 'ok', result.usage, Buffer.byteLength(result.html));
      return json(200, { ...result, ledger: ledger.summary() });
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
  // All operator sessions use one port and one private, persistent allowance.
  startStudio({ port: 4312, ledgerPath: join(state, 'joshu-a-studio', 'usage.json'),
    password: process.env.STUDIO_PASSWORD, apiKey: process.env.OPENAI_API_KEY })
    .then(({ origin }) => console.log('制作画面 ' + origin + '/studio/'))
    .catch(error => {
      console.error(error.code === 'EADDRINUSE' ? '制作サーバーはすでに起動中です。' : error.message);
      process.exitCode = 1;
    });
}
