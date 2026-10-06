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

## 公開方針

- [集客・コンテンツ導線戦略](ACQUISITION_STRATEGY.md)
- [X・note・itch.ioの運用とコンテンツ再利用](docs/social-operations.md)
- [2026-10-06の監査・公開前/公開時チェックリスト](SITE_AUDIT.md)
- [Search Console / Bing Webmasterの登録準備と管理者手順](docs/search-console-bing.md)
- [非公開の製品ページHTMLテンプレート](docs/product-page-template.md)
- [製品公開手順と外部媒体からの導線](docs/product-launch.md)
- [製品公開時の法務・プライバシー確認](docs/legal-release-checklist.md)

正式公開製品のrelease gateは `node scripts/check-release.mjs`、チェッカーのテストは `node --test tests/check-release.test.mjs`。本番反映後のHTTP確認は `node scripts/check-release.mjs --live`。Node.js標準機能だけを使用します。`products/<slug>/` は購入・DL・利用が可能な製品だけを対象とし、販売前紹介ページはこのテンプレートとチェッカーの対象外です。実情報が揃うまで製品ページを公開しません。

製品は `/products/<slug>/index.html`、実記事は `/journal/<slug>/index.html`。
faviconとロゴ形状は維持します。`assets/brand-mark.png`はfavicon原本の比例縮小版、`assets/og-home.png`は既存ロゴとブランドコピーを配置した共有画像です。生成AIによるロゴ生成は行いません。
