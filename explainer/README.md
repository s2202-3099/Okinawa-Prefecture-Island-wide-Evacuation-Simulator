# 解説動画：沖縄の島から、何日で逃げられるか（Remotion）

春日部つむぎ（解説）とずんだもん（聞き役）の掛け合いで、2つのシミュレータを動かしながら解説する約15分の動画です。

- 第1部　先島諸島（`nansei-evacuation-sim` のモデル）：受け入れ先、那覇経由、決心の遅れ・猶予、観光ピーク
- 第2部　沖縄県全域（このリポジトリの `index.html`）：中間シナリオの51日間、時間・輸送手段・受け入れ先と経由・観光と自主避難、3シナリオの比較
- まとめ　求められる備え

背景の地図は、その場面の条件でシミュレータを回した結果そのもので、条件を変えると地図の流れと人の量が変わります。

## 作り方

```bash
npm i
node scripts/export-runs.mjs [先島版の index.html]   # 2つのモデルを条件ごとに回して src/data/{saki,oki}.json を作る
python3 script/build-episode.py                       # 台本 script/episode.json を組み立てる
python3 scripts/make-voices.py                         # VOICEVOX で台詞を合成（--changed で変わった台詞だけ）
npm run dev                                            # Remotion Studio でプレビュー
npx remotion render Explainer out/explainer.mp4
```

先島版の `index.html` は、既定で `../../nansei-evacuation-sim/index.html`（同じ階層に clone）を読みます。

### 台本と画面

`script/build-episode.py` が台本です。台詞ごとに、画面の状態（章、カメラ、地図の条件、地図を何日目から何日目まで進めるか、重ねるパネル）を指定します。尺は台詞の音声の長さから自動で決まります。

### 音声

VOICEVOX エンジンが `http://127.0.0.1:50021` で動いている必要があります（VOICEVOX アプリを起動するか、`docker run -d -p 50021:50021 voicevox/voicevox_engine:cpu-latest`）。
誤読しやすい語は `scripts/make-voices.py` の `READINGS` で合成時だけ読みを差し替えています。読みの確認用に `script/readings.txt` を書き出します。
クレジット表記「VOICEVOX:ずんだもん」「VOICEVOX:春日部つむぎ」を動画の最後に入れています。

### 立ち絵（未設定）

いまは仮のアイコンで表示しています。立ち絵の素材を `public/characters/zundamon/` と `public/characters/tsumugi/` に置き、`src/characters.ts` の `art` を埋めると差し替わります。

- `base`：口を閉じた立ち絵（背景透過PNG）
- `mouth`：口を開いた差分（任意。音量に合わせて口パク）
- `blink`：目を閉じた差分（任意。5秒に1回まばたき）

立ち絵素材の利用規約（配布元の規約と、キャラクターの利用ガイドライン）は各自で確認してください。

### BGM（未設定）

`public/bgm/` に曲を置き、`src/Episode.tsx` の「BGM」トラックに `<Audio>` を足してください。ナレーションに被るので、音量は 0.1〜0.15 程度から。

### ネットワークが制限された環境

Remotion が描画用のブラウザを取得できないときは、手元の Chrome Headless Shell を指定します。

```bash
REMOTION_BROWSER=/path/to/chrome-headless-shell npx remotion render Explainer out/explainer.mp4
```

## フォント

Noto Sans JP（SIL Open Font License 1.1）を `public/fonts` に同梱しています。
