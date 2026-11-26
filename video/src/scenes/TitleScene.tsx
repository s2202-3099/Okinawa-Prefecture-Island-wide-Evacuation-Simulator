import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {SCN} from '../data';
import {C, fontFamily, man} from '../theme';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const TitleScene: React.FC = () => {
  const f = useCurrentFrame();
  const S = SCN.mid;
  return (
    <AbsoluteFill style={{background: C.paper, fontFamily, justifyContent: 'center', padding: '0 160px'}}>
      <div style={{fontSize: 40, fontWeight: 700, color: C.island, letterSpacing: '0.08em',
        opacity: interpolate(f, [5, 25], [0, 1], clamp)}}>沖縄県 全島避難シミュレータ</div>
      <div style={{fontSize: 120, fontWeight: 900, color: C.ink, lineHeight: 1.2, marginTop: 20,
        opacity: interpolate(f, [15, 40], [0, 1], clamp),
        translate: `0 ${interpolate(f, [15, 45], [30, 0], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)})}px`}}>
        沖縄県の{man(S.target)}人を<br />本土へ運び出す
      </div>
      <div style={{width: interpolate(f, [40, 80], [0, 900], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)}),
        height: 8, background: C.island, marginTop: 40}} />
      <div style={{fontSize: 40, color: C.sub, marginTop: 36, lineHeight: 1.6,
        opacity: interpolate(f, [55, 80], [0, 1], clamp)}}>
        中間シナリオ（開始まで{S.par.startDelay}日・攻撃まで{S.par.warn}日・受入は全国分散）を、地図の上で1日ずつ追う
      </div>
    </AbsoluteFill>
  );
};
