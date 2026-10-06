# joshu-a-site
Official website for 助手A

静的HTMLの公式サイト。公開製品の情報が揃ってから、詳細ページと購入・ダウンロード・利用先を追加します。

## Cloudflare Pages

- Production branch: `main`
- Framework: `None`
- Build command: 空欄
- Output directory: `.`
- `404.html`で未知のURLを404として扱います。SPA fallbackは使いません。
- `_headers`はリポジトリ内のMarkdown文書だけをnoindexにします。

ホスティングはCloudflare Pagesを継続する。[ChatGPT Sites](https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites)は監視対象とし、独自ドメイン、SEO/OG、カスタムヘッダー、GitHub/コード連携、export/import、公開上限、料金、ホスティング制御、移行性を再評価する。これらがCloudflare Pagesと同等以上と確認できた場合に限り、移行を検討する。

## 公開方針

- [集客・コンテンツ導線戦略](ACQUISITION_STRATEGY.md)
- [X・note・itch.ioの運用とコンテンツ再利用](docs/social-operations.md)
- [2026-10-06の監査・公開前/公開時チェックリスト](SITE_AUDIT.md)
- [Search Console / Bing Webmasterの登録準備と管理者手順](docs/search-console-bing.md)
- [非公開の製品ページHTMLテンプレート](docs/product-page-template.md)
- [製品公開手順と外部媒体からの導線](docs/product-launch.md)
- [製品公開時の法務・プライバシー確認](docs/legal-release-checklist.md)
- [問い合わせ・サポート運用](docs/support-operations.md)
- [製品公開後の計測と改善ループ](docs/measurement-improvement.md)

製品情報は `data/products/<slug>.json` に記入し、`node scripts/build-products.mjs` で製品ページ・トップの製品カード・sitemapを生成します。生成後は `node scripts/check-release.mjs` と `node --test tests/build-products.test.mjs tests/check-release.test.mjs` を実行します。入力仕様は[製品公開手順](docs/product-launch.md)を参照してください。いずれもNode.js標準機能だけを使用し、npm依存はありません。本番反映後のHTTP確認は `node scripts/check-release.mjs --live`。`products/<slug>/` とrelease gateは購入・DL・利用可能な正式公開製品だけを対象にし、販売前紹介ページは対象外です。実情報が揃うまで製品ページを生成しません。

製品は `/products/<slug>/index.html`、実記事は `/journal/<slug>/index.html`。
faviconとロゴ形状は維持します。`assets/brand-mark.png`はfavicon原本の比例縮小版、`assets/og-home.png`は既存ロゴとブランドコピーを配置した共有画像です。生成AIによるロゴ生成は行いません。
