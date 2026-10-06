# 販促窓 引き継ぎルール

Last updated: 2026-10-06

## 目的

ChatGPTの会話窓が変わっても、助手Aの販売・公開・販促判断を同じ基準で継続できるようにする。

この文書と以下の関連文書を正本として扱う。

## この窓の担当範囲

担当する:
- 販売先比較
- 価格設定
- 手数料・純利益
- 公開条件・審査負担
- 販売チャネル選択
- 販促導線
- KPI
- 公開後の診断
- Pro費用回収と収益目標
- joshu-a.comを母艦とした販売戦略

担当しない:
- A.I. TERMINAL内部の詳細設計
- 実装仕様の設計判断
- 製品機能そのものの要件定義
- ホームページのHTML/CSS実装詳細

上記が深くなった場合は、適切な設計/実装窓へ戻す。

## ユーザーの方針

- 人手を極力減らす。
- 自動化できる定型作業はユーザーに返さない。
- ユーザーは価格、契約、公開、重大方針など重要判断を担当する。
- A.I. TERMINAL / dot が製造を担当し、販促窓は販売準備を並行して進める。
- Pro 100を費用ではなく開発投資として評価し、最初は「Proを使っても余剰が残る状態」、次に月5万円純利益、その先を狙う。
- 製品完成後の販売開始タイムラグを極小化する。
- 製品がない間は、無理に空ページや薄いSEO記事を増やさず、販売インフラと判断ルールを整える。

## 製品完成時の標準動作

ユーザーが「製品できた」と伝えたら、販促窓は原則として以下を自走する。

1. 製品の最低限情報を確認
2. 最新の販売チャネル条件・手数料・審査要件を再確認
3. 価格候補を提示
4. 月3万円 / 月5万円等の必要販売数を試算
5. 採用チャネル / 見送りチャネルを提案
6. 公開順を決める
7. ホームページ側へ渡す情報を整理
8. itch.io / Steam / note / X 等の必要チャネル用準備を整理
9. 公開後KPIと72時間/7日/30日レビューを設定

ユーザーへ返すのは、原則として判断が必要な事項のみ。

例:
- 価格候補の選択
- 有料チャネル利用
- 本人確認・契約
- 公開可否
- 法務/権利判断

## 役割分担

### ユーザー
- 重要判断
- 契約
- 本人確認
- 価格最終承認
- 公開最終承認

### 販促窓
- 販売・価格・利益・チャネル・KPI・改善判断

### ホームページ側
- 製品ページ実装
- metadata / JSON-LD / sitemap
- 表示・アクセシビリティ
- 公開チェック

### A.I. TERMINAL / dot
- 製品製造
- 検証
- ビルド
- リリース候補
- 機械検証証拠

## 新しい会話窓で最初に読む文書

優先順:
1. `docs/SALES_WINDOW_HANDOFF.md`（この文書）
2. `docs/PROMOTION_PROGRESS.md`
3. `docs/COMMERCIALIZATION_PLAYBOOK.md`
4. `docs/SALES_EXECUTION_ROADMAP.md`
5. `docs/PRICING_REVENUE_RULES.md`
6. `docs/CHANNEL_ECONOMICS.md`
7. `docs/POST_LAUNCH_DIAGNOSTICS.md`
8. `ACQUISITION_STRATEGY.md`

ホームページ実装側の詳細が必要な場合のみ:
- `docs/product-page-template.md`
- `docs/product-launch.md`
- `docs/social-operations.md`
- `docs/search-console-bing.md`

## 新しい会話窓での再開方法

新しい窓では、会話履歴を正本にせず、GitHub上の上記文書を確認してから回答する。

最低限、次を再構築する:
- 現在の販売準備状態
- 人間操作待ち
- 製品待ちタスク
- 次に自動で進められる販促作業
- 収益目標
- ユーザーに返すべき判断事項

## 現在の状態（2026-10-06）

- 実製品はまだない。
- 販売インフラ・チャネル判断・価格判断・公開後診断・実行ロードマップは先行整備済み。
- 現在の販促側ボトルネックは「販売可能な実製品がまだないこと」。
- 製品完成前でも、チャネル条件・価格ルール・検索基盤・KPI・競合/市場調査は継続可能。
- ホームページ制作と重複する実装作業は、この窓では避ける。

## 重要原則

> 会話窓が変わっても、販促窓の挙動はGitHub文書から再構築できる状態を維持する。

新しい重要判断や運用変更が発生した場合、この文書または関連する正本文書へ反映し、会話だけに残さない。


## A.I. TERMINAL統合方針

設計相談の結論として、販売・公開工程は既存Development Orchestratorへ直書きせず、Product Lifecycle配下の独立した **Commercialization Pipeline** として統合する方針を採用する。

想定構造:
- Development Pipeline
- Commercialization Pipeline
- Post-Launch Pipeline

販促窓が所有する正本ロジック:
- 価格候補計算
- チャネル適合
- 手数料/損益
- 人手負担
- GO / CONDITIONAL GO / NO-GOの商用判断ルール
- KPI診断ルール

A.I. TERMINAL側が所有するもの:
- lifecycle state
- task dependency
- evidence
- approval
- mutation protection
- progress tracking
- publication readiness
- checkpoint scheduling

P21のExecutionProviderとは衝突しない。P21は実行主体の抽象化、Commercializationは販売工程の内容定義として分離する。

実装候補はP21完了後の独立項目（例: P22 Commercialization Pipeline）として扱う。
