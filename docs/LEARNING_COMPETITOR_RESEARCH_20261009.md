# 無料知育コンテンツ10本 — 競合・発見導線調査（一次調査）

Date: 2026-10-09
Status: RESEARCH / 仮説・未計測
Scope: /learning/ 配下の10教材
Method: 公開Web検索・競合サイトの掲載内容確認。検索順位・月間検索数・訪問数・操作率の実測は未取得。モバイル実機の競合UX比較も未実施。

## 結論

「無料、登録不要、操作できるシミュレーション」は単独では差別化しない。GeoGebra、PhET、専門サイトと直接競合する。狙う体験上の仮説は「日本語で具体的な一問に絞る」「スマホ縦持ちで主要操作と結果が同時に見える」「入力条件を即変更できる」「30秒以内に価値が分かる」。この優位性は現時点で未実証。

## 既存10教材と競合エビデンス

| 教材slug | 具体的な検索意図（仮説、検索量未確認） | 確認した既存提供先 | 検証すべき改善方向 |
| --- | --- | --- | --- |
| point-p | 動く点P 面積 グラフ / 角を曲がると式が変わる | GeoGebra「動点問題（1次関数）」 | 区間と面積グラフの同期、角を通過する瞬間の理解 |
| linear-function | 一次関数 傾き 切片 マイナス / a=0 | GeoGebra「1次関数のグラフとy切片の関係」 | ゼロ/負値とガイドを同画面で即理解 |
| speed-distance-time | 速さ 距離 時間 グラフ わからない | コアドリルの図解・アニメーション説明 | 再生シークなしで希望の速さ・時刻を指定 |
| proportion | 比例 反比例 グラフ 動かす | PhET Ratio and Proportion / GeoGebra類 | x=0を含む軸・増減・違いを単一操作で |
| probability | サイコロ 確率 実験 試行回数 | PhET Plinko Probability | 少数/多数試行と理論値の違いを一画面で |
| current-voltage | オームの法則 電流 電圧 抵抗 | PhET「直流回路キット」 | 回路組立でなく基本式の要点に集中 |
| light-reflection | 入射角 反射角 法線 | ツクルラボ「光の反射・屈折・凸レンズ」 | 法線基準と角度の誤解を短く扱う |
| moon-phases | 月の満ち欠け 太陽 地球 月 動かす | シミュラボ/エレファンキューブ/Eurekarium | 地球視点と俯瞰を同時に把握、モデル簡略化の明示 |
| geometry-nets | 立方体 展開図 折る 11種類 | ugoku-sansu.jp / エレファンキューブ | 折り始める前と後を直感的に見比べる。教材量では厳しい競争 |
| japan-and-world-history | 日本史 世界史 同じ頃 年表 | まなれきドットコム281件無料対比年表 / PHP等書籍 | 同じ時代の発見を短い操作で生む。件数や単なる並列表示を強みとしない |

## 確認できた一次Web参照

- GeoGebra 切片: https://www.geogebra.org/m/ngbvkq2v
- GeoGebra 点P: https://www.geogebra.org/m/z7hqdsfs
- PhET シミュレーション一覧: https://phet.colorado.edu/en/simulations/browse
- PhET 直流回路: https://phet.colorado.edu/sims/html/circuit-construction-kit-dc/latest/circuit-construction-kit-dc_all.html?locale=ja
- コアドリル 速さ・時間・距離: https://core-dorill.com/math/analysis/linear-function/linear-function-speed-time/
- ツクルラボ 光: https://tsukuru-lab.com/study/science/optics/guide
- シミュラボ 月: https://shimulabo.com/sims/tsuki-michikake/
- ugoku-sansu 展開図: https://ugoku-sansu.jp/chapter03/
- エレファンキューブ 展開図: https://www.elephancube.co.jp/OpenEducationalResources/interactive/I1_cube-net-simulator.html
- まなれき 同時代比較: https://manareki.com/parallel-timeline
- PHP 日本史世界史並列年表: https://www.php.co.jp/books/detail.php?isbn=978-4-569-83126-8

URLは証拠追跡用。今後ページ内容・提供状況の変化に注意。

## 当面の優先順位（実測需要に基づく順位ではない）

1. 既存ページの title / description / h1 が「分からない疑問＋操作体験」を説明しているか、10件を個別監査する。
2. 各教材に「何を変えると何が見えるか」を明示し、初回操作に迷わないか確認する。
3. 月・光・電流・歴史は図や年代の正確さだけでなく「モデル化の前提・出典」を確認。
4. 既存競合と比べたスマホ実機操作回数・上下スクロールの比較を行う（未測定）。
5. Cloudflare Web Analytics等が使えるまで、検索需要・閲覧実数を作り話で補わない。

## 新規題材候補（順位付け保留）

- 水槽への給水でグラフが途中から変わる理由（状態変化）
- 追いつく・すれ違う問題（2人の距離と時間）
- 天気図で前線を動かしたとき何が変わるか（モデルの妥当性検証が必要）
- 浮力・密度の「沈む/浮く」境界値（PhETとも競合）
- 歴史の出来事が同時か因果関係があるかを区別するクイズ

これらは制作推奨やSEO需要の事実ではなく、ユーザー操作の価値を検証する仮説である。

## 次に必要な追加情報

- Search ConsoleのURL別表示・クリック・検索クエリ
- Web Analytics有効化後の教材別訪問と参照元
- UIスクリーンショットまたはブラウザ実機の競合UX比較
- 制作工数と公開後の修正負担

アクセスデータのない現在、テーマの「需要順位」やコンバージョン効果は確定不可。

この文書は調査記録であり、サイトコード変更や本番公開の承認ではない。
