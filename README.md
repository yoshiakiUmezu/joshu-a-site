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

製品は `/products/<slug>/index.html`、実記事は `/journal/<slug>/index.html`。
faviconとロゴ形状は維持します。`assets/brand-mark.png`はfavicon原本の比例縮小版、`assets/og-home.png`は既存ロゴとブランドコピーを配置した共有画像です。生成AIによるロゴ生成は行いません。
