# 最初の製品公開：入口と公開ゲート

購入・DL・利用が可能になった正式公開時に[製品ページのHTMLテンプレート](product-page-template.md)を実製品の事実で埋める。外部から直接来た人が「何の商品か・誰向けか・何ができるか・価格・対応環境・次の操作」をページ上部だけで判断できる状態にする。`products/<slug>/` と `node scripts/check-release.mjs` は正式公開製品のrelease gateであり、販売前紹介ページ用ではない。

## 公開までの最短手順

1. 実製品の名称、slug、一言価値、対象者、機能、公開状況、価格と課金条件、OS/利用条件、購入/DL/利用URL、実画面・OG画像を確定する。[法務・プライバシー確認](legal-release-checklist.md)で販売主体、データ収集、同梱物を判定し、必要な表示だけを揃える。CTA先を人間が実際に開いて完了まで試す。実画像を `assets/` に配置する。OG画像は1200×630 PNG。ロゴ/実画面の構成は[販促素材ガイド](promotional-assets.md)に従う。
2. `data/products/<slug>.json`を新規作成し、下の必須項目と該当する任意項目へ実情報だけを入力する。準備中の下書きは`"publish": false`にする。公開できる情報と稼働するCTAが揃った正式製品だけ`true`にする。ロゴ形状とfaviconには触れない。
3. リポジトリ直下で `node scripts/build-products.mjs` を実行する。ジェネレーターが製品HTML、トップの製品カード、sitemapを更新する。次に `node scripts/check-release.mjs` と `node --test tests/build-products.test.mjs tests/check-release.test.mjs` を実行する。
4. プレビューでスマホ幅、文字/CTA/画像、キーボード操作、OG、実際の外部CTA先を人間が確認する。GitHub PRレビューを経て`main`へ反映するのはサイト管理者の判断。本番反映後に `node scripts/check-release.mjs --live` を実行し、Search Console/Bingにsitemapを提出済みなら製品の正規URLを検査する。

### 製品データの入力項目

JSONファイルを1製品1ファイルで管理する。`slug`はファイル名と一致させ、URL公開後は変更しない。

- 必須（公開時）: `slug`, `publish`, `productType`（`SoftwareApplication`または`VideoGame`）, `name`, `oneLineValue`, `audience`, `description`, `status`, `priceDisplay`, `priceAmount`, `currency`, `platforms`, `ctaLabel`, `ctaUrl`, `ogImage`, `screenshot`（`src`, `alt`, `caption`, `width`, `height`）, `features`, `releaseDate`, `lastModified`。
- 任意: `title`（省略時に製品名から生成）, `ogAlt`（省略時に製品名と一言価値から生成）, `video`（MP4 URLと任意のposter）, `faq`, `updates`, `relatedArticles`, `legalLinks`（`privacy`, `terms`, `license`, `refund`, `sellerInformation`, `support`）。実在する内容とリンクだけを記述する。法的要否の判断は人が行い、生成器は法律判断を確定しない。
- `publish:false`ならslug・ファイル名とpublish型だけ確認し、ページ、トップカード、sitemapを生成しない。公開済みジェネレーター管理ページがあってpublishをfalseに戻した場合はそのページを除去する。
- URLはHTTPSまたは既存のサイト内パスを使う。画像は`/assets/`内の既存ファイル。sitemapの`lastmod`は実際のページ内容更新日に合わせる。

トップページの`PRODUCTS:COPY` / `PRODUCTS:CARDS`、sitemapの`PRODUCTS:GENERATED`マーカー内だけがジェネレーターの管理領域。そこへ手編集しない。マーカー外の本文や手書きページは保持する。生成器は既存の手書き製品ページを上書きしない。X・note・itch.io等に公開するリンクは必ず製品の正規URLを使う。

公開前に`contact@joshu-a.com`で受信・返信できること、製品ページと販売ストアのサポート/返金窓口が正しいことを人が確認する。問い合わせの分類・情報の扱い・エスカレーションは[サポート運用](support-operations.md)を参照する。

チェックは**1コマンド**でローカル公開物を検査する。Node.js標準機能だけを使用し、依存パッケージや有料APIは不要。ページ追加時はcanonical、title/description、OG/X、1200×630 PNGの有無・容量、単一h1、JSON-LD構文とSoftwareApplication/VideoGame、Offer、主CTA、実画面、alt、内部リンク、sitemap掲載、noindex、localhost/CloudflareプレビューURL/プレースホルダー、ホームの準備中文言を調べる。404.html、robots.txt、Markdownのnoindexも確認する。`--live`は本番デプロイ後のHTTP 200/404、HTTPS転送、noindexとOG画像の応答を確認する。

自動チェックは価格・対応OS・説明・スクリーンショットが**真実か**、外部ストアの決済/DL/利用が正常か、OGの見た目が良いか、モバイルで読めるか、法務・ライセンス・プライバシー表記が製品に必要かまでは判断できない。ここは人間の公開承認に残す。販売前紹介ページを先に出したい場合は、このテンプレートとrelease gateを流用せず、公開URL・sitemap・noindex・CTA・検証方法を別途決めてから実装する。正式公開を装う架空Offerは作らない。

## 外部媒体 → 製品ページ

配布URLの基本形は `https://joshu-a.com/products/<slug>/`。トップを経由させない。トップはブランド名検索と製品横断の入口として使う。

媒体ごとの投稿価値の判断、原稿テンプレート、承認と再利用は[外部チャネル運用](social-operations.md)で扱う。このページとrelease checkerは、正式公開製品のページ・URL・CTAの公開条件を扱う。

| 入口 | リンク先と運用 |
| --- | --- |
| X | 製品紹介ポストのリンクを該当製品ページへ。プロフィールの総合リンクだけはトップでも可。 |
| note | 製品に言及する記事本文・末尾から該当製品ページへ。文脈に合うCTA文言を付ける。 |
| itch.io | ゲームの説明/開発ログからそのゲームの製品ページへ。サイト側CTAは実際のitch.io商品ページへ返す。相互リンクのループを強要しない。 |
| Google検索 / AI検索 | 製品ページの自己canonical、固有title/description、実内容、構造化データ、sitemap、内部リンクで直接発見可能にする。検索結果のリンクにはUTMを付けない。 |
| 将来の媒体 | その投稿が扱う1製品の正規URLへ。複数製品を紹介する文脈だけトップ/一覧を選ぶ。 |

配布前にリンクをシークレットウィンドウとスマホで開き、「直接製品の説明が見える」「CTAが動く」を確認する。公開後にURLを変える必要が生じたら旧URLから新正規URLへ恒久転送し、外部リンクも順次更新する。

## UTMは最小限

自分で管理できる投稿リンクだけ、`utm_source`（媒体）、`utm_medium`（チャネル種別）、`utm_campaign`（製品単位の施策）を付ける。値は小文字ASCIIとハイフンで統一し、個人情報を入れない。

| 媒体 | source | medium | campaign例 |
| --- | --- | --- | --- |
| Xの公開ポスト | `x` | `social` | `<slug>-launch` |
| note記事 | `note` | `referral` | `<slug>-launch` |
| itch.io説明欄 | `itchio` | `referral` | `<slug>-launch` |
| 別媒体 | 媒体の短い固定名 | `social` または `referral` | `<slug>-launch` |

例：`https://joshu-a.com/products/<slug>/?utm_source=x&utm_medium=social&utm_campaign=<slug>-launch`。大型更新だけ `<slug>-update-YYYYMM` に切り替える。投稿ごとの番号や細分化した `utm_content` は当面使わない。広告を始める場合は別途計測設計する。Google/AI検索からの自然流入、サイト内リンクにはUTMを付けない。**canonical、sitemap、OG URLは常にUTMなし**。解析ツールは今は追加しない。UTMは将来解析を導入したときに区別するための規則であり、付けただけでは計測できない。

## 所要時間の目安

実製品の本文・価格/条件・CTA URL・実画面・OG画像が**すべて揃っている場合**、テンプレートへの入力、ホーム/sitemap更新、ローカルチェックとプレビュー確認で**約30〜60分**を見込む。公開先の審査・デプロイ・検索登録の反映時間は別。素材や販売条件が未確定なら所要時間は見積もれない。
