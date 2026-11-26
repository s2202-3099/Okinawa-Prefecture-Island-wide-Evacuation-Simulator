import {Audio} from '@remotion/media';
import React from 'react';
import {Sequence, staticFile, Track} from 'remotion';
import {ChartScene} from './scenes/ChartScene';
import {ClosingScene} from './scenes/ClosingScene';
import {MapScene} from './scenes/MapScene';
import {TitleScene} from './scenes/TitleScene';
import {
  CHART_FROM, CHART_LEN, CLOSING_FROM, CLOSING_LEN, MAP_FROM, MAP_SCENE_LEN, N, segStart, TITLE_LEN,
} from './timing';

const PAD = 8;

export const EvacuationVideo: React.FC = () => (
  <>
    <Track name="Scenes">
      <Sequence name="タイトル" from={0} durationInFrames={TITLE_LEN}>
        <TitleScene />
      </Sequence>
      <Sequence name="地図：全県の避難" from={MAP_FROM} durationInFrames={MAP_SCENE_LEN}>
        <MapScene />
      </Sequence>
      <Sequence name="シナリオの比較" from={CHART_FROM} durationInFrames={CHART_LEN}>
        <ChartScene />
      </Sequence>
      <Sequence name="結び" from={CLOSING_FROM} durationInFrames={CLOSING_LEN}>
        <ClosingScene />
      </Sequence>
    </Track>
    <Track name="ナレーション">
      <Audio name="N1 タイトル" src={staticFile('narration/title.wav')} from={15} durationInFrames={N.title} />
      <Audio name="N2 人口" src={staticFile('narration/introA.wav')} from={MAP_FROM + segStart('introA') + PAD} durationInFrames={N.introA} />
      <Audio name="N3 3つの空港" src={staticFile('narration/introB.wav')} from={MAP_FROM + segStart('introB') + PAD} durationInFrames={N.introB} />
      <Audio name="N4 1〜7日目" src={staticFile('narration/days1.wav')} from={MAP_FROM + segStart('days1') + PAD} durationInFrames={N.days1} />
      <Audio name="N5 8〜25日目" src={staticFile('narration/days8.wav')} from={MAP_FROM + segStart('days8') + PAD} durationInFrames={N.days8} />
      <Audio name="N6 攻撃開始" src={staticFile('narration/attack.wav')} from={MAP_FROM + segStart('attack') + PAD} durationInFrames={N.attack} />
      <Audio name="N7 26〜51日目" src={staticFile('narration/days26.wav')} from={MAP_FROM + segStart('days26', 'days') + PAD} durationInFrames={N.days26} />
      <Audio name="N8 シナリオ比較" src={staticFile('narration/chart.wav')} from={CHART_FROM + 15} durationInFrames={N.chart} />
      <Audio name="N9 結び" src={staticFile('narration/closing.wav')} from={CLOSING_FROM + 10} durationInFrames={N.closing} />
    </Track>
  </>
);
