# 製品完成 → 販促 引き渡し仕様

Last updated: 2026-10-07

## 目的

A.I. TERMINAL / dot で製品が販売候補まで到達した時点で、販促窓が即座に販売判断へ移れるよう、必要情報を定型化する。

ユーザーが毎回情報を集め直したり、手入力で整理したりしないことを前提とする。

## 引き渡しトリガー

次を満たした時点で「販売候補」として引き渡す。

- ビルド可能
- 主要機能が実装済み
- 既知の重大不具合なし
- 必要な機械検証が通っている
- ライセンス/外部依存が把握済み
- 配布物または実行可能成果物が存在
- リリースノート相当の変更概要が出せる

販売候補 = 即公開可能、ではない。公開前に販促GO/NO-GOゲートを通す。

## A.I. TERMINAL / dot から渡す項目

### 必須
- product_name
- category: Software / Game / Experiment / Android App
- one_line_value
- target_user
- supported_platforms
- version
- release_candidate_status
- build_artifacts
- verification_summary
- known_issues
- external_dependencies
- licenses
- support_burden_estimate
- update_burden_estimate
- screenshots_or_video
- release_notes
- repository
- release_commit_or_tag

### 可能なら自動算出
- installer / archive / APK / AAB / executable のサイズ
- 対応OS最低バージョン
- required permissions
- network dependency
- account/login dependency
- offline availability
- third_party_runtime_dependency
- crash/error reporting availability
- rollback availability

### 販促窓が後から決める項目
- price
- sales_channels
- store priority
- launch order
- CTA
- marketing copy
- UTM
- revenue scenario
- KPI

## 引き渡しフォーマット

JSONまたはMarkdownでよいが、最低限以下の見出しを固定する。

1. Product
2. User value
3. Platform
4. Build
5. Verification
6. Known issues
7. Dependencies / licenses
8. Support / maintenance
9. Media
10. Release readiness

## 欠損時の扱い

不足情報があっても、販促全体を止めない。

- 価格未定 → 販促窓で候補作成
- スクリーンショット不足 → ホームページ側/Terminalへ素材生成依頼
- ライセンス不明 → GO判定のみ停止
- 対応OS不明 → 製品ページ公開のみ停止
- 販売チャネル未定 → 販促窓で比較
- known issueあり → Severityに応じて公開可否だけ判定

## ユーザーに返す項目

ユーザーへは原則として以下だけ返す。

- 価格最終候補
- 採用販売先
- 有料契約/本人確認の必要性
- 公開してよいか
- 重大な法務/ライセンス/セキュリティ判断

## 成功条件

A.I. TERMINAL / dot が販売候補を出した時点で、販促窓が追加ヒアリングを最小限にして、
- GO/NO-GO
- 価格
- 販売先
- 利益試算
- 公開順
まで進められること。


## A.I. TERMINAL統合候補

この引き渡し仕様は、将来的にA.I. TERMINALへ統合する前提で設計する。

推奨統合:
- 製品がrelease candidateへ到達した時点で、上記必須項目を機械的に収集する
- `sales-handoff.json` または同等の構造化データを生成する
- ライセンス/依存/既知不具合/検証結果/配布物を自動添付する
- `SALES_GO_NO_GO_GATE.md` 相当のルールで自動preflightする
- 結果を `GO / CONDITIONAL GO / NO-GO` と理由に分けて出力する
- GOでも価格・販売先・契約・公開は人間承認を残す
- CONDITIONAL GOでは該当条件だけを局所ブロックし、他の販促準備は継続する
- NO-GOでは公開系だけを停止し、修正タスクへ戻せるようにする

A.I. TERMINAL側の実装設計・状態機械・承認境界への組み込みは、ターミナル設計相談側で決定する。
