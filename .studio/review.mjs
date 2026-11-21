function escapeText(value) {
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value).replace(/[&<>"']/g, (character) => entities[character]);
}

const stages = {
  review: {
    status: "内容を確認してください",
    detail: "PCとスマホの画像を確認し、このデザインでよければ確認ボタンを押してください。",
    action: '<form method="post" action="./confirm"><button id="confirm-version" type="submit">この版を確認する</button></form>',
  },
  confirmed: {
    status: "確認済み・納品待ち",
    detail: "開発者が模擬購入を確定すると、この画面からHTMLを保存できます。",
    action: '<a class="button" id="refresh-review" href="./">納品状況を更新</a>',
  },
  released: {
    status: "納品済み",
    detail: "確認した版のHTMLを保存できます。保存したファイルをブラウザで開くとサイトを表示できます。",
    action: '<a class="button" id="download-offer" href="./download" download>HTMLをダウンロード</a>',
  },
};

export function reviewPage(offer) {
  const stage = stages[offer.status];
  const name = escapeText(offer.name);
  const version = escapeText(offer.id.slice(0, 8));
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <meta name="referrer" content="strict-origin">
  <title>${name} | 購入前確認 | 助手A</title>
  <style>
    :root { color-scheme: dark; font-family: Inter,system-ui,"Yu Gothic UI","Hiragino Kaku Gothic ProN",sans-serif; background: #0a0d12; color: #f1f4f8; }
    * { box-sizing: border-box; }
    body, h1, h2, p, figure { margin: 0; }
    body { line-height: 1.65; }
    .shell { width: min(80rem, calc(100% - clamp(2rem,7vw,7rem))); margin-inline: auto; }
    header { border-bottom: 1px solid #303844; }
    header .shell, .controls, .bar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    header .shell { min-height: 4rem; padding-block: .6rem; }
    header strong { letter-spacing: .04em; }
    .private, .meta, .hint { font-size: .875rem; color: #a7b3c2; }
    .intro { padding-block: clamp(1.4rem,4vw,3.25rem) 1.4rem; }
    h1 { font-size: clamp(1.8rem,4.2vw,3.3rem); line-height: 1.3; overflow-wrap: anywhere; letter-spacing: -.035em; }
    .meta { margin-top: .45rem; }
    .controls { padding: 1rem clamp(1rem,2.8vw,2rem); gap: .85rem 2rem; border: 1px solid #374457; border-radius: .8rem; background: #141c27; }
    h2, legend { font-size: 1.1rem; font-weight: 700; }
    .controls p { margin-top: .2rem; max-width: 52ch; }
    a { color: #c4dcff; text-underline-offset: .2em; }
    button, .button { display: inline-block; font: inherit; font-weight: 650; text-decoration: none; color: #122238; background: #c4dcff; border: 0; border-radius: .5rem; padding: .62rem 1.05rem; cursor: pointer; }
    :is(button, a, input):focus-visible { outline: 2px solid #c4dcff; outline-offset: 4px; }
    .images { margin: 1.5rem 0 3rem; }
    fieldset { margin: 0; min-width: 0; padding: 0; border: 0; }
    legend { padding: 0; margin-bottom: .65rem; }
    .choices { display: inline-flex; flex-wrap: wrap; gap: .3rem; }
    .choices label { display: inline-flex; align-items: center; gap: .42rem; min-height: 2.75rem; padding: .4rem .8rem; border: 1px solid #455366; border-radius: .45rem; cursor: pointer; }
    .choices label:has(input:checked) { background: #273549; border-color: #89a7d1; }
    input { margin: 0; accent-color: #b4d5ff; }
    .stage { background: #111821; border: 1px solid #303844; border-radius: .7rem; margin-top: .75rem; padding: clamp(.4rem,1.6vw,1.25rem); }
    .bar { margin-bottom: .7rem; font-size: .875rem; }
    .stage img { display: block; width: 100%; height: auto; margin-inline: auto; }
    .mobile { display: none; }
    .mobile img { max-width: 390px; }
    fieldset:has(#review-mobile:checked) .desktop { display: none; }
    fieldset:has(#review-mobile:checked) .mobile { display: block; }
    @media (max-width: 35rem) { .controls > form, .controls .button, .controls button { width: 100%; text-align: center; } }
  </style>
</head>
<body>
  <header><div class="shell"><strong>助手A ホームページ制作室</strong><span class="private">購入テスト・料金は発生しません</span></div></header>
  <main class="shell">
    <div class="intro"><h1>${name}</h1><p class="meta">購入前確認 · 版 ${version}</p></div>
    <section class="controls" aria-labelledby="status">
      <div><h2 id="status">${stage.status}</h2><p class="hint">${stage.detail}</p></div>
      ${stage.action}
    </section>
    <section class="images" aria-label="確認用画像">
      <fieldset>
        <legend>デザインを確認</legend>
        <div class="choices">
          <label><input type="radio" name="viewport" id="review-pc" checked>PC</label>
          <label><input type="radio" name="viewport" id="review-mobile">スマホ</label>
        </div>
        <div class="stage">
          <figure class="desktop">
            <figcaption class="bar"><span>PC · 1,280 px</span><a href="./desktop.jpg" target="_blank" rel="noopener noreferrer">原寸画像を開く ↗</a></figcaption>
            <img src="./desktop.jpg" alt="PC幅で表示したページ全体の確認画像">
          </figure>
          <figure class="mobile">
            <figcaption class="bar"><span>スマホ · 390 px</span><a href="./mobile.jpg" target="_blank" rel="noopener noreferrer">原寸画像を開く ↗</a></figcaption>
            <img src="./mobile.jpg" alt="スマホ幅で表示したページ全体の確認画像">
          </figure>
        </div>
      </fieldset>
    </section>
  </main>
</body>
</html>`;
}
