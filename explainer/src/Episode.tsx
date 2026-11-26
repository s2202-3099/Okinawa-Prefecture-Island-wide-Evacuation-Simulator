import {Audio} from '@remotion/media';
import React from 'react';
import {AbsoluteFill, interpolate, Sequence, staticFile, Track, useCurrentFrame} from 'remotion';
import {Hud} from './components/HudFrame';
import {MapLayer} from './components/MapLayer';
import {PanelView} from './components/Panels';
import {Characters, Subtitle} from './components/Talk';
import {RUNS} from './data';
import {C, fontFamily} from './theme';
import {cameraAt, LINES, mapAt, stateAt} from './timeline';

const Screen: React.FC = () => {
  const f = useCurrentFrame();
  const st = stateAt(f);
  const map = mapAt(f);
  const cam = cameraAt(f);
  const run = RUNS[map.run];
  const big = st.panel && ['title', 'list', 'chart', 'credits'].includes((st.panel as {kind: string}).kind);
  const attackFlash = run.sim === 'oki' && map.day >= run.sum.warn;
  return (
    <AbsoluteFill style={{fontFamily, background: C.bg}}>
      <MapLayer state={map} frame={f} cam={cam} hl={st.hl} />
      {attackFlash && <AbsoluteFill style={{boxShadow: `inset 0 0 120px rgba(255,77,77,${0.25 + 0.1 * Math.sin(f / 8)})`}} />}
      <AbsoluteFill style={{background: `rgba(11,22,36,${big ? 0.45 : 0})`}} />
      <Hud frame={f} map={map} st={st} />
      <PanelView panel={st.panel} t={f - st.panelAt} upto={st.upto} frame={f} />
      <Characters line={st.line} frame={f} />
      <Subtitle line={st.line} frame={f} lineEnd={st.lineEnd} />
      <AbsoluteFill style={{background: C.bg, opacity: interpolate(f, [0, 20], [1, 0], {extrapolateRight: 'clamp'})}} />
    </AbsoluteFill>
  );
};

export const Episode: React.FC = () => (
  <>
    <Screen />
    <Track name="声">
      {LINES.map((l) => (
        <Audio key={l.id} name={`${l.who === 'z' ? 'ずんだもん' : 'つむぎ'} ${l.id}`} src={staticFile(`voice/${l.id}.mp3`)} from={l.from} durationInFrames={l.dur} />
      ))}
    </Track>
    <Track name="BGM">
      <Sequence name="BGMの差し込み口（public/bgm/ に曲を置いて Audio を足す）" from={0} durationInFrames={1} layout="none">{null}</Sequence>
    </Track>
  </>
);
