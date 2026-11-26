import React from 'react';
import {Easing, interpolate} from 'remotion';
import {RUNS} from '../data';
import {C, fmt} from '../theme';
import type {Panel} from '../timeline';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const out = Easing.bezier(0.16, 1, 0.3, 1);
const tone = (t?: string) => (t === 'good' ? C.good : t === 'bad' ? C.bad : C.text);

const Card: React.FC<{children: React.ReactNode; t: number; width?: number; style?: React.CSSProperties}> = ({children, t, width = 640, style}) => (
  <div style={{position: 'absolute', right: 60, top: 300, maxHeight: 470, overflow: 'hidden', width, background: C.panel, border: `1px solid ${C.panelEdge}`, borderRadius: 20,
    padding: '28px 34px', boxShadow: '0 20px 60px rgba(0,0,0,0.45)', opacity: interpolate(t, [0, 12], [0, 1], clamp),
    translate: `${interpolate(t, [0, 18], [40, 0], {...clamp, easing: out})}px 0`, ...style}}>{children}</div>
);
const Title: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div style={{fontSize: 28, fontWeight: 900, color: C.sub, letterSpacing: '0.04em', marginBottom: 14}}>{children}</div>
);

export const PanelView: React.FC<{panel: Panel; t: number; upto: number; frame: number}> = ({panel, t, upto}) => {
  if (!panel) return null;
  const p = panel as Record<string, unknown> & {kind: string};
  switch (p.kind) {
    case 'title': {
      const o = interpolate(t, [0, 16], [0, 1], clamp);
      return (
        <div style={{position: 'absolute', left: 0, right: 0, top: 0, bottom: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '0 160px', background: `rgba(11,22,36,${0.72 * o})`}}>
          {p.kicker ? <div style={{fontSize: 36, fontWeight: 700, color: C.people, opacity: o}}>{p.kicker as string}</div> : null}
          <div style={{fontSize: 84, fontWeight: 900, color: C.text, lineHeight: 1.3, marginTop: 14, whiteSpace: 'pre-line', opacity: o,
            translate: `0 ${interpolate(t, [0, 22], [24, 0], {...clamp, easing: out})}px`}}>{p.title as string}</div>
          {p.sub ? <div style={{fontSize: 36, color: C.sub, marginTop: 26, opacity: interpolate(t, [10, 28], [0, 1], clamp)}}>{p.sub as string}</div> : null}
        </div>
      );
    }
    case 'note':
    case 'list': {
      const items = p.items as string[];
      const n = p.kind === 'note' ? items.length : upto;
      return (
        <Card t={t} width={p.kind === 'list' ? 1000 : 700} style={p.kind === 'list' ? {top: 150, maxHeight: 'none'} : undefined}>
          <Title>{p.title as string}</Title>
          {items.map((it, i) => {
            const on = i < n;
            const [head, rest] = it.includes('：') ? it.split('：') : [it, ''];
            return (
              <div key={i} style={{display: 'flex', gap: 18, marginTop: 16, opacity: on ? 1 : 0.18}}>
                <span style={{fontSize: 30, fontWeight: 900, color: on ? C.people : C.dim, minWidth: 34}}>{p.kind === 'note' ? '・' : i + 1}</span>
                <span style={{fontSize: 30, color: C.text, lineHeight: 1.5}}><b>{head}</b>{rest && <span style={{color: C.sub}}>　{rest}</span>}</span>
              </div>
            );
          })}
        </Card>
      );
    }
    case 'stats':
      return (
        <Card t={t}>
          <Title>{p.title as string}</Title>
          {(p.items as [string, string][]).map(([k, v], i) => (
            <div key={k} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '12px 0',
              borderTop: i ? `1px solid ${C.panelEdge}` : undefined, opacity: interpolate(t, [6 + i * 6, 18 + i * 6], [0, 1], clamp)}}>
              <span style={{fontSize: 30, color: C.sub}}>{k}</span>
              <span style={{fontSize: 40, fontWeight: 900, color: C.text}}>{v}</span>
            </div>
          ))}
        </Card>
      );
    case 'cond':
      return (
        <Card t={t}>
          <Title>{p.title as string}</Title>
          {(p.rows as [string, string, string][]).map(([k, a, b], i) => (
            <div key={k} style={{padding: '6px 0', borderTop: i ? `1px solid ${C.panelEdge}` : undefined}}>
              <div style={{fontSize: 20, color: C.sub}}>{k}</div>
              <div style={{display: 'flex', alignItems: 'baseline', gap: 16, marginTop: 2}}>
                {a && <span style={{fontSize: 30, color: C.dim, textDecoration: 'line-through'}}>{a}</span>}
                {a && <span style={{fontSize: 28, color: C.people}}>→</span>}
                <span style={{fontSize: 33, fontWeight: 900, color: C.text, opacity: interpolate(t, [a ? 10 : 0, a ? 22 : 12], [0, 1], clamp)}}>{b}</span>
              </div>
            </div>
          ))}
        </Card>
      );
    case 'result':
      return (
        <Card t={t}>
          <div style={{fontSize: 28, color: C.sub}}>{p.label as string}</div>
          <div style={{fontSize: 92, fontWeight: 900, color: tone(p.tone as string), lineHeight: 1.15, marginTop: 6,
            scale: String(interpolate(t, [0, 14], [0.9, 1], {...clamp, easing: out}))}}>{p.value as string}</div>
        </Card>
      );
    case 'compare': {
      const items = p.items as [string, number, string, string][];
      const max = p.max as number;
      return (
        <Card t={t} width={760}>
          <Title>{p.title as string}</Title>
          {items.map(([label, v, text, tn], i) => {
            const g = interpolate(t, [8 + i * 5, 30 + i * 5], [0, 1], {...clamp, easing: out});
            return (
              <div key={label} style={{display: 'flex', alignItems: 'center', gap: 14, height: 56}}>
                <span style={{width: 230, fontSize: 26, color: C.text, fontWeight: 700}}>{label}</span>
                <div style={{flex: 1, display: 'flex', alignItems: 'center', gap: 12}}>
                  <div style={{height: 22, width: `${(v / max) * 70 * g}%`, minWidth: 3, borderRadius: 6, background: tone(tn) === C.text ? C.sub : tone(tn)}} />
                  <span style={{fontSize: 28, fontWeight: 900, color: tone(tn), whiteSpace: 'nowrap', opacity: g}}>{text}</span>
                </div>
              </div>
            );
          })}
        </Card>
      );
    }
    case 'chart':
      return <ScenarioChart runs={p.runs as string[]} xmax={p.xmax as number} t={t} />;
    case 'credits':
      return (
        <Card t={t} width={820} style={{top: 150, maxHeight: 'none'}}>
          <Title>クレジット・出所</Title>
          {[
            ['音声', 'VOICEVOX:ずんだもん　VOICEVOX:春日部つむぎ'],
            ['シミュレータ', '南西諸島 住民避難シミュレータ／沖縄県 全島避難シミュレータ（個人による非公式な図上検討）'],
            ['出所', '内閣官房国家危機管理室「沖縄県の離島からの住民避難・受入れに係る取組」、住民基本台帳、部隊編成の公表資料'],
            ['注意', '座席数・回転日数・駐機スポット・受入枠などの多くは推定値。在日米軍施設の使用と全国規模の受入枠は仮置き'],
          ].map(([k, v]) => (
            <div key={k} style={{display: 'flex', gap: 20, marginTop: 14}}>
              <span style={{minWidth: 150, fontSize: 24, color: C.people, fontWeight: 900}}>{k}</span>
              <span style={{fontSize: 24, color: C.text, lineHeight: 1.55}}>{v}</span>
            </div>
          ))}
        </Card>
      );
    default:
      return null;
  }
};

// 3シナリオの「県内に残る人」の推移
const ScenarioChart: React.FC<{runs: string[]; xmax: number; t: number}> = ({runs, xmax, t}) => {
  const Wd = 900, Ht = 430, L = 110, B = 50, Tp = 20;
  const ymax = 1700000;
  const sx = (d: number) => L + (d / xmax) * (Wd - L - 20);
  const sy = (v: number) => Tp + (1 - v / ymax) * (Ht - Tp - B);
  const draw = interpolate(t, [10, 90], [0, xmax], {...clamp, easing: Easing.bezier(0.4, 0, 0.6, 1)});
  const COLORS = [C.bad, C.people, C.good];
  return (
    <Card t={t} width={980} style={{top: 130, maxHeight: 'none'}}>
      <Title>シナリオごとの「県内に残る人」</Title>
      <div style={{display: 'flex', gap: 26, marginBottom: 8}}>
        {runs.map((id, i) => (
          <span key={id} style={{fontSize: 24, color: C.text}}><span style={{display: 'inline-block', width: 26, height: 8, background: COLORS[i], marginRight: 8, verticalAlign: 'middle'}} />
            {RUNS[id].label.replace('シナリオ', '')}　<span style={{color: C.sub, fontSize: 21}}>開始{RUNS[id].sum.startDelay}日・猶予{RUNS[id].sum.warn}日</span></span>
        ))}
      </div>
      <svg width={Wd} height={Ht}>
        <defs><clipPath id="cd"><rect x={0} y={0} width={sx(draw) + 4} height={Ht} /></clipPath></defs>
        {[0, 500000, 1000000, 1500000].map((v) => (
          <g key={v}>
            <line x1={L} x2={Wd - 20} y1={sy(v)} y2={sy(v)} stroke={C.panelEdge} />
            <text x={L - 12} y={sy(v) + 8} fontSize={22} fill={C.sub} textAnchor="end">{v ? `${v / 10000}万` : '0'}</text>
          </g>
        ))}
        {[0, 10, 20, 30, 40, 50, 60].filter((d) => d <= xmax).map((d) => (
          <text key={d} x={sx(d)} y={Ht - 14} fontSize={22} fill={C.sub} textAnchor="middle">{d}日</text>
        ))}
        <g clipPath="url(#cd)">
          {runs.map((id, i) => {
            const s = RUNS[id].sum;
            const rem = s.rem!.slice(0, xmax + 1);
            return (
              <g key={id}>
                <line x1={sx(s.warn)} x2={sx(s.warn)} y1={Tp} y2={Ht - B} stroke={COLORS[i]} strokeDasharray="6 6" strokeOpacity={0.6} />
                <polyline fill="none" stroke={COLORS[i]} strokeWidth={5} strokeLinejoin="round" points={rem.map((v, d) => `${sx(d)},${sy(v)}`).join(' ')} />
                {s.warn <= xmax && <circle cx={sx(s.warn)} cy={sy(s.atWar)} r={9} fill={COLORS[i]} stroke={C.bg} strokeWidth={3} />}
                {s.warn <= xmax && <text x={sx(s.warn) + 14} y={sy(s.atWar) - 12} fontSize={24} fontWeight={900} fill={COLORS[i]}>{s.atWar ? `${fmt(s.atWar)}人` : ''}</text>}
              </g>
            );
          })}
        </g>
      </svg>
    </Card>
  );
};
