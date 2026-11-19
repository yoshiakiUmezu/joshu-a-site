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
const instructions = `依頼主がそのまま使いたいと思える、日本語の静的な1ページをデザインし、HTMLとCSSを書いてください。入力はbrief、修正時はさらにpreviousHtmlとinstructionです。

構成を用途から決めてください。冒頭は一目で「何のサイトか」「なぜ見たいか」が伝わる表紙。訪問者が欲しい具体的な情報と、その先へ進むページ内リンクをすぐ見つけられるようにします。次の区画は異なる組み方で情報を深め、最後は実用情報につなげます。全面のグラデーションに中央揃えの標語、同形カードの反復、用途をまたいで使える宣伝文、飾りの番号・バッジ・英語ラベルは避けてください。

次の編集素材はすべて横長です。新規・修正とも、テーマに合う素材があれば1点を使い、最初の画面の構図の主役にしてください。図解の依頼は、関連する写真と別に線や面で説明図を組みます。画像はホストが同梱する制作見本です。実在の店舗・公演・竣工物の記録写真とは表現しません。画像不要の指定がある場合やテーマに合わない場合は、入力内容にある品目・数値・形・関係性からCSSの図版、本の見開き、時刻表など、その題材独自の表現を設計します。
- art:coffee は喫茶の窓辺の珈琲とトースト。食の雑誌のような写真のトリミングと店名の組版、印刷されたメニューのような品目・価格の対応、営業時間へとつなぐ。過度なセピアや、写真全面を暗く覆う処理は不要。
- art:concert はインクのような抽象的な音のリボン。公演ポスターなら図版と見出し、日付の強弱を大胆に組み、出演順と会場を読み取れる番組表へつなぐ。見出しを大きくするだけで終えない。
- art:architecture は中庭のある建築のスタディ模型。建築誌の扉のように図版・作品名・用途を編集し、年と作品名の索引、設計の考え方につなぐ。外側の罫線だけで済ませず、図解を求められたらCSSで意味のある平面・開口・中庭も組む。

PCでは図版と文字を対比させ、スマホでは順序・余白・トリミングを組み直します。横長写真を320pxでも主題が見える大きさで使い、最初のスマホ画面にも図版と依頼の核心を同居させてください。画像は通常のimgで幅100%、object-fit:coverと用途に応じたaspect-ratioを使えます。見出しは短い意味のまとまりを保ち、末尾の1文字だけが次行に落ちないよう設計。本文とリンクは読みやすい大きさ・コントラストにします。
briefの店名・日付・開場と開演・出演順・作品名・価格・表記を根拠にしてください。提示のない税込区分、予約方法、受賞歴、所在地、客の声、連絡先や営業実績は創作しません。修正では指示された変更を反映し、それ以外の入力事実とサイトの個性を保持してください。ページ全体を返します。

出力のtitleはプレーンテキスト、htmlは本文断片、cssはスタイルシートです。DOCTYPE・head・bodyはホストが用意します。
HTML要素は ${[...elements].join(' ')} だけ。mainとh1を各1個使い、小文字で明示的に閉じてください（brとhrは空要素）。
imgも空要素です。素材を使うときは <img src="art:coffee" alt="窓辺の珈琲とトースト"> の形式で、全体で1枚のみ。指定の3キーを利用できます。独自URL、base64、幅・高さ属性は使いません。
その他の属性は引用符付きのclass、id、aria-label、aria-hidden、図版のrole="img"、aのhref、timeのdatetimeだけ。idは英字で始まる英数字・ハイフン・アンダースコア、hrefは存在する#idだけです。
外部フォント・外部参照・インラインstyle・スクリプト・フォーム・HTMLコメントは使えません。
CSSのアットルールは@mediaだけ。比較はmin-widthやmax-widthを使い、CSSエスケープ、URL、山括弧は使わないでください。`;

export function buildResponseRequest({ brief, instruction = '', previousHtml = '' }) {
  return {
    model: MODEL,
    store: false,
    service_tier: 'default',
    reasoning: { effort: 'none' },
    max_output_tokens: MAX_OUTPUT_TOKENS,
    instructions,
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

export async function callResponses(body, { apiKey, fetchImpl = fetch }) {
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
  try {
    return { html: renderSite(site), usage };
  } catch (error) {
    throw providerError(error.message, usage);
  }
}
