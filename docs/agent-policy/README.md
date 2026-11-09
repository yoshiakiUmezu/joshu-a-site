# 助手A 共通 AGENTS.md 運用

## 正本と適用先

- 正本: [COMMON_RULES.md](COMMON_RULES.md) 内の `JOSHU_A_COMMON_AGENT_RULES` ブロック。
- 適用先: `yoshiakiUmezu` が所有する各リポジトリのルート `AGENTS.md`。
- 共通ブロック以外のリポジトリ固有ルールは変更しない。ローカル指示、品質ゲート、承認・公開条件を上書きしない。
- GitHubの自動化はAGENTS.md自体の機能ではない。定期同期タスクが欠落・差分を検出し、レビュー用のPRを作る。自動マージしない。

## 新しいリポジトリを初回コミットから共通ルール付きで作る

GitHubの通常の `New repository` には全リポジトリに `AGENTS.md` を自動挿入する設定がない。作成時に初期化するには**専用テンプレート**を使用する。

### テンプレートの初回準備（1回だけ）

1. この正本のPRをレビューし、`joshu-a-site/main` にマージする（このリポジトリの公開連携・承認条件を確認する）。
2. WindowsにGitと[GitHub CLI](https://cli.github.com/)を用意し、`gh auth login` で所有者アカウントへログインする。
3. このリポジトリを取得し、PowerShellで `powershell -ExecutionPolicy Bypass -File docs/agent-policy/setup-template.ps1` を実行する。
4. スクリプトが `yoshiakiUmezu/joshu-a-repo-template` を **Private** で作成し、正本の共通ルールだけが入った初回コミットをpushした後、Template repositoryとして設定・検証する。既存リポジトリは上書きしない。

このチャットのGitHub連携にはリポジトリ作成/テンプレート設定の書き込み機能がないため、上記の1回限りの操作はユーザー側で必要。

### 以後の新規作成

- Web UI: `https://github.com/yoshiakiUmezu/joshu-a-repo-template/generate` から作成する（テンプレート初回準備が完了した場合のみ）。
- GitHub CLI: `gh repo create yoshiakiUmezu/NEW_NAME --private --template yoshiakiUmezu/joshu-a-repo-template --clone`
- Codex等のエージェントは、新規リポジトリを作成する際にテンプレート経由で作成する。使えないときは初回コミットに同等の `AGENTS.md` を同梱してからpushする。

この方法なら初回コミット時点から `AGENTS.md` が存在する。ただし通常の「New repository」や他サービスによるリポジトリ作成には自動強制されない。専用テンプレートを選ばず作成した場合は、既存の定期同期が後からPRを提案するが、マージまでは適用されない。

## 変更時

1. 共通ルールはこの正本で修正する。
2. 定期同期が各リポジトリの差分を確認し、欠落・古いブロックだけをPRで提案する。
3. 既存の個別 `AGENTS.md` の本文は保存し、PRを確認してマージする。無断のマージ・製品デプロイは禁止。

長時間作業の30分ごとの報告・再実行等は、実行するエージェント側の運用指示・スケジューラで扱う。AGENTS.mdの配置だけで定期実行は保証されない。
