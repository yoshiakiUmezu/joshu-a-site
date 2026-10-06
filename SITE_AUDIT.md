# 助手A ブランド母艦サイト監査（2026-10-06）

## 変更前の記録

- 対象: `yoshiakiUmezu/joshu-a-site` のみ。A.I. TERMINAL本体は対象外。
- 初期作業ディレクトリは空だったため、このディレクトリへmainをclone。
- `git ls-remote origin refs/heads/main` とHEADが一致: `db3a29becb85df8668955f94709ee1b4ad422a0a`（Add branded 404 page）。
- 初期状態: `main...origin/main`、未コミット変更なし。
- 作業branch: `audit/brand-hub-foundation`。mainへのmergeは禁止。
- 変更前ファイル: index.html 16,940 B、404.html 3,497 B、favicon.png 618,279 B、robots.txt 108 B、sitemap.xml 271 B、README.md 46 B、ACQUISITION_STRATEGY.md 6,076 B（clone後のWindows改行を含むサイズ）。原本は上記commitから再現できる。
- 本番HTTP確認: `/`・robots・sitemapは200、存在しないパスは404、HTTPはHTTPSへ転送。`www.joshu-a.com` は今回の環境で名前解決不可。wwwの運用意図は不明のため障害認定しない。
- 既存方針: ACQUISITION_STRATEGY.mdの恒久製品URL、一次情報、実コンテンツが揃ってから公開する方針を継承。
- 想定Cloudflare設定: main / framework None / build command空欄 / output `.`。ダッシュボード設定そのものは未検証。

## A. 現状評価（変更前）

基本コピー、個人開発ブランドの説明、黒・ネイビーの落ち着いたデザイン、静的HTMLによる軽い構成は良い土台。title、description、canonical、OGテキスト、X card、WebSite / Brand、robots、sitemap、意味のある見出し、skip link、focus、reduced-motion、404が既にある。

最大の強みは、誇大な実績や架空の機能を主張せず、静的な一次情報の母艦として育てられること。最大の弱点は、主CTAの先が仮の製品カードになり、訪問者の「次に何ができるか」が不明確なこと。製品が未公開なので購入/DLまでのCVは現時点では成立しない。監査は公開前の土台として評価し、売上や実際のCVRの改善を保証しない。

## B. 問題一覧 / C. 優先順位

| 優先度 | 問題・影響 | 判断 |
| --- | --- | --- |
| P0 | 現時点で確認した公開・閲覧を妨げる問題なし | 本番HTTP200・404を確認 |
| P1 | Product 01 / 02 / Coming laterと価格・OSのダッシュが実製品の一覧に見える。CTAから意思決定へ進めない | 公開準備中の簡潔な説明へ置換。架空の製品情報を作らない |
| P1（公開時） | 実製品の価値、価格、対応環境、購入/DL/利用先、恒久URLが未掲載 | 製品未公開の現状では欠陥とせず、公開時の必須タスク |
| P2 | 680px以下でナビが消える。contactへの近道がなくなる | JSなしで小画面でもナビを表示 |
| P2 | sticky headerに対するアンカーの余白なし | PRODUCTS / ABOUT / CONTACT / skipの到達位置を検証し調整 |
| P2 | OG / Xの画像が未指定 | 既存ロゴを形状維持で配置する共有画像。生成AIは使わない |
| P2 | 30pxのロゴ表示に618KBのfavicon原本を使用。寸法属性なし | favicon原本は保持。別の表示用アセットと明示寸法を検討 |
| P2 | 小さい補助文字のコントラスト、スマホのタップ領域 | 実測に基づいて変更 |
| P2 | 320pxで文字を200%へ拡大すると横はみ出しが発生 | ナビ・パネルラベル・メールの折り返しとgridの最小幅を修正 |
| P2（運用） | contact@の実際の受信、検索登録、実機、previewのindex抑止はソースから証明できない | 公開前の人による確認として残す |
| P2（将来） | 各ページのmetadata / JSON-LD / deep link設計を引き継ぐ運用手順が不足 | 既存戦略を具体化した最小の公開チェックリスト |
| P2 | output `.` によりACQUISITION_STRATEGY.mdも本番200で配信され、noindexがない | `_headers`でMarkdown文書だけnoindex。HTMLの製品・記事ページは対象外 |
| P3 | パネルの装飾、色味・余白・英語ラベルの好み、inline CSSの分割 | 全面刷新や微調整は不要 |

## D. 今直すべきもの

仮製品一覧の除去、公開状況に合うCTA、モバイルナビ、アンカー到達位置、実測で判明するアクセシビリティ、共有画像、ロゴ転送量。公開目的への寄与が明確なものに限定。新しいランタイムJS・framework・外部サービスは導入しない。

## E. 製品公開後まで待つべきもの

実製品に基づく `/products/<slug>/index.html`、購入/DL/利用CTA、SoftwareApplication / VideoGame、実画像・動画、価格・動作環境・FAQ・更新履歴・サポート、実記事ができてからの `/journal/<slug>/index.html`、流入とCTAの最低限の計測。空Journal、SEO量産の枠、llms.txt、IndexNow、意味の薄いアニメーションは追加しない。

## 検証と最終判断

### 総合評価

変更前 **7/10** → 修正後 **8/10**（製品公開前の母艦基盤としての主観評価）。現時点のCV成果を採点したものではない。最大の強みは、明確なブランドコピーと個人開発の説明、依存のない静的HTML、既存のSEO / a11y基盤。最大の弱点は、購入/DL/利用の意思決定に必要な実製品の一次情報がまだないこと。最初の製品の詳細と実際のCTAが公開されるまでは、その先のファネルは完成しない。

### 実施した変更

- 仮の3製品カード・空の価格/OS欄を削除し、公開準備中の状態を1枚で明記。Hero CTAは「製品の公開状況を見る」。公開時に本来の製品CTAへ置換する。
- スマホにもPRODUCTS / ABOUT / CONTACTナビを表示。ナビとメールリンクは44px以上の高さ。JavaScriptメニューは導入しない。
- 200%の文字拡大でも横はみ出しが起きないよう、モバイルnav・パネル上部ラベルを折り返し、gridの最小幅とメールの折り返しを調整。
- sticky headerを考慮したscroll-marginを追加。トップ・各セクションのdeep link、skip linkで見出しが隠れないことを確認。
- 既存faviconから縦横比・色・余白を維持して96×96の表示用PNGを作成し、トップと404に寸法属性付きで使用。6,051 B。favicon.pngのバイト列は変更なし。輪郭の描き直し、トレース、切り取り、色変更、生成AIは使用しない。
- OG画像1200×630（83,317 B）に既存ロゴを比例縮小して配置。ブランド名、基本コピー、製品カテゴリ、公式ドメインのみ掲載。OG画像・寸法・alt、X large image / image / altを追加。
- 配信されるリポジトリ文書の検索混入を抑えるため、`/*.md` に `X-Robots-Tag: noindex`。公開HTML・robots・sitemap・画像は対象外。
- ローカル検証用の`.wrangler/`はgitignoreへ追加。Cloudflareの本番設定は変更しない。
- 不要になった仮カード用CSSを除去。ビルド、ランタイムJS、新規framework、外部フォントや計測サービスは追加しない。

### 実施しなかった変更と理由

- 基本コピー、配色、Heroパネル、ロゴ形状、faviconを維持。大きなHeroや装飾の再設計は現時点の目的に寄与しない。
- 補助文字の配色は維持。axeでコントラスト違反が検出されず、好みの変更は不要。
- inline CSSは継続。2ページの規模で共有CSSのために追加リクエストと移行作業を増やす必要はない。製品ページが増えた段階で共通化を判断する。
- title / description / canonical / robots / sitemap / WebSite / Brandは既存の正しい情報を継続。sitemapのlastmodは変更当日と一致。架空のSoftwareApplication / VideoGame / Offer / ratingは追加しない。
- 空Journal、SNS枠、SEO記事量産、llms.txt、IndexNow、アニメーション追加は延期または不要。
- CSPやキャッシュの独自設計は追加しない。フォーム入力、ランタイムJS、外部スクリプト、秘密情報、危険なHTML挿入処理はなく、今回の範囲で明確な脆弱性は検出していない。Cloudflare標準の配信設定を維持。
- wwwのDNS、メール受信、本番設定はリポジトリ外なので変更しない。メール送信や有料APIは使用しない。

### テスト結果

実行環境: Windows、Node v24.21.0、Playwright（headless Edge）、html-validate 11.16.2、PostCSS、axe-core、Lighthouse 13.5.0（headless Chrome）、Wrangler 4.147.0（ローカルのみ）、Python標準HTMLParser / XML / JSON解析。検証ツールはOSの一時ディレクトリに導入し、サイトの依存・build commandを増やしていない。

- `git diff --check`: 合格。
- HTML2ページ: html-validate recommendedで構造エラー0。既存の小文字DOCTYPEとvoid要素の末尾 `/` はHTMLとして有効なため、スタイル規則のみ無効化。大文字化など目的のない整形はしない。
- inline CSS2ページ: PostCSS構文解析に成功。
- JavaScript: 実行JSなし。JSON-LDはJSON解析成功。ブラウザpageerror 0、JS無効でも本文・CTA・リンクを利用可能。
- 320 / 375 / 390 / 768 / 1440px: 横はみ出しなし、全幅でナビ表示、画像読み込み成功。390px・1440pxの全体、320pxの404、OG画像は画像として目視確認。
- 680 / 681 / 900 / 901pxのbreakpoint付近も横はみ出しなし。320pxで全テキストのfont-sizeを2倍にする検証では当初scrollWidth 397pxだったが、修正後320px。文字の欠落・横スクロールなし。これは文字拡大の模擬で、端末固有のzoom動作は未検証。
- axe: 上記5幅のトップおよび320pxの404で違反0。自動検査はスクリーンリーダー実機検証の代わりではない。
- skip link: Tabで表示、Enterで本文、次のTabは主CTA。reduced-motionでscroll-behaviorはauto。
- 全内部リンクのHTTP200とアンカーの存在を確認。mailtoは文字列を確認しただけで、受信可否は未検証。
- sitemapのXML構造・トップURL、robotsの全体Allow / OAI-SearchBot Allow / Sitemap、metadata・画像参照・JSON-LDを確認。
- 本番の既存404はHTTP404。ローカルのトップ・robots・sitemapは200、存在しない通常/製品/記事パスは404。ローカルHTTPサーバーは404配信を模擬するもので、Cloudflare実環境の検証と区別する。
- `wrangler pages dev .` のローカル配信でも、トップ・robots・sitemap・両PNGの200 / 適切なContent-Typeと、存在しない製品・記事パスの404 / 404本文noindexを確認。header rule 1件の解析成功。README / 戦略 / 監査のMarkdownだけX-Robots-Tag: noindex、トップ・robots・sitemap・画像にnoindexなし。リモートdeployやCloudflare APIは実行していない。

Lighthouseは同じローカルHTTPサーバーで変更前1回・変更後2回のmobile lab測定。最初の修正後はPerformance 88、200%文字拡大への追加修正を含む最終ソースは下表の87。都合の良い値だけを採用しない。圧縮・CDN・キャッシュがないローカル条件のため、本番のフィールドCore Web VitalsやCVRの証拠にはならない。

| 指標 | 変更前 | 修正後 |
| --- | --- | --- |
| Performance | 72 | 87 |
| Accessibility | 100 | 100 |
| Best Practices | 100 | 100 |
| SEO | 100 | 100 |
| FCP | 1.5s | 1.1s |
| LCP | 7.4s | 4.0s |
| TBT | 230ms | 60ms |
| CLS | 0 | 0 |
| Speed Index | 2.5s | 2.3s |

表示用ロゴの618KBリクエストを6KBに置換したが、ブラウザはfavicon原本も別途取得するため、**ページ全体の転送量が99%減ったわけではない**。favicon変更禁止を優先した結果、618KBのアイコン取得は残る。修正後LCPも改善余地があり、本番計測で確認すべき。INPは実際の利用データが必要で、TBTで代替したと主張しない。

最初のLighthouse起動はEdgeのdebugging port待機に失敗。Chromeへ切り替えて正常完了した。上表は正常完了したレポートのみ。

### 各観点の判断

- 情報設計 / Hero: ブランド名、基本コピー、何を作るか、個人開発であることがファーストビューで分かる。ABOUTは方針、PRODUCTSは意思決定の入口、CONTACTは問い合わせ。今は公開状況に合ったラベルで期待を揃える。
- モバイル: 本文15px・行間1.9、CTA48px、nav44px。小画面でもcontactへ直接移動できる。Heroパネルは縦に長めだが装飾の全面整理はP3。端末別の実機QAは残る。
- CV導線: 公開前は「発見 → ブランド理解 → 公開状況確認 / 問い合わせ」。公開時は製品詳細URLと本物の購入/DL/利用先を差し込む。架空の購入ボタンや予約・メルマガの受付は作らない。
- SEO / AI検索: JSなしで一次情報を読める。日本語lang、title/description/canonical、見出し、robots、sitemap、WebSite / Brandが一致。OG画像追加は共有の識別性に寄与するが順位保証はしない。OAI-SearchBotのAllowはrobots上の許可であり、Cloudflareのbot設定や実際の引用採用を証明しない。
- HTML / CSS / JS / 保守性: semantic headings、ランドマーク、aria-labelledbyがある。CSSは小規模で依存なし。未使用の仮カード用規則を除去し、フレームワーク移行は不要。
- 表示速度 / CWV: 外部フォント・動画・第三者JSなし。表示用画像の過大サイズを是正。sticky blurは実機GPU次第で負荷があり得るが、測定された問題がない段階で好みの変更をしない。
- 信頼性 / セキュリティ: 個人開発という実態を記載し、誇大な実績・企業規模・レビュー・導入社数を捏造していない。問い合わせフォームやアカウント・決済処理は未実装。メール受信と実製品の提供先を公開前に確認する。
- Cloudflare: 静的ルートとroot 404に適合。build空欄 / output `.`を維持。SPA fallbackや全URL→トップのリダイレクトは追加しない。`_headers`でMarkdownだけnoindexにする。ダッシュボードおよびpreview HTTPヘッダーは別途確認が必要。

### 製品公開前に残すタスク

1. Draft PRの差分とCloudflare previewを確認し、運営者の判断でmainへmergeする。今回はmergeしない。
2. スマホ実機（iOS Safari / Android Chrome）、キーボード、スクリーンリーダーでCTA・ナビ・メールを確認。実際にcontact@で受信・返信できることを運営者が確認。
3. previewのnoindex、production branch、framework、build command、output、独自ドメイン・HTTPS、AI botの設定をダッシュボードとHTTP応答で確認。
4. merge後のOG画像200・PNGのContent-Type、X/OGの共有表示、トップ200・未知パス404、MarkdownのX-Robots-Tagを確認。SNSキャッシュの反映はサイトソースだけでは保証できない。
5. 検索登録・sitemap送信・canonicalの採用状況を運営者のSearch Consoleで確認。ローカルLighthouseのSEO100でindex済みとは判断しない。

### 製品公開時に追加するタスク

1. 実製品ごとに `/products/<slug>/index.html` を作る。英数字のslugを恒久URLにし、公開後の変更には個別301を使う。トップに実製品カードと明確な詳細CTAを置き、Heroの「公開状況」を実製品へ進むCTAに更新する。
2. 各製品ページ冒頭で製品名、一文の価値、対象者、対応OS、価格、提供状況、本物の購入/DL/利用CTAを示す。続けて実画面・デモ、主要機能/体験、動作環境、FAQ、更新方針/履歴、サポートを掲載。
3. ディープリンクで来た人も、ブランド名と製品名、何ができるか、価格/環境、次の行動をそのページだけで理解できるようにする。共通ヘッダーのロゴは `/`、ナビは `/#products` 等にし、相対 `#about` をそのまま流用しない。資産パスは `/assets/...` にする。
4. ページ固有のtitle、description、canonical、OG url/title/description/image、X image、h1、JSON-LDを揃え、公開した200のcanonical URLだけsitemapへ追加する。404と準備中URLは登録しない。lastmodは実際の内容更新日にする。
5. ソフトウェアはSoftwareApplication、ゲームはVideoGameの実データを追加。`@id`は製品URLに紐づけ、ブランドを参照し、name/url/description/image/operatingSystem等を実内容と一致させる。価格/通貨/Offerは確定した販売情報のみ。販売終了・未定情報や存在しないrating/reviewを捏造しない。Schema.orgの妥当性とGoogleリッチリザルトの要件は別々に確認する。
6. note/X/itch.io等から該当製品URLへ直接送客。トップへ一律転送しない。ストアと公式サイトで価格・対応環境・説明を揃え、公開されている購入/DL先で完了まで確認する。
7. 実記事が1本できたら `/journal/<slug>/index.html` を作る。実体のある一次情報と関連製品へのCTAを持たせる。記事一覧は必要になってから。Journalを前もって空で公開しない。
8. 実流入が出たらUTM、製品ページ到達、CTAクリック、ストア側の購入/DLを最小限計測する。クリックと購入完了を混同しない。実製品画像・動画を含めて本番モバイル性能とCWVを再評価する。

### モデルとツール

監査・SEO/情報設計・CV導線の判断・実装判断・最終レビューはこのセッションのGPT-6系モデルで実施。SEO・ブランドの事実・公開前後の導線を一貫して判断する必要があるため、このモデルで担当した。このセッション内のモデル切替機能がないため、軽量/中位/高性能モデルを別々に起動した実績はない。機械的走査・構文・リンク・レイアウト・a11y・性能検証はGit、Node、html-validate、PostCSS、Playwright、axe、Lighthouse、Wrangler等で実行し、別LLMへの反復投入は行っていない。

### 参照した一次資料

- [Cloudflare Pages: Serving Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/)（静的ルート、root 404、標準キャッシュ）
- [Cloudflare Pages: Build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)（frameworkなしのbuild設定）
- [Cloudflare Pages: Headers](https://developers.cloudflare.com/pages/configuration/headers/)（`_headers`、splat、X-Robots-Tag）
- [Google Search Central: SoftwareApplication](https://developers.google.com/search/docs/appearance/structured-data/software-app)（実製品の構造化データとrich resultを混同しない）
