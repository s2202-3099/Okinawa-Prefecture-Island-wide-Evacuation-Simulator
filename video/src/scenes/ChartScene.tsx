import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {SCN, type Scenario} from '../data';
import {C, fontFamily, man} from '../theme';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const X0 = 230, X1 = 1400, Y0 = 420, Y1 = 930, XMAX = 60, YMAX = 1700000;
const sx = (d: number) => X0 + (d / XMAX) * (X1 - X0);
const sy = (v: number) => Y1 - (v / YMAX) * (Y1 - Y0);

const LINES: {s: Scenario; color: string; w: number}[] = [
  {s: SCN.pess, color: C.attack, w: 6},
  {s: SCN.mid, color: C.island, w: 7},
  {s: SCN.opt, color: C.done, w: 6},
];
const desc = (s: Scenario) => `${s.name}（開始${s.par.startDelay}日・猶予${s.par.warn}日）`;

export const ChartScene: React.FC = () => {
  const f = useCurrentFrame();
  const drawn = interpolate(f, [30, 200], [0, XMAX], {...clamp, easing: Easing.bezier(0.4, 0, 0.6, 1)});
  const ann = (a: number) => interpolate(f, [a, a + 20], [0, 1], clamp);
  const {pess, mid, opt} = SCN;
  return (
    <AbsoluteFill style={{background: C.paper, fontFamily}}>
      <div style={{position: 'absolute', left: 120, top: 70, right: 120}}>
        <div style={{fontSize: 34, fontWeight: 700, color: C.island}}>3つのシナリオを比べると</div>
        <div style={{fontSize: 64, fontWeight: 900, color: C.ink, marginTop: 8, lineHeight: 1.25}}>
          差を生むのは、機材の数より決心の早さ
        </div>
      </div>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <defs>
          <clipPath id="draw"><rect x={0} y={0} width={sx(drawn) + 6} height={1080} /></clipPath>
        </defs>
        {[0, 500000, 1000000, 1500000].map((v) => (
          <g key={v}>
            <line x1={X0} x2={X1} y1={sy(v)} y2={sy(v)} stroke={C.coast} strokeOpacity={0.3} />
            <text x={X0 - 18} y={sy(v)} fontSize={26} fill={C.sub} textAnchor="end" dominantBaseline="middle">{v === 0 ? '0' : `${v / 10000}万`}</text>
          </g>
        ))}
        {[0, 10, 20, 30, 40, 50, 60].map((d) => (
          <text key={d} x={sx(d)} y={Y1 + 40} fontSize={26} fill={C.sub} textAnchor="middle">{d}日</text>
        ))}
        <text x={X0 - 18} y={Y0 - 36} fontSize={26} fill={C.sub} textAnchor="end">県内に残る人</text>
        {LINES.map(({s, color}, i) => (
          <g key={s.key} opacity={ann(10)}>
            <rect x={X0 + i * 450} y={300} width={44} height={10} fill={color} />
            <text x={X0 + 58 + i * 450} y={306} fontSize={28} fill={C.ink} fontWeight={700} dominantBaseline="middle">{desc(s)}</text>
          </g>
        ))}
        <g clipPath="url(#draw)">
          {LINES.map(({s, color, w}) => (
            <g key={s.key}>
              <line x1={sx(s.par.warn)} x2={sx(s.par.warn)} y1={Y0} y2={Y1} stroke={color} strokeWidth={2} strokeDasharray="7 7" strokeOpacity={0.7} />
              <polyline fill="none" stroke={color} strokeWidth={w} strokeLinejoin="round" strokeLinecap="round"
                points={s.rem.slice(0, XMAX + 1).map((v, d) => `${sx(d)},${sy(v)}`).join(' ')} />
            </g>
          ))}
          {/* 攻撃開始の時点 */}
          {[pess, mid].map((s, i) => (
            <circle key={s.key} cx={sx(s.par.warn)} cy={sy(s.atWar)} r={11} fill={LINES[i].color} stroke={C.paper} strokeWidth={3} />
          ))}
          <circle cx={sx(opt.allDay ?? 0)} cy={sy(0)} r={11} fill={C.done} stroke={C.paper} strokeWidth={3} />
        </g>
      </svg>
      <Note x={sx(pess.par.warn) + 24} y={sy(pess.atWar) - 50} o={ann(110)} color={C.attack}>
        悲観：攻撃開始の{pess.par.warn}日目に<br />{man(pess.atWar)}人（{Math.round((pess.atWar / pess.target) * 100)}%）が残る
      </Note>
      <Note x={sx(mid.par.warn) + 24} y={sy(mid.atWar) - 70} o={ann(70)} color={C.island}>
        中間：{mid.par.warn}日目に{man(mid.atWar)}人が残る
      </Note>
      <Note x={sx(opt.allDay ?? 0) + 26} y={sy(0) - 120} o={ann(245)} color={C.done}>
        楽観：{opt.allDay}日で全員が出られる
      </Note>
      <div style={{position: 'absolute', right: 70, top: 430, width: 380, opacity: ann(380),
        background: C.ink, color: C.paper, padding: '22px 26px', fontSize: 28, lineHeight: 1.55, fontWeight: 700}}>
        感度分析で最も効くのは<br />攻撃までの猶予<br />
        <span style={{fontSize: 48, fontWeight: 900}}>PRCC +0.96</span><br />
        <span style={{fontSize: 24, fontWeight: 400, color: '#C9C2B2'}}>機材を足すより、決心を何日早められるか</span>
      </div>
    </AbsoluteFill>
  );
};

const Note: React.FC<{x: number; y: number; o: number; color: string; children: React.ReactNode}> = ({x, y, o, color, children}) => (
  <div style={{position: 'absolute', left: x, top: y, opacity: o, translate: `0 ${(1 - o) * 12}px`,
    fontSize: 28, fontWeight: 700, color: C.ink, lineHeight: 1.5, background: 'rgba(246,241,228,0.94)',
    borderLeft: `8px solid ${color}`, padding: '10px 20px'}}>{children}</div>
);
