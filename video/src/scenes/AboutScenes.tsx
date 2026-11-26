import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {GEO, SCN} from '../data';
import {C, fmt, fontFamily, man} from '../theme';
import {clipStarts, N} from '../timing';
import {clamp, Footnote, Header, rise} from './parts';

const S = SCN.mid;

// ── 1. 何を確かめる道具か
const THREE = [
  {h: '運ぶ力', d: '飛行機・ヘリ・船・バス。\n空港と港が1日にさばける便数'},
  {h: '受け入れる先', d: '全国の空港と九州の港。\n本土で長く暮らす場所'},
  {h: '時間', d: '決心してから輸送を始めるまで。\n攻撃が始まるまでの猶予'},
];
export const AboutWhat: React.FC = () => {
  const f = useCurrentFrame();
  const [s0] = clipStarts('about1');
  // 「運ぶ力、受け入れる先、そして時間」が読まれるあたりで1枚ずつ出す
  const at = [0.55, 0.62, 0.69].map((r) => s0 + r * N.about1);
  const ask = s0 + 0.78 * N.about1;
  return (
    <AbsoluteFill style={{background: C.paper, fontFamily}}>
      <Header f={f} kicker="このシミュレータは何か"
        title={`${Math.round(S.target / 1e4)}万人を本土へ運び出せるか`}
        sub="武力攻撃が予測される事態で、沖縄県の全員を本土へ避難させる計画を図上で確かめる" />
      <div style={{position: 'absolute', left: 120, right: 120, top: 380, display: 'flex', gap: 40}}>
        {THREE.map((t, i) => (
          <div key={t.h} style={{flex: 1, background: '#EFE7D4', borderTop: `10px solid ${C.island}`, padding: '30px 34px', ...rise(f, at[i])}}>
            <div style={{fontSize: 52, fontWeight: 900, color: C.ink}}>{t.h}</div>
            <div style={{fontSize: 30, color: C.sub, marginTop: 16, lineHeight: 1.6, whiteSpace: 'pre-line'}}>{t.d}</div>
          </div>
        ))}
      </div>
      <div style={{position: 'absolute', left: 120, right: 120, top: 720, fontSize: 46, fontWeight: 900, color: C.island, ...rise(f, ask)}}>
        この3つのうち、どこが先に詰まるのか
      </div>
      <Footnote f={f} at={ask + 20}>個人による非公式な図上検討。座席数・回転日数・駐機スポット・受入枠などの主要な数値は推定値</Footnote>
    </AbsoluteFill>
  );
};

// ── 2. 三段階の輸送
const mainPop = GEO.islands.filter((i) => i.type === 'main').reduce((s, i) => s + i.pop, 0);
const LAYERS = [
  {n: '①', h: '本島で集める', from: `沖縄本島 ${man(mainPop)}人`, how: 'バス約2,500台で\n空港の近くへ', to: '那覇・嘉手納'},
  {n: '②', h: '小さな島から拠点へ', from: '空港のない離島', how: 'ヘリ・船・小型機で', to: '本島・宮古・石垣'},
  {n: '③', h: '拠点から本土へ', from: '那覇・宮古・下地島\n新石垣＋嘉手納（一部）', how: '空路と海路で', to: '全国24空港・九州4港'},
];
export const AboutLayers: React.FC = () => {
  const f = useCurrentFrame();
  const st = clipStarts('about2');
  return (
    <AbsoluteFill style={{background: C.paper, fontFamily}}>
      <Header f={f} kicker="仕組み①　運び方" title="避難の輸送は三段階" />
      <div style={{position: 'absolute', left: 120, right: 120, top: 330, display: 'flex', flexDirection: 'column', gap: 34}}>
        {LAYERS.map((l, i) => (
          <div key={l.n} style={{display: 'flex', alignItems: 'center', gap: 28, ...rise(f, st[i + 1])}}>
            <div style={{width: 90, fontSize: 72, fontWeight: 900, color: C.island}}>{l.n}</div>
            <div style={{width: 420, fontSize: 40, fontWeight: 900, color: C.ink, lineHeight: 1.3}}>{l.h}</div>
            <Box>{l.from}</Box>
            <Arrow label={l.how} />
            <Box strong>{l.to}</Box>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
const Box: React.FC<{children: React.ReactNode; strong?: boolean}> = ({children, strong}) => (
  <div style={{width: 380, minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
    background: strong ? C.ink : '#EFE7D4', color: strong ? C.paper : C.ink, fontSize: 30, fontWeight: 700,
    lineHeight: 1.4, whiteSpace: 'pre-line', padding: '12px 18px'}}>{children}</div>
);
const Arrow: React.FC<{label: string}> = ({label}) => (
  <div style={{width: 250, textAlign: 'center'}}>
    <div style={{fontSize: 24, color: C.sub, whiteSpace: 'pre-line', lineHeight: 1.35}}>{label}</div>
    <svg width={250} height={30}><path d="M10 15 H225 M210 4 L232 15 L210 26" stroke={C.island} strokeWidth={5} fill="none" /></svg>
  </div>
);

// ── 3. 入力と結果
const INPUTS = [
  {k: '決心から輸送開始まで', v: `${S.par.startDelay}日`},
  {k: '攻撃までの猶予', v: `${S.par.warn}日`},
  {k: '徴用する民間機・ヘリ', v: `${S.par.planes}機・${S.par.helis as number}機`},
  {k: '船舶の徴用率', v: `${S.par.shipRate as number}%`},
  {k: '米軍施設（嘉手納など）の使用', v: `${S.par.usBases}%`},
  {k: '受け入れ先', v: S.destName},
];
export const AboutInputs: React.FC = () => {
  const f = useCurrentFrame();
  const [s0, s1] = clipStarts('about3');
  const outAt = s0 + 0.55 * N.about3_0;
  const vOn = interpolate(f, [s1, s1 + 20], [0, 1], clamp);
  return (
    <AbsoluteFill style={{background: C.paper, fontFamily}}>
      <Header f={f} kicker="仕組み②　入力と結果" title="何を入れて、何を見るか" />
      <div style={{position: 'absolute', left: 120, top: 320, width: 980}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
          <div style={{fontSize: 34, fontWeight: 900, color: C.island}}>入力（主なもの）</div>
          <div style={{fontSize: 26, fontWeight: 900, color: C.paper, background: C.island, padding: '4px 14px', opacity: vOn}}>中間シナリオの値</div>
        </div>
        {INPUTS.map((it, i) => (
          <div key={it.k} style={{display: 'flex', justifyContent: 'space-between', borderBottom: `2px solid #E2D8C3`,
            padding: '16px 4px', fontSize: 36, ...rise(f, s0 + 10 + i * 10)}}>
            <span style={{color: C.ink, fontWeight: 700}}>{it.k}</span>
            <span style={{color: C.island, fontWeight: 900, opacity: vOn}}>{it.v}</span>
          </div>
        ))}
      </div>
      <svg width={120} height={60} style={{position: 'absolute', left: 1120, top: 590, ...rise(f, outAt)}}>
        <path d="M5 30 H95 M75 10 L105 30 L75 50" stroke={C.ink} strokeWidth={6} fill="none" />
      </svg>
      <div style={{position: 'absolute', left: 1250, right: 90, top: 430, background: C.ink, color: C.paper,
        padding: '40px 40px', ...rise(f, outAt)}}>
        <div style={{fontSize: 34, fontWeight: 700, color: '#C9C2B2'}}>結果として見るもの</div>
        <div style={{fontSize: 48, fontWeight: 900, marginTop: 18, lineHeight: 1.35}}>攻撃が始まった時点で<br />県内に残る人数</div>
        <div style={{fontSize: 28, color: '#C9C2B2', marginTop: 22, lineHeight: 1.5}}>ほかに、先島・本島が空になる日、どこが詰まったか</div>
      </div>
      <Footnote f={f} at={s1}>中間シナリオ：住民{fmt(S.residents)}人＋観光客{fmt(S.tourists)}人。日数そのものではなく、条件を変えたときの傾向を読む</Footnote>
    </AbsoluteFill>
  );
};
