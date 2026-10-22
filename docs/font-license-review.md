# 日本語フォント比較：ライセンス事前確認

確認日：2026-10-20。フォント本体取得前に、下記の配布物に付属するOFL全文とMETADATAを読み、導入可否を判定した。これは確認した特定配布物に対する技術的な遵守記録で、法律意見や他の配布版への包括的許諾判断ではない。

## 一次情報と取得版

公式配布リポジトリは[google/fonts](https://github.com/google/fonts)。取得は固定commit `47d54ca1ebb14fd864695f1d39dc734f39017c33` の `ofl/<id>/` からのみ行う。Google Fonts掲載という事実ではなく、**そのディレクトリのOFL.txt全文・著作権ヘッダー・METADATA.pb**を根拠とする。ファイルは無改変・無サブセットのTTF。可変フォントはウェイトごとの複製を作らず1ファイルを使う。

| 正式名称／id | 制作者・著作権表示 | 公式配布物（OFL・METADATA・対象TTFを含む）／公式上流 | 取得予定ファイル・必要ウェイト | RFN（同梱OFL）／判定 |
| --- | --- | --- | --- | --- |
| LINE Seed JP / lineseedjp | LY Corporation。designer: LY Corporation, RixFont, Fontworks | [固定配布物](https://github.com/google/fonts/tree/47d54ca1ebb14fd864695f1d39dc734f39017c33/ofl/lineseedjp)・[公式サイト](https://seed.line.me/index_jp.html)・[公式上流](https://github.com/line/seed) | LINESeedJP-Regular.ttf (400), LINESeedJP-Bold.ttf (700) | RFN指定なし／導入可 |
| Zen Kaku Gothic New / zenkakugothicnew | Yoshimichi Ohira。Copyright 2022 The Zen Kaku Gothic Project Authors。METADATAにはThe Zen Project Authorsの表示もある | [固定配布物](https://github.com/google/fonts/tree/47d54ca1ebb14fd864695f1d39dc734f39017c33/ofl/zenkakugothicnew)・[公式上流](https://github.com/googlefonts/zen-kakugothic) | ZenKakuGothicNew-Regular.ttf (400), -Medium.ttf (500), -Bold.ttf (700) | RFN指定なし／導入可 |
| Noto Sans JP / notosansjp | designer: Google。Copyright 2014–2021 Adobe | [固定配布物](https://github.com/google/fonts/tree/47d54ca1ebb14fd864695f1d39dc734f39017c33/ofl/notosansjp)・[公式上流](https://github.com/notofonts/noto-cjk) | NotoSansJP[wght].ttf (variable 100–900。UIの400/500/600/700等を同じ1ファイルで表示) | **Source**／導入可（無改変） |
| M PLUS 1p / mplus1p | Coji Morishita, M+ Fonts Project。Copyright 2016 The M+ Project Authors。OFL末尾にThe Rounded M+ Project Authorsの表示もあるため省略しない | [固定配布物](https://github.com/google/fonts/tree/47d54ca1ebb14fd864695f1d39dc734f39017c33/ofl/mplus1p)・[公式上流](https://github.com/coz-m/MPLUS_FONTS) | MPLUS1p-Regular.ttf (400), -Medium.ttf (500), -Bold.ttf (700) | RFN指定なし／導入可。別配布元の異なるM+ライセンスを混用しない |
| Zen Maru Gothic / zenmarugothic | Yoshimichi Ohira。Copyright 2021 The Zen Maru Gothic Project Authors（METADATAも保存） | [固定配布物](https://github.com/google/fonts/tree/47d54ca1ebb14fd864695f1d39dc734f39017c33/ofl/zenmarugothic)・[公式上流](https://github.com/googlefonts/zen-marugothic) | ZenMaruGothic-Regular.ttf (400), -Medium.ttf (500), -Bold.ttf (700) | RFN指定なし／導入可 |
| Noto Serif JP / notoserifjp | OFLヘッダー: Copyright 2012 Google Inc. All Rights Reserved.／METADATA: designer Google, Copyright 2017–2024 Adobe | [固定配布物](https://github.com/google/fonts/tree/47d54ca1ebb14fd864695f1d39dc734f39017c33/ofl/notoserifjp)・[公式上流](https://github.com/notofonts/noto-cjk)・[上流Serif/LICENSE](https://github.com/notofonts/noto-cjk/blob/985fa52c81c1d6692ccdd82bc3656e8fb932fd89/Serif/LICENSE) | NotoSerifJP[wght].ttf (variable 200–900) | 同梱OFLにRFN指定なし／導入可。GoogleとAdobeの両著作権表示を保存する。上流もOFL 1.1で許諾条件は矛盾しない |

版の同一性は上記commit、ファイル名、取得後のSFNT name table Version、SHA-256で特定する。Google FontsのMETADATAのsource commitも原文のまま残す。正確な内部Versionとバイト数は取得前に推測せず、取得後に`dev/font-lab/inventory.json`へ記録する。

## 各6書体へ適用する条件

全6書体の上記配布物は **SIL Open Font License 1.1（2007-02-26）**。各行の導入可判定は次の条件付きで、商用利用・Web組込み・GitHub上のソフトウェア同梱再配布・GitHub Pagesのセルフホスト配信を認める。今回Pagesへは配信しない。

- OFL Permission & Conditions冒頭が使用・埋込み・改変・再配布を許諾する。条件2はソフトウェアとの同梱を認め、**著作権表示とライセンスの各コピーへの同梱**を要求する。各書体の`OFL.txt`全文・`METADATA.pb`・取得時に抽出した内部著作権表示を対応フォルダへ置き、開発UIからも読めるようにする。
- 商用アプリも可能だが、条件1によりフォント単体の販売は禁止。アプリのライセンスと混同せず、フォントと派生物はOFLのまま（条件5）。アプリ全体をOFLにする義務はない。
- Webフォントは配布に当たるため同梱条件を守る。[OFL公式の利用説明](https://openfontlicense.org/how-to-use-ofl-fonts/)の2.1はセルフホストの`@font-face`を明示的に認める。[公式OFL本文](https://openfontlicense.org/open-font-license-official-text/)も参照するが、個別配布物の表示を省略しない。
- 改変・サブセット化・形式変換はOFL上のModified Versionになり得る。許諾はあるが、条件3のRFNと条件5を満たすこと。Noto Sans JPのRFNはSourceで、無許諾の改変版のprimary nameへ使わない。他5書体は確認したOFLにRFNの追加指定なし。今回は改変・変換・サブセット化・内部名変更を行わない。CSSのフォント別名はファイルの内部名変更ではない。
- 条件4により著作権者・制作者の名前を改変版の推奨・宣伝に使わない。画像としての出力物やアプリ画面へ常時クレジットを載せる義務と、フォントファイル配布時の権利表示の同梱義務は区別する。
- **LINE固有の公式説明**は商用利用時の帰属表示を「強く推奨」する。OFL本文の義務に加えて比較UIと文書に `LINE Seed JP © LY Corporation` を表示する。他書体の制作者表示も開発UIに出す。制作者の公認・推奨を意味しない。
- Noto Serif JPのGoogle/Adobe、Zen/M+の表示差は著作権表示を一方に置き換えて解決しない。全表示と原ファイルを保存する。異なるライセンス条項の適用・不明な配布元・追加条件の矛盾が見つかった場合は取得・選択肢を停止し再調査する。

## 現在のフォント

**2026-10-21追記：下記は比較導入時の旧標準の記録。現在のローカル実装はZen Maru Gothicを正式採用。** 同じ固定公式配布元からTTF3本・OFL・METADATAを再取得して保存済み原本と全バイト／SHA-256が一致することを再確認した。OFLのRFN追加指定はなく、無改変400/500/700と権利文書を`public/fonts/zen-maru-gothic/`へ同梱する。OFLヘッダーのProject Authorsと、METADATA／内部name tableのAuthorsの両表記を保存する。[正式採用記録](zen-maru-adoption.md)を優先する。比較記録と他5書体は開発専用として保持する。

`src/style.css`の指定は `Inter,"Hiragino Sans","Yu Gothic",Meiryo,system-ui,sans-serif`。フォント本体・外部CSSを読み込んでおらず、端末内のインストール状況と文字ごとに実フォントが変わる（iPhoneなら通常Hiragino、WindowsならYu Gothic等）。Interが常に使われているとは断定しない。一部のバッジは明示的なsystem-ui指定も持つ。「現在へ戻す」では上書きを除去し、元のCSSを完全に復帰する。OSフォントを抽出・同梱・再配布しない。これらのフォントファイルの再配布許諾を本調査で与えるものではない。

## 比較と正式採用の境界

文字サイズ・CSSの指定ウェイト・配色・余白は統一し、書体だけ変更する。静的ファイルにない600等のウェイトはブラウザの通常のマッチング／合成に任せ、任意のウェイト補正を入れない。LINEには500がなく、可変Notoには実ウェイトがあるため、この違いも比較時に考慮する。絵文字・未収録文字は端末フォールバックで、6書体すべてに全Unicode文字を保証するものではない。

取得した6書体の容量・ウェイト・取得URL・取得日・内部Version・SHA-256・著作権原文は`dev/font-lab/inventory.json`、ライセンスは`dev/font-lab/fonts/<id>/OFL.txt`と`METADATA.pb`へ保存する。本番採用時は採用1書体だけの容量・必要ウェイトを再判断し、ライセンス同梱、RFN確認、オフライン配信・監査許可リストを別途整備する。今回の比較用フォントは`public/`や通常の`dist/`へ入れない。
