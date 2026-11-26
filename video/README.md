# 全県避難の流れを地図で見せる動画（Remotion）

親フォルダの `index.html`（沖縄県 全島避難シミュレータ）の**中間シナリオ**を、地図上のアニメーションにした約2分15秒の動画です。

## 中身

1. タイトル
2. 地図：住民145万人＋観光客10万人の分布 → 4つの空港（那覇・宮古・下地島・新石垣。宮古と下地島は橋でつながり1つの拠点として扱う）と嘉手納の一部→ 1日ずつの避難
   - 1〜7日目：決心から輸送開始まで。定期便での自力退避だけ
   - 8〜25日目：本島はバスで集結し、全国24空港と九州の4港へ。先島は優先され28日目に空になる
   - 25日目：攻撃開始。いったん止めて、県内に残る約48万人を見せる
   - 26〜51日目：輸送力が3分の1に落ちた状態で運び続け、51日目に県内が空になる
3. 悲観・中間・楽観の3シナリオで「県内に残る人」の推移を比較
4. 結び：読み方と注意書き、出所、クレジット

数字はすべてシミュレータ本体のモデルとシナリオ定義をそのまま動かして得たものです。

## 使い方

```bash
npm i
node scripts/export-sim.mjs   # index.html のモデルを実行して src/data/sim.json を作り直す
npm run dev                   # Remotion Studio でプレビュー
npx remotion render OkinawaEvacuation out/okinawa-evacuation.mp4
```

ネットワークが制限された環境では、Remotion が描画用のブラウザを取得できないことがあります。その場合は手元の Chrome Headless Shell を指定してください。

```bash
REMOTION_BROWSER=/path/to/chrome-headless-shell npx remotion render OkinawaEvacuation out/okinawa-evacuation.mp4
```

## ナレーション

原稿は `scripts/narration.json`。音声は VOICEVOX のずんだもん（ノーマル）で、動画の結びに「VOICEVOX:ずんだもん」のクレジットを入れています（音声ライブラリの利用条件）。

```bash
docker run -d -p 50021:50021 voicevox/voicevox_engine:cpu-latest   # または VOICEVOX アプリを起動
python scripts/make-narration-voicevox.py         # 文ごとに合成し、息継ぎを挟んで public/narration/*.wav を作る
python scripts/make-narration.py --measure-only   # 長さを測って src/data/narration.json を更新
```

各区間の尺はナレーションの長さから決まります（`src/timing.ts`）。数が「ヒャク／サンジュウニマン」のように割れて読まれる箇所は、合成スクリプトが自動でつなぎ直します。

## フォント

Noto Sans JP（SIL Open Font License 1.1）を `public/fonts` に同梱しています。
