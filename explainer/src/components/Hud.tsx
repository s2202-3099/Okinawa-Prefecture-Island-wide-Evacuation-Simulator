import React from 'react';
import {interpolate} from 'remotion';
import {C, fmt} from '../theme';
import {totalsAt} from './MapLayer';
import type {MapState} from '../timeline';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// 左上：章と、いま地図に出している条件
export const TopLeft: React.FC<{sec: string; runLabel: string; secAt: number; runAt: number; frame: number}> = ({sec, runLabel, secAt, runAt, frame}) => {
  const so = interpolate(frame - secAt, [0, 15], [0, 1], clamp);
  const ro = interpolate(frame - runAt, [0, 15], [0, 1], clamp);
  return (
    <div style={{position: 'absolute', left: 60, top: 48, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start'}}>
      {sec && <div style={{fontSize: 30, fontWeight: 900, color: C.text, padding: '8px 22px', background: 'rgba(240,86,140,0.18)',
        borderLeft: `6px solid ${C.people}`, opacity: so, letterSpacing: '0.04em'}}>{sec}</div>}
      <div style={{fontSize: 24, fontWeight: 700, color: C.sub, padding: '6px 18px', background: C.panel, border: `1px solid ${C.panelEdge}`,
        borderRadius: 999, opacity: ro}}>地図の条件：<span style={{color: C.text}}>{runLabel}</span></div>
    </div>
  );
};

// 右上：日付・残っている人・攻撃までの日数
export const DayBox: React.FC<{state: MapState; frame: number}> = ({state}) => {
  const {remaining, inSaki, naha, run} = totalsAt(state);
  const day = Math.floor(state.day + 0.0001);
  const warn = run.sum.warn;
  const atk = run.sim === 'oki' ? day >= warn : day >= warn;
  const label = run.sim === 'oki' ? '県内に残る人' : '先島に残る人';
  const left = run.sim === 'oki' ? remaining : inSaki;
  const tag = day < warn ? `攻撃まで あと${warn - day}日` : day === warn ? '攻撃開始' : `攻撃開始から${day - warn}日`;
  return (
    <div style={{position: 'absolute', right: 60, top: 48, width: 400, background: C.panel, border: `1px solid ${atk ? C.attack : C.panelEdge}`,
      borderRadius: 18, padding: '20px 26px', boxShadow: '0 10px 40px rgba(0,0,0,0.35)'}}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12}}>
        <div style={{whiteSpace: 'nowrap'}}><span style={{fontSize: 72, fontWeight: 900, color: C.text, lineHeight: 1}}>{day}</span>
          <span style={{fontSize: 30, fontWeight: 700, color: C.text, marginLeft: 6}}>日目</span></div>
        <span style={{fontSize: 21, fontWeight: 900, color: atk ? C.bg : C.attack, background: atk ? C.attack : 'transparent', whiteSpace: 'nowrap',
          border: `2px solid ${C.attack}`, borderRadius: 8, padding: '3px 10px'}}>{tag}</span>
      </div>
      <div style={{fontSize: 22, color: C.sub, marginTop: 12}}>{label}</div>
      <div style={{fontSize: 48, fontWeight: 900, color: left < 1 ? C.done : atk ? C.attack : C.people, lineHeight: 1.15}}>
        {fmt(left)}<span style={{fontSize: 24, marginLeft: 6}}>人</span>
      </div>
      {naha >= 50 && <div style={{fontSize: 22, color: C.via, marginTop: 6}}>那覇で足止め {fmt(naha)}人</div>}
    </div>
  );
};
