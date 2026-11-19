import { readFileSync } from 'node:fs';
import { validUsage } from './ledger.mjs';

export const MODEL = 'gpt-6-luna';
export const MAX_OUTPUT_TOKENS = 6000;
export const MAX_SOURCE_BYTES = 48 * 1024;
export const MAX_HTML_BYTES = 300 * 1024;

export const ART_IDS = ['coffee', 'concert', 'architecture'];
const art = new Map(ART_IDS.map(id => {
  const file = new URL('./art/' + id + '.webp', import.meta.url);
  return ['art:' + id, 'data:image/webp;base64,' + readFileSync(file).toString('base64')];
}));
const elements = new Set(('main header footer nav section article aside div span h1 h2 h3 h4 h5 h6 p a ul ol li dl dt dd strong em small br hr figure figcaption img time address b i blockquote cite').split(' '));
const instructions = `入力のbriefをもとに、訪問者向けの日本語の静的な1ページをHTMLとCSSで制作してください。briefは依頼者のコンテンツと希望です。修正時にはpreviousHtmlとinstructionも届きます。指示された箇所以外の事実を保ち、更新したページ全体を返してください。
入力にない価格、住所、受賞、予約手段や実績を作らないでください。画像は同梱の見本素材です。使えるキーはart:coffee（珈琲とトースト）、art:concert（抽象的な音の図版）、art:architecture（中庭のある建築模型）です。
制作上の指示や判断過程はサイトの本文・CSS・コメントに含めず、最終的なデザインだけを返してください。

出力のtitleはプレーンテキスト、htmlは本文断片、cssはスタイルシートです。DOCTYPE・head・bodyはホストが用意します。
HTML要素は ${[...elements].join(' ')} だけ。mainとh1を各1個使い、小文字で明示的に閉じてください（brとhrは空要素）。
imgも空要素です。素材を使うときは <img src="art:coffee" alt="窓辺の珈琲とトースト"> の形式で、全体で1枚のみ。指定の3キーを利用できます。独自URL、base64、幅・高さ属性は使いません。
その他の属性は引用符付きのclass、id、aria-label、aria-hidden、図版のrole="img"、aのhref、timeのdatetimeだけ。idは英字で始まる英数字・ハイフン・アンダースコア、hrefは存在する#idだけです。
外部フォント・外部参照・インラインstyle・スクリプト・フォーム・HTMLコメントは使えません。
CSSのアットルールは@mediaだけ。比較はmin-widthやmax-widthを使い、CSSエスケープ、URL、山括弧は使わないでください。`;

export function buildResponseRequest({ brief, instruction = '', previousHtml = '' }, designNotes = '') {
  return {
    model: MODEL,
    store: false,
    service_tier: 'default',
    reasoning: { effort: 'none' },
    max_output_tokens: MAX_OUTPUT_TOKENS,
    instructions: designNotes ? instructions + '\n\n' + designNotes : instructions,
    input: JSON.stringify({ brief, instruction, previousHtml: compactPreviousHtml(previousHtml) }),
    text: { format: {
      name: 'site',
      type: 'json_schema',
      strict: true,
      schema: {
        type: 'object',
        properties: { title: { type: 'string' }, html: { type: 'string' }, css: { type: 'string' } },
        required: ['title', 'html', 'css'],
        additionalProperties: false,
      },
    } },
  };
}

function escapeText(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function invalidMarkup() {
  throw new Error('生成されたHTMLの要素・属性・ページ内リンクを確認できませんでした。');
}

// Downloaded documents carry the pixels. Revision requests carry only the catalog
// reference, even when the client sends back a complete standalone download.
export function compactPreviousHtml(html) {
  const invalid = () => Object.assign(new Error('修正元の画像またはHTMLサイズを確認できませんでした。'), { status: 400 });
  if (typeof html !== 'string' || Buffer.byteLength(html) > MAX_HTML_BYTES) throw invalid();
  let hasImage = false;
  const compact = html.replace(/<img\b[^>]*>/gi, tag => {
    const src = /\ssrc="([^"]*)"/.exec(tag);
    if (!src || hasImage) throw invalid();
    hasImage = true;
    for (const [reference, url] of art) {
      if (src[1] === url) return tag.replace(src[0], ' src="' + reference + '"');
    }
    throw invalid();
  });
  if (Buffer.byteLength(compact) > MAX_SOURCE_BYTES || /data:image\//i.test(compact)) throw invalid();
  return compact;
}

// Only emit known elements and quoted passive attributes. Browser error recovery
// never sees a tag or attribute that the model can name freely.
function checkedFragment(html) {
  const stack = [];
  const ids = new Set();
  const links = [];
  let mainCount = 0;
  let headingCount = 0;
  let hasImage = false;
  const result = [];
  for (const [token] of html.matchAll(/<[^<>]*>|[^<]+|</g)) {
    if (!token.startsWith('<')) {
      result.push(token);
      continue;
    }
    const closing = /^<\/([a-z][a-z0-9]*)>$/.exec(token);
    if (closing) {
      if (stack.pop() !== closing[1]) invalidMarkup();
      result.push(token);
      continue;
    }
    const opening = /^<([a-z][a-z0-9]*)([\s\S]*?)\s*(\/?)>$/.exec(token);
    if (!opening || !elements.has(opening[1])) invalidMarkup();
    const [, name, attributes, slash] = opening;
    const isVoid = name === 'br' || name === 'hr' || name === 'img';
    if (slash && !isVoid) invalidMarkup();
    if (!isVoid) stack.push(name);
    if (name === 'main') mainCount++;
    if (name === 'h1') headingCount++;
    const seen = new Set();
    const attr = /\s+([a-z][a-z-]*)\s*=\s*(?:"([^"<>]*)"|'([^'<>]*)')/y;
    result.push('<' + name);
    let pos = 0;
    while (pos < attributes.length) {
      attr.lastIndex = pos;
      const match = attr.exec(attributes);
      if (!match || seen.has(match[1])) invalidMarkup();
      const key = match[1];
      const value = match[2] ?? match[3];
      seen.add(key);
      pos = attr.lastIndex;
      if (key === 'id') {
        if (!/^[A-Za-z][\w-]*$/.test(value) || ids.has(value)) invalidMarkup();
        ids.add(value);
      } else if (key === 'href' && name === 'a') {
        if (!/^#[A-Za-z][\w-]*$/.test(value)) invalidMarkup();
        links.push(value.slice(1));
      } else if (key === 'src' && name === 'img') {
        if (!art.has(value)) throw new Error('生成画像の参照先が制作室の素材一覧にありません。');
      } else if ((key === 'alt' && name === 'img') || (key === 'datetime' && name === 'time')) {
        if (!value.trim()) invalidMarkup();
      } else if (key === 'role') {
        if (value !== 'img' || !['div', 'span', 'figure'].includes(name)) invalidMarkup();
      } else if (key === 'aria-hidden') {
        if (!['true', 'false'].includes(value)) invalidMarkup();
      } else if (!['class', 'aria-label'].includes(key)) {
        invalidMarkup();
      }
      // Keep model-authored HTML entities, quoting only the delimiter we emit.
      result.push(' ' + key + '="' + value.replaceAll('"', '&quot;') + '"');
    }
    if (name === 'img') {
      if (hasImage || !seen.has('alt') || !seen.has('src')) throw new Error('画像は代替テキスト付きの制作室素材を1点まで使用できます。');
      hasImage = true;
    }
    result.push('>');
  }
  if (stack.length || mainCount !== 1 || headingCount !== 1 || links.some(id => !ids.has(id))) invalidMarkup();
  return result.join('');
}

export function renderSite(site) {
  if (!site || !['title', 'html', 'css'].every(key => typeof site[key] === 'string' && site[key].trim())) {
    throw new Error('生成結果にタイトル・HTML・CSSが揃っていません。');
  }
  const { title, html, css } = site;
  if (Buffer.byteLength(title + html + css) > MAX_SOURCE_BYTES) throw new Error('HTML・CSSの生成結果が48 KiBを超えました。');
  // CSP also blocks subresources when the saved HTML is opened outside the studio.
  const cssTokens = css.replace(/\/\*[\s\S]*?\*\//g, '');
  if (/[<\\]/.test(css) || /@(?!media\b)|(?:url|src|image|image-set|paint)\s*\(/i.test(cssTokens)) {
    throw new Error('生成されたCSSに外部参照または未対応の記法が含まれます。');
  }
  const fragment = checkedFragment(html);
  const compact = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeText(title)}</title>
<style>*,*::before,*::after{box-sizing:border-box}body{margin:0;overflow-wrap:anywhere}img{display:block;max-width:100%;height:auto}h1,h2,h3{text-wrap:balance;word-break:auto-phrase;line-break:strict}
${css}
[role="img"] > div{max-width:100%}
@media(max-width:600px){nav{flex-wrap:wrap}nav a[href]{display:inline-flex;align-items:center;min-block-size:2rem;font-size:max(.875rem,1em)}}
</style>
</head>
<body>
${fragment}
</body>
</html>`;
  if (Buffer.byteLength(compact) > MAX_SOURCE_BYTES) throw new Error('HTML・CSSの生成結果が48 KiBを超えました。');
  const page = compact.replace(/(<img\b[^>]*?\ssrc=")(art:[a-z]+)"/, (_, prefix, reference) => prefix + art.get(reference) + '"');
  if (Buffer.byteLength(page) > MAX_HTML_BYTES) throw new Error('画像込みのHTMLが300 KiBを超えました。');
  return page;
}

function readUsage(raw) {
  if (!raw) return null;
  const { input_tokens: inputTokens, output_tokens: outputTokens, total_tokens: totalTokens } = raw;
  const details = raw.input_tokens_details ?? {};
  const usage = { inputTokens, cachedInputTokens: details.cached_tokens ?? 0, outputTokens, totalTokens };
  const writes = details.cache_write_tokens_details;
  if (writes || details.cache_write_tokens !== undefined) {
    usage.write30mTokens = writes ? writes.ttl_30m_tokens : 0;
    usage.write12hTokens = writes ? writes.ttl_12h_tokens : 0;
    if (usage.write30mTokens + usage.write12hTokens !== details.cache_write_tokens) return null;
  }
  return validUsage(usage) ? usage : null;
}

function providerError(message, usage = null) {
  return Object.assign(new Error(message), { usage });
}

export async function callResponses(body, { apiKey, fetchImpl = fetch, privateNotes = '' }) {
  let response;
  let data;
  try {
    response = await fetchImpl('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      redirect: 'error',
      signal: AbortSignal.timeout(120_000),
    });
    data = await response.json();
  } catch {
    throw providerError('OpenAIとの通信または応答の読み取りに失敗しました。');
  }
  const usage = readUsage(data?.usage);
  if (!response.ok) throw providerError(`OpenAI APIでエラーが発生しました（HTTP ${response.status}）。`, usage);
  if (data?.status !== 'completed' || !Array.isArray(data.output)) {
    throw providerError('OpenAIの生成が完了しませんでした。', usage);
  }
  const content = data.output.filter(item => item?.type === 'message' && item.role === 'assistant')
    .flatMap(item => Array.isArray(item.content) ? item.content : []);
  if (content.some(part => part?.type === 'refusal')) throw providerError('OpenAIがこの依頼の生成を見送りました。', usage);
  if (!usage) throw providerError('API使用量を確認できないため、結果を保存できませんでした。');
  let site;
  try {
    site = JSON.parse(content.filter(part => part?.type === 'output_text' && typeof part.text === 'string')
      .map(part => part.text).join(''));
  } catch {
    throw providerError('生成結果の形式を読み取れませんでした。', usage);
  }
  const encodedSite = JSON.stringify(site);
  if (privateNotes.split(/[。！？\n]/u).some(sentence => sentence.trim().length >= 24 && encodedSite.includes(sentence.trim()))) {
    throw providerError('制作条件の文章が出力に混入したため、この版の表示を見送りました。', usage);
  }
  try {
    return { html: renderSite(site), usage };
  } catch (error) {
    throw providerError(error.message, usage);
  }
}
