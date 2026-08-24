# NightingaleDanceInfo 引き継ぎ書

## 目的

ナイチンゲールダンスの情報をまとめる非公式ホームページです。  
GitHub Pages で公開している静的サイトなので、別ワークスペースでもリポジトリを取得して編集、push すれば反映できます。

## 公開URL

- ホーム: https://ngdf1234.github.io/nightingaledanceinfohp/
- スケジュール一覧: https://ngdf1234.github.io/nightingaledanceinfohp/schedule.html
- 動画一覧: https://ngdf1234.github.io/nightingaledanceinfohp/clips.html

## リポジトリ

- GitHub: https://github.com/NGDF1234/nightingaledanceinfohp.git
- 公開元: `main` ブランチのルート
- GitHub Pages 設定: `Deploy from a branch` / `main` / `/root`

## 別ワークスペースでの開始手順

```powershell
git clone https://github.com/NGDF1234/nightingaledanceinfohp.git
cd nightingaledanceinfohp
```

ローカル確認は `index.html` をブラウザで開くだけで可能です。  
GitHub Pages 反映は以下です。

```powershell
git add .
git commit -m "Update site"
git push
```

## 主要ファイル

- `index.html`: ホーム画面のHTML。ヘッダー、ヒーロー、NEWS、PROFILE、REGULAR、SCHEDULE、CLIPS の並び。
- `schedule.html`: スケジュール一覧画面。
- `clips.html`: 動画一覧画面。
- `styles.css`: 全ページ共通デザイン。見た目の調整は基本ここ。
- `script.js`: JSON読み込み、NEWS、SCHEDULE、CLIPS、YouTubeポップアップ、検索処理。
- `assets/`: ロゴ、背景、見出し、読み込み中画像など。
- `data/nightingale-info.json`: NEWS と SCHEDULE の入力データ。
- `data/nightingale-youtube-clips.json`: YouTube動画一覧の入力データ。

## 画像を差し替えるとき

画像は `assets/` に保存して、HTMLまたはCSSの参照先を変更します。  
ブラウザやGitHub Pagesのキャッシュ対策として、CSSを変えたら各HTMLの `styles.css?v=数字` を1つ上げます。

例:

```html
<link rel="stylesheet" href="styles.css?v=95">
```

## データ出力の場所

情報取得側のプログラムは、ホームページのリポジトリ内に相対パスでJSONを出力します。

```text
data/nightingale-info.json
data/nightingale-youtube-clips.json
```

別ワークスペースでも絶対パスを固定しないで、ホームページフォルダ基準の相対パスで出力してください。

## `data/nightingale-info.json`

NEWS、REGULAR、SCHEDULE を入れるJSONです。

```json
{
  "updatedAt": "2026-08-23T01:00:00+09:00",
  "news": [
    {
      "date": "2026-08-21",
      "tag": "LIVE",
      "title": "タイトル",
      "text": "補足文",
      "url": "https://example.com/"
    }
  ],
  "regular": [
    {
      "title": "番組名",
      "comment": "補足コメント",
      "time": "毎週土曜 9:25〜10:15",
      "period": {
        "startDate": "2026-08-25",
        "endDate": "2026-12-31"
      },
      "url": "https://example.com/"
    }
  ],
  "schedule": [
    {
      "date": "2026-08-23",
      "startTime": "18:30",
      "endTime": "",
      "tag": "LIVE",
      "title": "公演名",
      "station": "会場・放送局・配信元",
      "text": "補足文",
      "url": "https://example.com/"
    }
  ]
}
```

運用ルール:

- ホームのスケジュールは今日から1週間分だけ表示。
- `schedule.html` は今日以降を初期表示。
- キーワード検索はタイトル、カテゴリ、放送局、補足文に部分一致。
- 今日の予定は薄い青で表示。
- YouTubeのNEWSは `url` から動画IDを判定できる場合、ポップアップ再生になります。
- REGULARは `period.startDate` 以降に表示し、`period.endDate` がある場合はその日まで表示します。終了日未定の場合は `endDate` を入れません。

## `data/nightingale-youtube-clips.json`

動画一覧とおすすめ動画の入力JSONです。

```json
{
  "updatedAt": "2026-08-23T01:00:00+09:00",
  "channels": [
    {
      "channelName": "ナイチンゲールダンスチャンネル",
      "channelType": "combi_official",
      "channelUrl": "https://www.youtube.com/@nightingaledance",
      "channelId": "UCK_5obaQBnlzrRnVN7G6yrA"
    }
  ],
  "clips": [
    {
      "id": "youtube|VIDEO_ID",
      "videoId": "VIDEO_ID",
      "kind": "video",
      "channelName": "ナイチンゲールダンスチャンネル",
      "channelType": "combi_official",
      "channelUrl": "https://www.youtube.com/@nightingaledance",
      "channelId": "UCK_5obaQBnlzrRnVN7G6yrA",
      "title": "動画タイトル",
      "url": "https://www.youtube.com/watch?v=VIDEO_ID",
      "viewCount": 12345,
      "uploadDate": "2026-08-01",
      "firstSeenAt": "2026-08-23T01:00:00+09:00",
      "lastStatsUpdatedAt": "2026-08-23T01:00:00+09:00"
    }
  ]
}
```

運用ルール:

- `kind` は通常動画が `video`、Shorts が `shorts`。
- 動画一覧の初期表示は新着順。
- 動画一覧はキーワード、チャンネル種別、人気順、更新日時の昇順・降順で絞り込み。
- ホームのおすすめ動画は、横動画の再生回数上位10件からランダム3件、Shortsの再生回数上位10件からランダム3件を表示。
- 画面には再生回数を表示しない。検索・並べ替え用に `viewCount` を保持する。

## REGULAR の更新

レギュラー番組は `data/nightingale-info.json` の `regular` にあります。  
別プログラムから追加する場合も、ホームページフォルダ基準の相対パスでこのJSONへ出力してください。

## 作業時の注意

- `data/*.json` は情報取得プログラムが更新することがあります。デザインだけ直すときは不用意にコミットしない。
- 画像を差し替えるときは、古い画像を消すより新しいファイル名で追加して参照先を変える方がキャッシュ事故が少ない。
- HTMLやCSSを変えたら、公開後にスマホ縦、スマホ横、PC幅で確認する。
- 非公式サイトなので、公式情報の確認リンクは残す。

## 別ワークスペースのCodexに最初に伝える文

```text
このリポジトリはナイチンゲールダンス非公式まとめサイトです。
まず HANDOFF.md を読んでください。
デザイン変更は styles.css と index.html / schedule.html / clips.html を中心に行います。
データJSONは情報取得プログラムが更新するので、指示がない限り data/*.json はコミットしないでください。
変更後は node --check script.js を実行し、必要なファイルだけ commit/push してください。
```
