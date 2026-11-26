import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import INS from '../data/insights.json';
import {C, fontFamily, man} from '../theme';
import {clipStarts, N} from '../timing';
import {clamp, Header, rise} from './parts';

const LEVERS = [...INS.levers].sort((a, b) => b.saved - a.saved);
const MAX = Math.max(...LEVERS.map((l) => l.saved));
// ナレーションで触れる順に強調する（決心 → 民間機 → 那覇のスポット）
const FOCUS: Record<string, number> = {start3: 0.27, planes: 0.43, spots: 0.66};

export const LessonsScene: React.FC = () => {
  const f = useCurrentFrame();
  const [s0] = clipStarts('lessons');
  const grow = (i: number) => interpolate(f, [s0 + 0.16 * N.lessons + i * 8, s0 + 0.16 * N.lessons + i * 8 + 30], [0, 1],
    {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
  const lit = (id: string) => (FOCUS[id] !== undefined && f >= s0 + FOCUS[id] * N.lessons ? 1 : 0);
  const prcc = INS.mc.prcc.slice(0, 4);
  return (
    <AbsoluteFill style={{background: C.paper, fontFamily}}>
      <Header f={f} kicker="教訓" title="何をすれば、残る人を減らせるか"
        sub={`中間シナリオから条件を1つずつ変え、攻撃開始時の県内残留（${man(INS.base.atWar)}人）がどれだけ減るかを比べた`} />
      <div style={{position: 'absolute', left: 120, top: 400, width: 1180}}>
        {LEVERS.map((l, i) => {
          const on = lit(l.id);
          return (
            <div key={l.id} style={{display: 'flex', alignItems: 'center', height: 84, opacity: interpolate(grow(i), [0, 0.2], [0, 1])}}>
              <div style={{width: 500}}>
                <div style={{fontSize: 30, fontWeight: 900, color: on ? C.island : C.ink}}>{l.label}</div>
                <div style={{fontSize: 22, color: C.sub}}>{l.note}</div>
              </div>
              <div style={{flex: 1, display: 'flex', alignItems: 'center', gap: 16}}>
                <div style={{height: 40, width: `${(l.saved / MAX) * 85 * grow(i)}%`, minWidth: 4,
                  background: on ? C.island : '#B9AE97'}} />
                <span style={{fontSize: 32, fontWeight: 900, color: on ? C.island : C.ink, whiteSpace: 'nowrap'}}>
                  {l.saved > 0 ? `約${man(l.saved)}人` : '変わらない'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{position: 'absolute', right: 120, top: 400, width: 440, background: C.ink, color: C.paper,
        padding: '28px 32px', ...rise(f, s0 + 0.66 * N.lessons)}}>
        <div style={{fontSize: 30, fontWeight: 900, lineHeight: 1.5}}>攻撃前に足りないのは<br />空港ではなく機材</div>
        <div style={{fontSize: 24, color: '#C9C2B2', marginTop: 12, lineHeight: 1.6}}>
          攻撃前は那覇の枠に空きが残る。スポットが効くのは、攻撃で枠が3分の1に減った後
        </div>
      </div>
      <div style={{position: 'absolute', right: 120, top: 720, width: 440, background: '#EFE7D4', padding: '24px 32px',
        ...rise(f, s0 + 0.2 * N.lessons)}}>
        <div style={{fontSize: 24, fontWeight: 700, color: C.sub}}>感度分析（{INS.mc.n.toLocaleString()}回の試行・PRCC）</div>
        {prcc.map((p) => (
          <div key={p.name} style={{display: 'flex', justifyContent: 'space-between', fontSize: 26, marginTop: 8}}>
            <span style={{color: C.ink}}>{p.name}</span>
            <span style={{fontWeight: 900, color: C.island}}>{p.val > 0 ? '+' : '−'}{Math.abs(p.val).toFixed(2)}</span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
