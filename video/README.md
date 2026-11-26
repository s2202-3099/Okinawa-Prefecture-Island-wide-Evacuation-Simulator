# 全県避難の流れを地図で見せる動画（Remotion）

親フォルダの `index.html`（沖縄県 全島避難シミュレータ）の**中間シナリオ**を、シミュレータの解説から入り、地図のアニメーションで追い、教訓と求められる備えで締める約5分の動画です。

## 中身

1. タイトル
2. シミュレータの解説
   - 何を確かめる道具か（運ぶ力・受け入れる先・時間のどこが先に詰まるか）
   - 三段階の輸送（本島での集結、離島から拠点島へ、拠点から本土へ）
   - 入力と結果（中間シナリオの値と、攻撃開始時の県内残留という見方）
3. 地図：中間シナリオの51日間
   - 住民145万人＋観光客10万人の分布と、4つの空港（宮古と下地島は1つの拠点）・嘉手納の一部
   - 1〜7日目：輸送開始まで。定期便での自力退避だけ
   - 8〜25日目：全国24空港と九州の4港へ。先島は28日目に空になる
   - 25日目：攻撃開始。県内に残る約48万人を見せる
   - 26〜51日目：輸送力が3分の1の状態で運び続ける
4. 悲観・中間・楽観の比較
5. 教訓：中間シナリオから打ち手を1つずつ変えたときに、攻撃開始時の残留がどれだけ減るか（`src/data/insights.json`）
6. 求められる備え：モデルから読める4つの示唆と、その根拠の数字
7. 結び：「輸送が破綻するのではなく、間に合わない」と注意書き・出所・クレジット

数字はすべてシミュレータ本体のモデルとシナリオ定義をそのまま動かして得たものです。教訓の数字は `scripts/export-insights.mjs` が作ります（モンテカルロは乱数の種を固定して再現できるようにしています）。

## 使い方

```bash
npm i
node scripts/export-sim.mjs        # index.html のモデルを実行して src/data/sim.json を作り直す
node scripts/export-insights.mjs   # 打ち手ごとの効果と感度分析を src/data/insights.json に書く
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
