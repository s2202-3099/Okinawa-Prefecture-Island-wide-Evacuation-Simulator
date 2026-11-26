import React from 'react';
import {Easing, interpolate} from 'remotion';
import {C} from '../theme';

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const out = Easing.bezier(0.16, 1, 0.3, 1);
// at フレームから現れる（不透明度と少しの持ち上がり）
export const rise = (f: number, at: number, len = 20) => ({
  opacity: interpolate(f, [at, at + len], [0, 1], clamp),
  translate: `0 ${interpolate(f, [at, at + len + 6], [24, 0], {...clamp, easing: out})}px`,
});

export const Header: React.FC<{f: number; kicker: string; title: string; sub?: string}> = ({f, kicker, title, sub}) => (
  <div style={{position: 'absolute', left: 120, top: 80, right: 120}}>
    <div style={{fontSize: 34, fontWeight: 700, color: C.island, ...rise(f, 0)}}>{kicker}</div>
    <div style={{fontSize: 66, fontWeight: 900, color: C.ink, marginTop: 8, lineHeight: 1.25, ...rise(f, 6)}}>{title}</div>
    {sub && <div style={{fontSize: 32, color: C.sub, marginTop: 14, lineHeight: 1.5, ...rise(f, 14)}}>{sub}</div>}
  </div>
);

export const Footnote: React.FC<{f: number; at: number; children: React.ReactNode}> = ({f, at, children}) => (
  <div style={{position: 'absolute', left: 120, right: 120, bottom: 60, fontSize: 26, color: C.sub, ...rise(f, at)}}>{children}</div>
);
