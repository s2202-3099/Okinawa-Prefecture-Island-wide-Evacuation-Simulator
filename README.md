Okinawa Prefecture-wide Evacuation Simulator

A single-file HTML tabletop model of a full-prefecture civilian evacuation from Okinawa (≈1.45 million residents, up to ≈100,000 tourists) to mainland Japan under an anticipated armed attack situation. It asks where the binding constraint actually sits: lift capacity, reception capacity, or time.

Unofficial, for tabletop study only. This is not the position or plan of any government, municipality, or armed force. Seat counts, sortie rates, turnaround days, parking stands, reception capacities and availability rates are estimates derived from aircraft type and distance, not published figures.

What it models

Three transport layers — ground assembly on Okinawa main island, feeder legs from outlying islands to hub islands, and trunk legs from three hubs (Naha, Miyako/Shimoji, New Ishigaki) to 27 receiving airports and 4 discharge ports. Great-circle distance is computed per airport, so sorties per aircraft per day fall with range and distant airports tie up far more airframes per passenger moved. Reception on the mainland is modelled as temporary shelter plus long-term housing that opens at a daily rate rather than all at once.

Main finding

Monte Carlo over 1,000 runs, with sensitivity measured both by median split and by PRCC. Warning time dominates every other variable (PRCC +0.96). Adding aircraft and shipping moves the outcome far less than deciding to start days earlier. Under the central scenario, roughly 480,000 people remain in the prefecture when hostilities begin.

Running it

index.html is self-contained — drag it into a browser, or serve it via GitHub Pages. External dependencies are Leaflet 1.9.4 and CARTO map tiles only; it falls back to a built-in vector coastline when neither loads.

Known limits

Reception capacity figures, especially the 1.55 million "full national mobilization" case, are placeholders rather than real allocations. Use of US military facilities in Japan is a pure assumption. The mainland reception layer is calibrated only to the correct order of magnitude. Full source list and further limitations are documented in Japanese below.
# 沖縄県 全島避難シミュレータ

武力攻撃予測事態における沖縄県全域（住民約145万人・観光客ストック最大約10万人）の
本土避難について、輸送力・受入枠・時間の三者がどこで律速するかを図上で検討するための
単一ファイル HTML アプリケーション。

**図上検討用・非公式。** 政府・自治体・自衛隊その他いかなる機関の見解でも計画でもない。
座席数・ソーティ数・回転日数・駐機スポット数・収容人員・可動率などの主要な数値は、
機種と距離から置いた推定値であり、公表されたものではない。
とくに在日米軍施設の使用と「全国総動員」の受入枠は、公的な裏づけのない仮置きである。

## 公開

`index.html` 単体で完結する。GitHub Pages なら Settings → Pages で
ブランチのルートを指定するだけでよい。ローカルで開く場合も
ファイルをブラウザにドラッグすれば動く。

外部依存は Leaflet 1.9.4（cdnjs）と地図タイル（CARTO）のみ。
どちらも読めない環境では内蔵のベクター海岸線に自動でフォールバックする。
タイルの読み込みに成功すると内蔵海岸線は自動で消える。手動でも切り替えられる。

## 何を模型化しているか

### 三層の輸送

1. **陸上集結（沖縄本島）** — 130万人を国道58号・沖縄自動車道経由で集結地へ動かす工程。
   バス約2,500台・45席・1日4回転・道路の目詰まり係数0.55。
2. **末端（離島 → 拠点島）** — 滑走路のない島からコミューター機・ヘリ・船で拠点島へ。
3. **幹線（拠点島 → 本土）** — 那覇・宮古/下地島・石垣の3ハブから、
   受入空港27港および陸揚げ港4港へ。

### 三つのハブ

| ハブ | 空港 | 1日の便数枠 | 港湾処理 |
|---|---|---|---|
| 沖縄本島 | 那覇（30スポット×7回転） | 210 | 20,000人/日 |
| 宮古 | 宮古・下地島（7×7.6） | 53 | 6,000人/日 |
| 八重山 | 新石垣（5×8.0） | 40 | 6,000人/日 |

先島だけを扱った旧版では那覇は後方の安全な中継地だったが、
全島避難では本島自体が最大の避難元になる。「先島を本島経由にする比率」を上げると、
先島の避難民は本島130万人と同じ那覇空港の枠に並び直す。

### 空港ごとの距離と枠

出発ハブから受入空港・陸揚げ港までの大圏距離を1港ずつ計算する。
1機が1日に立てられる便数は距離で決まるため（那覇発で鹿児島2.28便、
福岡2.05便、関西1.74便、新千歳1.0便強）、遠い空港の1便は近い空港の1便より
はるかに多くの機材を拘束する。

各空港は1日の絶対枠を持ち、機材は重み `残枠 × 往復回数^(k-1)` で配分される。
`k` は「受入空港の使い方」つまみで決まり、近接優先（k=6）なら近い空港に集中し、
均等分散（k=0）なら残枠に比例して便が並ぶ。既定条件で両端の差は便数にして約1割。

船は関東や北海道までは行かず九州（鹿児島・志布志・博多・佐世保）で陸揚げする前提なので、
受入範囲を広げても海上の回転日数は変わらない。

### 本土側の受入

到着した住民はまず一時滞在施設に入り、長期滞在先が開設された分だけそこへ移る。
長期枠は初日に全部現れるのではなく、1日あたりの開設速度で積み上がる
（開始時点で使えるのは総枠の1割）。観光客は本土に自宅があるため長期枠を消費せず、
乗継までの平均1.6日で一時滞在を抜ける。

既定では本土側の詰まりを輸送側に返さない。武力攻撃予測事態でまず問われるのは
「本土に出せたか」であって行き先が決まっているかではない、という判断による。
返す設定にも切り替えられる。

### 展開との結合

増援部隊（約9,600名・車両多数）の往路輸送を先に処理する。
往路で沖縄に到達した船腹は翌日から復路として避難民を運ぶ。
車両甲板を旅客に転用できるため復路は往路の1.6倍を積む。

### 算入しないもの

尖閣領海警備専従部隊のPL10隻、護衛艦・掃海艇の輸送力（護衛と航路啓開が本務）、
海保固定翼機（洋上監視機で客席がない）、陸自の戦闘部隊人員（南西展開が優先される）。

## 使い方

### シナリオ

パネル上部の3ボタンで、較正済みの前提一式をワンクリックで再現できる。
「初期値に戻す」ですべて既定に戻る。

| | 悲観 | 中間 | 楽観 |
|---|---|---|---|
| 決心から避難開始 | 10日 | 7日 | 3日 |
| 攻撃までの猶予 | 21日 | 25日 | 60日 |
| 徴用民間機 | 55機 | 110機 | 200機 |
| 米軍施設 | 使わない | 20% | 70% |
| 受入先 | 九州・山口 | 全国分散 | 全国総動員 |
| 先島の搬出完了 | 153日 | 28日 | 10日 |
| 全県の搬出完了 | — | 51日 | 26日 |
| 開戦時の残留 | 約119万人（74%） | 約48万人（31%） | 0 |

### 主なつまみ

- **時間の前提** — 決心から避難開始まで／攻撃までの猶予／攻撃開始後の輸送力低下。
  感度分析でも猶予の寄与が突出する（PRCC +0.96）。輸送力を積み増すより
  決心を何日早められるかが効く領域にいる。
- **輸送資産** — 民間旅客機・ヘリ・船舶徴用率・他方面からの割当率・在日米軍施設の使用度。
- **受入** — 一時受け入れ先（7段階）／長期受入枠の扱い（輸送の門にするか）／
  長期滞在先の開設速度／一時滞在施設の収容。
- **配分** — 先島への優先配分／受入空港の使い方（近接優先か均等分散か）／
  先島を本島経由にする比率。

### モンテカルロ

1,000回試行。着手日数は対数正規、猶予は指数分布、機材数・徴用率・割当率・
米軍施設の使用度・妨害度などにもばらつきを与える。
成功確率が0%または100%に振り切った場合は、二値の成否ではなく
開戦時点の搬出率で感度を測る。

感度分析は中央値分割による寄与（百分点）と、順位相関で他変数を統制した PRCC の両方を出す。
猶予の寄与が支配的なため、それ以外の順位はノイズを含む。

## 主な出典・較正の足場

- 内閣官房国家危機管理室「沖縄県の離島からの住民避難・受入れに係る取組」（令和8年3月）
  — 先島側の輸送力較正、九州・山口の受入枠112,800人
- 部隊編成・保有機数は公表資料
- 人口は住民基本台帳ベースの概数
- 東日本大震災の全国避難者数ピーク約47万人 — 受入枠の規模感の参照点
- ウクライナにおける事前避難率（明示的警告下でも全人口の1%未満）— 自主避難率の参照点

## 既知の限界

- 受入枠の絶対値、とくに「全国総動員」155万人は仮置きであり、実在する枠ではない。
- 在日米軍施設の使用可否は政治的・軍事的に自明でなく、開放度は純粋な仮定である。
- 本土側の受入レイヤー（開設速度15,000人/日、一時滞在収容など）は
  桁を合わせるための仮置きで、日数そのものを引用できる精度はない。
  較正するなら熊本地震における応急仮設・みなし仮設の確保実績が足場になる。
- 沖縄本島は3つの集結圏に束ねており、41市町村単位の割当は表現していない。
- 段階避難（要配慮者→児童生徒→一般）の順序は、要配慮者の優先以外は入れていない。
- 海岸線は手書きの簡略ポリゴン（39図形・355点）であり、測地成果ではない。

## 更新の履歴

- **v4** — 対象を先島18島（約11万人）から沖縄県全域（約145万人）へ拡張。
  本島の陸上集結層、本土側の受入レイヤー、在日米軍施設のパラメータ化、
  空港ごとの距離と枠による機材配分、シナリオプリセット、北海道を含む海岸線の再作図。
- **v3** — 先島諸島限定。母港運用と展開の結合モデル。

## ライセンス

`LICENSE` を参照。
