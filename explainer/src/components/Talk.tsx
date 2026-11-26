import React from 'react';
import {Img, interpolate, staticFile} from 'remotion';
import {CHARS} from '../characters';
import {C} from '../theme';
import type {Line} from '../timeline';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// 字幕。話している人の色の名札と、本文
export const Subtitle: React.FC<{line: Line; frame: number; lineEnd: number}> = ({line, frame, lineEnd}) => {
  const ch = CHARS[line.who];
  const t = frame - line.from;
  // 台詞と台詞の間が短いときは字幕を出したままにし、長い間（ポーズ）のときだけ消す
  const gap = lineEnd - (line.from + line.dur);
  const o = interpolate(t, [0, 6], [0, 1], clamp) * (gap > 20 ? interpolate(frame, [line.from + line.dur + 4, line.from + line.dur + 12], [1, 0], clamp) : 1);
  return (
    <div style={{position: 'absolute', left: 60, right: 560, bottom: 50, minHeight: 150, background: 'rgba(8,16,28,0.88)',
      border: `2px solid ${ch.color}`, borderRadius: 22, padding: '30px 38px 26px', opacity: Math.max(o, 0.0001),
      boxShadow: '0 16px 50px rgba(0,0,0,0.5)'}}>
      <div style={{position: 'absolute', top: -24, left: 30, background: ch.color, color: C.bg, fontSize: 26, fontWeight: 900,
        padding: '4px 18px', borderRadius: 999}}>{ch.name}</div>
      <div style={{fontSize: 42, fontWeight: 700, color: C.text, lineHeight: 1.5}}>{line.text}</div>
    </div>
  );
};

// 立ち絵（素材がなければ仮のアイコン）。話している方が前に出て、口が音量に合わせて動く
export const Characters: React.FC<{line: Line; frame: number}> = ({line, frame}) => {
  const t = frame - line.from;
  const env = t >= 0 && t < line.dur ? line.env[Math.min(line.env.length - 1, t)] ?? 0 : 0;
  return (
    <>
      {(['z', 't'] as const).map((who, i) => {
        const ch = CHARS[who];
        const speaking = line.who === who;
        const bob = speaking ? Math.sin(frame / 5) * 3 * Math.min(1, env * 2) : 0;
        const right = who === 't' ? 40 : 270;
        const blink = frame % 150 < 5;
        if (ch.art) {
          return (
            <div key={who} style={{position: 'absolute', right, bottom: 0, height: ch.art.height, translate: `0 ${-bob}px`,
              filter: speaking ? 'none' : 'brightness(0.7)', scale: ch.art.flip ? '-1 1' : undefined}}>
              <Img src={staticFile(ch.art.base)} style={{height: '100%'}} />
              {ch.art.mouth && speaking && env > 0.25 && <Img src={staticFile(ch.art.mouth)} style={{position: 'absolute', inset: 0, height: '100%'}} />}
              {ch.art.blink && blink && <Img src={staticFile(ch.art.blink)} style={{position: 'absolute', inset: 0, height: '100%'}} />}
            </div>
          );
        }
        // 仮のアイコン
        const size = speaking ? 210 : 170;
        return (
          <div key={who} style={{position: 'absolute', right: right + (speaking ? 0 : 20), bottom: speaking ? 70 : 60, width: size, textAlign: 'center',
            translate: `0 ${-bob}px`, opacity: speaking ? 1 : 0.6, zIndex: speaking ? 2 : 1}}>
            <div style={{width: size, height: size, borderRadius: '50%', background: `radial-gradient(circle at 35% 30%, ${ch.color}, ${ch.color}55)`,
              border: `4px solid ${speaking ? C.text : ch.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
              boxShadow: speaking ? `0 0 ${20 + env * 40}px ${ch.color}` : 'none'}}>
              <span style={{fontSize: size * 0.42, fontWeight: 900, color: C.bg, lineHeight: 1}}>{ch.initial}</span>
              <span style={{width: size * 0.22, height: 6 + env * size * 0.12, borderRadius: 999, background: C.bg, marginTop: 8,
                transition: 'none'}} />
            </div>
            <div style={{fontSize: 22, fontWeight: 900, color: ch.color, marginTop: 8, textShadow: `0 0 8px ${C.bg}`}}>{ch.name}</div>
          </div>
        );
      })}
    </>
  );
};
