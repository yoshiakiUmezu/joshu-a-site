# 最初の製品公開：入口と公開ゲート

購入・DL・利用が可能になった正式公開時に[製品ページのHTMLテンプレート](product-page-template.md)を実製品の事実で埋める。外部から直接来た人が「何の商品か・誰向けか・何ができるか・価格・対応環境・次の操作」をページ上部だけで判断できる状態にする。`products/<slug>/` と `node scripts/check-release.mjs` は正式公開製品のrelease gateであり、販売前紹介ページ用ではない。

## 公開までの最短手順

1. 実製品の名称、slug、一言価値、対象者、主機能、公開状況、価格と課金条件、OS/利用条件、購入/DL/利用URL、実画面・OG画像を確定する。CTA先を人間が実際に開いて完了まで試す。
2. テンプレートを `products/<slug>/index.html` にコピーして全`{{...}}`を置換。実体のない動画・FAQ・更新情報・関連記事は節ごと削除。ソフトウェア/ゲームのJSON-LD種別と実際のOfferを合わせる。OG画像は `assets/<slug>-og.png` に1200×630 PNGで置く。ロゴ形状とfaviconには触れない。
3. トップのPRODUCTSを準備中表示から実製品カードへ更新し、そのカードを `/products/<slug>/` にリンクする。`sitemap.xml`へ `https://joshu-a.com/products/<slug>/` を1件追加し、内容の実更新日を`lastmod`へ入れる。
4. リポジトリ直下で `node scripts/check-release.mjs`、`node --test tests/check-release.test.mjs` を実行。プレビューでスマホ幅、文字/CTA/画像、キーボード操作、OG、実際の外部CTA先を人間が確認する。Cloudflare Pages本番反映後に `node scripts/check-release.mjs --live` を実行する。GitHub PRレビューを経て`main`へ反映するのはサイト管理者の判断。
5. Search Console/Bingにsitemapを提出済みなら、製品の正規URLを検査する。X・note・itch.io等に公開するリンクは必ず製品の正規URLを使う。

チェックは**1コマンド**でローカル公開物を検査する。Node.js標準機能だけを使用し、依存パッケージや有料APIは不要。ページ追加時はcanonical、title/description、OG/X、1200×630 PNGの有無・容量、単一h1、JSON-LD構文とSoftwareApplication/VideoGame、Offer、主CTA、実画面、alt、内部リンク、sitemap掲載、noindex、localhost/CloudflareプレビューURL/プレースホルダー、ホームの準備中文言を調べる。404.html、robots.txt、Markdownのnoindexも確認する。`--live`は本番デプロイ後のHTTP 200/404、HTTPS転送、noindexとOG画像の応答を確認する。

自動チェックは価格・対応OS・説明・スクリーンショットが**真実か**、外部ストアの決済/DL/利用が正常か、OGの見た目が良いか、モバイルで読めるか、法務・ライセンス・プライバシー表記が製品に必要かまでは判断できない。ここは人間の公開承認に残す。販売前紹介ページを先に出したい場合は、このテンプレートとrelease gateを流用せず、公開URL・sitemap・noindex・CTA・検証方法を別途決めてから実装する。正式公開を装う架空Offerは作らない。

## 外部媒体 → 製品ページ

配布URLの基本形は `https://joshu-a.com/products/<slug>/`。トップを経由させない。トップはブランド名検索と製品横断の入口として使う。

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
