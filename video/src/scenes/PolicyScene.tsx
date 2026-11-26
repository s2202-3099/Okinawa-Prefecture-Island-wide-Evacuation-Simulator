import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import INS from '../data/insights.json';
import {C, fontFamily, man} from '../theme';
import {clipStarts} from '../timing';
import {Footnote, Header, rise} from './parts';

const saved = (id: string) => INS.levers.find((l) => l.id === id)!.saved;
const CARDS = [
  {h: '決心を早める',
    d: '兆しの段階で判断できる基準と、市町村の避難実施要領を平時から整え、訓練しておく',
    e: `3日早めると約${man(saved('start3'))}人多く出られる`},
  {h: '輸送手段を前もって押さえる',
    d: '民間機・船舶の徴用と、米軍施設の使用を、事前に取り決めておく',
    e: `民間機5割増で約${man(saved('planes'))}人、嘉手納3倍で約${man(saved('us'))}人`},
  {h: '早めの自主避難を後押しする',
    d: '早い段階での情報提供と、移動・滞在の費用の支援',
    e: `自主避難8%→18%で約${man(saved('selfRes'))}人`},
  {h: '長く暮らせる受入先を全国で確保する',
    d: '仮設・みなし仮設・公営住宅など、長期の滞在先を事前に割り当てる',
    e: `想定枠${man(INS.base.destCap)}人に対し、必要な住民は約${man(INS.base.needShelter)}人`},
];

export const PolicyScene: React.FC = () => {
  const f = useCurrentFrame();
  const st = clipStarts('policy');
  return (
    <AbsoluteFill style={{background: C.paper, fontFamily}}>
      <Header f={f} kicker="求められる備え" title="モデルから読める4つの示唆" />
      <div style={{position: 'absolute', left: 120, right: 120, top: 300, display: 'grid',
        gridTemplateColumns: '1fr 1fr', gap: 36}}>
        {CARDS.map((c, i) => (
          <div key={c.h} style={{background: '#EFE7D4', borderLeft: `10px solid ${C.island}`, padding: '26px 32px', ...rise(f, st[i + 1])}}>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 16}}>
              <span style={{fontSize: 56, fontWeight: 900, color: C.island}}>{i + 1}</span>
              <span style={{fontSize: 40, fontWeight: 900, color: C.ink}}>{c.h}</span>
            </div>
            <div style={{fontSize: 28, color: C.ink, marginTop: 10, lineHeight: 1.55}}>{c.d}</div>
            <div style={{fontSize: 27, fontWeight: 900, color: C.island, marginTop: 14}}>{c.e}</div>
          </div>
        ))}
      </div>
      <Footnote f={f} at={st[4] + 60}>効果はいずれもモデル上の感度で、推定値に依存する。受入枠の大きさは公的な裏づけのない仮置き</Footnote>
    </AbsoluteFill>
  );
};
