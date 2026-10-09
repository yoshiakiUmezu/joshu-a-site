# 製品公開後の計測と改善ループ

## 2026-10-09 現状調査と導入判断

公開済みの無料知育コンテンツ10本について、ページ単位の流入・閲覧を把握する必要が生じたため、Cloudflare Web Analyticsを第一候補として再評価した。

### 現在の計測状態

- **Cloudflare Web Analytics:** Cloudflareダッシュボードへはこの作業環境から接続できないため、Pagesプロジェクト側で現在有効かどうかは**未確認**。リポジトリ検索ではCloudflare Web Analytics / Google Analytics等の解析スニペット、Cookie、localStorage/sessionStorageを使う解析コードは見つからなかった。ただしPagesのWeb Analyticsはダッシュボード設定で自動注入できるため、ソースにスニペットがないことだけでCloudflare側も無効とは断定しない。
- **Cloudflare Pagesとの関係:** Pagesでは `Workers & Pages > 対象プロジェクト > Metrics > Web Analytics` から有効化でき、次回デプロイ時にCloudflareがJavaScript beaconを自動挿入する。したがって初期導入ではHTMLへ手動スニペットを追加しない方針とする。
- **既存HTML / headers:** main上のHTMLに解析コードは見つからない。`_headers` はMarkdownへの `X-Robots-Tag: noindex` のみで、CSPは設定されていない。現状はWeb Analytics beaconを妨げるCSP設定は確認できない。
- **Google Search Console:** `docs/PROGRESS_TRACKER.md` のユーザー確認記録ではDomain property登録、所有権確認、sitemap送信、トップのインデックス/canonical確認までDONE。
- **Bing Webmaster Tools:** 同じ正本ではサイト追加、所有権確認、sitemap送信、トップのIndexed successfully確認までDONE。
- **その他の追跡:** 現在のリポジトリには広告SDK、GA、追跡Cookie、フォーム、アカウント、決済、独自イベント解析は確認できない。問い合わせメールは別途個人情報を含み得るため、サイト全体を「個人情報を一切扱わない」とは表現しない。

### 採用判断

**推奨: Cloudflare Web AnalyticsをPagesのダッシュボード設定から有効化する。**

理由:
- Cloudflare公式ではWeb Analyticsは全プランで利用可能かつ無料。
- Pagesはダッシュボードから一回の設定で有効化でき、サイトHTMLへ手動スニペットを恒久追加する必要がない。
- CookieやlocalStorageを使わず、Cloudflareは個人データを収集・利用しないプライバシー重視の方式として説明している。
- 今必要な「どの教材ページが見られたか」「どこから来たか」「モバイル/PC比率」「日別傾向」を、独自分析基盤なしで把握できる。

追加費用、Workers、DB、独自サーバー、Google Analyticsは初期導入に不要。

### 導入後に確認できる指標

Cloudflare Web Analyticsで確認対象とする:

- Visits
- Page views
- Path（トップ、`/learning/`、各教材URL）
- Referer host
- Device type（desktop / mobile / tablet）
- Browser / OS
- Country
- 日時範囲別の推移
- Page load time / Core Web Vitals

まず `/learning/` と各教材10本をPathで比較し、「検索や外部参照から見つかっている教材」「一覧を経由して見られている教材」の傾向を集計値で確認する。

### 今回取得しないもの

Cloudflare Web Analyticsは現行仕様では以下を提供しないため、今回の対象外とする:

- UTMパラメータ別集計（クエリ文字列を記録しない）
- スライダー操作
- 再生 / リセット等のボタンクリック
- 教材カードやCTAのクリックイベント
- 個人単位の行動履歴
- 同一ユーザーを媒体横断で結合したファネル

カスタムイベントは現行Web Analyticsで未対応。これを補うWorkers等の独自イベント基盤は、ページ閲覧データを見て必要性が実証されるまで作らない。

### プライバシー / セキュリティ

Cloudflare公式ではWeb AnalyticsはCookieやlocalStorage等のクライアント状態を使用せず、個人のフィンガープリントも行わない。beaconは `https://static.cloudflareinsights.com/beacon.min.js` から読み込まれ、Cloudflare proxied siteでは `/cdn-cgi/rum` へ計測データを送信する。

現状の `_headers` にCSPはないため、導入時のCSP変更は不要。将来CSPを導入する場合はCloudflare beaconを許可する設定を同時に設計する。

ただし第三者への情報送信を伴う機能であるため、Cookieを使わないことだけを理由に法務確認を省略しない。`legal-release-checklist.md` の「Analytics / Cookie」および外部送信規律の確認対象として扱う。現段階では広告・個人ID・独自テレメトリーを追加しない。

### 本番設定の承認ゲート

本番変更は未実施。助手Aの承認後に次を人がCloudflareダッシュボードで行う:

1. Workers & Pages
2. `joshu-a-site` プロジェクト
3. Metrics
4. Web Analytics の **Enable**
5. 次回Production deployment後、Web Analytics画面にデータが入り始めることを確認
6. 本番HTMLでCloudflare beaconが注入されていることを確認
7. 24時間〜数日後にトップ / learning一覧 / 各教材のPath・Referer・Device typeが表示されることを確認

有効化済みだった場合は重複設定を行わず、既存Analytics siteとデータ表示を確認するだけにする。

2026-10-07時点で実製品は未公開。この文書は、公開後に確認する指標と手順を決めるもので、実測値や解析アカウントの状態を示すものではない。目的は個人単位の追跡ではなく、集計値で「発見 → 製品ページ → CTA → 配布/販売先 → DL・購入・利用」のどこを次に調べるべきか見つけること。

## 推奨する最小構成

製品公開前は計測コード・Cookie・Cloudflare設定を追加しない。公開後もまず各媒体が標準で提供する集計値と、Search Console / Bing Webmaster Toolsを使う。サイト訪問の集計が必要になった段階で、Cloudflare PagesのWeb Analyticsを有効にするか人が判断する。これは任意設定で、今回有効化していない。

Cloudflare Web Analyticsは無料で、Cloudflareの説明では訪問者の個人データを収集しないプライバシー重視のアクセス解析である。PagesではプロジェクトのMetricsから有効化できる。ただしURLのクエリ文字列を記録せず、UTMをレポートできない。現時点でカスタムイベントにも対応しないため、**Web AnalyticsだけではCTAクリック数を測れない**。クエリを保存しないことはUTMが不要という意味ではなく、リンク規則の一貫性や対応ストアの集計用に残す。

したがって導入時も、Cloudflareのページ訪問/参照元ドメイン、媒体内のリンククリック、ストア内の訪問・DL・購入などを別々の集計値として並べる。異なるサービス間で同一人物やセッションを結びつけず、CTAクリック・購入等を訪問数から推定しない。実製品公開後、CTA率が改善判断に必要なのに観測できないことが確認された場合のみ、匿名集計イベントを受けるWorkers等を別途設計する。そこではIP・Cookie・広告識別子・個人単位ID・生のUTM値を保存しない設計、費用/保持期間、プライバシー文書と法務確認が必要になる。今は作らない。

## 現在/公開後に取得できる指標

「取得できる」は該当サービスの管理画面や公開後の機能で集計を確認できる意味。アカウント権限があることや、助手Aの実データが現在存在することを意味しない。

| 情報源 | 区分 | 観測できる値 | 分からないこと・注意 |
| --- | --- | --- | --- |
| X | 外部媒体側だけ | 投稿ごとの表示、反応、リンククリック。動画では再生関連指標 | リンククリックは製品ページ到達や購入ではない。集計の定義・期間に従う |
| note | 外部媒体側だけ | 記事の表示/閲覧、流入元の集計。機能・表示場所は利用時に確認 | 記事から製品ページへのクリックや、その後の行動はサイト/ストア側の別計測 |
| itch.io | 外部媒体/ストア側だけ | 実プロジェクト公開後のページ閲覧、DL、購入等のダッシュボード集計 | 公式製品ページのCTAクリックや、複数媒体をまたいだ同一利用者の行動ではない |
| Cloudflare Web Analytics | 自サイト側 | 有効化後のページビュー、訪問、URLパス、参照元ホスト、端末等。サイト性能指標 | UTM/クエリ値、CTAイベント、DL/購入/利用を測らない。今回未有効 |
| Google Search Console | 外部検索側 | 検索クエリ/ページ等の表示回数、クリック、CTR、平均掲載順位 | ページ訪問後のCTAや購入を測らない。登録状態は今回確認していない。既存のSTAYを維持 |
| Bing Webmaster Tools | 外部検索側 | Bing検索パフォーマンス、URL/サイトマップ等の管理レポート | CTAや購入を測らない。登録状態は今回確認していない。既存のSTAYを維持 |
| GitHub | 外部媒体側 | 製品リポジトリがある場合、過去14日間のリポジトリ閲覧/clone、参照元、人気コンテンツ | joshu-a.com上の閲覧・CTAや、clone後の利用ではない。製品に公開リポジトリがある場合のみ |
| Google検索/AI検索 | 外部発見経路 | Search Console等に現れる検索実績、またはサイト側で取得可能な参照元ホスト | AI回答での露出/引用全体、個々の回答表示、サイトに来る前の行動は一貫して取得できない。AI検索流入も通常の検索/参照元に現れない場合がある |
| 将来のSteam | ストア側 | Steamworksのトラフィックレポート、UTM対応リンク経由の集計訪問/一部コンバージョン | 対象・定義・閾値は製品種別やレポートによる。リリース時に公式仕様を再確認 |
| 将来のGoogle Play | ストア側 | Play Consoleでストア訪問者/流入元/UTM等と、インストール等の取得可能な集計 | サイトCTAや同一利用者の全経路ではない。現行レポート仕様をリリース時に確認 |
| joshu-a.com（未計測状態） | 現時点では取得不可 | サーバー/解析設定を導入しない限り、サイト内の訪問・CTAの独自集計はない | UTMを付けただけでは計測されない。今回もサイト実測値は取得していない |

媒体指標の定義や保持期間は異なる。数値を合算して「総ユーザー数」と呼んだり、違う定義のクリックをそのまま比較したりしない。

## CTA計測方式の比較

| 方式 | 取得できること | 実装/維持 | プライバシー・費用 | 判断 |
| --- | --- | --- | --- | --- |
| A. Cloudflare Web Analytics | ページ訪問、参照元ホスト、パス、性能指標 | Pages設定で有効化。独自イベント実装なし | 現行の公式説明では無料。Cookie/訪問者個人データなしとされるが、サイトのプライバシー説明との整合確認は必要。UTM/CTA計測なし | 公開後に訪問状況が必要なら候補。CTA率は得られない |
| B. Workers等の匿名イベント計測 | 明示実装すればCTAクリック等 | Worker/イベント保管/レポートの開発・運用が必要 | Analytics Engineの公開料金ページは現行無料枠を案内する一方、料金開始時期等の変更可能性がある。ログ保持、濫用対策、個人データを避ける設計、法務確認も必要 | 現状は費用対効果が低い。将来、判断に必要なCTA観測が欠けるとき再評価 |
| C. ストア側統計のみ | ストア内訪問、DL/購入等の完了側集計 | 外部ストアの通常機能。サイト変更なし | 媒体の仕様・アカウント条件による | 公開当初の完了側の確認には使うが、ページ到達やCTAは分からない |
| D. 当面計測しない | 計測値なし。動作確認と受信問い合わせなどの質的情報 | 追加作業なし | 追跡/保守負担なし | **公開前の推奨**。公開後、判断課題が出たらAを検討し、必要性が実証されてからBを再評価 |

Cloudflare Web Analyticsの仕様: [概要](https://developers.cloudflare.com/web-analytics/about/)、[指標](https://developers.cloudflare.com/web-analytics/data-metrics/high-level-metrics/)、[ディメンション](https://developers.cloudflare.com/web-analytics/data-metrics/dimensions/)、[Pagesでの有効化](https://developers.cloudflare.com/pages/how-to/web-analytics/)、[FAQ（UTM・カスタムイベント・クエリ文字列）](https://developers.cloudflare.com/web-analytics/faq/)。Analytics Engineの無料枠・料金条件は変わりうるため、採用を再検討する時点で[現行料金](https://developers.cloudflare.com/analytics/analytics-engine/pricing/)と[制限](https://developers.cloudflare.com/analytics/analytics-engine/limits/)を読み直す。

## UTM運用

[製品公開手順](product-launch.md)と[外部チャネル運用](social-operations.md)の規則を使う。UTMはリンクのラベルであり、計測サービスが値を読まなければレポートにはならない。

| 媒体 | `utm_source` | `utm_medium` |
| --- | --- | --- |
| X | `x` | `social` |
| note | `note` | `referral` |
| itch.io | `itchio` | `referral` |
| GitHub | `github` | `referral` |
| その他 | 短い固定小文字名 | `social` または `referral` |

キャンペーンは公開時 `<slug>-launch`、大型更新時だけ `<slug>-update-YYYYMM`。小型更新で分けず、`utm_content`等を追加しない。UTMは該当製品ページへ向かう外部リンクだけに付ける。canonical、sitemap、内部リンク、Google自然検索、AI検索用URL、OG URLには付けない。検索流入はSearch Console/Bingや訪問元ホストで確認できる範囲に限る。販売/DLがitch.io内で完結するなら無理に公式サイト経由にせず、ストアの集計を使う。

## ファネルと観測限界

| 段階 | 主な観測元 | 観測できない/注意すること |
| --- | --- | --- |
| Exposure（露出） | X/note/itch.io投稿、Search Console/Bingの表示回数、ストア内表示等 | 露出指標の定義が媒体ごとに異なる。AI回答で見られた全回数は通常分からない |
| Product Page Visit | 有効化したCloudflare Web Analytics、Search Console/Bingのクリック | Web AnalyticsのUTM別訪問は不可。検索クリックと実ページ描画は同じ指標ではない |
| Primary CTA | 今は通常の静的リンクに対する独自集計なし。外部投稿側リンククリックは参考値 | Xのリンククリック等をCTAクリックとみなさない。Cloudflare Web Analyticsはカスタムイベント非対応 |
| Store / Download page | ストアの集計、利用可能ならSteam/PlayのUTMレポート | サイト→ストアの遷移数を必ず取れるとは限らない。ストア表示・訪問定義を確認 |
| Download / Purchase / Use | itch.io/Steam/Play等のストア・配布・アプリ側集計、必要に応じサポート情報 | 決済やDL完了後の起動/継続利用は、製品自体が安全に集計機能を持たない限り分からない。外部集計をユーザー単位で結合しない |
| Support / retention signal | 問い合わせ件数と分類、ストアや製品が提供する任意の集計 | 問い合わせ件数は満足度や全利用者数ではない。個人情報を解析用台帳へコピーしない |

## 数値から次に調べる順番

数値だけで原因を断定しない。指標の定義・期間・反映遅延・小さい母数を確認し、その後に次の順で調べる。

| 観測 | 確認順 |
| --- | --- |
| 流入/表示が少ない | 公開URL/robots/canonical/sitemap/HTTPが正常か → 対象者がいる発見チャネルに実際に告知したか → 検索クエリや投稿内容が実製品の課題と合うか |
| 流入はあるが主CTAの行動が弱そう | CTA数が直接観測できるか先に確認。計れないなら低率と断定しない。製品ページの冒頭、一言価値、対象ユーザー、価格/条件、対応環境、CTA文言・位置・動作を人が確認 |
| CTAまたはストア到達はあるがDL/購入が弱そう | 遷移計測の有無と期間差を確認 → ストア表示、価格/購入条件、対応OS、配布ファイル、説明と画像、ストア審査/障害を確認 |
| 問い合わせが多い/同じ質問が続く | [サポート運用](support-operations.md)で分類し、製品説明・FAQ・初回導線・既知不具合のどこで期待がずれたか確認 |
| 検索表示はあるがクリックが弱い | Search Console/Bingのクエリと製品内容の一致 → title/descriptionの正確さと検索結果上の説明を確認。掲載順位だけで変更しない |
| ダウンロード後の利用が不明 | 起動/利用を計測できる機能が本当に必要か製品ごとに判断。不要なテレメトリーを足さず、サポートや任意フィードバック等の既存シグナルで補う |

一度に複数要素を変更せず、仮説・変更内容・日付・比較期間を記録する。データが少ない、遅れている、定義が不明な場合は結論を保留する。

## 確認周期

- 公開当日: 正規URL/HTTPS/CTA/実ストアを人が開いて確認。利用可能な各管理画面の初期状態と測定期間を記録する。初日の数字を成果判定に使わない。
- 3日後: HTTP、検索登録/エラー、参照元、ストア配布状態、重大な問い合わせを確認。母数が少なければ修正を急がない。
- 7日後: 7日間の各媒体別集計を並べ、観測できる最も弱い遷移を選んで仮説を1つ記録する。指標定義と報告遅延を考慮する。
- 30日後: 検索クエリ・ページ実績、媒体/ストア集計、問い合わせ傾向を見直し、ページや説明の変更が必要か決める。Search Consoleの日次監視はしない。
- 大型更新後: 更新日と利用可能な前後の同じ長さの期間を記録する。更新内容や外部告知の影響を混同しないよう注記する。

公開頻度やサービスの更新遅延に応じて間隔を延ばす。毎日確認する運用や最低投稿数は設けない。

## 最小の指標レコード

スプレッドシート/CSV等で十分。新しいCMSは作らない。1行を「製品 × 期間 × 情報源」とし、ユーザー単位IDは持たない。

| 項目 | 内容 |
| --- | --- |
| `PRODUCT`, `PERIOD_START`, `PERIOD_END`, `SOURCE` | 製品slug、対象期間、媒体/計測元 |
| `EXPOSURES`, `PAGE_VISITS`, `CTA_CLICKS`, `STORE_VISITS`, `DOWNLOADS`, `PURCHASES`, `USES`, `SUPPORT_COUNT` | その情報源で定義できる数値のみ。取得不能項目は空欄のままにする |
| `DATA_SOURCE`, `MEASURED_AT` | 画面/API等の取得元と取得日 |
| `NOTES` | 定義差、報告遅延、告知/更新、障害、母数の注意 |

値は実数値、`unknown`（確認していない/値が確定しない）、`unavailable`（その情報源が提供しない）のいずれか。確認済みの0件だけを`0`とする。欠損を0に置き換えない。異なる情報源の指標を同じ列に入れる場合も`SOURCE`と定義を保つ。

## 自動化と人の判断

将来、公式に提供されるレポート/APIからの週次/月次取得、同一定義での前期間比較、異常候補、低CTA候補（CTA計測が導入された場合のみ）、Search Consoleクエリ整理、問い合わせからのFAQ候補、レポート草稿は自動化候補。データが`unavailable`/少数なら自動で改善を提案しない。

人が原因を確定し、価格・訴求・製品仕様・公開声明・広告投資・追跡方式を決める。AIは推測と実測を分けて根拠を示す。価格や法務/プライバシー判断、外部への送信や公開は自動確定しない。

## 関連文書と公式仕様

- 投稿・deep-link・UTM規則: [外部チャネル運用](social-operations.md)
- 公開URL・canonical・sitemap・正式release gate: [製品公開手順](product-launch.md)
- 問い合わせ分類とFAQ候補: [サポート運用](support-operations.md)
- 解析/データ取扱いの法務確認: [法務・プライバシーチェック](legal-release-checklist.md)
- Search Console: [検索パフォーマンスレポート](https://support.google.com/webmasters/answer/7576553?hl=ja)、[Search Consoleの概要](https://developers.google.com/search/docs/monitor-debug/search-console-start?hl=ja)
- Bing Webmaster: [公式ツールの説明](https://www2.bing.com/webmasters/help/refreshed-webmaster-tools-7c7d2533)
- X: [投稿アクティビティダッシュボード](https://business.x.com/help/tweet-activity-dashboard)、[指標差異について](https://help.x.com/en/business-and-advertising/common-analytics-discrepancies)
- note: [アクセス状況](https://www.help-note.com/hc/ja/articles/360010324194-%E3%83%80%E3%83%83%E3%82%B7%E3%83%A5%E3%83%9C%E3%83%BC%E3%83%89%E3%81%AE-%E3%82%A2%E3%82%AF%E3%82%BB%E3%82%B9%E7%8A%B6%E6%B3%81-%E3%81%AB%E3%81%A4%E3%81%84%E3%81%A6)、[流入元](https://www.help-note.com/hc/ja/articles/61983634535449-%E3%83%80%E3%83%83%E3%82%B7%E3%83%A5%E3%83%9C%E3%83%BC%E3%83%89%E3%81%A7%E8%A8%98%E4%BA%8B%E3%81%AE%E6%B5%81%E5%85%A5%E5%85%83%E3%82%92%E3%81%BF%E3%82%8B)
- itch.io: [Creator FAQ](https://itch.io/docs/creators/faq)、[Analyticsの説明](https://itch.io/docs/general/about)
- GitHub: [リポジトリトラフィック](https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-traffic-to-a-repository?apiVersion=2022-11-28)
- Steam: [トラフィックレポート](https://partner.steamgames.com/doc/marketing/traffic_reporting?l=english)、[UTM分析](https://partner.steamgames.com/doc/marketing/utm_analytics?language=english)
- Google Play: [ストア掲載情報の取得とパフォーマンス分析](https://support.google.com/googleplay/android-developer/answer/9859173)

## 初回リリース後7日間

| 時点 | 見るもの | 条件と次の対応 |
| --- | --- | --- |
| 当日 | 製品ページとCTAの実動作、ストア公開状態。利用可能なら各媒体の露出/リンククリックを記録 | リンク不通・誤情報・配布不可なら公開導線を修正。数字の大小はまだ評価しない |
| 3日後 | 自サイトのページ到達（有効化済みなら）、参照元ホスト、Search Console/Bingの処理状況、ストア訪問/DL/購入、重大問い合わせ | 取得不能は`unavailable`、まだ未確認は`unknown`。流入が少なくても告知実施・正規URL・検索遮断の有無を先に確認 |
| 7日後 | 期間を揃えた媒体別露出/クリック、製品ページ到達、ストア側訪問/DL/購入、問い合わせ分類 | 到達が弱ければ発見経路とリンク、検索表示があるのにクリックが弱ければtitle/description、ストア到達後の完了が弱ければストア説明・価格・環境を順に人が確認。CTAクリックが直接測れないときはCTA率を作らない。根拠が薄ければ変更せず、次の期間まで観測 |

1回の見直しで変えるのは、根拠のある小さな1点まで。変更日と仮説を記録し、次の同程度の期間で再確認する。
