# 製品ページの正式テンプレート

これは**購入・DL・利用が可能になった正式公開製品専用**の非公開テンプレート。実製品の事実・稼働するCTA・実画像が揃った時だけ `products/<slug>/index.html` にコピーする。`node scripts/check-release.mjs` は、このパスの全ページを正式公開製品として検査するrelease gateであり、販売前の紹介ページには対応しない。現在このパスに製品ページは作らない。`{{...}}` はすべて置換し、不要な任意セクションは削除する。

## 必須入力と判断

| 入力 | 決め方 |
| --- | --- |
| `SLUG` / `PRODUCT_NAME` | 短く恒久的なASCII slug、正式名称。公開後のURL変更は原則避ける。 |
| `ONE_LINE_VALUE` / `AUDIENCE` / `WHAT_IT_DOES` | 直接流入した人が、何・誰向け・何ができるかを数秒で判断できる実際の説明。 |
| `PUBLIC_STATUS` / `PRICE_DISPLAY` / `OS_DISPLAY` | 現在利用できる事実に合う公開状況、税込/税別や購入形態まで明確な価格表記、実際に対応する環境。未定・準備中のまま公開しない。 |
| `CTA_URL` / `CTA_LABEL` | 購入・DL・利用の実際の次の一歩。トップや製品ページ自身へのリンクではなく、稼働する正しい入手・利用先へ。 |
| `TITLE` / `DESCRIPTION` / `OG_ALT` | 製品固有の検索・SNS文言と実際の `assets/<slug>-og.png`（1200×630 PNG）。ブランドの共有画像をそのまま使い回さない。 |
| `SCHEMA_TYPE_JSON` | ソフトウェアは `"SoftwareApplication"`、ゲームは `["VideoGame", "SoftwareApplication"]` とJSONとして入力。`PRICE_AMOUNT`、`PRICE_CURRENCY`、`OS_SCHEMA`、`CTA_URL`は表示と一致。価格が未確定なら公開前に決定し、虚偽のOfferを出さない。 |
| `SCREENSHOT_*` / `FEATURE_*` | 実画面・実機能のみ。画像に用途が伝わるaltを付ける。 |
| `VIDEO_*` / FAQ / 更新情報 / 関連記事 | 実体がある項目だけ残す。動画・記事・更新情報がない時はセクションごと削除する。空のJournalを作らない。 |

公開前に[法務・プライバシー確認](legal-release-checklist.md)で必要性を判定する。利用規約、プライバシー、ライセンス、返金条件、販売者情報、サポートのリンクは、該当する条件があり、実際の文書またはストアの案内先が用意できたものだけを製品ページに加える。リンクを置く位置と内容は販売先の規則に合わせ、未作成のリンクや空の節を残さない。

公開時はホームの製品カードを実製品の名前・短い説明・正規URLへ更新し、準備中の文言を事実に合わせて直す。sitemapには、**公開済みで200・indexable・自己canonicalの製品URLだけ**を追加する。未公開/プレビュー/削除済みページを載せない。製品情報を大きく変更した日だけ`lastmod`を更新する。`/products/<slug>/`を外部媒体に配布する正規URLとし、`/products/<slug>/index.html`は内部ファイル名としてだけ扱う。

## HTML（製品情報を入れてから公開）

```html
<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{{TITLE}}</title>
  <meta name="description" content="{{DESCRIPTION}}" />
  <meta name="robots" content="index,follow,max-image-preview:large" />
  <meta name="theme-color" content="#07090d" />
  <link rel="canonical" href="https://joshu-a.com/products/{{SLUG}}/" />
  <link rel="icon" type="image/png" href="/favicon.png" />

  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="助手A" />
  <meta property="og:locale" content="ja_JP" />
  <meta property="og:url" content="https://joshu-a.com/products/{{SLUG}}/" />
  <meta property="og:title" content="{{TITLE}}" />
  <meta property="og:description" content="{{DESCRIPTION}}" />
  <meta property="og:image" content="https://joshu-a.com/assets/{{SLUG}}-og.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="{{OG_ALT}}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{{TITLE}}" />
  <meta name="twitter:description" content="{{DESCRIPTION}}" />
  <meta name="twitter:image" content="https://joshu-a.com/assets/{{SLUG}}-og.png" />
  <meta name="twitter:image:alt" content="{{OG_ALT}}" />

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": {{SCHEMA_TYPE_JSON}},
    "@id": "https://joshu-a.com/products/{{SLUG}}/#product",
    "name": "{{PRODUCT_NAME}}",
    "description": "{{DESCRIPTION}}",
    "url": "https://joshu-a.com/products/{{SLUG}}/",
    "image": "https://joshu-a.com/assets/{{SLUG}}-og.png",
    "operatingSystem": "{{OS_SCHEMA}}",
    "isPartOf": { "@id": "https://joshu-a.com/#website" },
    "offers": {
      "@type": "Offer",
      "url": "{{CTA_URL}}",
      "price": "{{PRICE_AMOUNT}}",
      "priceCurrency": "{{PRICE_CURRENCY}}"
    }
  }
  </script>

  <style>
    :root { color-scheme: dark; --bg: #07090d; --panel: #10151d; --text: #f4f7fb; --muted: #a8b0bc; --line: #344050; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.75 system-ui, -apple-system, "Noto Sans JP", sans-serif; }
    a { color: inherit; }
    a:focus-visible { outline: 2px solid #fff; outline-offset: 4px; }
    .wrap { width: min(100% - 32px, 900px); margin-inline: auto; }
    .skip { position: absolute; top: -100px; left: 12px; padding: 10px; background: #fff; color: #07090d; }
    .skip:focus { top: 12px; }
    header, footer { border-block: 1px solid var(--line); }
    header .wrap, footer .wrap { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 64px; }
    .brand { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; font-weight: 700; }
    .brand img { width: 30px; height: 30px; }
    nav { display: flex; gap: 20px; flex-wrap: wrap; }
    main { padding-block: 48px 80px; }
    h1 { font-size: clamp(34px, 7vw, 56px); line-height: 1.18; margin: 8px 0 16px; }
    h2 { font-size: clamp(24px, 4vw, 32px); line-height: 1.35; }
    p { max-width: 72ch; }
    .muted, .facts dt { color: var(--muted); }
    .lead { font-size: clamp(18px, 3vw, 22px); }
    .facts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-block: 28px; }
    .facts div, .card { padding: 20px; border: 1px solid var(--line); border-radius: 14px; background: var(--panel); }
    .facts dt { font-size: 13px; }
    .facts dd { margin: 4px 0 0; font-weight: 650; overflow-wrap: anywhere; }
    .cta { display: inline-flex; min-height: 48px; align-items: center; justify-content: center; padding: 10px 22px; border-radius: 10px; background: #fff; color: #07090d; font-weight: 700; text-decoration: none; }
    section { padding-top: 50px; }
    img, video { max-width: 100%; height: auto; }
    figure { margin: 20px 0; }
    figcaption { color: var(--muted); font-size: 14px; }
    .cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    @media (max-width: 640px) { header .wrap, footer .wrap { flex-wrap: wrap; padding-block: 12px; } .facts, .cards { grid-template-columns: 1fr; } main { padding-top: 32px; } .cta { width: 100%; } }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; } }
  </style>
</head>
<body>
  <a class="skip" href="#main">本文へ移動</a>
  <header>
    <div class="wrap">
      <a class="brand" href="/" aria-label="助手A ホーム"><img src="/assets/brand-mark.png" width="30" height="30" alt="" />助手A</a>
      <nav aria-label="サイト内ナビゲーション"><a href="/#products">製品一覧</a><a href="/#contact">お問い合わせ</a></nav>
    </div>
  </header>
  <main class="wrap" id="main">
    <p class="muted"><a href="/">助手A</a> / 製品</p>
    <h1>{{PRODUCT_NAME}}</h1>
    <p class="lead">{{ONE_LINE_VALUE}}</p>
    <p>{{WHAT_IT_DOES}}</p>
    <p>対象：{{AUDIENCE}}</p>
    <dl class="facts">
      <div><dt>公開状況</dt><dd>{{PUBLIC_STATUS}}</dd></div>
      <div><dt>価格</dt><dd>{{PRICE_DISPLAY}}</dd></div>
      <div><dt>対応環境</dt><dd>{{OS_DISPLAY}}</dd></div>
    </dl>
    <a class="cta" data-primary-cta href="{{CTA_URL}}">{{CTA_LABEL}}</a>

    <section aria-labelledby="features-heading">
      <h2 id="features-heading">できること</h2>
      <div class="cards"><article class="card"><h3>{{FEATURE_TITLE}}</h3><p>{{FEATURE_DESCRIPTION}}</p></article></div>
    </section>
    <section aria-labelledby="screenshots-heading">
      <h2 id="screenshots-heading">画面・体験</h2>
      <figure><img data-screenshot src="/assets/{{SLUG}}-screenshot.png" width="{{SCREENSHOT_WIDTH}}" height="{{SCREENSHOT_HEIGHT}}" alt="{{SCREENSHOT_ALT}}" loading="lazy" /><figcaption>{{SCREENSHOT_CAPTION}}</figcaption></figure>
    </section>
    <section aria-labelledby="video-heading">
      <h2 id="video-heading">デモ動画</h2>
      <video controls preload="none" poster="/assets/{{SLUG}}-video-poster.png"><source src="/assets/{{SLUG}}-demo.mp4" type="video/mp4" />動画を再生できない場合は<a href="/assets/{{SLUG}}-demo.mp4">動画ファイル</a>をご覧ください。</video>
    </section>
    <section aria-labelledby="faq-heading">
      <h2 id="faq-heading">よくある質問</h2>
      <details><summary>{{FAQ_QUESTION}}</summary><p>{{FAQ_ANSWER}}</p></details>
    </section>
    <section aria-labelledby="updates-heading">
      <h2 id="updates-heading">更新情報</h2>
      <p><time datetime="{{UPDATE_DATE}}">{{UPDATE_DATE}}</time>：{{UPDATE_SUMMARY}}</p>
    </section>
    <section aria-labelledby="related-heading">
      <h2 id="related-heading">関連記事</h2>
      <p><a href="{{RELATED_ARTICLE_URL}}">{{RELATED_ARTICLE_TITLE}}</a></p>
    </section>
    <section aria-labelledby="contact-heading">
      <h2 id="contact-heading">お問い合わせ</h2>
      <p>ご質問や不具合のご連絡は<a href="mailto:contact@joshu-a.com">contact@joshu-a.com</a>へ。</p>
    </section>
  </main>
  <footer><div class="wrap"><span>© 2026 助手A</span><a href="/">公式サイト</a></div></footer>
</body>
</html>
```

動画・FAQ・更新情報・関連記事は内容がないなら節ごと削除する。スクリーンショットも実画面が用意できるまで公開しない。JSON-LDの`offers`は必須で、実際の購入/入手条件とCTAに一致させる。無料でも実際に入手できる場合は価格を`0`とする。販売前紹介ページを将来公開する場合は、このテンプレートやrelease gateを流用せず、ページの扱いと検証方法を別途設計する。`offers`を削除して正式公開チェックを迂回しない。架空の評価・レビュー・ダウンロード数は追加しない。Googleの[SoftwareApplication仕様](https://developers.google.com/search/docs/appearance/structured-data/software-app)ではゲームを他のアプリ種別と併記する例があり、レビューまたは評価がない場合はアプリのリッチリザルト対象にならない。構造化データは検索表示を保証しない。
