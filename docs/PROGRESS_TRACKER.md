# 助手A サイト進捗管理

この文書は、PC操作待ち・外部サービス待ち・後続確認が必要な項目を継続管理する正本。
個別のCodex指示文に依存せず、状態変更時に更新する。

## STAY / PC操作待ち

現在なし。

## WATCH

| 項目 | 状態 | 再開条件 | 次の操作 |
| --- | --- | --- | --- |
| GPT Sites再評価 | WATCH | OpenAI側に意味のある仕様変更が出たら | 独自ドメイン、SEO/OG、カスタムヘッダー、GitHub/コード連携、export/import、上限、料金、制御、移行性をCloudflare Pagesと比較 |
| 知育コンテンツ Android実機フォロー | WATCH | 「速さ・距離・時間」公開後 | Android実機＋OS文字拡大で表示・操作を確認し、問題があれば修正 |

## DONE

| 項目 | 完了内容 |
| --- | --- |
| Google Search Console | ユーザー確認: joshu-a.com Domain property登録・所有権確認・sitemap.xml送信済み。URL検査でトップはインデックス済み、Googlebot取得成功、canonical正常。 |
| Bing Webmaster Tools | ユーザー確認: joshu-a.com追加・所有権確認・sitemap.xml送信済み。URL InspectionでトップはIndexed successfully。 |
| pages.dev → joshu-a.com 301転送 | ユーザー確認: Cloudflare Bulk Redirectを設定し、https://joshu-a-site.pages.dev/ から https://joshu-a.com/ への301転送が動作。 |

## 運用ルール

- STAY項目は完了条件を満たすまで削除しない。
- 別作業の指示文に埋め込むだけで管理しない。
- 状態変更時はこの文書を更新する。
- 完了した項目は必要に応じて「DONE」へ移し、再確認条件がある場合は残す。
