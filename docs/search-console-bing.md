# 検索エンジン登録の準備と手順

対象は `https://joshu-a.com/`。登録作業・アカウント認証・DNS変更はサイト管理者が管理画面で行う。このリポジトリには検証トークンを仮置きしない。

## サイト側の現状（2026-10-06）

| 項目 | 確認結果 / 運用 |
| --- | --- |
| 正規URL | `https://joshu-a.com/`。トップのcanonical・OG URL・sitemap・robots内のsitemap URLが一致。 |
| HTTPS | 公開環境で `http://joshu-a.com/` → `https://joshu-a.com/` の301を確認。 |
| www | `www.joshu-a.com` は現在名前解決できない。登録・配布には使わない。将来有効化するならHTTPSを設定し、www→非wwwの恒久転送を確認する。 |
| index/noindex | トップは `index,follow`。`404.html` はnoindex。リポジトリのMarkdownは `_headers` によりnoindex。公開製品ページにはnoindexを付けない。 |
| robots / sitemap | どちらも公開環境で200。`robots.txt` はsitemapを記載。`sitemap.xml` は現時点ではトップだけ。製品公開時に実在する正規製品URLを追加する。 |
| 404 | 未知のURLが公開環境で404を返すことを確認。 |
| metadata | トップのtitle、description、canonical、OG、Xカード、WebSite/Brand JSON-LDを確認。製品ごとは公開時に個別設定する。 |
| Cloudflare Pages | `main`をproduction、buildなし、output `.`。ルート直下の検証ファイルと`index.html`の`<head>`が公開される構成。2026-10-06時点で`https://joshu-a-site.pages.dev/`は200・`index,follow`で表示され、canonicalは`https://joshu-a.com/`を指す。転送は未設定。検索エンジンが採用したcanonicalは管理画面で別途確認する。 |

公開環境の検証は2026-10-06時点のHTTP応答。登録前と製品公開後に再確認する。sitemap提出先は **`https://joshu-a.com/sitemap.xml`**。提出するプロパティはGoogleでは `joshu-a.com`（Domain）または `https://joshu-a.com/`（URLプレフィックス）、Bingでは `https://joshu-a.com/`。製品公開後は `https://joshu-a.com/products/<slug>/` をURL検査する。

`pages.dev`の重複配信を解消する場合は、[Cloudflare公式の手順](https://developers.cloudflare.com/pages/how-to/redirect-to-custom-domain/)に沿って管理者がBulk Redirectを設定し、パス・クエリを保持した301を本番ドメインへ向ける。Cloudflare Pagesの`_redirects`はホスト単位の転送を扱えないため、サイト内の一律転送ルールを追加しない。設定前後に`pages.dev`と独自ドメイン双方のトップ・実製品URLを確認する。現状のcanonicalは正規URLの強いヒントだが、検索エンジン側の選択を保証しない。

## Google Search Console：管理者の操作（目安5分、DNS伝播待ちを除く）

1. [Search Console](https://search.google.com/search-console/)でプロパティを追加する。DNSを操作できるなら **ドメイン `joshu-a.com`** を選ぶ。全サブドメイン・HTTP/HTTPSをまとめて扱える。DNSに触れないなら **URLプレフィックス `https://joshu-a.com/`** を選ぶ。
2. 画面に表示された**実際の**所有権確認値で検証する。DomainプロパティはDNS確認が必要。DNS管理画面で指定された名前・TXT値（CNAMEを選んだ場合はその名前・宛先）をそのまま追加し、既存のTXT/MXを置き換えない。反映に時間がかかる場合は待つ。確認後もレコードを残す。
3. URLプレフィックスでHTMLファイル方式を使う場合は、画面から取得したファイルを名前・内容とも変更せず**リポジトリ直下**へ置き、`main`へ通常のレビュー・デプロイを経て `https://joshu-a.com/<指定ファイル名>` が200で読めることを確かめてから「確認」を押す。メタ方式なら画面のタグを `index.html` の **`<head>`内**へ置き、公開HTMLで見えることを確かめる。両方式ともDomainプロパティでは使えない。検証後もファイル/タグを残す。
4. 「サイトマップ」で `https://joshu-a.com/sitemap.xml`（画面が相対パス入力なら `sitemap.xml`）を送信する。トップ `https://joshu-a.com/` をURL検査する。製品公開後は製品の正規URLもURL検査し、必要ならインデックス登録をリクエストする。送信・リクエストは掲載保証ではない。

## Bing Webmaster Tools：管理者の操作（目安5分、DNS伝播待ちを除く）

1. [Bing Webmaster Tools](https://www.bing.com/webmasters/)でサイト `https://joshu-a.com/` を追加する。
2. Google Search ConsoleからのインポートにはGoogleアカウントのOAuth承認が必要なので、この手順では**手動追加**を選ぶ。Bingが提示する実際の確認方式で所有権を検証する。DNSを使う場合は表示されたレコードを既存DNSを壊さず追加する。Cloudflare DNSで検証用CNAMEを置く場合はDNS-onlyにする。XMLファイル方式なら提供された `BingSiteAuth.xml` を**リポジトリ直下**に置いてデプロイし、`https://joshu-a.com/BingSiteAuth.xml` の200を確認する。meta方式なら表示されたタグを `index.html` の`<head>`内へ置く。確認後もトークンを残す。
3. 「Sitemaps / サイトマップ」から `https://joshu-a.com/sitemap.xml` を送信する。製品公開後にそのURLがsitemapへ載り、200で表示できることを確認する。

HTML/XMLファイルやmetaを選ぶと**デプロイ待ちが別途必要**で、5分は管理画面での操作目安に限る。DNS方式も伝播待ちがあり得る。検証ファイルを置く際は、Cloudflare Pagesのプレビューではなく本番ドメインで応答を確かめる。検証値を架空で記入しない。

参考：[Google所有権確認](https://support.google.com/webmasters/answer/9008080)、[Googleプロパティ種別](https://support.google.com/webmasters/answer/34592)、[Googleサイトマップ](https://support.google.com/webmasters/answer/7451001)、[Bingサイト追加・確認](https://www.bing.com/webmasters/help/add-and-verify-site-12184f8b)、[Bingサイトマップ](https://www.bing.com/webmasters/help/sitemaps-3b5cf6ed)、[Cloudflareの検証用CNAME](https://developers.cloudflare.com/dns/manage-dns-records/troubleshooting/cname-domain-verification/)、[Pages本番別名の転送](https://developers.cloudflare.com/pages/how-to/redirect-to-custom-domain/)。
