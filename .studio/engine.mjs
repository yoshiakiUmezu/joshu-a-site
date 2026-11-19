export const MODEL = 'gpt-6-luna';
export const MAX_OUTPUT_TOKENS = 6000;
export const MAX_HTML_BYTES = 48 * 1024;

const elements = new Set(('main header footer nav section article aside div span h1 h2 h3 h4 h5 h6 p a ul ol li dl dt dd strong em small br hr figure figcaption time address b i blockquote cite').split(' '));
const instructions = `あなたは1ページの静的ホームページを設計するデザイナーです。入力は制作依頼のJSONです。
用途に合う構成と具体的なコピー、明瞭な見出し、余白、配色、読みやすい本文、用途に即したCSSの視覚表現を設計してください。
日本語を基本に、入力された名称と要望を活かしてください。架空の連絡先・認証・受賞実績・購入機能を足さず、リンクには実在するページ内の移動先を用意してください。
320pxのスマホから広いPCまで文字を読みやすくし、横スクロールを避け、必要に応じて段組みを切り替えてください。
previousHtmlがあるときは、そのページと最初のbriefを元にinstructionの指定箇所を修正して全体を返してください。
出力のtitleはプレーンテキスト、htmlは本文断片、cssはスタイルシートです。DOCTYPE・head・bodyはホストが用意します。
HTML要素は ${[...elements].join(' ')} だけ。mainとh1を各1個使い、小文字で明示的に閉じてください（brとhrは空要素）。
属性は引用符付きのclass、id、aria-label、aria-hidden、aのhrefだけ。idは英字で始まる英数字・ハイフン・アンダースコア、hrefは#idだけです。
画像・外部フォント・外部参照・インラインstyle・スクリプト・フォーム・HTMLコメントは使えません。図形や模様はCSSグラデーション等で作れます。
CSSのアットルールは@mediaだけ。比較はmin-widthやmax-widthを使い、CSSエスケープ、URL、山括弧は使わないでください。`;

export function buildResponseRequest({ brief, instruction = '', previousHtml = '' }) {
  return {
    model: MODEL,
    store: false,
    service_tier: 'default',
    reasoning: { effort: 'none' },
    max_output_tokens: MAX_OUTPUT_TOKENS,
    instructions,
    input: JSON.stringify({ brief, instruction, previousHtml }),
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

// Only emit known elements and quoted passive attributes. Browser error recovery
// never sees a tag or attribute that the model can name freely.
function checkedFragment(html) {
  const stack = [];
  const ids = new Set();
  const links = [];
  let mainCount = 0;
  let headingCount = 0;
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
    const isVoid = name === 'br' || name === 'hr';
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
      } else if (key === 'aria-hidden') {
        if (!['true', 'false'].includes(value)) invalidMarkup();
      } else if (!['class', 'aria-label'].includes(key)) {
        invalidMarkup();
      }
      // Keep model-authored HTML entities, quoting only the delimiter we emit.
      result.push(' ' + key + '="' + value.replaceAll('"', '&quot;') + '"');
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
  if (Buffer.byteLength(title + html + css) > MAX_HTML_BYTES) throw new Error('生成結果が48 KiBを超えました。');
  // CSP also blocks subresources when the saved HTML is opened outside the studio.
  const cssTokens = css.replace(/\/\*[\s\S]*?\*\//g, '');
  if (/[<\\]/.test(css) || /@(?!media\b)|(?:url|src|image|image-set|paint)\s*\(/i.test(cssTokens)) {
    throw new Error('生成されたCSSに外部参照または未対応の記法が含まれます。');
  }
  const fragment = checkedFragment(html);
  const page = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeText(title)}</title>
<style>*,*::before,*::after{box-sizing:border-box}body{margin:0;overflow-wrap:anywhere}
${css}
</style>
</head>
<body>
${fragment}
</body>
</html>`;
  if (Buffer.byteLength(page) > MAX_HTML_BYTES) throw new Error('生成結果が48 KiBを超えました。');
  return page;
}

function readUsage(raw) {
  if (!raw) return null;
  const { input_tokens: inputTokens, output_tokens: outputTokens, total_tokens: totalTokens } = raw;
  const cachedInputTokens = raw.input_tokens_details?.cached_tokens ?? 0;
  if (![inputTokens, cachedInputTokens, outputTokens, totalTokens].every(n => Number.isSafeInteger(n) && n >= 0)
      || cachedInputTokens > inputTokens || totalTokens !== inputTokens + outputTokens) return null;
  return { inputTokens, cachedInputTokens, outputTokens, totalTokens };
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
