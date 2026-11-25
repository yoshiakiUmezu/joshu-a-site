import { motionModes, motionSheet } from './motion.mjs';
import { readFileSync } from 'node:fs';
import { validUsage } from './ledger.mjs';

export const MODEL = 'gpt-6-luna';
export const MAX_OUTPUT_TOKENS = 6000;
export const MAX_SOURCE_BYTES = 48 * 1024;
export const MAX_HTML_BYTES = 300 * 1024;

const catalog = JSON.parse(readFileSync(new URL('./art/catalog.json', import.meta.url), 'utf8'));
export const COVER_IDS = ['coffee', 'concert', 'architecture'];
const ART_IDS = [...COVER_IDS, ...Object.keys(catalog)];
const MAX_IMAGES = 3;
const art = new Map(ART_IDS.map(id => {
  const file = new URL('./art/' + id + '.webp', import.meta.url);
  return ['art:' + id, 'data:image/webp;base64,' + readFileSync(file).toString('base64')];
}));
const elements = new Set(('main header footer nav section article aside div span h1 h2 h3 h4 h5 h6 p a ul ol li dl dt dd strong em small br hr figure figcaption img time address b i blockquote cite details summary').split(' '));
const instructions = `入力のbriefをもとに、訪問者向けの日本語の静的な1ページをHTMLとCSSで制作してください。briefは依頼者のコンテンツと希望です。修正時にはpreviousHtmlとinstructionも届きます。指示された箇所以外の事実を保ち、更新したページ全体を返してください。
入力にない価格、住所、受賞、予約手段や実績を作らないでください。画像は同梱の見本素材です。使える素材と用途は制作設定に従ってください。
制作上の指示や判断過程はサイトの本文・CSS・コメントに含めず、最終的なデザインだけを返してください。

ホストがサイト名入りの共通ヘッダー、h2から作るページ内目次、末尾の移動リンクを追加します。作品独自の終わりを設計する場合はmainの最後にfooterを1つ置き、本文と同じ美術方針で制作してください。htmlにはmainをルートに本文のみを書き、冒頭にサイトの目的とh1、その後に提供内容・判断材料・次の行動を用途に応じて構成します。主要区画には短く具体的なh2を付けてください。日本語の通常LPは、操作せずに読める本文を約1600字（目次・フッター・空白・閉じた補足を除く）目安に設計する。区画数は固定せず、原稿量と用途に合わせて編集する。スクロールだけで具体例と違いが読めるよう、代表例の紹介、選ぶための比較、使い方や体験の順序など、入力から裏付けられる内容を本文に展開する。detailsには深く読みたい補足を置く。同一情報の再掲や空白で長くしない。短い告知や簡潔なページを希望された場合は区画を統合する。
出力のdesignは非公開の短い制作方針です。先に読者の目的、要望の素材感を画面のどこにどう見せるか、各節で新しく伝える内容を具体化し、その方針をhtmlとcssで形にしてください。h2には本文とは別に短い目次名（例 data-nav="作品"）を付けられます。
動きの専門用語を求めず、業種の体験に合わせて文字・写真・操作の見せ場を設計する。初稿・修正とも演出は多め。冒頭・各節・作品紹介・操作で使う演出を選ぶ。案件の雰囲気に似合う和文書体を自分で選び、bodyのfont-familyに端末用の代替候補とともに指定する。ページ内の見出し・本文・操作・フッターは同じ書体でまとめる。無骨な極太字、見出しの機械的な太字、意図しない書体の混在を避ける。修正では書体の変更依頼がない限り選定を維持する。初稿では、読者が見比べる・選ぶ・深く読む場面を一つ決め、その対象と操作の入口をスマホの最初の画面に置く。見せ場にdetailsを使うときは、内容に合わせてclass="studio-fold"（折り込み記事）またはclass="studio-slip"（横から差し込む明細）を選べる。summaryには開くと得られる内容を書き、展開後に具体的な比較材料を示す。修正時は選ばれた構図と入口を維持する。ただし構図変更の依頼を優先する。実装可能なホストの効果を使う。依頼に合わせてmotionを選ぶ。softは静かな浮かび上がり、editorialは印刷面が開くような登場、rhythmicは短く弾むリズム。冒頭の主役が図や写真ならその要素にstudio-motion-lead、スクロールで見せたい作品・図やカードにstudio-motion-detailというclassを付ける。動きはホストがCSSで適用する。修正時は依頼に関係のない動きの設定を引き継ぐ。
出力のtitleはプレーンテキスト、htmlは本文断片、cssはスタイルシートです。DOCTYPE・head・bodyはホストが用意します。
HTML要素は ${[...elements].join(' ')} だけ。mainとh1を各1個使い、小文字で明示的に閉じてください（brとhrは空要素）。
imgも空要素です。素材を使うときは <img src="art:coffee" alt="窓辺の珈琲とトースト"> の形式で、指定された素材を各1回、合計3点まで使えます。独自URL、base64、幅・高さ属性は使いません。
h2のdata-nav以外の属性は引用符付きのclass、id、aria-label、aria-hidden、図版のrole="img"、aのhref、timeのdatetimeだけ。idは英字で始まる英数字・ハイフン・アンダースコア、hrefは存在する#idだけです。
外部フォント・外部参照・インラインstyle・スクリプト・フォーム・HTMLコメントは使えません。
CSSのアットルールは@mediaだけ。比較はmin-widthやmax-widthを使い、CSSエスケープ、URL、山括弧は使わないでください。`;

export function buildResponseRequest({ brief, instruction = '', previousHtml = '' }, designNotes = '', reference = '') {
  const textInput = JSON.stringify({ brief, instruction, previousHtml: compactPreviousHtml(previousHtml)
    .replace(/<style id="studio-motion">[\s\S]*?<\/style>/, '')
    .replace(/@layer studioType \{[^@]*?\n\}/, '').replace(frameStyle, '').replace(/<div id="studio-top(?:-\d+)?"><\/div>(?=<!--studio-frame-start-->)/, '')
    .replace(/<!--studio-frame-start-->[\s\S]*?<!--studio-frame-end-->/g, '') });
  return {
    model: MODEL,
    store: false,
    service_tier: 'default',
    reasoning: { effort: 'none' },
    max_output_tokens: MAX_OUTPUT_TOKENS,
    instructions: designNotes ? instructions + '\n\n' + designNotes : instructions,
    input: reference ? [{ role: 'user', content: [
      { type: 'input_text', text: textInput },
      { type: 'input_image', detail: 'high', image_url: reference },
    ] }] : textInput,
    text: { format: {
      name: 'site',
      type: 'json_schema',
      strict: true,
      schema: {
        type: 'object',
        properties: { motion: { type: 'string', enum: motionModes }, design: { type: 'string' }, title: { type: 'string' }, html: { type: 'string' }, css: { type: 'string' } },
        required: ['motion', 'design', 'title', 'html', 'css'],
        additionalProperties: false,
      },
    } },
  };
}

function escapeText(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function invalidMarkup(html, offset, reason) {
  const before = html.slice(0, offset);
  const line = before.split('\n').length;
  const column = offset - before.lastIndexOf('\n');
  throw new Error(`HTMLの${line}行${column}列：${reason}`);
}

// Downloaded documents carry the pixels. Revision requests carry only the catalog
// reference, even when the client sends back a complete standalone download.
export function compactPreviousHtml(html) {
  const invalid = () => Object.assign(new Error('修正元の画像またはHTMLサイズを確認できませんでした。'), { status: 400 });
  if (typeof html !== 'string' || Buffer.byteLength(html) > MAX_HTML_BYTES) throw invalid();
  let images = 0;
  const compact = html.replace(/<img\b[^>]*>/gi, tag => {
    const src = /\ssrc="([^"]*)"/.exec(tag);
    if (!src || ++images > MAX_IMAGES) throw invalid();
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
  let images = 0;
  const result = [];
  for (const tokenMatch of html.matchAll(/<[^<>]*>|[^<]+|</g)) {
    const [token] = tokenMatch;
    const offset = tokenMatch.index;
    if (!token.startsWith('<')) {
      result.push(token);
      continue;
    }
    const closing = /^<\/([a-z][a-z0-9]*)>$/.exec(token);
    if (closing) {
      if (stack.pop() !== closing[1]) invalidMarkup(html, offset, '閉じタグの対応が一致しません。');
      result.push(token);
      continue;
    }
    const opening = /^<([a-z][a-z0-9]*)([\s\S]*?)\s*(\/?)>$/.exec(token);
    if (!opening || !elements.has(opening[1])) invalidMarkup(html, offset, '未対応の要素またはタグの書式です。');
    const [, name, attributes, slash] = opening;
    const isVoid = name === 'br' || name === 'hr' || name === 'img';
    if (slash && !isVoid) invalidMarkup(html, offset, 'この要素には閉じタグが必要です。');
    if (!isVoid) stack.push(name);
    if (name === 'main') mainCount++;
    if (name === 'h1') headingCount++;
    const seen = new Set();
    const attr = /\s+([a-z][a-z-]*)\s*=\s*(?:"([^"<>]*)"|'([^'<>]*)'|([A-Za-z][A-Za-z0-9_-]*)(?=\s|$))/y;
    result.push('<' + name);
    let pos = 0;
    const invalidAttribute = reason => invalidMarkup(html, offset + name.length + 1 + pos, reason);
    while (pos < attributes.length) {
      attr.lastIndex = pos;
      const match = attr.exec(attributes);
      if (!match || seen.has(match[1])) invalidAttribute('属性の書式または重複を確認してください。');
      const key = match[1];
      const value = match[2] ?? match[3] ?? match[4];
      seen.add(key);

      if (key === 'id') {
        if (!/^[A-Za-z][\w-]*$/.test(value) || ids.has(value)) invalidAttribute('idの書式または重複を確認してください。');
        ids.add(value);
      } else if (key === 'href' && name === 'a') {
        if (!/^#[A-Za-z][\w-]*$/.test(value)) invalidAttribute('hrefにはページ内のidを指定してください。');
        links.push({ id: value.slice(1), offset });
      } else if (key === 'aria-labelledby') {
        if (!/^[A-Za-z][\w-]*$/.test(value)) invalidAttribute('aria-labelledbyの参照形式が不正です。');
        links.push({ id: value, offset });
      } else if (key === 'src' && name === 'img') {
        if (!art.has(value)) invalidAttribute('生成画像の参照先が制作室の素材一覧にありません。');
      } else if ((key === 'alt' && name === 'img') || (key === 'datetime' && name === 'time')) {
        if (!value.trim()) invalidAttribute('属性値が空です。');
      } else if (key === 'data-nav' && name === 'h2') {
        if (!value.trim()) invalidAttribute('目次名が空です。');
      } else if (key === 'role') {
        if (value !== 'img' || !['div', 'span', 'figure'].includes(name)) invalidAttribute('未対応のroleです。');
      } else if (key === 'aria-hidden') {
        if (!['true', 'false'].includes(value)) invalidAttribute('aria-hiddenの値が不正です。');
      } else if (!['class', 'aria-label'].includes(key)) {
        invalidAttribute('この要素には指定できない属性です。');
      }
      // Keep model-authored HTML entities, quoting only the delimiter we emit.
      pos = attr.lastIndex;
      result.push(' ' + key + '="' + value.replaceAll('"', '&quot;') + '"');
    }
    if (name === 'img') {
      if (++images > MAX_IMAGES || !seen.has('alt') || !seen.has('src')) invalidMarkup(html, offset, '画像は代替テキスト付きの制作室素材を3点まで使用できます。');
    }
    result.push('>');
  }
  if (stack.length) invalidMarkup(html, html.length, '閉じていない要素があります。');
  if (mainCount !== 1 || headingCount !== 1) invalidMarkup(html, html.length, 'mainとh1をそれぞれ1個にしてください。');
  const missing = links.find(link => !ids.has(link.id));
  if (missing) invalidMarkup(html, missing.offset, '参照先のidが見つかりません。');
  return result.join('');
}

const captions = { coffee: '窓辺の珈琲とトーストのイメージ', concert: '音を描いた公演グラフィック', architecture: '中庭を囲む住宅のスタディ模型のイメージ',
  ...Object.fromEntries(Object.entries(catalog).map(([id, item]) => [id, item.alt])) };
const crops = { wide: '16/9', split: '4/3', poster: '3/2' };

// Work on checked markup only. A missed image slot is completed locally,
// without another provider request. The reference board never enters this step.
export function validMaterialSet(selected, supporting = []) {
  if (!Array.isArray(supporting)) return false;
  const ids = selected === null ? supporting : [selected, ...supporting];
  return (selected !== null || supporting.length === 0)
    && ids.length <= MAX_IMAGES && new Set(ids).size === ids.length && ids.every(id => ART_IDS.includes(id));
}

export function applyMaterialPlan(site, { art: selected, supporting = [], placement, position }) {
  if (!Object.hasOwn(crops, placement) || !/^(?:100|[1-9]?\d)% (?:100|[1-9]?\d)%$/.test(position)) throw new Error('素材の配置設定を確認してください。');
  if (!validMaterialSet(selected, supporting)) throw new Error('未登録の制作素材です。');
  const missing = new Set(selected === null ? [] : [selected, ...supporting]);
  let html = checkedFragment(site.html).replace(/<img\b[^>]*>/g, tag => {
    const key = tag.match(/\ssrc="art:([a-z]+)"/)?.[1];
    if (missing.delete(key)) return tag;
    const id = tag.match(/\sid="([^"]+)"/);
    return id ? '<span id="' + id[1] + '"></span>' : '';
  });
  if (selected === null) return { ...site, html };
  const photo = id => '<img src="art:' + id + '" alt="' + captions[id] + '">';
  if (missing.delete(selected)) {
    const slot = /<figure\b[^>]*\sclass="[^"]*\bstudio-hero-visual\b[^"]*"[^>]*>/;
    html = slot.test(html) ? html.replace(slot, tag => tag + photo(selected))
      : html.replace('</h1>', '</h1><figure class="studio-hero-visual">' + photo(selected) + '</figure>');
  }
  if (missing.size) {
    const figures = Array.from(missing, id => '<figure>' + photo(id) + '<figcaption>' + captions[id] + '（イメージ）</figcaption></figure>');
    html = html.replace('</main>', '<div class="studio-materials">' + figures.join('') + '</div></main>');
  }
  const style = ':where(.studio-hero-visual)>:where(img){display:block;width:100%;object-fit:cover;object-position:' + position
    + ';aspect-ratio:' + crops[placement] + ';max-height:62vh;height:auto}'
    + '.studio-materials{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr));gap:1rem}.studio-materials figure{margin:0}.studio-materials img{width:100%;aspect-ratio:4/3;object-fit:cover}'
    + '@media(max-width:600px){:where(.studio-hero-visual)>:where(img){aspect-ratio:4/3}}';
  return { ...site, html, css: site.css.includes(style) ? site.css : site.css + '\n' + style };
}

// The fragment is already normalized by checkedFragment; reuse existing anchor targets.
function pageFrame(fragment, name) {
  const used = new Set(Array.from(fragment.matchAll(/ id="([^"]+)"/g), match => match[1]));
  function unique(base) {
    let id = base;
    for (let i = 2; used.has(id); i++) id = base + '-' + i;
    used.add(id);
    return id;
  }
  const top = unique('studio-top');
  const index = unique('studio-index');
  const links = [];
  const content = fragment.replace(/<h2( [^>]*)?>([\s\S]*?)<\/h2>/g, (heading, attrs = '', inner) => {
    const shortName = / data-nav="([^"]+)"/.exec(attrs)?.[1].trim();
    const label = shortName || inner.replace(/<br>/g, ' ').replace(/<[^>]+>/g, '').trim();
    if (!label || links.length >= 5) return heading;
    const existing = / id="([^"]+)"/.exec(attrs);
    const target = existing?.[1] || unique('studio-section-' + (links.length + 1));
    links.push('<a href="#' + target + '">' + label + '</a>');
    return existing ? heading : '<h2' + attrs + ' id="' + target + '">' + inner + '</h2>';
  });
  const brand = escapeText(name);
  const menu = links.length ? '<nav aria-label="主要な区画">' + links.join('') + '</nav>' : '';
  const mobile = links.length ? '<span class="studio-first-link">' + links[0] + '</span><a class="studio-index-link" href="#' + index + '">目次</a>' : '';
  const header = '<header class="studio-mast' + (links.length >= 2 ? ' studio-follow' : '') + '"><a href="#' + top + '">' + brand + '</a>' + menu + mobile + '</header>';
  if (/<\/footer>\s*<\/main>$/.test(content)) {
    const closing = content.slice(content.lastIndexOf('<footer'));
    const footerTargets = new Set(Array.from(closing.matchAll(/<a\b[^>]* href="([^"]+)"/g), match => match[1]));
    const missingLinks = links.filter(link => !footerTargets.has(link.match(/href="([^"]+)"/)[1]));
    const extraMenu = missingLinks.length ? '<nav aria-label="その他の区画">' + missingLinks.join('') + '</nav>' : '';
    const indexLinks = '<!--studio-frame-start--><div id="' + index + '" class="studio-closing-links">' + extraMenu
      + '<a href="#' + top + '">ページ先頭へ</a></div><!--studio-frame-end-->';
    const closingId = closing.match(/^<footer\b[^>]* id="([^"]+)"/)?.[1];
    const closingAnchor = closingId || unique('studio-closing');
    const withAnchor = closingId ? content : content.slice(0, content.lastIndexOf('<footer')) + closing.replace('<footer', '<footer id="' + closingAnchor + '"');
    return '<div id="' + top + '"></div><!--studio-frame-start-->' + header.replace('href="#' + index + '"', 'href="#' + closingAnchor + '"') + '<!--studio-frame-end-->'
      + withAnchor.replace(/<\/footer>(\s*<\/main>)$/, () => indexLinks + '</footer></main>');
  }
  const footer = '<footer class="studio-end" id="' + index + '"><strong>' + brand + '</strong>' + menu + '<a href="#' + top + '">ページ先頭へ</a></footer>';
  return '<div id="' + top + '"></div><!--studio-frame-start-->' + header + '<!--studio-frame-end-->' + content + '<!--studio-frame-start-->' + footer + '<!--studio-frame-end-->';
}

const frameStyle = `
.studio-mast,.studio-end{box-sizing:border-box;margin:0;padding:.65rem clamp(1rem,4vw,4rem);background:var(--studio-paper,Canvas);color:var(--studio-ink,CanvasText);font:500 1rem/1.4 system-ui,sans-serif;display:flex;align-items:center;gap:1rem;justify-content:space-between}
.studio-closing-links,.studio-closing-links nav{display:flex;align-items:center;flex-wrap:wrap;gap:.8em}.studio-closing-links{margin-top:1.25rem}.studio-closing-links a{color:inherit}
.studio-mast{border-bottom:1px solid currentColor}.studio-mast.studio-follow{position:sticky;top:0;z-index:10}
.studio-mast>a:first-child{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.studio-mast nav,.studio-end nav{display:flex;align-items:center;gap:1em}.studio-mast nav{min-width:0}
.studio-mast nav a{display:block;min-width:0;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}
.studio-mast a,.studio-end a{color:inherit;padding:.3em 0;text-underline-offset:.2em}
.studio-mast .studio-index-link,.studio-mast .studio-first-link{display:none}.studio-end{flex-wrap:wrap;border-top:1px solid currentColor}.studio-end nav{flex-wrap:wrap}
body:has(.studio-follow) [id]{scroll-margin-top:4.5rem}
@media(max-width:700px){.studio-mast nav{display:none}.studio-mast .studio-first-link{display:block;min-width:0;max-width:38%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.studio-mast .studio-index-link{display:inline-block;flex:none}.studio-end{align-items:flex-start;flex-direction:column}}
`;
const typeStyle = `@layer studioType {
  :where(body *) {font-family:inherit!important}
  :where(body, body *) {font-weight:400!important}
  :where(b,strong){font-weight:600!important}
  :is(h1,h2,h3,h4,h5,h6), :is(h1,h2,h3,h4,h5,h6) * {
    font-weight:300!important
  }
}`;

export function renderSite(site, siteName) {
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
${typeStyle}
${css}
${siteName ? frameStyle : ''}
[role="img"] > div{max-width:100%}
@media(max-width:600px){nav{flex-wrap:wrap}nav a[href]{display:inline-flex;align-items:center;min-block-size:2rem;font-size:max(.875rem,1em)}}
</style>
${siteName || site.motion ? motionSheet(site.motion) : ''}
</head>
<body${siteName || site.motion ? ' data-motion="' + (motionModes.includes(site.motion) ? site.motion : 'soft') + '"' : ''}>
${siteName ? pageFrame(fragment, siteName) : fragment}
</body>
</html>`;
  if (Buffer.byteLength(compact) > MAX_SOURCE_BYTES) throw new Error('HTML・CSSの生成結果が48 KiBを超えました。');
  const page = compact.replace(/(<img\b[^>]*?\ssrc=")(art:[a-z]+)"/g, (_, prefix, reference) => prefix + art.get(reference) + '"');
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

export async function requestText(body, { apiKey, fetchImpl = fetch }) {
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
  return { text: content.filter(part => part.type === 'output_text').map(part => part.text).join(''),
    searches: data.output.filter(item => item.type === 'web_search_call' && item.status === 'completed').length, usage };
}

export async function callResponses(body, { apiKey, fetchImpl, privateNotes = '', material, siteName }) {
  const { text, usage } = await requestText(body, { apiKey, fetchImpl });
  let site;
  try {
    site = JSON.parse(text);
  } catch {
    throw providerError('生成結果の形式を読み取れませんでした。', usage);
  }
  const encodedSite = JSON.stringify([site?.title, site?.html, site?.css]);
  if (privateNotes.split(/[。！？\n]/u).some(sentence => sentence.trim().length >= 24 && encodedSite.includes(sentence.trim()))) {
    throw providerError('制作条件の文章が出力に混入したため、この版の表示を見送りました。', usage);
  }
  try {
    return { html: renderSite(material ? applyMaterialPlan(site, material) : site, siteName), usage };
  } catch (error) {
    throw Object.assign(providerError(error.message, usage), { rejectedSite: site });
  }
}
