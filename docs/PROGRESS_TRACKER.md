# 助手A サイト進捗管理

この文書は、PC操作待ち・外部サービス待ち・後続確認が必要な項目を継続管理する正本。
個別のCodex指示文に依存せず、状態変更時に更新する。

## STAY / PC操作待ち

| 項目 | 状態 | 再開条件 | 次の操作 |
| --- | --- | --- | --- |
| Google Search Console | STAY | PC操作可能になったら | joshu-a.com のDomain property追加 → Cloudflare DNSへ実TXT追加 → 所有権確認 → sitemap.xml送信 → URL検査 |
| Bing Webmaster Tools | STAY | PC操作可能になったら | サインイン → joshu-a.com追加 → 所有権確認 → sitemap.xml送信 → URL検査 |
| pages.dev → joshu-a.com 301転送 | STAY | PC操作可能かつSEO登録確認後 | Cloudflare Pages/Redirect設定を確認し、必要なら恒久転送を設定 |
| GPT Sites再評価 | WATCH | OpenAI側に意味のある仕様変更が出たら | 独自ドメイン、SEO/OG、カスタムヘッダー、GitHub/コード連携、export/import、上限、料金、制御、移行性をCloudflare Pagesと比較 |

## 運用ルール

- STAY項目は完了条件を満たすまで削除しない。
- 別作業の指示文に埋め込むだけで管理しない。
- 状態変更時はこの文書を更新する。
- 完了した項目は必要に応じて「DONE」へ移し、再確認条件がある場合は残す。
